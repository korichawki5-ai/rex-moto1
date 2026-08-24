/* ═══════════════════════════════════════════════════════════════
   REXMOTO — Storefront Logic (home / products / product detail)
   ═══════════════════════════════════════════════════════════════ */

const RX = window.RX;

// ═════════════════════════════════════════════════════════════
// BOOT LOADER
// ═════════════════════════════════════════════════════════════
function hideBoot() {
  const b = document.getElementById("boot");
  if (b) b.classList.add("done");
}
window.addEventListener("load", () => setTimeout(hideBoot, 1200));
setTimeout(hideBoot, 2000);

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
// PRODUCT CARD RENDER
// ═════════════════════════════════════════════════════════════
function productCard(p) {
  const mainImg = RX.getProductMainImage(p);
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
      <button class="btn btn-primary" onclick="event.stopPropagation();openOrder('${p.id}')">اطلب الآن</button>
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
  const all = await RX.fetchProducts().catch(e => { console.warn(e); return []; });
  const moto = all.filter(p => p.category === "moto");
  const scooter = all.filter(p => p.category === "scooter");
  const acc = all.filter(p => ["battery", "accessory", "helmet", "part"].includes(p.category));
  const featured = all.filter(p => p.isFeatured).slice(0, 4);

  renderProductGrid(document.getElementById("featuredGrid"), featured);
  renderProductGrid(document.getElementById("motoGrid"), moto.slice(0, 4));
  renderProductGrid(document.getElementById("scooterGrid"), scooter.slice(0, 4));
  renderProductGrid(document.getElementById("accGrid"), acc.slice(0, 4));

  // Categories images (defaults from public/images)
  const catsEl = document.getElementById("catsGrid");
  if (catsEl) {
    const imgOf = (cat) => {
      const found = all.find(p => p.category === cat);
      return found ? RX.getProductMainImage(found) : `public/images/cat-${cat}.jpg`;
    };
    catsEl.innerHTML = [
      categoryCard("01", "موتور سايكل كهربائي", imgOf("moto"), "moto", "s1"),
      categoryCard("02", "طروتينات وسكوترات", imgOf("scooter"), "scooter", "s2"),
      categoryCard("03", "بطاريات وشواحن", imgOf("battery"), "battery", "s3"),
      categoryCard("04", "إكسسوارات وخوذ", imgOf("accessory"), "accessory", "s4"),
      categoryCard("05", "قطع غيار وصيانة", imgOf("part"), "part", "s5")
    ].join("");
  }

  // Testimonials
  const tests = await RX.fetchApprovedTestimonials().catch(() => []);
  renderTestimonials(tests);

  // Hero image
  const heroImg = document.querySelector("[data-hero-img]");
  if (heroImg) {
    const firstFeatured = featured[0] || moto[0] || all[0];
    if (firstFeatured) heroImg.src = RX.getProductMainImage(firstFeatured);
    else heroImg.src = "public/images/hero-moto.jpg";
  }
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
  _allProducts = await RX.fetchProducts().catch(e => { console.warn(e); return []; });
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
  // Related
  const all = await RX.fetchProducts().catch(() => []);
  const related = all.filter(x => x.id !== p.id && (x.category === p.category || x.brand === p.brand)).slice(0, 4);
  renderProductGrid(document.getElementById("relatedGrid"), related);
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
  document.getElementById("pdStats").innerHTML = stats.map(([k, v]) => `<div class="pd-stat"><span class="k">${k}</span><span class="v">${v}</span></div>`).join("");

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

  // Colors
  const colorWrap = document.getElementById("pdColors");
  if (p.colors && p.colors.length) {
    colorWrap.style.display = "";
    colorWrap.querySelector(".color-chips").innerHTML = p.colors.map((c, i) => `<button type="button" class="color-chip ${i === 0 ? "active" : ""}" data-color="${c}">${c}</button>`).join("");
    colorWrap.querySelectorAll(".color-chip").forEach(b => b.addEventListener("click", () => {
      colorWrap.querySelectorAll(".color-chip").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    }));
  } else {
    colorWrap.style.display = "none";
  }

  // Qty
  const qtyInput = document.getElementById("pdQty");
  document.getElementById("qtyMinus").addEventListener("click", () => { qtyInput.value = Math.max(1, +qtyInput.value - 1); });
  document.getElementById("qtyPlus").addEventListener("click", () => { qtyInput.value = Math.min(p.stockQuantity || 20, +qtyInput.value + 1); });

  // Order buttons
  document.getElementById("pdOrderBtn").addEventListener("click", () => openOrderFromDetail(p));
  const waBtn = document.getElementById("pdWaBtn");
  waBtn.addEventListener("click", () => {
    const s = window.RX && window.RX._settings ? window.RX._settings : null;
    const wa = (s && s.whatsapp) || window.REXMOTO_CONFIG.whatsappDefault;
    const msg = `مرحباً، أرغب بالاستفسار عن: ${p.name} — السعر: ${RX.fmtDZD(p.price)} دج`;
    window.open(RX.waLink(wa, msg), "_blank");
  });

  // Set breadcrumb
  document.title = `${p.name} — REXMOTO`;
}

window.switchPdImg = function (thumb, src) {
  document.getElementById("pdMainImg").src = src;
  document.querySelectorAll("#pdThumbs img").forEach(i => i.classList.remove("active"));
  thumb.classList.add("active");
};

function openOrderFromDetail(p) {
  const qty = +document.getElementById("pdQty").value || 1;
  const colorBtn = document.querySelector("#pdColors .color-chip.active");
  const color = colorBtn ? colorBtn.dataset.color : "";
  openOrder(p.id, { quantity: qty, selectedColor: color });
}

// ═════════════════════════════════════════════════════════════
// ORDER MODAL
// ═════════════════════════════════════════════════════════════
let _orderCtx = null;
async function openOrder(id, opts = {}) {
  const p = await RX.fetchProduct(id);
  if (!p) return RX.toast("المنتج غير متوفر", "err");
  _orderCtx = { product: p, ...opts };
  const modal = document.getElementById("orderModal");
  // Visual
  document.getElementById("mImg").src = RX.getProductMainImage(p);
  document.getElementById("mImg").alt = p.name;
  document.getElementById("mName").textContent = p.name;
  document.getElementById("mBrand").textContent = p.brand || "";
  document.getElementById("mPrice").innerHTML = RX.fmtDZD(p.price) + (RX.offerActive(p) && p.oldPrice ? `<span class="old">${RX.fmtDZ(p.oldPrice)} دج</span>` : "");
  document.getElementById("mSpecs").innerHTML = `
    ${p.topSpeed ? `<div class="mf-spec"><span class="k">السرعة</span><span class="v">${p.topSpeed} km/h</span></div>` : ""}
    ${p.rangeKm ? `<div class="mf-spec"><span class="k">المدى</span><span class="v">${p.rangeKm} km</span></div>` : ""}
    ${p.battery ? `<div class="mf-spec"><span class="k">البطارية</span><span class="v">${p.battery}</span></div>` : ""}
  `;
  // Colors
  const colorSel = document.getElementById("oColor");
  if (p.colors && p.colors.length) {
    colorSel.parentElement.style.display = "";
    colorSel.innerHTML = p.colors.map((c, i) => `<option value="${c}" ${i === 0 ? "selected" : ""}>${c}</option>`).join("");
  } else {
    colorSel.parentElement.style.display = "none";
    colorSel.innerHTML = "";
  }
  // Qty
  document.getElementById("oQty").value = opts.quantity || 1;
  if (opts.selectedColor) colorSel.value = opts.selectedColor;
  // Reset form
  ["oName", "oPhone", "oCity", "oNotes"].forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  document.getElementById("detailStep").style.display = "flex";
  document.getElementById("formStep").style.display = "none";
  document.getElementById("successStep").classList.remove("on");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

window.openOrder = openOrder;

document.addEventListener("click", e => {
  if (e.target.id === "goOrderBtn") showOrderForm();
  if (e.target.id === "backToDetail") showOrderDetail();
  if (e.target.id === "modalClose") closeAllModals();
  const modal = document.getElementById("orderModal");
  if (e.target === modal) closeAllModals();
});
function showOrderForm() {
  document.getElementById("detailStep").style.display = "none";
  document.getElementById("formStep").style.display = "flex";
  document.getElementById("successStep").classList.remove("on");
}
function showOrderDetail() {
  document.getElementById("detailStep").style.display = "flex";
  document.getElementById("formStep").style.display = "none";
}
document.addEventListener("DOMContentLoaded", () => {
  const submit = document.getElementById("submitOrderBtn");
  if (submit) submit.addEventListener("click", submitOrder);
});
async function submitOrder() {
  if (!_orderCtx) return;
  const name = document.getElementById("oName").value.trim();
  const phone = document.getElementById("oPhone").value.trim();
  const city = document.getElementById("oCity").value.trim();
  const notes = document.getElementById("oNotes").value.trim();
  const qty = +document.getElementById("oQty").value || 1;
  const color = document.getElementById("oColor").value || "";
  if (name.length < 2) return RX.toast("اكتب اسمك الكامل", "err");
  if (!/^[0-9+][0-9\s\-]{7,}$/.test(phone)) return RX.toast("رقم الهاتف غير صحيح", "err");
  const btn = document.getElementById("submitOrderBtn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> جارٍ الإرسال...';
  try {
    await RX.submitOrder({
      productId: _orderCtx.product.id,
      customerName: name,
      phone,
      city,
      quantity: qty,
      selectedColor: color,
      notes
    });
    document.getElementById("formStep").style.display = "none";
    document.getElementById("successStep").classList.add("on");
    RX.toast("تم إرسال طلبك بنجاح", "ok");
  } catch (err) {
    RX.toast(err.message || "تعذّر إرسال الطلب، حاول لاحقاً", "err");
  } finally {
    btn.disabled = false; btn.textContent = "تأكيد الطلب";
  }
}
