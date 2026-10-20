/* ============================================================
   ZAPLECZE™ — logika sklepu (vanilla JS, bez zależności)
   ============================================================ */
(function () {
  "use strict";

  const DATA = window.STORE_DATA;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const fmt = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: DATA.currency,
    maximumFractionDigits: 0,
  });
  const money = (v) => fmt.format(v).replace(/\u00a0/g, " ");

  const CAT_NAME = Object.fromEntries(
    DATA.categories.map((c) => [c.id, c.name])
  );

  /* ---------------- State ---------------- */
  const state = {
    category: "all",
    search: "",
    sort: "featured",
    payment: "blik",
    priceMin: null,
    priceMax: null,
    cart: loadCart(), // { [productId]: qty }
  };

  function loadCart() {
    try {
      const raw = localStorage.getItem("zaplecze-cart");
      const obj = raw ? JSON.parse(raw) : {};
      return typeof obj === "object" && obj ? obj : {};
    } catch (e) {
      return {};
    }
  }
  function saveCart() {
    try {
      localStorage.setItem("zaplecze-cart", JSON.stringify(state.cart));
    } catch (e) {}
  }

  const productById = (id) => DATA.products.find((p) => p.id === id);

  /* ---------------- Perfume volume tiers ---------------- */
  function perfumeUnitsInCart() {
    return Object.entries(state.cart).reduce((sum, [id, qty]) => {
      const p = productById(id);
      return p && p.category === "perfumy" ? sum + qty : sum;
    }, 0);
  }
  function perfumeUnitPrice(units) {
    let price = DATA.perfumeTiers[0].price;
    for (const t of DATA.perfumeTiers) if (units >= t.min) price = t.price;
    return price;
  }
  function unitPriceFor(product) {
    if (product.category === "perfumy") {
      return perfumeUnitPrice(perfumeUnitsInCart());
    }
    return product.price;
  }

  /* ---------------- Marquee ---------------- */
  (function buildMarquee() {
    const brands = [
      "Apple", "Nike", "Dyson", "JBL", "Louis Vuitton", "Dior", "Chanel",
      "Versace", "Valentino", "Prada", "YSL", "LEGO Technic", "New Balance",
      "Jean Paul Gaultier", "Emporio Armani", "Carolina Herrera",
    ];
    const html = brands
      .map((b) => `<span>${b} <b>✦</b></span>`)
      .join("");
    $("#marqueeTrack").innerHTML = html + html; // x2 dla płynnej pętli
  })();

  /* ---------------- Categories ---------------- */
  function renderCategories() {
    const grid = $("#catGrid");
    grid.innerHTML = DATA.categories
      .map((c) => {
        const count = DATA.products.filter((p) => p.category === c.id).length;
        return `
        <article class="cat-card reveal" data-cat="${c.id}" tabindex="0" role="button"
          aria-label="Kategoria ${c.name}">
          <img src="${c.image}" alt="${c.name}" loading="lazy" decoding="async" />
          <span class="cat-count">${count} szt.</span>
          <div class="cat-info">
            <h3>${c.name}</h3>
            <span class="tagline">${c.tagline}</span>
          </div>
          <span class="cat-arrow">→</span>
        </article>`;
      })
      .join("");

    $$(".cat-card", grid).forEach((el) => {
      const go = () => {
        setCategory(el.dataset.cat);
        document.getElementById("sklep").scrollIntoView({ behavior: "smooth" });
      };
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });

    $("#footerCats").innerHTML = DATA.categories
      .map(
        (c) =>
          `<li><a href="#sklep" data-cat-link="${c.id}">${c.name}</a></li>`
      )
      .join("");
    $$("[data-cat-link]").forEach((a) =>
      a.addEventListener("click", () => setCategory(a.dataset.catLink))
    );
  }

  /* ---------------- Filters / chips ---------------- */
  function renderChips() {
    const chips = [
      { id: "all", label: "Wszystko" },
      ...DATA.categories.map((c) => ({ id: c.id, label: c.name })),
    ];
    $("#filterChips").innerHTML = chips
      .map(
        (c) =>
          `<button class="chip ${state.category === c.id ? "active" : ""}"
            data-chip="${c.id}" role="tab" aria-selected="${state.category === c.id}">${c.label}</button>`
      )
      .join("");
    $$("[data-chip]").forEach((b) =>
      b.addEventListener("click", () => setCategory(b.dataset.chip))
    );
  }

  function setCategory(id) {
    state.category = id;
    renderChips();
    renderGrid();
  }

  /* ---------------- Grid ---------------- */
  function visibleProducts() {
    let list = DATA.products.slice();
    if (state.category !== "all")
      list = list.filter((p) => p.category === state.category);
    if (state.search.trim()) {
      const q = state.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          CAT_NAME[p.category].toLowerCase().includes(q)
      );
    }
    if (state.priceMin != null)
      list = list.filter((p) => p.price >= state.priceMin);
    if (state.priceMax != null)
      list = list.filter((p) => p.price <= state.priceMax);
    const disc = (p) => 1 - p.price / p.regular;
    switch (state.sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "discount":
        list.sort((a, b) => disc(b) - disc(a));
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name, "pl"));
        break;
    }
    return list;
  }

  function renderGrid() {
    const list = visibleProducts();
    const grid = $("#productGrid");
    const plural = (n) => {
      if (n === 1) return "produkt";
      const d = n % 10,
        h = n % 100;
      if (d >= 2 && d <= 4 && !(h >= 12 && h <= 14)) return "produkty";
      return "produktów";
    };
    $("#resultsCount").innerHTML = `Znaleziono: <b>${list.length}</b> ${plural(
      list.length
    )}${
      state.category !== "all"
        ? ` w kategorii <b>${CAT_NAME[state.category]}</b>`
        : ""
    }`;

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>Brak wyników 🔍</h3>
          <p>Nie znaleźliśmy nic pod „${state.search}”. Spróbuj innej nazwy lub wyczyść filtry.</p>
          <p><button class="btn btn-ghost btn-sm" id="clearFilters">Wyczyść filtry</button></p>
        </div>`;
      $("#clearFilters").addEventListener("click", () => {
        state.search = "";
        state.priceMin = null;
        state.priceMax = null;
        $("#searchInput").value = "";
        $("#searchInputMobile").value = "";
        if ($("#priceMin")) $("#priceMin").value = "";
        if ($("#priceMax")) $("#priceMax").value = "";
        setCategory("all");
      });
      return;
    }

    grid.innerHTML = list
      .map((p, i) => {
        const off = Math.round((1 - p.price / p.regular) * 100);
        return `
        <article class="p-card" style="--d:${Math.min(i, 11) * 45}ms" data-id="${p.id}">
          <div class="p-media"
               aria-label="Zobacz ${p.name}">
            ${p.badge ? `<span class="p-badge">${p.badge}</span>` : ""}
            <span class="p-discount">-${off}%</span>
            <img src="${p.images[0]}" alt="${p.name}" loading="lazy" decoding="async" />
          </div>
          <div class="p-body">
            <span class="p-cat">${CAT_NAME[p.category]} · ${p.brand}</span>
            <h3 class="p-name">${p.name}</h3>
            <div class="p-price-row">
              <span class="p-price">${money(p.price)}</span>
              <s class="p-regular">${money(p.regular)}</s>
            </div>
            <button class="btn btn-sm btn-block p-add" data-add="${p.id}">
              Dodaj do koszyka
            </button>
          </div>
        </article>`;
      })
      .join("");

    $$("[data-add]", grid).forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        addToCart(b.dataset.add, 1);
      })
    );
  }

  /* ---------------- Reviews ---------------- */
  function renderReviews() {
    $("#reviewGrid").innerHTML = DATA.reviews
      .map(
        (r) => `
        <article class="review-card">
          <div class="review-img"><img src="${r.image}" alt="Opinia klienta — zrzut wiadomości" loading="lazy" decoding="async" /></div>
          <div class="review-body">
            <span class="stars" aria-label="${r.stars} na 5 gwiazdek">${"★".repeat(r.stars)}</span>
            <p class="review-quote">„${r.quote}”</p>
            <span class="review-author">${r.author} <span class="verified">✓ ZWERYFIKOWANE</span></span>
          </div>
        </article>`
      )
      .join("");
  }

  /* ---------------- Payments section ---------------- */
  function renderPayments() {
    const icons = { blik: "⚡", crypto: "₿", cod: "📦" };
    const extras = {
      blik: { txt: "BEZ DOPŁAT", warn: false },
      crypto: { txt: "+10% DO ZAMÓWIENIA", warn: true },
      cod: { txt: "+30 ZŁ DO ZAMÓWIENIA", warn: true },
    };
    $("#payMethods").innerHTML = DATA.payments.methods
      .map(
        (m) => `
        <div class="pay-card">
          <span class="pay-icon">${icons[m.id]}</span>
          <h3>${m.name}</h3>
          <p>${m.note}</p>
          <span class="pay-extra ${extras[m.id].warn ? "warn" : ""}">${extras[m.id].txt}</span>
        </div>`
      )
      .join("");
    $("#rulesList").innerHTML = DATA.payments.rules
      .map((r) => `<li><span>${r}</span></li>`)
      .join("");
  }

  /* ---------------- Cart ---------------- */
  function cartEntries() {
    return Object.entries(state.cart)
      .map(([id, qty]) => ({ product: productById(id), qty }))
      .filter((e) => e.product && e.qty > 0);
  }
  function cartCount() {
    return cartEntries().reduce((s, e) => s + e.qty, 0);
  }

  function addToCart(id, qty) {
    state.cart[id] = (state.cart[id] || 0) + qty;
    saveCart();
    renderCart();
    const p = productById(id);
    toast(`${p.name} — dodano do koszyka`);
    bumpCart();
  }
  function setQty(id, qty) {
    if (qty <= 0) delete state.cart[id];
    else state.cart[id] = qty;
    saveCart();
    renderCart();
  }

  function bumpCart() {
    const c = $("#cartCount");
    c.classList.remove("show");
    void c.offsetWidth;
    c.classList.add("show");
  }

  function cartTotals() {
    const entries = cartEntries();
    const subtotal = entries.reduce(
      (s, e) => s + unitPriceFor(e.product) * e.qty,
      0
    );
    const method = DATA.payments.methods.find((m) => m.id === state.payment);
    let extra = 0;
    if (method && method.extra.type === "percent")
      extra = Math.round((subtotal * method.extra.value) / 100);
    if (method && method.extra.type === "flat") extra = method.extra.value;
    return { subtotal, extra, total: subtotal + extra, method };
  }

  function renderCart() {
    const entries = cartEntries();
    const count = cartCount();

    $("#cartCount").textContent = count;
    $("#cartCount").classList.toggle("show", count > 0);
    $("#bbCount").textContent = count;
    $("#bbCount").classList.toggle("show", count > 0);

    const box = $("#cartItems");
    if (!entries.length) {
      box.innerHTML = `
        <div class="cart-empty">
          <span class="big">🛒</span>
          <p>Twój koszyk jest pusty.<br />Dodaj coś z dropu!</p>
          <button class="btn btn-sm" id="goShop">Przejdź do sklepu</button>
        </div>`;
      $("#goShop").addEventListener("click", () => {
        closeCart();
        document.getElementById("sklep").scrollIntoView({ behavior: "smooth" });
      });
      $("#cartFoot").style.display = "none";
      const btn0 = $("#checkoutBtn");
      if (btn0) {
        btn0.classList.add("btn-disabled");
        btn0.setAttribute("aria-disabled", "true");
      }
      return;
    }
    $("#cartFoot").style.display = "";

    const perfUnits = perfumeUnitsInCart();
    const perfPrice = perfumeUnitPrice(perfUnits);

    box.innerHTML = entries
      .map(({ product: p, qty }) => {
        const unit = unitPriceFor(p);
        const isPerf = p.category === "perfumy";
        return `
        <div class="cart-item">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
          <div>
            <div class="ci-name">${p.name}</div>
            <div class="ci-unit">
              ${money(unit)} / szt.${isPerf ? ` <s>${money(p.regular)}</s>` : ""}
            </div>
            <div class="qty" data-qtybox="${p.id}">
              <button data-dec="${p.id}" aria-label="Zmniejsz ilość">−</button>
              <span>${qty}</span>
              <button data-inc="${p.id}" aria-label="Zwiększ ilość">+</button>
            </div>
          </div>
          <div class="ci-right">
            <button class="ci-remove" data-del="${p.id}" aria-label="Usuń z koszyka">🗑</button>
            <span class="ci-price">${money(unit * qty)}</span>
          </div>
        </div>`;
      })
      .join("");

    $$("[data-inc]", box).forEach((b) =>
      b.addEventListener("click", () => setQty(b.dataset.inc, state.cart[b.dataset.inc] + 1))
    );
    $$("[data-dec]", box).forEach((b) =>
      b.addEventListener("click", () => setQty(b.dataset.dec, state.cart[b.dataset.dec] - 1))
    );
    $$("[data-del]", box).forEach((b) =>
      b.addEventListener("click", () => setQty(b.dataset.del, 0))
    );

    /* payment options */
    $("#payOptions").innerHTML = DATA.payments.methods
      .map(
        (m) => `
        <label class="pay-option ${state.payment === m.id ? "checked" : ""}">
          <input type="radio" name="pay" value="${m.id}" ${state.payment === m.id ? "checked" : ""} />
          ${m.cartLabel}
        </label>`
      )
      .join("");
    $$('#payOptions input[name="pay"]').forEach((r) =>
      r.addEventListener("change", () => {
        state.payment = r.value;
        renderCart();
      })
    );

    /* totals */
    const t = cartTotals();
    const rows = [`<div class="row"><span>Wartość produktów</span><span>${money(t.subtotal)}</span></div>`];
    if (t.extra > 0)
      rows.push(
        `<div class="row"><span>${t.method.cartLabel}</span><span>+${money(t.extra)}</span></div>`
      );
    rows.push(
      `<div class="row grand"><span>Razem</span><b>${money(t.total)}</b></div>`
    );
    $("#cartTotals").innerHTML = rows.join("");

    const tierNote = box.querySelector(".tier-note");
    if (tierNote) tierNote.remove();
    if (perfUnits >= 5) {
      const note = document.createElement("div");
      note.className = "tier-note";
      note.textContent =
        perfUnits >= 10
          ? `🎉 Masz ${perfUnits} szt. perfum — cena 110 zł/szt. Przy 10+ możliwa dalsza negocjacja na priv.`
          : `🎉 Masz ${perfUnits} szt. perfum — rabat ilościowy: ${perfPrice} zł/szt.`;
      $("#cartItems").appendChild(note);
    }

    updateCheckoutLink();
  }

  /* ---------------- Cart open/close ---------------- */
  function openCart() {
    $("#cartDrawer").classList.add("open");
    maybeAskGeo();
    $("#cartDrawer").setAttribute("aria-hidden", "false");
    $("#overlay").classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    $("#cartDrawer").classList.remove("open");
    $("#cartDrawer").setAttribute("aria-hidden", "true");
    $("#overlay").classList.remove("show");
    document.body.style.overflow = "";
  }

  /* ---------------- Product modal ---------------- */
  let modalProduct = null;
  /* ---------------- Ostatnio oglądane ---------------- */
  const RECENT_KEY = "zaplecze-recent";
  function recentGet() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function recentAdd(id) {
    let r = recentGet().filter((x) => x !== id);
    r.unshift(id);
    r = r.slice(0, 8);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(r));
    } catch (e) {
      /* tryb prywatny */
    }
    renderRecent();
  }
  function renderRecent() {
    const wrap = $("#recentWrap");
    if (!wrap) return;
    const items = recentGet().map(productById).filter(Boolean);
    wrap.hidden = items.length === 0;
    if (!items.length) return;
    $("#recentStrip").innerHTML = items
      .map(
        (p) => `<button type="button" class="recent-card" data-recent="${p.id}">
          <img src="${p.images[0]}" alt="" loading="lazy" />
          <span class="rc-name">${p.name}</span>
          <span class="rc-price">${money(p.price)}</span>
        </button>`
      )
      .join("");
    $$("[data-recent]", $("#recentStrip")).forEach((b) =>
      b.addEventListener("click", () => openModal(b.dataset.recent))
    );
  }

  /* ---------------- Modal informacyjny (Jak kupić / Opinie / Płatności) --
     Sekcje zostają na dole strony, ale treść jest dostępna jednym
     kliknięciem z hero — bez scrollowania i bez hamburgera. */
  const INFO_SECTIONS = { jak: "#jak-kupic", opinie: "#opinie", platnosci: "#platnosc" };
  function openInfoModal(key) {
    const sec = $(INFO_SECTIONS[key]);
    if (!sec) return;
    const src = sec.querySelector(".container") || sec;
    const body = $("#infoBody");
    body.innerHTML = src.innerHTML;
    /* unikamy zduplikowanych id i wymuszamy widoczność animacji reveal */
    body.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    body.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    body.scrollTop = 0;
    $("#infoModal").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeInfoModal() {
    const m = $("#infoModal");
    if (!m) return;
    m.classList.remove("open");
    if (!$("#productModal").classList.contains("open"))
      document.body.style.overflow = "";
  }

  /* ---------------- Auto-fit nagłówka hero ----------------
     Mierzymy realną szerokość wierszy i ściągamy rozmiar, dopóki
     najdłuższe słowo mieści się w kolumnie tekstu (działa z każdym
     fontem i każdą szerokością ekranu — także po dociągnięciu fontów). */
  function fitHeroTitle() {
    const h1 = $(".hero h1");
    if (!h1) return;
    h1.style.fontSize = "";
    let guard = 0;
    while (
      h1.scrollWidth > h1.clientWidth + 1 &&
      guard < 40
    ) {
      const cur = parseFloat(getComputedStyle(h1).fontSize) || 68;
      if (cur <= 26) break;
      h1.style.fontSize = cur - 2 + "px";
      guard++;
    }
  }

  /* ---------------- Animowane liczniki hero ---------------- */
  function animateStats() {
    if (!("requestAnimationFrame" in window)) return;
    $$(".hero-stats .num").forEach((el) => {
      const m = el.textContent.trim().match(/^(\d+(?:[.,]\d+)?)(.*)$/);
      if (!m) return;
      const target = parseFloat(m[1].replace(",", "."));
      const suffix = m[2];
      const dec = (m[1].split(/[.,]/)[1] || "").length;
      const dur = 1400;
      let t0 = null;
      const step = (ts) => {
        if (t0 == null) t0 = ts;
        const k = Math.min(1, (ts - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        el.textContent = (target * e).toFixed(dec) + suffix;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  let modalImgIndex = 0;
  let modalQty = 1;

  function openModal(id) {
    modalProduct = productById(id);
    if (!modalProduct) return;
    modalImgIndex = 0;
    modalQty = 1;
    recentAdd(id);
    renderModal();
    $("#productModal").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    $("#productModal").classList.remove("open");
    if (!$("#cartDrawer").classList.contains("open"))
      document.body.style.overflow = "";
  }

  function galleryStep(dir) {
    if (!modalProduct || modalProduct.images.length < 2) return;
    const n = modalProduct.images.length;
    modalImgIndex = (modalImgIndex + dir + n) % n;
    renderModal();
  }

  function renderModal() {
    const p = modalProduct;
    const off = Math.round((1 - p.price / p.regular) * 100);
    const save = p.regular - p.price;
    $("#modalMainImg").src = p.images[modalImgIndex];
    $("#modalMainImg").alt = p.name;
    $("#modalMainImg").classList.remove("zoom");
    $("#modalMainImg").style.transformOrigin = "";
    const hint = $("#galleryHint");
    if (hint) {
      hint.hidden = false;
      hint.textContent =
        p.images.length > 1
          ? "Strzałki ‹ › / przeciągnięcie = kolejne zdjęcie · kliknij zdjęcie = przybliżenie"
          : "👆 Kliknij zdjęcie, aby przybliżyć";
    }
    const cnt = $("#galCount");
    if (cnt) {
      cnt.hidden = p.images.length < 2;
      cnt.textContent = `${modalImgIndex + 1} / ${p.images.length}`;
    }
    const gPrev = $("#galPrev");
    const gNext = $("#galNext");
    if (gPrev) gPrev.hidden = p.images.length < 2;
    if (gNext) gNext.hidden = p.images.length < 2;

    $("#modalThumbs").innerHTML =
      p.images.length > 1
        ? p.images
            .map(
              (img, i) =>
                `<button class="${i === modalImgIndex ? "active" : ""}" data-thumb="${i}" aria-label="Zdjęcie ${i + 1}">
                   <img src="${img}" alt="" loading="lazy" />
                 </button>`
            )
            .join("")
        : "";
    $$("[data-thumb]", $("#modalThumbs")).forEach((b) =>
      b.addEventListener("click", () => {
        modalImgIndex = +b.dataset.thumb;
        renderModal();
      })
    );

    $("#modalInfo").innerHTML = `
      <span class="p-cat">${CAT_NAME[p.category]} · ${p.brand}</span>
      <h2>${p.name}</h2>
      <div class="modal-price-row">
        <span class="modal-price">${money(p.price)}</span>
        <s class="modal-regular">${money(p.regular)}</s>
        <span class="modal-save">OSZCZĘDZASZ ${money(save)} (-${off}%)</span>
      </div>
      <p class="modal-desc">${p.desc}</p>
      <ul class="modal-meta">
        ${p.meta.map((m) => `<li>${m}</li>`).join("")}
      </ul>
      <div class="modal-actions">
        <div class="qty">
          <button id="mQtyDec" aria-label="Zmniejsz ilość">−</button>
          <span id="mQtyVal">${modalQty}</span>
          <button id="mQtyInc" aria-label="Zwiększ ilość">+</button>
        </div>
        <button class="btn" id="mAdd" style="flex:1">Dodaj do koszyka — ${money(p.price * modalQty)}</button>
      </div>
      <p class="modal-pay-note">
        Płatności: <b>BLIK/PSC</b> · <b>krypto (+10%)</b> · <b>pobranie InPost (+30 zł)</b>.
        ${p.category === "perfumy" ? "Perfumy: 5 szt. = 130 zł/szt., 10 szt. = 110 zł/szt." : "Wysyłka do 24 h od potwierdzenia płatności."}
      </p>`;

    $("#mQtyDec").addEventListener("click", () => {
      modalQty = Math.max(1, modalQty - 1);
      renderModal();
    });
    $("#mQtyInc").addEventListener("click", () => {
      modalQty = Math.min(99, modalQty + 1);
      renderModal();
    });
    $("#mAdd").addEventListener("click", () => {
      addToCart(p.id, modalQty);
      closeModal();
      openCart();
    });
  }

  /* ---------------- Toasts ---------------- */
  function toast(msg) {
    const wrap = $("#toastWrap");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="tick">✓</span><span>${msg}</span>`;
    wrap.appendChild(el);
    setTimeout(() => {
      el.classList.add("hide");
      setTimeout(() => el.remove(), 350);
    }, 2600);
  }

  /* ---------------- Dane do zamówienia (formularz w koszyku) -------- */
  const ORDER_KEY = "zaplecze-order";
  function loadOrder() {
    try {
      return JSON.parse(localStorage.getItem(ORDER_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveOrder(patch) {
    const o = Object.assign(loadOrder(), patch);
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(o));
    } catch (e) {
      /* prywatny tryb przeglądarki itp. */
    }
    return o;
  }

  /* ---------------- Checkout (Telegram) ----------------
     Strona jest w budowie — zamówienie domykamy na priv via Telegram.
     Link t.me/Xinekx?text=… otwiera CZAT z @Xinekx z gotowym szkicem
     wiadomości w polu do pisania (oficjalny draft_text deep-link). */
  function buildOrderMessage(entries, t) {
    /* tylko konkrety: pozycje, płatność, suma, dane do wysyłki */
    const lines = entries.map(({ product: p, qty }) => `• ${qty}× ${p.name}`);
    const o = loadOrder();
    const info = [];
    if (o.name && o.name.trim()) info.push(`Imię/nick: ${o.name.trim()}`);
    if (o.phone && o.phone.trim()) info.push(`Telefon: ${o.phone.trim()}`);
    const ship = o.ship || "Paczkomat InPost";
    info.push(
      o.shipDetails && o.shipDetails.trim()
        ? `Dostawa: ${ship} — ${o.shipDetails.trim()}`
        : `Dostawa: ${ship}`
    );
    if (o.notes && o.notes.trim()) info.push(`Uwagi: ${o.notes.trim()}`);
    return (
      `Cześć! Zamówienie (Zaplecze Resellera):\n\n` +
      lines.join("\n") +
      `\n\nPłatność: ${t.method.cartLabel}\n` +
      `Razem: ${t.total} zł\n\n` +
      info.join("\n")
    );
  }

  function updateCheckoutLink() {
    const entries = cartEntries();
    const btn = $("#checkoutBtn");
    if (!btn) return;
    if (!entries.length) {
      btn.classList.add("btn-disabled");
      btn.setAttribute("aria-disabled", "true");
      return;
    }
    btn.classList.remove("btn-disabled");
    btn.removeAttribute("aria-disabled");
    const t = cartTotals();
    const msg = buildOrderMessage(entries, t);
    btn.href = "https://t.me/Xinekx?text=" + encodeURIComponent(msg);
  }

  function copyText(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(
        () => toast("Skopiowane do schowka ✅"),
        () => toast("Schowek zablokowany — zaznacz treść i skopiuj ręcznie ✂️")
      );
      return;
    }
    /* stary fallback: ukryty textarea + execCommand */
    try {
      const ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      toast(ok ? "Skopiowane do schowka ✅" : "Skopiuj treść ręcznie ✂️");
    } catch (e) {
      toast("Skopiuj treść ręcznie ✂️");
    }
  }

  /* Zapasowa ścieżka, gdy Telegram się nie otworzy (brak aplikacji,
     blokada popupów, sam login w przeglądarce). Otwieramy ręcznie
     albo automatycznie, gdy strona została widoczna po kliknięciu
     „Zamów przez Telegram" — czyli nic się nie uruchomiło. */
  function openCheckoutModal() {
    const entries = cartEntries();
    $("#cmText").value = entries.length
      ? buildOrderMessage(entries, cartTotals())
      : "(koszyk jest pusty)";
    $("#checkoutModal").classList.add("open");
  }
  function closeCheckoutModal() {
    const m = $("#checkoutModal");
    if (m) m.classList.remove("open");
  }
  function checkoutNotice() {
    const entries = cartEntries();
    if (entries.length) {
      const msg = buildOrderMessage(entries, cartTotals());
      // kopia do schowka jako zapas, gdyby starszy klient zignorował ?text=
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).catch(() => {});
      }
    }
    toast("Otwieram czat @Xinekx z gotową treścią — kliknij Wyślij 📩 (treść masz też w schowku)");
  }

  /* ---------------- Geolokalizacja — najbliższa okolica (100% lokalnie) --
     Współrzędne z GPS porównujemy wyłącznie w przeglądarce z listą
     window.PL_CITIES (haversine). Nic nie wychodzi na zewnątrz. */
  const GEO_ASKED = "zaplecze-geo-asked";
  const GEO_CITY = "zaplecze-geo-city";

  function nearestCity(lat, lon) {
    let best = null;
    let bestD = Infinity;
    const rad = Math.PI / 180;
    (window.PL_CITIES || []).forEach((c) => {
      const dLat = (c[2] - lat) * rad;
      const dLon = (c[3] - lon) * rad;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * rad) * Math.cos(c[2] * rad) * Math.sin(dLon / 2) ** 2;
      const dist = 2 * 6371 * Math.asin(Math.sqrt(a));
      if (dist < bestD) {
        bestD = dist;
        best = c;
      }
    });
    return best ? { name: best[0], voiv: best[1], km: Math.round(bestD) } : null;
  }

  function savedCity() {
    try {
      return JSON.parse(localStorage.getItem(GEO_CITY)) || null;
    } catch (e) {
      return null;
    }
  }

  function renderGeoChip() {
    /* v27: chip zniknął — został jeden rząd miasto+przycisk;
       przycisk GPS chowamy, gdy miasto jest już znane */
    const retry = $("#geoRetry");
    if (retry) retry.hidden = !!savedCity();
  }

  function setGeoStatus(msg, isErr) {
    const st = $("#geoStatus");
    if (!st) return;
    st.hidden = !msg;
    st.textContent = msg || "";
    st.classList.toggle("err", !!isErr);
  }

  function geoFallback(msg) {
    toast(msg);
    setGeoStatus(msg);
    renderGeoChip();
  }

  /* Czy przeglądarka w ogóle może zapytać o geolokalizację?
     W ramce podglądu (iframe bez allow="geolocation") Permissions-Policy
     blokuje API i prompt NIGDY się nie pokaże — stąd „natychmiastowe
     odrzucenie". Wykrywamy to i prosimy o wpisanie miasta ręcznie. */
  function geoPolicyBlocked() {
    try {
      if (
        document.featurePolicy &&
        typeof document.featurePolicy.allowsFeature === "function"
      )
        return !document.featurePolicy.allowsFeature("geolocation");
    } catch (e) {
      /* brak wsparcia featurePolicy — próbujemy dalej */
    }
    return false;
  }

  function detectGeo() {
    if (!("geolocation" in navigator) || !navigator.geolocation.getCurrentPosition) {
      geoFallback("Ta przeglądarka nie wspiera lokalizacji — wpisz miasto i wyszukaj paczkomat 🔎");
      return;
    }
    if (geoPolicyBlocked()) {
      geoFallback(
        window.self !== window.top
          ? "Strona działa w ramce podglądu, która blokuje pytanie o lokalizację — wpisz miasto i wyszukaj paczkomat 🔎"
          : "Przeglądarka blokuje pytanie o lokalizację — wpisz miasto i wyszukaj paczkomat 🔎"
      );
      return;
    }
    toast("Pytam przeglądarkę o lokalizację… 📍");
    const onOk = (pos) => {
      const hit = nearestCity(pos.coords.latitude, pos.coords.longitude);
      if (!hit) {
        geoFallback("Nie udało się dopasować okolicy 🤔 — wpisz miasto ręcznie 🔎");
        return;
      }
      try {
        localStorage.setItem(GEO_CITY, JSON.stringify(hit));
      } catch (e) {
        /* tryb prywatny — działamy dalej bez zapisu */
      }
      const inp = $("#geoCityInput");
      if (inp && !inp.value.trim()) inp.value = hit.name;
      renderGeoChip();
      toast(`Twoja okolica: ${hit.name} (${hit.voiv}) 📍 — szukam paczkomatów…`);
      searchLockers(hit.name);
    };
    const onErr = (err, wasRetry) => {
      if (err && err.code === 1) {
        geoFallback(
          "Brak zgody na lokalizację ✋ Sprawdź uprawnienia strony (ikona przy adresie → Lokalizacja) albo po prostu wpisz miasto 🔎"
        );
        return;
      }
      /* timeout / niedokładny GPS — jedna próba z pełną dokładnością */
      if (!wasRetry && err && (err.code === 2 || err.code === 3)) {
        navigator.geolocation.getCurrentPosition(
          onOk,
          (e2) => onErr(e2, true),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
        return;
      }
      geoFallback("Nie udało się pobrać lokalizacji 📡 — wpisz miasto i wyszukaj paczkomat 🔎");
    };
    navigator.geolocation.getCurrentPosition(onOk, (e) => onErr(e, false), {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  }

  /* ---------------- Wyszukiwarka paczkomatów ----------------
     MAPA = iframe Google Maps — działa od razu, bez bibliotek i API.
     LISTA punktów (klik = adres SAM wpada do zamówienia) = baza
     OpenStreetMap, ładowana w tle; jak nie pyknie, mapa i tak jest.
     Na zewnątrz idzie tylko nazwa miasta — współrzędne GPS zostają
     na urządzeniu. */
  let lastPts = [];
  let lastCity = "";
  let lastCenter = null;

  function kmFrom(el, c) {
    if (!c) return null;
    const rad = Math.PI / 180;
    const dLat = (el.lat - c.lat) * rad;
    const dLon = (el.lon - c.lon) * rad;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(c.lat * rad) * Math.cos(el.lat * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  function kmTxt(km) {
    if (km == null) return "";
    const v = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
    return ` · ~${String(v).replace(".", ",")} km od centrum`;
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function pointLabel(el, city) {
    const t = el.tags || {};
    const street = [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(" ");
    const post = t["addr:postcode"] ? `${t["addr:postcode"]} ` : "";
    const where = street || t.name || "";
    return `Paczkomat${where ? " — " + where : ""}, ${post}${city}`;
  }

  function fillPoint(el, city) {
    const label = pointLabel(el, city);
    const det = $("#ofShipDetails");
    if (det) {
      det.value = label;
      saveOrder({ shipDetails: label });
      updateCheckoutLink();
    }
    renderGeoChip();
    const panel = $("#geoMapPanel");
    if (panel) panel.hidden = true;
    setGeoStatus("✅ Paczkomat w zamówieniu: " + label + " — resztę ustalimy na priv");
    toast("Paczkomat wstawiony do zamówienia ✅");
  }

  function renderLockersList(pts, city) {
    const box = $("#geoPointList");
    if (!box) return;
    if (!pts.length) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    box.innerHTML =
      `<span class="geo-list-h">Kliknij paczkomat — adres wpadnie do zamówienia:</span>` +
      pts
        .slice(0, 8)
        .map(
          (el, i) =>
            `<button type="button" class="geo-list-item" data-pt="${i}">📦 ${escapeHtml(pointLabel(el, city))}${escapeHtml(kmTxt(kmFrom(el, lastCenter)))}</button>`
        )
        .join("");
    $$("[data-pt]", box).forEach((b) =>
      b.addEventListener("click", () => fillPoint(lastPts[+b.dataset.pt], lastCity))
    );
  }

  function normalizeCity(str) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s,.-]+$/g, "")
      .trim();
  }
  function localCityLookup(city) {
    const n = normalizeCity(city);
    const hit = (window.PL_CITIES || []).find((c) => normalizeCity(c[0]) === n);
    if (!hit) return null;
    return {
      lat: hit[2],
      lon: hit[3],
      name: hit[0],
      bbox: [hit[2] - 0.07, hit[2] + 0.07, hit[3] - 0.11, hit[3] + 0.11],
    };
  }

  async function geocodeCity(city) {
    const gRes = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pl&q=${encodeURIComponent(city + ", Polska")}`,
      { headers: { Accept: "application/json" } }
    );
    const gj = await gRes.json();
    if (!gj || !gj.length) return null;
    const g0 = gj[0];
    const [s, n, w, e] = (g0.boundingbox || []).map(Number);
    return { lat: +g0.lat, lon: +g0.lon, name: g0.name || city, bbox: [s, n, w, e] };
  }

  const OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ];

  async function fetchLockerPoints(geo) {
    const cl = 0.09;
    const bs = Math.max(geo.bbox[0], geo.lat - cl);
    const bn = Math.min(geo.bbox[1], geo.lat + cl);
    const bw = Math.max(geo.bbox[2], geo.lon - cl * 1.6);
    const be = Math.min(geo.bbox[3], geo.lon + cl * 1.6);
    const query = `[out:json][timeout:8];node[amenity=parcel_locker](${bs},${bw},${bn},${be});out body 60;`;
    const attempts = OVERPASS_ENDPOINTS.map((ep) => {
      const ctrl =
        typeof AbortController === "function" ? new AbortController() : null;
      const tAbort = ctrl ? setTimeout(() => ctrl.abort(), 9000) : null;
      return fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: query,
        signal: ctrl ? ctrl.signal : undefined,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http-" + r.status))))
        .then((j) => {
          if (!j || !j.elements) throw new Error("bad-json");
          return j;
        })
        .finally(() => clearTimeout(tAbort));
    });
    let hardTimer;
    const hardStop = new Promise((_, rej) => {
      hardTimer = setTimeout(() => rej(new Error("hard-timeout")), 12000);
    });
    let oj;
    try {
      oj = await Promise.any([Promise.any(attempts), hardStop]);
    } finally {
      clearTimeout(hardTimer);
    }
    let pts = oj.elements.filter((el) => el.lat != null && el.lon != null);
    const isInpost = (el) =>
      /inpost/i.test(
        [el.tags && el.tags.operator, el.tags && el.tags.brand, el.tags && el.tags.name]
          .filter(Boolean)
          .join(" ")
      );
    const inpost = pts.filter(isInpost);
    if (inpost.length) pts = inpost;
    pts.sort(
      (a, b) =>
        (a.lat - geo.lat) ** 2 + (a.lon - geo.lon) ** 2 - ((b.lat - geo.lat) ** 2 + (b.lon - geo.lon) ** 2)
    );
    return pts.slice(0, 40);
  }

  function showCityMap(city) {
    const box = $("#geoMapBox");
    if (!box) return;
    const q = encodeURIComponent("paczkomat InPost " + city);
    box.innerHTML = `<iframe title="Mapa paczkomatów — ${escapeHtml(city)}" loading="lazy" referrerpolicy="no-referrer" src="https://maps.google.com/maps?q=${q}&z=12&output=embed"></iframe>`;
    const full = $("#geoMapFull");
    if (full) full.href = `https://www.google.com/maps/search/${q}`;
  }

  async function searchLockers(cityName) {
    const city = (cityName || "").trim();
    if (!city) {
      setGeoStatus("Wpisz nazwę miasta 🙂");
      return;
    }
    /* 1) mapa OD RAZU — bez czekania na cokolwiek */
    $("#geoMapPanel").hidden = false;
    showCityMap(city);
    renderLockersList([], city);
    setGeoStatus(`Mapa paczkomatów: ${city} 🗺️ Doczytuję listę punktów z adresami…`);

    /* 2) w tle lista punktów (klik = auto-uzupełnienie adresu) */
    if (typeof fetch !== "function") {
      setGeoStatus(`Mapa paczkomatów: ${city} 🗺️ Kliknij punkt na mapie i przepisz adres do pola dostawy ✍️`);
      return;
    }
    try {
      const geo = localCityLookup(city) || (await geocodeCity(city));
      if (!geo) {
        setGeoStatus(`Nie znam miasta „${city}" 🤔 Sprawdź pisownię — mapa pokazuje wyniki dla wpisanej nazwy.`, true);
        return;
      }
      lastCity = geo.name;
      lastCenter = { lat: geo.lat, lon: geo.lon };
      try {
        localStorage.setItem("zaplecze-geo-lastq", city);
      } catch (e) {}
      const pts = await fetchLockerPoints(geo);
      lastPts = pts;
      if (!pts.length) {
        setGeoStatus("Mapa powyżej pokazuje paczkomaty 🗺️ Kliknij punkt i przepisz adres do pola dostawy ✍️");
        return;
      }
      renderLockersList(pts, geo.name);
      const plural = pts.length === 1 ? "paczkomat" : pts.length < 5 ? "paczkomaty" : "paczkomatów";
      setGeoStatus(`Masz ${pts.length} ${plural} — kliknij pozycję na liście, a adres SAM wpadnie do zamówienia 📍`);
    } catch (err) {
      setGeoStatus("Mapa powyżej pokazuje paczkomaty 🗺️ Listy punktów nie udało się doczytać — kliknij punkt na mapie i przepisz adres do pola dostawy ✍️");
    }
  }


  function maybeAskGeo() {
    const modal = $("#geoModal");
    if (!modal) return;
    if (!localStorage.getItem(GEO_ASKED) && !savedCity()) {
      localStorage.setItem(GEO_ASKED, "1");
      modal.classList.add("open");
    } else {
      renderGeoChip();
    }
  }

  /* ---------------- UI glue ---------------- */
  function initUI() {
    /* header scroll + pasek postępu */
    const header = $("#siteHeader");
    const progress = $("#scrollProgress");
    const onScroll = () => {
      header.classList.toggle("scrolled", window.scrollY > 12);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    };
    /* throttling rAF — pasek postępu i header bez szarpania */
    let rafPending = false;
    window.addEventListener(
      "scroll",
      () => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
          onScroll();
          rafPending = false;
        });
      },
      { passive: true }
    );
    onScroll();

    /* burger */
    const burger = $("#burgerBtn");
    const menu = $("#mobileMenu");
    burger.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    $$("a", menu).forEach((a) =>
      a.addEventListener("click", () => {
        menu.classList.remove("open");
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      })
    );

    /* search */
    const onSearch = (v) => {
      state.search = v;
      renderGrid();
    };
    $("#searchInput").addEventListener("input", (e) => {
      $("#searchInputMobile").value = e.target.value;
      onSearch(e.target.value);
    });
    $("#searchInputMobile").addEventListener("input", (e) => {
      $("#searchInput").value = e.target.value;
      onSearch(e.target.value);
    });

    /* sort */
    $("#sortSelect").addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderGrid();
    });

    /* cart */
    $("#cartBtn").addEventListener("click", openCart);
    $("#bbCart").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#overlay").addEventListener("click", closeCart);
    $("#checkoutBtn").addEventListener("click", (e) => {
      if (!cartEntries().length) {
        e.preventDefault();
        toast("Koszyk jest pusty — dodaj najpierw coś z oferty 🛒");
        return;
      }
      checkoutNotice();
    });
    if ($("#copyMsgBtn"))
      $("#copyMsgBtn").addEventListener("click", () => {
        const entries = cartEntries();
        if (!entries.length) {
          toast("Koszyk jest pusty — nie ma czego kopiować 🛒");
          return;
        }
        copyText(buildOrderMessage(entries, cartTotals()));
      });
    if ($("#tgHelpBtn"))
      $("#tgHelpBtn").addEventListener("click", openCheckoutModal);
    if ($("#cmClose")) $("#cmClose").addEventListener("click", closeCheckoutModal);
    if ($("#cmBackdrop")) $("#cmBackdrop").addEventListener("click", closeCheckoutModal);
    if ($("#cmCopy"))
      $("#cmCopy").addEventListener("click", () => copyText($("#cmText").value));

    /* formularz danych do zamówienia (leci w wiadomości na Telegram) */
    const SHIP_PLACEHOLDERS = {
      "Paczkomat InPost": "Paczkomat: numer + adres (np. KAT108, ul. …)",
      "Kurier InPost": "Adres dostawy: ulica, numer, miasto, kod",
      "Odbiór osobisty": "Miejscowość / dogodny termin",
    };
    const ofName = $("#ofName");
    if (ofName) {
      const ofPhone = $("#ofPhone");
      const ofShip = $("#ofShip");
      const ofDetails = $("#ofShipDetails");
      const ofNotes = $("#ofNotes");
      const saved = loadOrder();
      ofName.value = saved.name || "";
      ofPhone.value = saved.phone || "";
      if (saved.ship) ofShip.value = saved.ship;
      ofDetails.value = saved.shipDetails || "";
      ofDetails.placeholder =
        SHIP_PLACEHOLDERS[ofShip.value] || SHIP_PLACEHOLDERS["Paczkomat InPost"];
      ofNotes.value = saved.notes || "";

      const sync = () => updateCheckoutLink();
      ofName.addEventListener("input", () => {
        saveOrder({ name: ofName.value });
        sync();
      });
      ofPhone.addEventListener("input", () => {
        saveOrder({ phone: ofPhone.value });
        sync();
      });
      ofDetails.addEventListener("input", () => {
        saveOrder({ shipDetails: ofDetails.value });
        sync();
      });
      ofNotes.addEventListener("input", () => {
        saveOrder({ notes: ofNotes.value });
        sync();
      });
      ofShip.addEventListener("change", () => {
        saveOrder({ ship: ofShip.value });
        ofDetails.placeholder = SHIP_PLACEHOLDERS[ofShip.value] || "";
        sync();
      });
    }

    /* modal */
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && e.target.tagName) || "";
      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA" &&
        tag !== "SELECT" &&
        $("#productModal").classList.contains("open")
      ) {
        galleryStep(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (e.key === "Escape") {
        closeModal();
        closeCart();
        closeInfoModal();
        closeCheckoutModal();
        const gm = $("#geoModal");
        if (gm) gm.classList.remove("open");
      }
    });

    /* geolokalizacja: przyciski pytania + ponowna próba + wstawienie miasta */
    const geoModal = $("#geoModal");
    if (geoModal) {
      const closeGeo = () => {
        geoModal.classList.remove("open");
        renderGeoChip();
      };
      $("#geoClose").addEventListener("click", closeGeo);
      $("#geoBackdrop").addEventListener("click", closeGeo);
      $("#geoDeny").addEventListener("click", () => {
        closeGeo();
        toast("Jasne — dane wpiszesz ręcznie ✍️");
      });
      $("#geoAllow").addEventListener("click", () => {
        geoModal.classList.remove("open");
        detectGeo();
      });
      $("#geoRetry").addEventListener("click", detectGeo);
    }

    /* filtr ceny od–do */
    const pMin = $("#priceMin");
    const pMax = $("#priceMax");
    if (pMin && pMax) {
      const onPriceInput = () => {
        state.priceMin = pMin.value === "" ? null : Math.max(0, +pMin.value || 0);
        state.priceMax = pMax.value === "" ? null : Math.max(0, +pMax.value || 0);
        renderGrid();
      };
      pMin.addEventListener("input", onPriceInput);
      pMax.addEventListener("input", onPriceInput);
      $("#priceClear").addEventListener("click", () => {
        pMin.value = "";
        pMax.value = "";
        state.priceMin = null;
        state.priceMax = null;
        renderGrid();
      });
    }

    /* ostatnio oglądane */
    if ($("#recentClear"))
      $("#recentClear").addEventListener("click", () => {
        try {
          localStorage.removeItem(RECENT_KEY);
        } catch (e) {}
        renderRecent();
      });

    /* szybki dostęp: Jak kupić / Opinie / Płatności (modale z hero) */
    if ($("#hqJak")) $("#hqJak").addEventListener("click", () => openInfoModal("jak"));
    if ($("#hqOpinie")) $("#hqOpinie").addEventListener("click", () => openInfoModal("opinie"));
    if ($("#hqPlatnosci")) $("#hqPlatnosci").addEventListener("click", () => openInfoModal("platnosci"));
    if ($("#infoClose")) $("#infoClose").addEventListener("click", closeInfoModal);
    if ($("#infoBackdrop")) $("#infoBackdrop").addEventListener("click", closeInfoModal);

    /* galeria produktu: swipe (dotyk), przeciąganie myszą, strzałki ‹ ›,
       klawiatura i zoom kliknięciem */
    const mmWrap = $("#modalMainImgWrap");
    if (mmWrap) {
      let touchX0 = null;
      let mouseX0 = null;
      let suppressZoomClick = false;
      mmWrap.addEventListener(
        "touchstart",
        (e) => {
          touchX0 = e.touches && e.touches[0] ? e.touches[0].clientX : null;
        },
        { passive: true }
      );
      mmWrap.addEventListener("touchend", (e) => {
        if (touchX0 == null || !e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - touchX0;
        touchX0 = null;
        if (Math.abs(dx) < 40) return;
        galleryStep(dx < 0 ? 1 : -1);
      });
      mmWrap.addEventListener("mousedown", (e) => {
        mouseX0 = e.clientX;
      });
      mmWrap.addEventListener("mouseup", (e) => {
        if (mouseX0 == null) return;
        const dx = e.clientX - mouseX0;
        mouseX0 = null;
        if (Math.abs(dx) >= 40) {
          suppressZoomClick = true;
          galleryStep(dx < 0 ? 1 : -1);
        }
      });
      mmWrap.addEventListener("mouseleave", () => {
        mouseX0 = null;
      });
      const mmImg = $("#modalMainImg");
      mmImg.style.cursor = "zoom-in";
      mmImg.addEventListener("click", (e) => {
        if (suppressZoomClick) {
          suppressZoomClick = false;
          return;
        }
        mmImg.classList.toggle("zoom");
        if (mmImg.classList.contains("zoom")) {
          const r = mmImg.getBoundingClientRect();
          if (r.width && r.height) {
            mmImg.style.transformOrigin = `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`;
          }
          mmImg.style.cursor = "zoom-out";
        } else {
          mmImg.style.transformOrigin = "";
          mmImg.style.cursor = "zoom-in";
        }
      });
      const gPrev = $("#galPrev");
      const gNext = $("#galNext");
      if (gPrev) gPrev.addEventListener("click", () => galleryStep(-1));
      if (gNext) gNext.addEventListener("click", () => galleryStep(1));
    }

    /* geolokalizacja: wpisz miasto → szukaj paczkomatu */
    const gci = $("#geoCityInput");
    if (gci && !gci.value.trim()) {
      const hitCity = savedCity();
      let lastq = "";
      try {
        lastq = localStorage.getItem("zaplecze-geo-lastq") || "";
      } catch (e) {}
      const prefill = (hitCity && hitCity.name) || lastq;
      if (prefill) gci.value = prefill;
    }
    if ($("#geoSearchBtn"))
      $("#geoSearchBtn").addEventListener("click", () =>
        searchLockers($("#geoCityInput").value)
      );
    if ($("#geoCityInput"))
      $("#geoCityInput").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          searchLockers(e.target.value);
        }
      });

    /* reveal on scroll */
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((en) => {
                if (en.isIntersecting) {
                  en.target.classList.add("in");
                  io.unobserve(en.target);
                }
              });
            },
            { threshold: 0.12 }
          )
        : {
            observe: (el) => el.classList.add("in"),
            unobserve: () => {},
            disconnect: () => {},
          };
    window.__revealIO = io;

    /* stats */
    $("#statProducts").textContent = DATA.products.length + "+";
    animateStats();
  }

  function observeReveals() {
    const io = window.__revealIO;
    $$(".reveal:not(.in)").forEach((el) => io.observe(el));
  }

  /* ---------------- Boot ---------------- */
  renderCategories();
  renderChips();
  renderGrid();
  renderReviews();
  renderPayments();
  renderCart();
  renderRecent();
  fitHeroTitle();
  if (document.fonts && document.fonts.ready && document.fonts.ready.then)
    document.fonts.ready.then(() => fitHeroTitle());
  let fitTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitHeroTitle, 150);
  });
  initUI();
  observeReveals();

  /* re-observe dynamically added reveals */
  const mo = new MutationObserver(() => observeReveals());
  mo.observe(document.body, { childList: true, subtree: true });
})();
