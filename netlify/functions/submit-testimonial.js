/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Netlify Function: submit-testimonial
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
} catch (e) { console.error("Firebase init:", e.message); }

const clean = (s, n) => String(s || "").trim().replace(/[<>]/g, "").slice(0, n);

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "Method not allowed" }) };
  if (!db) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Service unavailable" }) };

  let data;
  try { data = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) }; }

  if (data.website) return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };

  const customerName = clean(data.customerName, 60);
  const productModel = clean(data.productModel, 80);
  const comment = clean(data.comment, 1000);
  const rating = parseInt(data.rating, 10);

  if (customerName.length < 2) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "اكتب اسمك" }) };
  if (comment.length < 3) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "التعليق قصير جداً" }) };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "التقييم غير صالح" }) };
  }

  try {
    await db.collection("testimonials").add({
      customerName,
      productModel: productModel || null,
      rating,
      comment,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ipHash: (event.headers["x-nf-client-connection-ip"] || "").slice(0, 45)
    });
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("submit-testimonial:", e);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "تعذّر الإرسال" }) };
  }
};
