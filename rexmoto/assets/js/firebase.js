/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Firebase Initialization (client SDK)
   ═══════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  serverTimestamp,
  limit,
  select
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

const cfg = window.REXMOTO_CONFIG;

if (!cfg || !cfg.firebase || !cfg.firebase.apiKey || cfg.firebase.apiKey === "YOUR_API_KEY_HERE") {
  console.warn("[REXMOTO] ⚠️ لم يتم ضبط إعدادات Firebase بعد. راجع README.md");
}

let app, db, auth;
try {
  app = initializeApp(cfg.firebase);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("[REXMOTO] فشل تهيئة Firebase:", e);
}

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════
const fmtDZD = (n) => (n || 0).toLocaleString("ar-DZ") + " دج";
const fmtDZ = (n) => (n || 0).toLocaleString("ar-DZ");
const waLink = (phone, msg) => "https://wa.me/" + String(phone).replace(/[^0-9]/g, "") + (msg ? "?text=" + encodeURIComponent(msg) : "");
const telLink = (phone) => "tel:" + String(phone).replace(/[^0-9+]/g, "");
const slugify = (s) => String(s).toLowerCase().trim().replace(/[^\w\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");

function getProductMainImage(p) {
  if (p.images && Array.isArray(p.images) && p.images.length) {
    const main = p.images.find(i => i.isMain) || p.images[0];
    return main.url || main;
  }
  if (p.imageUrl) return p.imageUrl;
  return "public/images/placeholder.svg";
}

function getProductImages(p) {
  if (p.images && Array.isArray(p.images) && p.images.length) {
    return p.images.map(i => i.url || i);
  }
  if (p.imageUrl) return [p.imageUrl];
  return [];
}

// صورة مصغرة للبطاقات (خفيفة) — مع رجوع ذكي للصيغة الكاملة
function getProductThumb(p) {
  if (p && p.thumbImage) return p.thumbImage;
  return getProductMainImage(p);
}

function isProductVisible(p) {
  return p.status !== "hidden" && p.status !== "disabled";
}

function isProductAvailable(p) {
  return p.status === "active" && (p.stockQuantity === undefined || p.stockQuantity === null || p.stockQuantity > 0);
}

function offerActive(p) {
  if (!p.oldPrice || p.oldPrice <= (p.price || 0)) return false;
  if (p.offerEndsAt) {
    const end = p.offerEndsAt.toDate ? p.offerEndsAt.toDate() : new Date(p.offerEndsAt);
    if (end < new Date()) return false;
  }
  return true;
}

function discountPercent(p) {
  if (!offerActive(p)) return 0;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function stockLabel(p) {
  if (p.status === "hidden" || p.status === "disabled") return { text: "مخفي", cls: "out" };
  if (p.stockQuantity === 0) return { text: "نفد المخزون", cls: "out" };
  if (p.stockQuantity && p.stockQuantity <= 3) return { text: "متبقي " + p.stockQuantity + " فقط", cls: "low" };
  return { text: "متوفر", cls: "" };
}

function toast(msg, type = "ok", duration = 2800) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = "toast show " + (type === "err" ? "err" : type === "info" ? "info" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), duration);
}

// ═════════════════════════════════════════════════════════════
// SETTINGS (يتم جلبها مرة واحدة وتخزينها)
// ═════════════════════════════════════════════════════════════
let _settingsCache = null;
async function getSettings() {
  if (_settingsCache) return _settingsCache;
  try {
    const snap = await getDoc(doc(db, "settings", "public"));
    if (snap.exists()) {
      _settingsCache = snap.data();
    } else {
      _settingsCache = {};
    }
  } catch (e) {
    console.warn("[REXMOTO] تعذّر جلب الإعدادات:", e);
    _settingsCache = {};
  }
  return _settingsCache;
}

function applySettings(s) {
  if (!s) return;
  const storeName = s.storeName || "REXMOTO";
  document.querySelectorAll("[data-store-name]").forEach(el => el.textContent = storeName);
  document.title = s.pageTitle || (storeName + " — متجر دراجات وسكوترات كهربائية");
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && s.metaDescription) metaDesc.setAttribute("content", s.metaDescription);
  document.documentElement.style.setProperty("--accent", s.accentColor || "#e11d48");
  document.documentElement.style.setProperty("--accent2", s.accentColor2 || "#f43f5e");
}

// ═════════════════════════════════════════════════════════════
// DATA FETCHING
// ═════════════════════════════════════════════════════════════
// حقول خفيفة للبطاقات فقط — نستثني الصور الكبيرة (base64) لسرعة التحميل
const CARD_FIELDS = [
  "name", "brand", "category", "status", "price", "oldPrice", "stockQuantity",
  "offerEndsAt", "topSpeed", "rangeKm", "motorPower", "battery", "colors",
  "warranty", "description", "isFeatured", "imageUrl", "thumbImage",
  "features", "createdAt"
];

async function fetchProducts(options = {}) {
  const { category, visibleOnly = true } = options;
  const q = query(
    collection(db, "products"),
    orderBy("createdAt", "desc"),
    select(...CARD_FIELDS)
  );
  const snap = await getDocs(q);
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (category) list = list.filter(p => p.category === category);
  if (visibleOnly) list = list.filter(isProductVisible);
  return list;
}

async function fetchProduct(id) {
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function fetchApprovedTestimonials() {
  const q = query(
    collection(db, "testimonials"),
    where("status", "==", "approved"),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function submitOrder(data) {
  // عبر Netlify Function للتحقق الإضافي
  const endpoint = (cfg.apiBase || "/.netlify/functions") + "/submit-order";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || "حدث خطأ أثناء إرسال الطلب");
  }
  return json;
}

async function submitTestimonial(data) {
  const endpoint = (cfg.apiBase || "/.netlify/functions") + "/submit-testimonial";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "حدث خطأ أثناء إرسال التقييم");
  return json;
}

// ═════════════════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════════════════
window.RX = {
  app, db, auth,
  fmtDZD, fmtDZ, waLink, telLink, slugify,
  getProductMainImage, getProductImages, getProductThumb, isProductVisible, isProductAvailable,
  offerActive, discountPercent, stockLabel,
  getSettings, applySettings,
  fetchProducts, fetchProduct, fetchApprovedTestimonials,
  submitOrder, submitTestimonial,
  toast
};
