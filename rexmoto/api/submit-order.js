/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Vercel Function: submit-order
   POST /api/submit-order
   يتحقق من المدخلات، يفحص المنتج في Firestore، ثم يحفظ الطلب.
   (السعر والمخزون من قاعدة البيانات أبداً من العميل)
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
  customerName: { min: 2, max: 80 },
  phone: { min: 8, max: 20, re: /^[0-9+\s\-()]+$/ },
  city: { max: 90 },
  notes: { max: 500 },
  selectedColor: { max: 30 },
  quantity: { min: 1, max: 20 },
  wilayaCode: { re: /^(0[1-9]|[1-5][0-9]|6[0-9])$/ }, // 01 … 69 (القانون 26-06)
  wilayaName: { max: 60 },
  communeName: { max: 80 },
  communeFr: { max: 80 }
};

function clean(s, max) {
  return String(s == null ? "" : s).trim().replace(/[<>]/g, "").slice(0, max);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let data = req.body;
  if (typeof data === "string" || !data) {
    try { data = JSON.parse(data || "{}"); }
    catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  // Honeypot — الروبوتات تمتلئ وتُتجاهل بصمت
  if (data.website) return res.status(200).json({ ok: true });

  const customerName = clean(data.customerName, ALLOWED.customerName.max);
  const phone = clean(data.phone, ALLOWED.phone.max);
  const notes = clean(data.notes, ALLOWED.notes.max);
  const selectedColor = clean(data.selectedColor, ALLOWED.selectedColor.max);
  const wilayaCode = clean(data.wilayaCode, 2);
  const wilayaName = clean(data.wilayaName, ALLOWED.wilayaName.max);
  const communeName = clean(data.communeName, ALLOWED.communeName.max);
  const communeFr = clean(data.communeFr, ALLOWED.communeFr.max);
  const city = clean(data.city, ALLOWED.city.max);
  const productId = clean(data.productId, 100);
  let quantity = parseInt(data.quantity, 10);

  // Validation
  const errors = [];
  if (customerName.length < ALLOWED.customerName.min) errors.push("الاسم قصير جداً");
  if (!ALLOWED.phone.re.test(phone) || phone.replace(/\D/g, "").length < 8) errors.push("رقم الهاتف غير صالح");
  if (!productId) errors.push("معرّف المنتج مطلوب");
  if (wilayaCode && !ALLOWED.wilayaCode.re.test(wilayaCode)) errors.push("الولاية غير صالحة");
  if (!Number.isFinite(quantity) || quantity < ALLOWED.quantity.min) quantity = 1;
  if (quantity > ALLOWED.quantity.max) quantity = ALLOWED.quantity.max;

  if (errors.length) {
    return res.status(400).json({ error: errors[0] });
  }
  if (!db) return res.status(503).json({ error: "Service unavailable" });

  try {
    // Verify product exists, is visible, and in stock — NEVER trust client price
    const prodSnap = await db.collection("products").doc(productId).get();
    if (!prodSnap.exists) return res.status(400).json({ error: "المنتج غير موجود" });
    const p = prodSnap.data();
    if (p.status === "hidden" || p.status === "disabled") {
      return res.status(400).json({ error: "المنتج غير متاح حالياً" });
    }
    if (p.stockQuantity !== undefined && p.stockQuantity !== null && p.stockQuantity < quantity) {
      return res.status(400).json({ error: "الكمية المطلوبة غير متوفرة" });
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
      city: city || [wilayaCode, wilayaName, communeFr].filter(Boolean).join(" - "),
      // بيانات الموقع الجغرافي (ولاية + بلدية)
      wilayaCode: wilayaCode || null,
      wilayaName: wilayaName || null,
      communeName: communeName || null,
      communeFr: communeFr || null,
      quantity,
      selectedColor: selectedColor || null,
      notes: notes || null,
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ipHash: (req.headers["x-real-ip"] || req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || "").slice(0, 45)
    };

    const ref = await db.collection("orders").add(order);
    return res.status(200).json({ ok: true, orderId: ref.id });
  } catch (e) {
    console.error("submit-order error:", e);
    return res.status(500).json({ error: "تعذّر إرسال الطلب، حاول لاحقاً" });
  }
};
