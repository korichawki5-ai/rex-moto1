/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Netlify Function: submit-order
   POST /api/submit-order
   يتحقق من المدخلات، يفحص المنتج في Firestore، ثم يحفظ الطلب.
   ═══════════════════════════════════════════════════════════════ */

const admin = require("firebase-admin");

let db;
try {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  db = admin.firestore();
} catch (e) {
  console.error("Firebase init failed:", e.message);
}

const ALLOWED = {
  name: { min: 2, max: 80 },
  phone: { min: 8, max: 20, re: /^[0-9+\s\-()]+$/ },
  city: { max: 60 },
  notes: { max: 500 },
  selectedColor: { max: 30 },
  quantity: { min: 1, max: 20 }
};

function clean(s, max) {
  return String(s || "").trim().replace(/[<>]/g, "").slice(0, max);
}

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  if (!db) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Service unavailable" }) };

  let data;
  try { data = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  // Honeypot
  if (data.website) return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };

  const customerName = clean(data.customerName, ALLOWED.name.max);
  const phone = clean(data.phone, ALLOWED.phone.max);
  const city = clean(data.city, ALLOWED.city.max);
  const notes = clean(data.notes, ALLOWED.notes.max);
  const selectedColor = clean(data.selectedColor, ALLOWED.selectedColor.max);
  const productId = clean(data.productId, 100);
  let quantity = parseInt(data.quantity, 10);

  // Validation
  const errors = [];
  if (customerName.length < ALLOWED.name.min) errors.push("الاسم قصير جداً");
  if (!ALLOWED.phone.re.test(phone) || phone.replace(/\D/g, "").length < 8) errors.push("رقم الهاتف غير صالح");
  if (!productId) errors.push("معرّف المنتج مطلوب");
  if (!Number.isFinite(quantity) || quantity < ALLOWED.quantity.min) quantity = 1;
  if (quantity > ALLOWED.quantity.max) quantity = ALLOWED.quantity.max;

  if (errors.length) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: errors[0] }) };
  }

  try {
    // Verify product exists, is visible, and in stock — NEVER trust client price
    const prodSnap = await db.collection("products").doc(productId).get();
    if (!prodSnap.exists) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "المنتج غير موجود" }) };
    const p = prodSnap.data();
    if (p.status === "hidden" || p.status === "disabled") {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "المنتج غير متاح حالياً" }) };
    }
    if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity < quantity) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "الكمية المطلوبة غير متوفرة" }) };
    }

    let mainImg = "";
    if (Array.isArray(p.images) && p.images.length) {
      const m = p.images.find(i => i.isMain) || p.images[0];
      mainImg = m.url || m;
    }
    if (!mainImg) mainImg = p.imageUrl || "";

    const order = {
      productId,
      productName: p.name,
      productImage: mainImg,
      unitPrice: p.price, // server-side price
      totalPrice: p.price * quantity,
      customerName,
      phone,
      city,
      quantity,
      selectedColor: selectedColor || null,
      notes: notes || null,
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ipHash: (event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"] || "").slice(0, 45)
    };

    const ref = await db.collection("orders").add(order);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ ok: true, orderId: ref.id })
    };
  } catch (e) {
    console.error("submit-order error:", e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "تعذّر إرسال الطلب، حاول لاحقاً" }) };
  }
};
