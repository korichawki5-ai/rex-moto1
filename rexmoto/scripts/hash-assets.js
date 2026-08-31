/* ═══════════════════════════════════════════════════════════════
   Content-Hashed Assets (build)
   يولّد نسخاً من ملفات CSS/JS بأسماء فريدة مشتقة من محتواها
   (app.a1b2c3d4.js) ثم يعيد كتابة روابطها في كل صفحات HTML.
   النتيجة: كل نشر = روابط جديدة = كل جهاز (حتى التي لا يمكن
   مسح كاشها) يحمّل أحدث نسخة فوراً.
   ═══════════════════════════════════════════════════════════════ */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, ".."); // جذر المشروع (rexmoto/)

const assets = [
  "assets/css/style.css",
  "assets/css/admin.css",
  "assets/js/config.js",
  "assets/js/firebase.js",
  "assets/js/app.js",
  "assets/js/wilayas.js",
  "assets/js/admin.js",
];

const htmlFiles = [
  "index.html",
  "products.html",
  "product.html",
  "404.html",
  "pages/privacy.html",
  "admin/index.html",
  "admin/login.html",
];

function hashOf(rel) {
  return crypto
    .createHash("sha1")
    .update(fs.readFileSync(path.join(root, rel)))
    .digest("hex")
    .slice(0, 8);
}

for (const rel of assets) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) {
    console.error(`[hash-assets] ❌ الملف غير موجود: ${rel}`);
    process.exit(1);
  }
  const h = hashOf(rel);
  const outRel = rel.replace(/(\.[a-z]+)$/, `.${h}$1`);
  fs.copyFileSync(src, path.join(root, outRel));
  console.log(`[hash-assets] ${rel} → ${outRel}`);
}

for (const rel of htmlFiles) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) continue;
  let html = fs.readFileSync(src, "utf8");
  for (const a of assets) {
    const hashed = a.replace(/(\.[a-z]+)$/, `.${hashOf(a)}$1`);
    html = html.split(a).join(hashed);
  }
  fs.writeFileSync(src, html);
  console.log(`[hash-assets] أعدت كتابة الروابط في ${rel}`);
}

console.log("[hash-assets] ✅ اكتمل.");
