/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Admin Panel Logic
   (Firestore-only — images stored as compressed base64 data URLs)
   ═══════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, limit, writeBatch
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const cfg = window.REXMOTO_CONFIG;
if (!cfg || cfg.firebase.apiKey === "YOUR_API_KEY_HERE") {
  document.body.innerHTML = '<div style="padding:40px;font-family:system-ui;text-align:center;color:#e11d48"><h2>⚠️ Firebase غير مهيّأ</h2><p>راجع README.md واضبط قيم Firebase في assets/js/config.js</p></div>';
  throw new Error("Firebase not configured");
}

const app = initializeApp(cfg.firebase);
const auth = getAuth(app);
const db = getFirestore(app);

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════
const fmtDZD = n => (Number(n) || 0).toLocaleString("ar-DZ") + " دج";
const fmtDZ = n => (Number(n) || 0).toLocaleString("ar-DZ");
const toast = (msg, type) => {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show " + (type === "err" ? "err" : type === "info" ? "info" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2800);
};
const waLink = (phone, msg) => "https://wa.me/" + String(phone).replace(/[^0-9]/g, "") + (msg ? "?text=" + encodeURIComponent(msg) : "");
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ar-DZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
const productMainImage = p => {
  if (p.images && p.images.length) {
    const m = p.images.find(i => i.isMain) || p.images[0];
    return m.url || m;
  }
  return p.imageUrl || "../public/images/placeholder.svg";
};
const statusPill = (s) => {
  const m = {
    new: ["new", "جديد"], contacted: ["contacted", "تم التواصل"],
    confirmed: ["confirmed", "مؤكد"], delivered: ["delivered", "تم التسليم"],
    cancelled: ["cancelled", "ملغى"],
    pending: ["pending", "قيد المراجعة"], approved: ["approved", "موافق"],
    rejected: ["rejected", "مرفوض"],
    active: ["delivered", "متوفر"], out: ["cancelled", "نفد"], hidden: ["cancelled", "مخفي"],
    low: ["pending", "متبقي قليل"], disabled: ["cancelled", "موقوف"]
  };
  const x = m[s] || ["new", s];
  return `<span class="pill ${x[0]}"><i class="d"></i>${x[1]}</span>`;
};

let currentUser = null;

// ═════════════════════════════════════════════════════════════
// IMAGE COMPRESSION (browser canvas → base64 JPEG)
// ═════════════════════════════════════════════════════════════
const MAX_IMG_W = 1200;
const IMG_QUALITY = 0.82;

function compressImage(file, opts = {}) {
  const maxW = opts.maxW || MAX_IMG_W;
  const quality = (typeof opts.quality === "number") ? opts.quality : IMG_QUALITY;
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("not an image"));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("حجم الصورة كبير جداً (أقصى 10MB)"));
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("fichier image invalide"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("erreur lecture"));
    reader.readAsDataURL(file);
  });
}

// توليد صورة مصغرة صغيرة (~560px) لبطاقات المنتجات — تُسرّع الموقع على الهواتف
function makeThumbFromDataUrl(dataUrl, maxW = 560, quality = 0.72) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch (e) { resolve(null); }
  });
}

// ═════════════════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════════════════
onAuthStateChanged(auth, async (user) => {
  if (!user) { location.href = "login.html"; return; }
  const adminDoc = await getDoc(doc(db, "admins", user.uid));
  if (!adminDoc.exists()) { await signOut(auth); location.href = "login.html"; return; }
  currentUser = { ...user, role: adminDoc.data().role || "admin" };
  document.getElementById("userName").textContent = adminDoc.data().name || user.email.split("@")[0];
  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("userAv").textContent = (adminDoc.data().name || "A").charAt(0);
  document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));
  initAdmin();
});

// ═════════════════════════════════════════════════════════════
// DATA
// ═════════════════════════════════════════════════════════════
let orders = [], products = [], testimonials = [];

function initAdmin() {
  document.getElementById("dashDate").textContent = new Date().toLocaleDateString("ar-DZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  onSnapshot(collection(db, "products"), snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts(); renderDash();
  }, err => console.error(err));

  onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(200)), snap => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderOrders(); renderDash(); updateBadges();
  }, err => console.error(err));

  onSnapshot(query(collection(db, "testimonials"), orderBy("createdAt", "desc"), limit(100)), snap => {
    testimonials = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTestimonials(); updateBadges();
  }, err => console.error(err));

  loadSettings();

  document.getElementById("orderSearch").addEventListener("input", renderOrders);
  document.getElementById("orderStatusFilter").addEventListener("change", renderOrders);
  document.getElementById("prodSearch").addEventListener("input", renderProducts);
  document.getElementById("prodCatFilter").addEventListener("change", renderProducts);
  document.getElementById("testFilter").addEventListener("change", renderTestimonials);
}

function updateBadges() {
  const no = orders.filter(o => o.status === "new").length;
  const pt = testimonials.filter(t => t.status === "pending").length;
  const set = (id, n) => { const el = document.getElementById(id); if (el) { el.textContent = n; el.style.display = n > 0 ? "grid" : "none"; } };
  set("dotOrders", no); set("dotTests", pt);
  set("mDotOrders", no); set("mDotTests", pt);
}

window.go = function (v) {
  document.querySelectorAll(".view").forEach(s => s.style.display = "none");
  const sec = document.getElementById("view-" + v);
  if (sec) sec.style.display = "block";
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  window.scrollTo({ top: 0 });
};

// ═════════════════════════════════════════════════════════════
// DASHBOARD
// ═════════════════════════════════════════════════════════════
function renderDash() {
  const fresh = orders.filter(o => o.status === "new").length;
  const total = orders.length;
  const value = orders.filter(o => o.status !== "cancelled").reduce((a, o) => a + (o.totalPrice || 0), 0);
  const low = products.filter(p => p.status === "out" || p.status === "low" || (p.stockQuantity != null && p.stockQuantity <= 3 && p.stockQuantity > 0)).length;

  document.getElementById("dashStats").innerHTML = `
    <div class="stat"><div class="ic-wrap red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><div class="lbl">طلبات جديدة</div><div class="val s">${fresh}</div><div class="chg">بحاجة لرد سريع</div></div>
    <div class="stat"><div class="ic-wrap green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></div><div class="lbl">إجمالي الطلبات</div><div class="val">${total}</div><div class="chg">كل الأوقات</div></div>
    <div class="stat"><div class="ic-wrap blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div class="lbl">قيمة الطلبات</div><div class="val">${Math.round(value / 1000)}<span style="font-size:14px;color:var(--muted);font-family:var(--mono)"> ألف دج</span></div><div class="chg">غير الملغاة</div></div>
    <div class="stat"><div class="ic-wrap amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="lbl">تنبيه مخزون</div><div class="val">${low}</div><div class="chg dn">من ${products.length} منتج</div></div>
  `;

  const recent = orders.slice(0, 6);
  document.getElementById("recentCount").textContent = orders.length + " طلب";
  document.getElementById("recentTable").innerHTML = renderOrderTable(recent);

  const today = new Date(); today.setHours(0,0,0,0);
  const counts = Array(7).fill(0);
  orders.forEach(o => {
    if (!o.createdAt) return;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    d.setHours(0,0,0,0);
    const diff = Math.floor((today - d) / 86400000);
    if (diff >= 0 && diff < 7) counts[6 - diff]++;
  });
  const max = Math.max(1, ...counts);
  const dayNames = ["أحد","اثن","ثلا","أرب","خمي","جمع","سبت"];
  document.getElementById("chart").innerHTML = counts.map((v, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (6 - i));
    return `<div class="bar ${i === 6 ? "today" : ""}"><span class="val">${v}</span><i style="height:${Math.round(v/max*100)}%"></i><span>${dayNames[d.getDay()]}</span></div>`;
  }).join("");
}

function renderOrderTable(list) {
  if (!list.length) return `<div class="empty-state"><h4>لا توجد طلبات</h4><p>ستظهر الطلبات هنا فور وصولها.</p></div>`;
  const rows = list.map(o => {
    const p = products.find(x => x.id === o.productId);
    const img = o.productImage || (p ? productMainImage(p) : "");
    return `<tr>
      <td class="od-cust"><b>${o.customerName}</b><small>${o.phone}</small></td>
      <td><div class="od-prod">${img ? `<img src="${img}" alt="">` : ""}<div><b>${o.productName || "—"}</b><small>${o.city || "—"} · ${o.quantity || 1}× ${o.selectedColor ? "· " + o.selectedColor : ""}</small></div></div></td>
      <td><span class="st-mini">${fmtDZD(o.totalPrice || 0)}</span></td>
      <td>${statusPill(o.status)}</td>
      <td><div class="row-actions">
        <select onchange="setOrderStatus('${o.id}',this.value)">
          ${["new","contacted","confirmed","delivered","cancelled"].map(s => `<option value="${s}" ${o.status===s?"selected":""}>${({new:"جديد",contacted:"تم التواصل",confirmed:"مؤكد",delivered:"تم التسليم",cancelled:"ملغى"})[s]}</option>`).join("")}
        </select>
        <button class="iconbtn" title="تفاصيل" onclick="showOrder('${o.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></button>
        <a class="iconbtn wa" title="واتساب" target="_blank" href="${waLink(o.phone, `مرحباً ${o.customerName}، بخصوص طلبك لـ ${o.productName||"المنتج"} من REXMOTO.`)}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z"/></svg></a>
      </div></td>
    </tr>`;
  }).join("");
  return `<table class="order-table"><thead><tr><th>العميل</th><th>المنتج</th><th>القيمة</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderOrders() {
  const q = (document.getElementById("orderSearch")?.value || "").toLowerCase();
  const st = document.getElementById("orderStatusFilter")?.value || "";
  let list = orders.slice();
  if (st) list = list.filter(o => o.status === st);
  if (q) list = list.filter(o => (o.customerName + " " + o.phone + " " + (o.productName||"")).toLowerCase().includes(q));
  document.getElementById("ordersTable").innerHTML = renderOrderTable(list);
}

window.setOrderStatus = async (id, status) => {
  try { await updateDoc(doc(db, "orders", id), { status, updatedAt: serverTimestamp() }); toast("تم تحديث الحالة"); }
  catch (e) { toast("تعذّر التحديث", "err"); }
};

window.showOrder = function (id) {
  const o = orders.find(x => x.id === id); if (!o) return;
  document.getElementById("mOrderBody").innerHTML = `
    <div class="detail-row"><b>رقم الطلب</b><span style="font-family:var(--mono)">${o.id.slice(0,12)}</span></div>
    <div class="detail-row"><b>العميل</b><span>${o.customerName}</span></div>
    <div class="detail-row"><b>الهاتف</b><span dir="ltr">${o.phone}</span></div>
    <div class="detail-row"><b>المدينة</b><span>${o.city || "—"}</span></div>
    <div class="detail-row"><b>المنتج</b><span>${o.productName || "—"}</span></div>
    <div class="detail-row"><b>الكمية</b><span>${o.quantity || 1}</span></div>
    <div class="detail-row"><b>اللون</b><span>${o.selectedColor || "—"}</span></div>
    <div class="detail-row"><b>السعر الإجمالي</b><span>${fmtDZD(o.totalPrice || 0)}</span></div>
    <div class="detail-row"><b>ملاحظات</b><span style="max-width:60%">${o.notes || "—"}</span></div>
    <div class="detail-row"><b>الحالة</b><span>${statusPill(o.status)}</span></div>
    <div class="detail-row"><b>التاريخ</b><span>${fmtDate(o.createdAt)}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px">
      <a class="btn btn-wa btn-sm" target="_blank" href="${waLink(o.phone, `مرحباً ${o.customerName}، بخصوص طلبك من REXMOTO.`)}">واتساب</a>
      <a class="btn btn-ghost btn-sm" href="tel:${o.phone}">اتصال</a>
    </div>`;
  openModal("mOrder");
};

// ═════════════════════════════════════════════════════════════
// PRODUCTS
// ═════════════════════════════════════════════════════════════
function renderProducts() {
  const q = (document.getElementById("prodSearch")?.value || "").toLowerCase();
  const cat = document.getElementById("prodCatFilter")?.value || "";
  let list = products.slice();
  if (cat) list = list.filter(p => p.category === cat);
  if (q) list = list.filter(p => (p.name + " " + (p.brand||"") + " " + (p.description||"")).toLowerCase().includes(q));

  document.getElementById("prodSub").textContent = `${list.length} منتج`;
  const grid = document.getElementById("prodGrid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h4>لا توجد منتجات</h4><p>ابدأ بإضافة أول منتج.</p><button class="btn btn-primary" style="margin-top:14px" onclick="openProductModal()">+ منتج جديد</button></div>`;
    return;
  }
  grid.innerHTML = list.map(p => {
    const st = p.status || "active";
    const stockCls = st === "out" ? "out" : (st === "low" || (p.stockQuantity && p.stockQuantity <= 3)) ? "low" : "";
    const stockText = st === "out" ? "نفد" : st === "hidden" ? "مخفي" : st === "disabled" ? "موقوف" : (p.stockQuantity != null ? p.stockQuantity + " متوفر" : "متوفر");
    return `<div class="prod-card">
      <div class="th">
        <div class="bgs">
          ${p.oldPrice && p.oldPrice > p.price ? `<span class="badge" style="background:var(--accent);color:#fff">-${Math.round((p.oldPrice-p.price)/p.oldPrice*100)}%</span>` : ""}
          ${p.isFeatured ? `<span class="badge" style="background:var(--green);color:#052">مميز</span>` : ""}
          ${st !== "active" ? `<span class="badge" style="background:var(--muted2);color:#fff">${stockText}</span>` : ""}
        </div>
        <img src="${productMainImage(p)}" alt="${p.name}">
      </div>
      <div class="bd">
        <div class="nm">${p.name}</div>
        <div class="cat">${p.brand || ""} · ${p.category || ""}</div>
        <div class="pr"><span class="p">${fmtDZ(p.price)}</span>${p.oldPrice > p.price ? `<span class="op">${fmtDZ(p.oldPrice)}</span>` : ""}</div>
        <div class="stock-p ${stockCls}">${stockText}</div>
        <div class="acts">
          <button class="iconbtn" title="تعديل" onclick="editProduct('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button>
          <button class="iconbtn wa" title="عرض في المتجر" onclick="window.open('../product.html?id=${p.id}','_blank')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg></button>
          <button class="iconbtn danger" title="حذف" onclick="deleteProduct('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
        </div>
      </div>
    </div>`;
  }).join("");
}

// ═════════════════════════════════════════════════════════════
// PRODUCT MODAL
// ═════════════════════════════════════════════════════════════
let editingProduct = null;
let pendingImages = [];
let existingImages = [];
let mainPick = null; // {kind: "e"|"p", idx} — الصورة المختارة كصورة رئيسية

// كل الصور (القديمة + الجديدة) بمعرّفات داخل مجموعتيها
function allImageRefs() {
  return [
    ...existingImages.map((img, idx) => ({ kind: "e", idx })),
    ...pendingImages.map((img, idx) => ({ kind: "p", idx }))
  ];
}
// الصورة الرئيسية الفعلية: المختارة يدوياً، وإلا الأولى
function resolveMain() {
  const refs = allImageRefs();
  if (!refs.length) return null;
  if (mainPick) {
    const groupLen = mainPick.kind === "e" ? existingImages.length : pendingImages.length;
    if (mainPick.idx < groupLen) {
      const offset = mainPick.kind === "e" ? 0 : existingImages.length;
      return refs[offset + mainPick.idx];
    }
  }
  return refs[0];
}

// ═════════════════════════════════════════════════════════════
// DYNAMIC ROWS: مميزات إضافية + ألوان مع صور
// ═════════════════════════════════════════════════════════════
let featRows = [];   // [{label, value}]
let colorRows = [];  // [{name, image}]

function escAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.addFeatRow = function (label = "", value = "") {
  if (featRows.length >= 12) { toast("الحد الأقصى 12 ميزة لكل منتج", "err"); return; }
  featRows.push({ label: String(label).slice(0, 40), value: String(value).slice(0, 60) });
  renderFeatRows();
};
window.moveFeatRow = function (i, dir) {
  const j = i + dir;
  if (j < 0 || j >= featRows.length) return;
  [featRows[i], featRows[j]] = [featRows[j], featRows[i]];
  renderFeatRows();
};
window.removeFeatRow = function (i) { featRows.splice(i, 1); renderFeatRows(); };
function renderFeatRows() {
  const box = document.getElementById("pmFeatRows");
  if (!box) return;
  if (!featRows.length) { box.innerHTML = `<div class="rows-empty">لا توجد مميزات بعد — اضغط "إضافة ميزة".</div>`; return; }
  box.innerHTML = featRows.map((r, i) => `
    <div class="feat-row">
      <input class="fr-label" placeholder="اسم الميزة (مثال: نوع البطارية)" maxlength="40" value="${escAttr(r.label)}">
      <input class="fr-value" placeholder="القيمة (مثال: 72V 20Ah)" maxlength="60" value="${escAttr(r.value)}">
      <button type="button" class="iconbtn" title="تحريك لأعلى" onclick="moveFeatRow(${i},-1)" ${i === 0 ? "disabled" : ""}>↑</button>
      <button type="button" class="iconbtn" title="تحريك لأسفل" onclick="moveFeatRow(${i},1)" ${i === featRows.length - 1 ? "disabled" : ""}>↓</button>
      <button type="button" class="iconbtn danger" title="حذف الميزة" onclick="removeFeatRow(${i})">✕</button>
    </div>`).join("");
  box.querySelectorAll(".feat-row").forEach((row, i) => {
    row.querySelector(".fr-label").addEventListener("input", e => { featRows[i].label = e.target.value; });
    row.querySelector(".fr-value").addEventListener("input", e => { featRows[i].value = e.target.value; });
  });
}

window.addColorRow = function (name = "", image = null) {
  if (colorRows.length >= 6) { toast("الحد الأقصى 6 ألوان لكل منتج", "err"); return; }
  colorRows.push({ name: String(name).slice(0, 30), image: image || null });
  renderColorRows();
};
window.removeColorRow = function (i) { colorRows.splice(i, 1); renderColorRows(); };
window.removeColorImage = function (i) { colorRows[i].image = null; renderColorRows(); };
window.onColorFile = async function (i, input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    toast("جارٍ تجهيز صورة اللون...", "info");
    const dataUrl = await compressImage(file, { maxW: 900, quality: 0.8 });
    colorRows[i].image = dataUrl;
    renderColorRows();
    toast("تمت إضافة صورة اللون");
  } catch (e) { toast(e.message || "تعذّرت إضافة الصورة", "err"); }
  input.value = "";
};
function renderColorRows() {
  const box = document.getElementById("pmColorRows");
  if (!box) return;
  if (!colorRows.length) { box.innerHTML = `<div class="rows-empty">لا توجد ألوان بعد — اضغط "إضافة لون".</div>`; return; }
  box.innerHTML = colorRows.map((c, i) => `
    <div class="color-row">
      <input class="cr-name" placeholder="اسم اللون (مثال: أحمر)" maxlength="30" value="${escAttr(c.name)}">
      <div class="cr-img">
        ${c.image
          ? `<img src="${c.image}" alt="">
             <div class="cr-img-actions">
               <button type="button" class="cr-btn" onclick="document.getElementById('cf_${i}').click()">تغيير الصورة</button>
               <button type="button" class="cr-btn danger" onclick="removeColorImage(${i})">إزالة</button>
             </div>`
          : `<button type="button" class="cr-add" onclick="document.getElementById('cf_${i}').click()">📷 صورة اللون</button>`}
        <input type="file" id="cf_${i}" accept="image/*" hidden onchange="onColorFile(${i}, this)">
      </div>
      <button type="button" class="iconbtn danger" title="حذف اللون" onclick="removeColorRow(${i})">✕</button>
    </div>`).join("");
  box.querySelectorAll(".color-row").forEach((row, i) => {
    row.querySelector(".cr-name").addEventListener("input", e => { colorRows[i].name = e.target.value; });
  });
}

window.openProductModal = function () {
  editingProduct = null; pendingImages = []; existingImages = []; mainPick = null;
  document.getElementById("pmTitle").textContent = "منتج جديد";
  document.getElementById("productForm").reset();
  document.getElementById("pmId").value = "";
  document.getElementById("pmStatus").value = "active";
  document.getElementById("pmFeatured").value = "false";
  document.getElementById("pmStock").value = 1;
  featRows = []; colorRows = [];
  addFeatRow(); addColorRow();
  renderImageList();
  openModal("mProduct");
};

window.editProduct = function (id) {
  const p = products.find(x => x.id === id); if (!p) return;
  editingProduct = p;
  pendingImages = [];
  existingImages = (p.images || []).map(i => ({ ...i }));
  const _mi = existingImages.findIndex(x => x.isMain);
  mainPick = _mi >= 0 ? { kind: "e", idx: _mi } : null;
  document.getElementById("pmTitle").textContent = "تعديل المنتج";
  document.getElementById("pmId").value = p.id;
  document.getElementById("pmName").value = p.name || "";
  document.getElementById("pmBrand").value = p.brand || "";
  document.getElementById("pmCat").value = p.category || "moto";
  document.getElementById("pmStatus").value = p.status || "active";
  document.getElementById("pmPrice").value = p.price || 0;
  document.getElementById("pmOldPrice").value = p.oldPrice || "";
  document.getElementById("pmStock").value = p.stockQuantity ?? 1;
  if (p.offerEndsAt) {
    const d = p.offerEndsAt.toDate ? p.offerEndsAt.toDate() : new Date(p.offerEndsAt);
    document.getElementById("pmOfferEnd").value = d.toISOString().slice(0,10);
  } else document.getElementById("pmOfferEnd").value = "";
  document.getElementById("pmSpeed").value = p.topSpeed || "";
  document.getElementById("pmRange").value = p.rangeKm || "";
  document.getElementById("pmMotor").value = p.motorPower || "";
  document.getElementById("pmBattery").value = p.battery || "";
  featRows = (Array.isArray(p.features) ? p.features : [])
    .filter(f => f && f.label && f.value)
    .slice(0, 12)
    .map(f => ({ label: String(f.label).slice(0, 40), value: String(f.value).slice(0, 60) }));
  if (!featRows.length) featRows.push({ label: "", value: "" });
  colorRows = (Array.isArray(p.colors) ? p.colors : [])
    .map(x => (typeof x === "string"
      ? { name: x.trim(), image: null }
      : { name: String((x && x.name) || "").trim(), image: (x && x.image) || null }))
    .filter(x => x.name)
    .slice(0, 6)
    .map(x => ({ name: x.name.slice(0, 30), image: x.image }));
  if (!colorRows.length) colorRows.push({ name: "", image: null });
  renderFeatRows();
  renderColorRows();
  document.getElementById("pmWarranty").value = p.warranty || "";
  document.getElementById("pmDesc").value = p.description || "";
  document.getElementById("pmFeatured").value = p.isFeatured ? "true" : "false";
  renderImageList();
  openModal("mProduct");
};

function renderImageList() {
  const list = document.getElementById("pmImgList");
  const mainRef = resolveMain();
  const all = [
    ...existingImages.map((img, i) => ({ type: "e", url: img.url, isMain: !!(mainRef && mainRef.kind === "e" && mainRef.idx === i), idx: i })),
    ...pendingImages.map((img, i) => ({ type: "p", url: img.dataUrl, isMain: !!(mainRef && mainRef.kind === "p" && mainRef.idx === i), idx: i }))
  ];
  if (!all.length) { list.innerHTML = '<div style="color:var(--muted);font-size:13px;grid-column:1/-1;text-align:center;padding:14px">لا توجد صور بعد</div>'; return; }
  list.innerHTML = all.map((img, i) => `
    <div class="img-item ${img.isMain ? "primary" : ""}">
      <img src="${img.url}" alt="">
      ${!img.isMain ? `<button type="button" class="set-main" onclick="setMainImage(${i})">رئيسية</button>` : ""}
      <button type="button" class="del" onclick="removeImage(${i})">✕</button>
    </div>`).join("");
}

window.setMainImage = function (i) {
  const refs = allImageRefs();
  mainPick = refs[i] || null;
  renderImageList();
};

window.removeImage = function (i) {
  const refs = allImageRefs();
  const t = refs[i];
  if (t.kind === "e") existingImages.splice(t.idx, 1);
  else pendingImages.splice(t.idx, 1);
  // تعديل مرجع الصورة الرئيسية بعد الحذف
  if (mainPick && mainPick.kind === t.kind) {
    if (mainPick.idx === t.idx) mainPick = null;
    else if (mainPick.idx > t.idx) mainPick.idx--;
  }
  renderImageList();
};

document.addEventListener("DOMContentLoaded", () => {
  const zone = document.getElementById("uploadZone");
  const input = document.getElementById("pmFiles");
  if (!zone || !input) return;
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag"));
  zone.addEventListener("drop", e => {
    e.preventDefault(); zone.classList.remove("drag");
    handleFiles(e.dataTransfer.files);
  });
  input.addEventListener("change", e => handleFiles(e.target.files));
});

async function handleFiles(files) {
  const total = pendingImages.length + existingImages.length;
  const remaining = 8 - total;
  if (remaining <= 0) { toast("الحد الأقصى 8 صور لكل منتج", "err"); return; }
  for (const file of [...files].slice(0, remaining)) {
    try {
      toast("جارٍ ضغط الصور...", "info");
      const dataUrl = await compressImage(file);
      pendingImages.push({ file, dataUrl });
    } catch (e) { toast(e.message, "err"); }
  }
  toast("تم تجهيز الصور");
  renderImageList();
}

document.getElementById("productForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("pmSave");
  btn.disabled = true; btn.textContent = "جارٍ الحفظ...";
  try {
    const finalImages = [
      ...existingImages.map(img => ({ url: img.url, isMain: false })),
      ...pendingImages.map(pi => ({ url: pi.dataUrl, isMain: false }))
    ];
    const mainRef = resolveMain();
    if (finalImages.length && mainRef) {
      const fi = mainRef.kind === "e" ? mainRef.idx : existingImages.length + mainRef.idx;
      if (fi >= 0 && fi < finalImages.length) finalImages[fi].isMain = true;
    }
    // مصغرة صغيرة للبطاقات (تُسرّع الموقع على الهواتف)
    let thumbImage = null;
    const mainImgObj = finalImages.find(i => i.isMain) || finalImages[0];
    if (mainImgObj && typeof mainImgObj.url === "string" && mainImgObj.url.startsWith("data:")) {
      thumbImage = await makeThumbFromDataUrl(mainImgObj.url);
    }
    const featuresData = featRows
      .map(r => ({ label: (r.label || "").trim().slice(0, 40), value: (r.value || "").trim().slice(0, 60) }))
      .filter(r => r.label && r.value)
      .slice(0, 12);
    const colorsData = colorRows
      .map(r => ({ name: (r.name || "").trim().slice(0, 30), image: r.image || null }))
      .filter(r => r.name)
      .slice(0, 6);

    const data = {
      name: document.getElementById("pmName").value.trim(),
      brand: document.getElementById("pmBrand").value.trim() || null,
      category: document.getElementById("pmCat").value,
      status: document.getElementById("pmStatus").value,
      price: Number(document.getElementById("pmPrice").value) || 0,
      oldPrice: document.getElementById("pmOldPrice").value ? Number(document.getElementById("pmOldPrice").value) : null,
      stockQuantity: Number(document.getElementById("pmStock").value) || 0,
      offerEndsAt: document.getElementById("pmOfferEnd").value ? new Date(document.getElementById("pmOfferEnd").value + "T23:59:59") : null,
      topSpeed: document.getElementById("pmSpeed").value ? Number(document.getElementById("pmSpeed").value) : null,
      rangeKm: document.getElementById("pmRange").value ? Number(document.getElementById("pmRange").value) : null,
      motorPower: document.getElementById("pmMotor").value ? Number(document.getElementById("pmMotor").value) : null,
      battery: document.getElementById("pmBattery").value.trim() || null,
      colors: colorsData,
      features: featuresData,
      warranty: document.getElementById("pmWarranty").value.trim() || null,
      description: document.getElementById("pmDesc").value.trim() || null,
      isFeatured: document.getElementById("pmFeatured").value === "true",
      images: finalImages,
      thumbImage,
      updatedAt: serverTimestamp()
    };

    let productId = editingProduct ? editingProduct.id : null;
    if (editingProduct) {
      await updateDoc(doc(db, "products", productId), data);
    } else {
      data.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, "products"), data);
      productId = ref.id;
    }
    closeModal("mProduct");
    toast(editingProduct ? "تم تحديث المنتج" : "تمت إضافة المنتج");
  } catch (err) {
    console.error(err);
    let m = err.message || "حدث خطأ";
    if (m.includes("document size")) m = "حجم الصور كبير — قلل عدد الصور أو استخدم صور أصغر";
    toast(m, "err");
  } finally {
    btn.disabled = false; btn.textContent = "حفظ المنتج";
  }
});

window.deleteProduct = async function (id) {
  if (!confirm("هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    toast("تم حذف المنتج");
  } catch (e) { toast("تعذّر الحذف", "err"); }
};

// توليد مصغرات للمنتجات الحالية التي لا تملكها (تحسين سرعة البطاقات)
window.generateThumbs = async function () {
  if (!confirm("سيتم توليد صورة مصغرة صغيرة لكل منتج يفتقر إليها — لتسريع تحميل البطاقات على الهواتف. متابعة؟")) return;
  let ok = 0, skip = 0;
  for (const p of products) {
    if (p.thumbImage) { skip++; continue; }
    const main = productMainImage(p);
    if (typeof main === "string" && main.startsWith("data:")) {
      try {
        const t = await makeThumbFromDataUrl(main);
        if (t) { await updateDoc(doc(db, "products", p.id), { thumbImage: t }); ok++; continue; }
      } catch (e) { /* نتخطى عند الخطأ */ }
    }
    skip++;
  }
  toast(`تم: ${ok} مصغرة جديدة — تخطي ${skip}`);
};

// ═════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═════════════════════════════════════════════════════════════
function renderTestimonials() {
  const filter = document.getElementById("testFilter")?.value || "pending";
  let list = testimonials.slice();
  if (filter) list = list.filter(t => t.status === filter);
  const el = document.getElementById("testList");
  if (!list.length) { el.innerHTML = `<div class="empty-state"><h4>لا توجد تقييمات</h4><p>ستظهر هنا تقييمات العملاء.</p></div>`; return; }
  el.innerHTML = `<div style="display:grid;gap:12px">` + list.map(t => `
    <div style="background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div><b style="font-size:15px">${t.customerName}</b>
          <div style="color:var(--muted);font-size:12px;font-family:var(--mono)">${t.productModel || "—"} · ${fmtDate(t.createdAt)}</div>
          <div style="color:var(--accent);font-size:14px;letter-spacing:2px;margin:6px 0">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</div>
        </div>
        ${statusPill(t.status)}
      </div>
      <p style="color:var(--muted);font-size:14px;margin:10px 0;line-height:1.8">${t.comment}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${t.status !== "approved" ? `<button class="btn btn-sm" style="background:var(--green);color:#032" onclick="setTestStatus('${t.id}','approved')">قبول ونشر</button>` : ""}
        ${t.status !== "rejected" ? `<button class="btn btn-sm btn-danger" onclick="setTestStatus('${t.id}','rejected')">رفض</button>` : ""}
        ${t.status !== "pending" ? `<button class="btn btn-sm btn-ghost" onclick="setTestStatus('${t.id}','pending')">إعادة للمراجعة</button>` : ""}
        <button class="btn btn-sm btn-danger" onclick="deleteTest('${t.id}')">حذف نهائي</button>
      </div>
    </div>`).join("") + `</div>`;
}

window.setTestStatus = async (id, status) => {
  try { await updateDoc(doc(db, "testimonials", id), { status, updatedAt: serverTimestamp() }); toast("تم التحديث"); }
  catch (e) { toast("خطأ", "err"); }
};
window.deleteTest = async (id) => {
  if (!confirm("حذف التقييم نهائياً؟")) return;
  try { await deleteDoc(doc(db, "testimonials", id)); toast("تم الحذف"); } catch (e) { toast("خطأ", "err"); }
};

// ═════════════════════════════════════════════════════════════
// SETTINGS
// ═════════════════════════════════════════════════════════════
async function loadSettings() {
  const snap = await getDoc(doc(db, "settings", "public"));
  if (!snap.exists()) return;
  const s = snap.data();
  const form = document.getElementById("settingsForm");
  Object.keys(s).forEach(k => {
    const el = form.elements[k];
    if (el) el.value = s[k];
  });
}

document.getElementById("settingsForm").addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("saveSettingsBtn");
  btn.disabled = true; btn.textContent = "جارٍ الحفظ...";
  try {
    const data = {};
    const form = e.target;
    ["storeName","email","phone","whatsapp","address","mapUrl","hours","facebook","instagram","pageTitle","metaDescription","accentColor"].forEach(k => {
      const el = form.elements[k];
      if (el) data[k] = el.value.trim();
    });
    data.updatedAt = serverTimestamp();
    await setDoc(doc(db, "settings", "public"), data, { merge: true });
    toast("تم حفظ الإعدادات");
  } catch (err) { toast("خطأ: " + err.message, "err"); }
  finally { btn.disabled = false; btn.textContent = "💾 حفظ الإعدادات"; }
});

// ═════════════════════════════════════════════════════════════
// MODALS
// ═════════════════════════════════════════════════════════════
window.openModal = id => document.getElementById(id).classList.add("open");
window.closeModal = id => document.getElementById(id).classList.remove("open");
document.addEventListener("click", e => {
  if (e.target.classList && e.target.classList.contains("modal")) e.target.classList.remove("open");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
});
