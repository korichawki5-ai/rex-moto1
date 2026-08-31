/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Storefront Logic (home / products / product detail)
   ═══════════════════════════════════════════════════════════════ */

const RX = window.RX;

// ═════════════════════════════════════════════════════════════
// MOBILE MENU
// ═════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const mm = document.getElementById("mobileMenu");
  if (menuBtn && mm) {
    menuBtn.addEventListener("click", () => mm.classList.toggle("open"));
    mm.querySelectorAll("a").forEach(a => a.addEventListener("click", () => mm.classList.remove("open")));
  }
  // Close modals on Esc
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAllModals();
  });
  // Init page-specific logic
  initPage();
});

function closeAllModals() {
  document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
  document.body.style.overflow = "";
}

// ═════════════════════════════════════════════════════════════
// PAGE ROUTER (detect current page)
// ═════════════════════════════════════════════════════════════
async function initPage() {
  // حماية: إن تعذّر تحميل Firebase (انقطاع إنترنت أو حجب) — أظهر الصفحة كاملة مع رسالة
  if (!RX || typeof RX.fetchProducts !== "function") {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
    const el = document.getElementById("featuredGrid") || document.getElementById("productsGrid");
    if (el) el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>⚠️ تعذّر تجهيز الموقع</h3><p>تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.</p></div>`;
    return;
  }

  const path = location.pathname;
  try {
    const settings = await RX.getSettings();
    RX.applySettings(settings);
    renderHeaderFooter(settings);
  } catch (e) {
    console.warn("Settings:", e);
  }

  if (path.endsWith("products.html") || path.includes("/products")) {
    await initProductsPage();
  } else if (path.endsWith("product.html") || path.includes("/product")) {
    await initProductDetailPage();
  } else if (path.endsWith("privacy.html")) {
    // static
  } else {
    await initHomePage();
  }
  revealOnScroll();
}

// ═════════════════════════════════════════════════════════════
// HEADER & FOOTER DYNAMIC CONTENT
// ═════════════════════════════════════════════════════════════
function renderHeaderFooter(s) {
  const wa = s.whatsapp || window.REXMOTO_CONFIG.whatsappDefault;
  const phone = s.phone || "";
  const fb = s.facebook || "";
  const ig = s.instagram || "";
  const address = s.address || "";
  const hours = s.hours || "";
  const email = s.email || "";
  const mapUrl = s.mapUrl || "";
  const storeName = s.storeName || "REXMOTO";

  // Social icons in header
  document.querySelectorAll("[data-social-header]").forEach(nav => {
    let html = "";
    if (wa) html += `<a class="wa" href="${RX.waLink(wa)}" target="_blank" rel="noopener" aria-label="واتساب"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.2c-.3.8-1.6 1.5-2.2 1.6-.6.1-1.3.2-4.1-1-3.3-1.5-5.3-5-5.5-5.3-.2-.3-1.3-1.7-1.3-3.3s.8-2.3 1.1-2.6c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5.3.7 1 2.4 1 2.6.1.2.2.4.1.6-.1.3-.2.5-.4.7l-.6.7c-.2.2-.4.4-.2.8.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.7.3.2.5.1.7-.1l1-1.1c.2-.3.4-.2.7-.1l2.5 1.2c.3.1.5.2.6.4 0 .1 0 .6-.2 1z"/></svg></a>`;
    if (fb) html += `<a class="fb" href="${fb}" target="_blank" rel="noopener" aria-label="فيسبوك"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-3h2.4V9.4c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 3h-2.2v7A10 10 0 0 0 22 12z"/></svg></a>`;
    if (ig) html += `<a class="ig" href="${ig}" target="_blank" rel="noopener" aria-label="إنستغرام"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2 0 1.8.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.5.4 1.1.4 2.3.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c0 1.2-.2 1.8-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.5.2-1.1.4-2.3.4-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2 0-1.8-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.5-.4-1.1-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c0-1.2.2-1.8.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.5-.2 1.1-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2M12 0C8.7 0 8.3 0 7.1.1 5.8.1 5 .3 4.2.6c-.8.3-1.5.7-2.2 1.4C1.3 2.7.9 3.4.6 4.2.3 5 .1 5.8.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c0 1.3.2 2.1.5 2.9.3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.6.5 2.9.5 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c1.3 0 2.1-.2 2.9-.5.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.6.5-2.9.1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c0-1.3-.2-2.1-.5-2.9-.3-.8-.7-1.5-1.4-2.2C21.3 1.3 20.6.9 19.8.6 19 .3 18.2.1 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z"/></svg></a>`;
    nav.innerHTML = html;
  });

  // WhatsApp FAB
  document.querySelectorAll("[data-wa-fab]").forEach(a => {
    if (wa) { a.href = RX.waLink(wa); a.style.display = "grid"; }
  });

  // Contact boxes
  const setText = (sel, val) => { if (val) document.querySelectorAll(sel).forEach(el => el.textContent = val); };
  setText("[data-phone]", phone);
  setText("[data-wa-number]", wa);
  setText("[data-address]", address);
  setText("[data-hours]", hours);
  setText("[data-email]", email);
  document.querySelectorAll("[data-store-name]").forEach(el => el.textContent = storeName);

  // Tel/wa links
  if (phone) document.querySelectorAll("[data-tel-link]").forEach(a => a.href = RX.telLink(phone));
  if (wa) document.querySelectorAll("[data-wa-link]").forEach(a => a.href = RX.waLink(wa));

  // Map
  if (mapUrl) {
    document.querySelectorAll("[data-map-frame]").forEach(f => f.src = mapUrl);
    document.querySelectorAll("[data-map-link]").forEach(a => a.href = mapUrl);
  }

  // Mobile social
  document.querySelectorAll("[data-mobile-social]").forEach(nav => {
    let html = "";
    if (wa) html += `<a href="${RX.waLink(wa)}" target="_blank" rel="noopener">واتساب</a>`;
    if (fb) html += `<a href="${fb}" target="_blank" rel="noopener">فيسبوك</a>`;
    if (ig) html += `<a href="${ig}" target="_blank" rel="noopener">إنستغرام</a>`;
    if (phone) html += `<a href="${RX.telLink(phone)}">اتصال</a>`;
    nav.innerHTML = html;
  });

  // Footer year
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
}

// ═════════════════════════════════════════════════════════════
// REVEAL ON SCROLL
// ═════════════════════════════════════════════════════════════
function revealOnScroll() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

// ═════════════════════════════════════════════════════════════
// HELPERS: ألوان ومميزات ديناميكية (تُضاف من لوحة الإدارة)
// ═════════════════════════════════════════════════════════════
function RXesc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// ألوان: صيغة قديمة ["الاسم"] أو صيغة جديدة [{name, image}]
function normColors(p) {
  const c = p && p.colors;
  if (!Array.isArray(c)) return [];
  return c
    .map(x => (typeof x === "string"
      ? { name: x.trim(), image: null }
      : { name: String((x && x.name) || "").trim(), image: (x && x.image) || null }))
    .filter(x => x.name)
    .slice(0, 6);
}
// مميزات مخصصة من الادمين: [{label, value}]
function normFeatures(p) {
  const f = p && p.features;
  if (!Array.isArray(f)) return [];
  return f.filter(x => x && x.label && x.value).slice(0, 12);
}

// ═════════════════════════════════════════════════════════════
// PRODUCT CARD RENDER
// ═════════════════════════════════════════════════════════════
function productCard(p) {
  const mainImg = RX.getProductThumb(p);
  const st = RX.stockLabel(p);
  const off = RX.discountPercent(p);
  const badge = off > 0
    ? `<span class="badge off">-${off}%</span>`
    : p.isNew ? `<span class="badge new">جديد</span>`
    : st.cls === "low" ? `<span class="badge low">متبقي قليل</span>`
    : st.cls === "out" ? `<span class="badge low">نفد</span>`
    : p.isFeatured ? `<span class="badge new">مميز</span>` : "";
  const oldPrice = RX.offerActive(p) && p.oldPrice ? `<span class="old-price">${RX.fmtDZ(p.oldPrice)}</span>` : "";
  const specSpeed = p.topSpeed ? `<div class="spec"><span class="k">السرعة</span><span class="v">${p.topSpeed} km/h</span></div>` : "";
  const specRange = p.rangeKm ? `<div class="spec"><span class="k">المدى</span><span class="v">${p.rangeKm} km</span></div>` : "";
  const specMotor = p.motorPower ? `<div class="spec"><span class="k">المحرك</span><span class="v">${p.motorPower}W</span></div>` : "";
  return `<article class="pcard reveal" onclick="location.href='product.html?id=${p.id}'">
    <div class="imgbox">
      ${badge}
      <span class="badge br">${p.brand || ""}</span>
      <img src="${mainImg}" alt="${p.name}" loading="lazy">
    </div>
    <div class="body">
      <div><span class="pbrand">${p.brand || ""}</span><h3>${p.name}</h3></div>
      <div class="spec-row">${specSpeed}${specRange}${specMotor}</div>
      <div class="price-row">
        <span class="price">${RX.fmtDZD(p.price)}</span>
        ${oldPrice}
        <span class="stock ${st.cls}"><i class="d"></i>${st.text}</span>
      </div>
    </div>
    <div class="actions">
      <button class="btn btn-ghost" onclick="event.stopPropagation();location.href='product.html?id=${p.id}'">عرض التفاصيل</button>
      <button class="btn btn-primary" onclick="event.stopPropagation();location.href='product.html?id=${p.id}&order=1'">اطلب الآن</button>
    </div>
  </article>`;
}

function renderProductGrid(container, products) {
  if (!container) return;
  if (!products.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <h3>لا توجد منتجات بعد</h3><p>سيتم إضافة المنتجات قريباً.</p></div>`;
    return;
  }
  container.innerHTML = products.map(productCard).join("");
  revealOnScroll();
}

// ═════════════════════════════════════════════════════════════
// CATEGORY CARD (for home)
// ═════════════════════════════════════════════════════════════
function categoryCard(num, title, img, target, spanClass) {
  const href = `products.html?cat=${encodeURIComponent(target)}`;
  return `<a class="cat ${spanClass}" href="${href}">
    <img class="cat-img" src="${img}" alt="${title}" loading="lazy">
    <div class="shade"></div>
    <div class="inner"><span class="count">${num}</span><h3>${title}</h3></div>
  </a>`;
}

// ═════════════════════════════════════════════════════════════
// HOME PAGE
// ═════════════════════════════════════════════════════════════
async function initHomePage() {
  // جلب المنتجات والتقييمات بالتوازي (تقليل زمن الانتظار)
  let loadFailed = false;
  const [all, tests] = await Promise.all([
    RX.fetchProducts().catch(e => { loadFailed = true; console.warn(e); return []; }),
    RX.fetchApprovedTestimonials().catch(() => [])
  ]);
  const moto = all.filter(p => p.category === "moto");
  const scooter = all.filter(p => p.category === "scooter");
  const acc = all.filter(p => ["battery", "accessory", "helmet", "part"].includes(p.category));
  const featured = all.filter(p => p.isFeatured).slice(0, 4);

  renderProductGrid(document.getElementById("featuredGrid"), featured);
  renderProductGrid(document.getElementById("motoGrid"), moto.slice(0, 4));
  renderProductGrid(document.getElementById("scooterGrid"), scooter.slice(0, 4));
  renderProductGrid(document.getElementById("accGrid"), acc.slice(0, 4));

  // إن فشل جلب المنتجات (انقطاع إنترنت أو عطل) — رسالة واضحة بدل شاشة فارغة
  if (loadFailed) {
    const el = document.getElementById("featuredGrid");
    if (el) el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>⚠️ تعذّر تحميل المنتجات</h3><p>تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.</p></div>`;
  }

  // 📷 صور الفئات: يضعها المدير من لوحة الإدارة (الإعدادات → صور الواجهة)
  // وإن لم يضعها تبقى الصور الجاهزة الافتراضية
  const st = (window.RX && RX._settings) || {};
  const cimgs = (st && st.catImages) || {};
  const catsEl = document.getElementById("catsGrid");
  if (catsEl) {
    catsEl.innerHTML = [
      categoryCard("01", "موتور سايكل كهربائي", cimgs.moto || "public/images/cat-moto.jpg", "moto", "s1"),
      categoryCard("02", "طروتينات وسكوترات", cimgs.scooter || "public/images/cat-scooter.jpg", "scooter", "s2"),
      categoryCard("03", "بطاريات وشواحن", cimgs.battery || "public/images/cat-battery.jpg", "battery", "s3"),
      categoryCard("04", "إكسسوارات وخوذ", cimgs.accessory || "public/images/cat-accessory.jpg", "accessory", "s4"),
      categoryCard("05", "قطع غيار وصيانة", cimgs.part || "public/images/cat-part.jpg", "part", "s5")
    ].join("");
  }

  // 📷 صورة الهيرو: من الإعدادات إن وُجدت، وإلا الصورة الجاهزة
  if (st.heroImage) {
    document.querySelectorAll("[data-hero-img]").forEach(el => { el.src = st.heroImage; });
  }

  // Testimonials (جلبت بالتوازي مع المنتجات)
  renderTestimonials(tests);
}

// ═════════════════════════════════════════════════════════════
// TESTIMONIALS
// ═════════════════════════════════════════════════════════════
function renderTestimonials(list) {
  const grid = document.getElementById("testsGrid");
  const section = document.getElementById("testimonialsSection");
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = `<div class="tempty"><h4>لا توجد تقييمات بعد</h4><p>كن أول من يشارك تجربته معنا.</p></div>`;
    return;
  }
  if (section) section.style.display = "";
  grid.innerHTML = list.map(t => `<div class="tcard">
    <div class="stars">${"★".repeat(t.rating)}${"☆".repeat(5 - t.rating)}</div>
    <p>"${t.comment}"</p>
    <div class="who">
      <div class="av">${(t.customerName || "?").charAt(0)}</div>
      <div><div class="nm">${t.customerName}</div><div class="rl">${t.productModel || "عميل REXMOTO"}</div></div>
    </div>
  </div>`).join("");
}

// Testimonial form
document.addEventListener("submit", async (e) => {
  const form = e.target.closest("#testForm");
  if (!form) return;
  e.preventDefault();
  const name = document.getElementById("tName").value.trim();
  const model = document.getElementById("tModel").value.trim();
  const text = document.getElementById("tText").value.trim();
  const hp = document.querySelector('input[name="website"]');
  if (hp && hp.value) return; // honeypot
  if (!name || !text) return RX.toast("من فضلك اكتب الاسم والرأي", "err");
  if (!tStar || tStar < 1) return RX.toast("اختر عدد النجوم", "err");
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جارٍ الإرسال...';
  try {
    await RX.submitTestimonial({ customerName: name, productModel: model, rating: tStar, comment: text });
    RX.toast("تم استلام تقييمك وسيُنشر بعد المراجعة", "ok");
    form.reset();
    document.querySelectorAll("#tStars button").forEach(b => b.classList.remove("on"));
    tStar = 0;
  } catch (err) {
    RX.toast(err.message || "حدث خطأ، حاول لاحقاً", "err");
  } finally {
    btn.disabled = false; btn.textContent = "نشر التقييم";
  }
});

let tStar = 0;
document.addEventListener("click", (e) => {
  const star = e.target.closest("#tStars button");
  if (!star) return;
  tStar = +star.dataset.v;
  document.querySelectorAll("#tStars button").forEach(b => b.classList.toggle("on", +b.dataset.v <= tStar));
});

// ═════════════════════════════════════════════════════════════
// PRODUCTS PAGE
// ═════════════════════════════════════════════════════════════
let _allProducts = [];
async function initProductsPage() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;
  grid.classList.add("skeleton-grid");
  grid.innerHTML = Array(6).fill(0).map(() => `<div class="pcard"><div class="imgbox skeleton" style="aspect-ratio:4/3"></div><div class="body"><div class="skeleton" style="height:16px;width:60%;margin-bottom:10px"></div><div class="skeleton" style="height:14px;width:90%;margin-bottom:18px"></div><div class="skeleton" style="height:24px;width:50%"></div></div></div>`).join("");
  let loadFailed = false;
  _allProducts = await RX.fetchProducts().catch(e => { loadFailed = true; console.warn(e); return []; });
  grid.classList.remove("skeleton-grid");

  // Populate brand filter
  const brands = [...new Set(_allProducts.map(p => p.brand).filter(Boolean))].sort();
  const brandSel = document.getElementById("fBrand");
  if (brandSel) {
    brandSel.innerHTML = `<option value="">كل الماركات</option>` + brands.map(b => `<option value="${b}">${b}</option>`).join("");
  }

  // URL param
  const params = new URLSearchParams(location.search);
  const initCat = params.get("cat") || "";
  const catSel = document.getElementById("fCat");
  if (catSel && initCat) catSel.value = initCat;

  ["fCat", "fBrand", "fStock", "fMin", "fMax", "fSearch"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", applyFilters);
  });

  applyFilters();
  if (loadFailed) {
    const el = document.getElementById("productsGrid");
    if (el) el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><h3>⚠️ تعذّر تحميل المنتجات</h3><p>تأكد من اتصالك بالإنترنت ثم أعد تحميل الصفحة.</p></div>`;
  }
}

function applyFilters() {
  const cat = document.getElementById("fCat")?.value || "";
  const brand = document.getElementById("fBrand")?.value || "";
  const stock = document.getElementById("fStock")?.value || "";
  const min = +(document.getElementById("fMin")?.value || 0);
  const max = +(document.getElementById("fMax")?.value || 0);
  const q = (document.getElementById("fSearch")?.value || "").trim().toLowerCase();
  let list = _allProducts.slice();
  if (cat) list = list.filter(p => p.category === cat);
  if (brand) list = list.filter(p => p.brand === brand);
  if (stock === "in") list = list.filter(p => RX.isProductAvailable(p));
  if (stock === "low") list = list.filter(p => p.stockQuantity && p.stockQuantity <= 3);
  if (min) list = list.filter(p => p.price >= min);
  if (max) list = list.filter(p => p.price <= max);
  if (q) list = list.filter(p => (p.name + " " + (p.brand || "") + " " + (p.description || "")).toLowerCase().includes(q));
  const meta = document.getElementById("resultsMeta");
  if (meta) meta.innerHTML = `<span>عرض <span class="count">${list.length}</span> منتج</span>`;
  renderProductGrid(document.getElementById("productsGrid"), list);
}

// ═════════════════════════════════════════════════════════════
// PRODUCT DETAIL PAGE
// ═════════════════════════════════════════════════════════════
let _currentProduct = null;
let _pdSelectedColor = "";
async function initProductDetailPage() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) { location.href = "products.html"; return; }
  const p = await RX.fetchProduct(id);
  if (!p || !RX.isProductVisible(p)) {
    document.querySelector(".product-detail").innerHTML = `<div class="empty-state"><h3>المنتج غير موجود</h3><p>ربما تم حذفه أو إخفاؤه.</p><a href="products.html" class="btn btn-primary" style="margin-top:20px">العودة للمنتجات</a></div>`;
    return;
  }
  _currentProduct = p;
  renderProductDetail(p);
  setupOrderPanel(p);
  // إذا جاء الزائر من زر "اطلب الآن" (بطاقة/زر) — مرّر مباشرة إلى الاستمارة
  if (params.get("order") === "1") {
    setTimeout(() => {
      const el = document.getElementById("pdOrderForm");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
  }
}

function renderProductDetail(p) {
  document.getElementById("pdName").textContent = p.name;
  document.getElementById("pdBrand").textContent = p.brand || "";
  const off = RX.discountPercent(p);
  const priceHtml = `<span class="pd-price">${RX.fmtDZD(p.price)}<span class="cur"> دج</span></span>`;
  const oldHtml = (off > 0 && p.oldPrice) ? `<span class="pd-old">${RX.fmtDZD(p.oldPrice)} دج</span><span class="pd-discount">-${off}%</span>` : "";
  document.getElementById("pdPrice").innerHTML = priceHtml + oldHtml;
  document.getElementById("pdDesc").textContent = p.description || "";

  // Stats
  const stats = [];
  if (p.topSpeed) stats.push(["السرعة القصوى", p.topSpeed + " km/h"]);
  if (p.rangeKm) stats.push(["المدى", p.rangeKm + " km"]);
  if (p.motorPower) stats.push(["قوة المحرك", p.motorPower + " W"]);
  if (p.battery) stats.push(["البطارية", p.battery]);
  if (p.warranty) stats.push(["الضمان", p.warranty]);
  normFeatures(p).forEach(f => stats.push([f.label, f.value]));
  document.getElementById("pdStats").innerHTML = stats.map(([k, v]) => `<div class="pd-stat"><span class="k">${RXesc(k)}</span><span class="v">${RXesc(v)}</span></div>`).join("");

  // Images
  const imgs = RX.getProductImages(p);
  const mainEl = document.getElementById("pdMainImg");
  const thumbsEl = document.getElementById("pdThumbs");
  if (imgs.length) {
    mainEl.src = imgs[0];
    thumbsEl.innerHTML = imgs.map((src, i) => `<img src="${src}" class="${i === 0 ? "active" : ""}" onclick="window.switchPdImg(this, '${src}')" alt="صورة ${i + 1}">`).join("");
  } else {
    mainEl.src = "public/images/placeholder.svg";
    thumbsEl.innerHTML = "";
  }

  // Colors — الضغط على لون يبدّل الصورة الرئيسية بصورته
  const colorWrap = document.getElementById("pdColors");
  const pColors = normColors(p);
  const galleryMain = imgs.length ? imgs[0] : "public/images/placeholder.svg";
  if (pColors.length) {
    colorWrap.style.display = "";
    colorWrap.querySelector(".color-chips").innerHTML = pColors.map((c, i) =>
      `<button type="button" class="color-chip ${i === 0 ? "active" : ""} ${c.image ? "has-img" : ""}" data-color="${RXesc(c.name)}" data-img="${c.image || ""}">${c.image ? `<img src="${c.image}" alt="${RXesc(c.name)}">` : ""}<span>${RXesc(c.name)}</span></button>`
    ).join("");
    colorWrap.querySelectorAll(".color-chip").forEach(b => b.addEventListener("click", () => {
      colorWrap.querySelectorAll(".color-chip").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      mainEl.src = b.dataset.img || galleryMain;
      document.querySelectorAll("#pdThumbs img").forEach(t => t.classList.remove("active"));
      // تحديث اللون المختار في استمارة الطلب
      _pdSelectedColor = b.dataset.color || "";
      updatePodColor();
    }));
  } else {
    colorWrap.style.display = "none";
  }
  // اللون الافتراضي = أول لون
  _pdSelectedColor = pColors.length ? pColors[0].name : "";

  // ملاحظة: زر "اطلب الآن" يُربط بالإرسال في setupOrderPanel (الاستمارة فوقه)
  document.title = `${p.name} — REXMOTO`;
}

window.switchPdImg = function (thumb, src) {
  document.getElementById("pdMainImg").src = src;
  document.querySelectorAll("#pdThumbs img").forEach(i => i.classList.remove("active"));
  thumb.classList.add("active");
};

// ═════════════════════════════════════════════════════════════
// ORDER FORM — مدمج في صفحة المنتج (فوق زر "اطلب الآن")
// بدون نافذة منبثقة: الاستمارة ظاهرة مباشرة في الصفحة
// ═════════════════════════════════════════════════════════════
function updatePodColor() {
  const line = document.getElementById("podColorLine");
  const val = document.getElementById("podColor");
  if (!line || !val) return;
  if (_pdSelectedColor) {
    val.textContent = _pdSelectedColor;
    line.style.display = "flex";
  } else {
    line.style.display = "none";
  }
}

function setupOrderPanel() {
  const wSel = document.getElementById("oWilaya");
  const cSel = document.getElementById("oCommune");
  if (!wSel || !cSel) return;

  // قائمة الولايات: الرقم أولاً ثم الاسم بالعربية والفرنسية
  // (69 ولاية رسمياً حسب القانون 26-06 / الجريدة الرسمية أفريل 2026)
  if (window.DZ_WILAYAS && Array.isArray(window.DZ_WILAYAS) && window.DZ_WILAYAS.length) {
    wSel.innerHTML = '<option value="">اختر الولاية بالرقم</option>' +
      window.DZ_WILAYAS.map(w => `<option value="${w[0]}">${w[0]} — ${w[1]} (${w[2]})</option>`).join("");
  } else {
    // احتياط: لو فشل تحميل ملف الولايات لأي سبب
    wSel.innerHTML = '<option value="">اختر الولاية</option><option value="غير محدد">ولاية غير مذكورة</option>';
  }

  wSel.addEventListener("change", fillPodCommunes);
  const btn = document.getElementById("pdOrderBtn");
  if (btn) btn.addEventListener("click", submitPodOrder);
  updatePodColor();
}

function fillPodCommunes() {
  const wSel = document.getElementById("oWilaya");
  const cSel = document.getElementById("oCommune");
  const w = (window.DZ_WILAYAS || []).find(x => x[0] === wSel.value);
  if (!w) {
    cSel.innerHTML = '<option value="">اختر الولاية أولاً</option>';
    cSel.disabled = true;
    return;
  }
  cSel.disabled = false;
  cSel.innerHTML = '<option value="">اختر البلدية</option>' +
    w[3].map(c => `<option value="${RXesc(c[1])}">${RXesc(c[0])} — ${RXesc(c[1])}</option>`).join("");
}

async function submitPodOrder() {
  const p = _currentProduct;
  if (!p) return;
  const name = ((document.getElementById("oName") || {}).value || "").trim();
  const phone = ((document.getElementById("oPhone") || {}).value || "").trim();
  const wSel = document.getElementById("oWilaya");
  const wCode = wSel ? wSel.value : "";
  const wInfo = (window.DZ_WILAYAS || []).find(x => x[0] === wCode);
  const cSel = document.getElementById("oCommune");
  const cFr = cSel ? cSel.value : "";
  const cInfo = wInfo ? wInfo[3].find(c => c[1] === cFr) : null;
  const notes = ((document.getElementById("oNotes") || {}).value || "").trim();
  const hp = ((document.querySelector("#pdOrderForm input[name=website]") || {}).value) || "";

  if (name.length < 3) return RX.toast("اكتب اسمك الكامل (الاسم واللقب)", "err");
  if (!/^[0-9+][0-9\s\-]{7,}$/.test(phone)) return RX.toast("رقم الهاتف غير صحيح", "err");
  if (!wCode || !wInfo) return RX.toast("اختر الولاية", "err");
  if (!cFr || !cInfo) return RX.toast("اختر البلدية", "err");

  const btn = document.getElementById("pdOrderBtn");
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جارٍ الإرسال...'; }
  try {
    await RX.submitOrder({
      productId: p.id,
      customerName: name,
      phone,
      wilayaCode: wCode,
      wilayaName: wInfo[1],
      communeName: cInfo[0],
      communeFr: cInfo[1],
      city: [wCode, wInfo[1], cInfo[1]].filter(Boolean).join(" - "),
      selectedColor: _pdSelectedColor || "",
      notes,
      quantity: 1, // الكمية ثابتة — محل دراجات وسكوترات
      website: hp
    });
    // إخفاء الحقول وإظهار رسالة النجاح مكانها (فوق زر الطلب)
    const fields = document.getElementById("podFields");
    const ok = document.getElementById("podSuccess");
    if (fields) fields.style.display = "none";
    if (ok) ok.style.display = "block";
    if (btn) { btn.disabled = true; btn.textContent = "تم إرسال الطلب ✓"; }
    RX.toast("تم إرسال طلبك بنجاح", "ok");
  } catch (err) {
    RX.toast(err.message || "تعذّر إرسال الطلب، حاول لاحقاً", "err");
    if (btn) { btn.disabled = false; btn.textContent = "اطلب الآن"; }
  }
}
