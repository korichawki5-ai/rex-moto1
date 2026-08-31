/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Vercel Function: submit-testimonial
   POST /api/submit-testimonial
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
} catch (e) { console.error("Firebase init failed:", e.message); }

const clean = (s, n) => String(s == null ? "" : s).trim().replace(/[<>]/g, "").slice(0, n);

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

  if (data.website) return res.status(200).json({ ok: true });

  const customerName = clean(data.customerName, 60);
  const productModel = clean(data.productModel, 80);
  const comment = clean(data.comment, 1000);
  const rating = parseInt(data.rating, 10);

  if (customerName.length < 2) return res.status(400).json({ error: "اكتب اسمك" });
  if (comment.length < 3) return res.status(400).json({ error: "التعليق قصير جداً" });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "التقييم غير صالح" });
  }
  if (!db) return res.status(503).json({ error: "Service unavailable" });

  try {
    await db.collection("testimonials").add({
      customerName,
      productModel: productModel || null,
      rating,
      comment,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ipHash: (req.headers["x-real-ip"] || req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] || "").slice(0, 45)
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("submit-testimonial:", e);
    return res.status(500).json({ error: "تعذّر الإرسال" });
  }
};
