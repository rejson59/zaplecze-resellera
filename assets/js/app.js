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
        $("#searchInput").value = "";
        $("#searchInputMobile").value = "";
        setCategory("all");
      });
      return;
    }

    grid.innerHTML = list
      .map((p, i) => {
        const off = Math.round((1 - p.price / p.regular) * 100);
        return `
        <article class="p-card" style="--d:${Math.min(i, 11) * 45}ms" data-id="${p.id}">
          <div class="p-media" data-open="${p.id}" role="button" tabindex="0"
               aria-label="Zobacz ${p.name}">
            ${p.badge ? `<span class="p-badge">${p.badge}</span>` : ""}
            <span class="p-discount">-${off}%</span>
            <img src="${p.images[0]}" alt="${p.name}" loading="lazy" decoding="async" />
            <button class="btn btn-sm p-quick" data-open="${p.id}">Szybki podgląd</button>
          </div>
          <div class="p-body">
            <span class="p-cat">${CAT_NAME[p.category]} · ${p.brand}</span>
            <h3 class="p-name" data-open="${p.id}">${p.name}</h3>
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
    $$("[data-open]", grid).forEach((el) => {
      el.addEventListener("click", () => openModal(el.dataset.open));
      if (el.getAttribute("role") === "button")
        el.addEventListener("keydown", (e) => {
          if (e.key === "Enter") openModal(el.dataset.open);
        });
    });
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
  let modalImgIndex = 0;
  let modalQty = 1;

  function openModal(id) {
    modalProduct = productById(id);
    if (!modalProduct) return;
    modalImgIndex = 0;
    modalQty = 1;
    renderModal();
    $("#productModal").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    $("#productModal").classList.remove("open");
    if (!$("#cartDrawer").classList.contains("open"))
      document.body.style.overflow = "";
  }

  function renderModal() {
    const p = modalProduct;
    const off = Math.round((1 - p.price / p.regular) * 100);
    const save = p.regular - p.price;
    $("#modalMainImg").src = p.images[modalImgIndex];
    $("#modalMainImg").alt = p.name;

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

  /* ---------------- Checkout (Telegram) ----------------
     Strona jest w budowie — zamówienie domykamy na priv via Telegram.
     Link share/url podstawia gotową wiadomość z zawartością koszyka. */
  function buildOrderMessage(entries, t) {
    const lines = entries.map(({ product: p, qty }) => {
      const unit = unitPriceFor(p);
      return `• ${qty}× ${p.name} — ${unit} zł/szt = ${unit * qty} zł`;
    });
    const payLine =
      t.extra > 0
        ? `Płatność: ${t.method.cartLabel} → +${t.extra} zł`
        : `Płatność: ${t.method.cartLabel}`;
    const perfUnits = perfumeUnitsInCart();
    const perfNote =
      perfUnits >= 5
        ? `\n(perfumy: ${perfUnits} szt — rabat ilościowy ${perfumeUnitPrice(perfUnits)} zł/szt)`
        : "";
    return (
      `Cześć! Moje zamówienie ze sklepu Zaplecze Resellera:\n\n` +
      lines.join("\n") +
      `\n\nWartość produktów: ${t.subtotal} zł\n` +
      payLine +
      `\nRazem: ${t.total} zł` +
      perfNote +
      `\n\nProszę o potwierdzenie i dane do wysyłki 🙂`
    );
  }

  function updateCheckoutLink() {
    const entries = cartEntries();
    const btn = $("#checkoutBtn");
    if (!entries.length) return;
    const t = cartTotals();
    const pageUrl = location.href.split("#")[0];
    btn.href =
      "https://t.me/share/url?url=" +
      encodeURIComponent(pageUrl) +
      "&text=" +
      encodeURIComponent(buildOrderMessage(entries, t));
  }

  function checkoutNotice() {
    toast("Otwieram Telegram z gotową wiadomością zamówienia 📩");
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
    window.addEventListener("scroll", onScroll, { passive: true });
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
    $("#checkoutBtn").addEventListener("click", checkoutNotice);

    /* modal */
    $("#modalClose").addEventListener("click", closeModal);
    $("#modalBackdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeModal();
        closeCart();
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
  initUI();
  observeReveals();

  /* re-observe dynamically added reveals */
  const mo = new MutationObserver(() => observeReveals());
  mo.observe(document.body, { childList: true, subtree: true });
})();
