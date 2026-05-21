const VIEWS = ["catalogo", "pedidos", "clientes", "cobros", "prendas", "cuenta"];

// ── Carrito ──────────────────────────────────────────────────────────────────

let carrito = [];

function addToCarrito(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto || carrito.some((p) => p.id === id)) return false;
  carrito.push(producto);
  updateCartBadge();
  return true;
}

function clearCarrito() {
  carrito = [];
  updateCartBadge();
}

function totalCarrito() {
  return carrito.reduce((sum, p) => sum + p.precioCosto, 0);
}

function updateCartBadge() {
  const btn = document.getElementById("cartBtn");
  const badge = document.getElementById("cartBadge");
  if (!btn) return;
  btn.hidden = carrito.length === 0;
  badge.textContent = carrito.length;
}

function buildCartWhatsappUrl() {
  const lines = carrito.map((p) =>
    `${p.emoji} ${p.nombre} - ${p.marca} | Talla ${p.tallaEtiqueta}/${p.tallaReal} | ${formatPeso(p.precioCosto)}`
  );
  const msg =
    `Hola ZETINA! 👋 Quisiera hacer el siguiente pedido:\n\n` +
    lines.join("\n") +
    `\n\n💰 *Total: ${formatPeso(totalCarrito())}*\n\n¡Gracias! 🛍️`;
  return "https://wa.me/525579346962?text=" + encodeURIComponent(msg);
}

const WA_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

function refreshCartSheet() {
  const body = document.getElementById("cartSheetBody");
  if (!body) return;

  if (carrito.length === 0) {
    body.innerHTML = `
      <div class="cart-head"><h3 class="cart-title">Mi Carrito</h3></div>
      <div class="cart-empty">
        <p class="cart-empty-icon">🛒</p>
        <p class="cart-empty-text">Tu carrito está vacío</p>
      </div>`;
    return;
  }

  const items = carrito.map((p) => `
    <div class="cart-item">
      <button class="cart-item-remove" data-id="${p.id}" aria-label="Eliminar ${p.nombre}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="cart-item-thumb" style="background:${p.gradiente}">
        <span aria-hidden="true">${p.emoji}</span>
      </div>
      <div class="cart-item-info">
        <p class="cart-item-name">${p.nombre}</p>
        <p class="cart-item-meta">${p.marca} · Talla ${p.tallaEtiqueta}</p>
        <p class="cart-item-price">${formatPeso(p.precioCosto)}</p>
      </div>
    </div>`).join("");

  body.innerHTML = `
    <div class="cart-head">
      <h3 class="cart-title">Mi Carrito</h3>
      <button class="cart-clear-btn" id="cartClearBtn">Vaciar todo</button>
    </div>
    <div class="cart-items">${items}</div>
    <div class="cart-total">
      <span class="cart-total-label">Total a pagar a ZETINA</span>
      <span class="cart-total-value">${formatPeso(totalCarrito())}</span>
    </div>
    <a href="${buildCartWhatsappUrl()}" target="_blank" rel="noopener noreferrer"
       class="btn-cart-whatsapp">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
      Enviar pedido por WhatsApp
    </a>`;
}

function openCartSheet() {
  refreshCartSheet();
  document.getElementById("cartOverlay").classList.add("open");
}

function closeCartSheet() {
  document.getElementById("cartOverlay").classList.remove("open");
}

function createCartSheet() {
  if (document.getElementById("cartOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "cartOverlay";
  overlay.className = "cart-overlay";
  overlay.innerHTML = `
    <div class="cart-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="cart-body" id="cartSheetBody"></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCartSheet();
  });

  overlay.querySelector("#cartSheetBody").addEventListener("click", (e) => {
    if (e.target.closest("#cartClearBtn")) {
      clearCarrito();
      closeCartSheet();
      return;
    }
    const removeBtn = e.target.closest(".cart-item-remove");
    if (removeBtn) {
      const id = parseInt(removeBtn.dataset.id);
      carrito = carrito.filter((p) => p.id !== id);
      updateCartBadge();
      refreshCartSheet();
    }
  });
}

// ── Datos del catálogo ──────────────────────────────────────────────────────

const productos = [
  {
    id: 1,
    nombre: "Blusa Satinada Manga Larga",
    marca: "ZARA",
    tallaEtiqueta: "M",
    tallaReal: "38",
    emoji: "👚",
    gradiente: "linear-gradient(150deg, #130016 0%, #855AA2 100%)",
    precioCosto: 185,
    precioMin: 290,
    precioMax: 380,
  },
  {
    id: 2,
    nombre: "Pantalón Skinny de Mezclilla",
    marca: "BERSHKA",
    tallaEtiqueta: "28",
    tallaReal: "30",
    emoji: "👖",
    gradiente: "linear-gradient(150deg, #130016 0%, #CCB8DD 100%)",
    precioCosto: 245,
    precioMin: 390,
    precioMax: 490,
  },
  {
    id: 3,
    nombre: "Vestido Floral Midi",
    marca: "ZARA WOMAN",
    tallaEtiqueta: "S",
    tallaReal: "36",
    emoji: "👗",
    gradiente: "linear-gradient(150deg, #855AA2 0%, #130016 100%)",
    precioCosto: 320,
    precioMin: 500,
    precioMax: 640,
  },
];

// ── Datos de pedidos (compras de la vendedora a ZETINA) ─────────────────────

const pedidos = [
  {
    id: 1,
    numero: "001",
    fecha: "2026-05-20",
    estado: "En proceso",
    prendas: [
      { nombre: "Blusa Satinada Manga Larga",    marca: "ZARA",      emoji: "👚", precio: 185 },
      { nombre: "Pantalón Skinny de Mezclilla",  marca: "BERSHKA",   emoji: "👖", precio: 245 },
      { nombre: "Falda Plisada Mini",            marca: "H&M",       emoji: "🩱", precio: 178 },
    ],
  },
  {
    id: 2,
    numero: "002",
    fecha: "2026-05-14",
    estado: "En camino",
    prendas: [
      { nombre: "Vestido Floral Midi",           marca: "ZARA WOMAN",  emoji: "👗", precio: 320 },
      { nombre: "Chamarra de Cuero Sintético",   marca: "PULL&BEAR",   emoji: "🧥", precio: 415 },
    ],
  },
  {
    id: 3,
    numero: "003",
    fecha: "2026-05-05",
    estado: "Entregado",
    prendas: [
      { nombre: "Top Crop de Encaje",            marca: "ZARA",        emoji: "👙", precio: 155 },
    ],
  },
];

const ESTADO_CONFIG = {
  "En camino":  { bg: "#CCB8DD", color: "#130016" },
  "Entregado":  { bg: "#DEFF00", color: "#130016" },
  "En proceso": { bg: "#855AA2", color: "#ffffff" },
};

const MESES_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFecha(iso) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MESES_ES[parseInt(m) - 1]}. ${y}`;
}

// ── Utilidades ──────────────────────────────────────────────────────────────

function formatPeso(n) {
  return "$" + n.toLocaleString("es-MX");
}

function buildWhatsappUrl(p) {
  const ganMin = p.precioMin - p.precioCosto;
  const ganMax = p.precioMax - p.precioCosto;
  const texto =
    `✨ *${p.nombre}*\n` +
    `👗 Marca: ${p.marca}  |  Talla etiqueta: ${p.tallaEtiqueta}  |  Talla real: ${p.tallaReal}\n` +
    `💰 Precio: ${formatPeso(p.precioMin)} – ${formatPeso(p.precioMax)}\n\n` +
    `¡Escríbeme para apartar tu pieza! 🛍️`;
  return "https://wa.me/?text=" + encodeURIComponent(texto);
}

// ── Render: Catálogo ────────────────────────────────────────────────────────

function renderCatalog() {
  const container = document.querySelector("#catalogo .view-content");

  const cards = productos.map((p) => {
    const ganMin = p.precioMin - p.precioCosto;
    const ganMax = p.precioMax - p.precioCosto;

    return `
      <article class="product-card">
        <div class="product-image" style="background: ${p.gradiente}">
          <span class="product-emoji" aria-hidden="true">${p.emoji}</span>

        </div>
        <div class="product-info">
          <div class="product-meta">
            <span class="brand-chip">${p.marca}</span>
          </div>
          <h3 class="product-name">${p.nombre}</h3>
          <div class="talla-row">
            <div class="talla-chip">
              <span class="talla-label">Talla etiqueta</span>
              <span class="talla-val">${p.tallaEtiqueta}</span>
            </div>
            <div class="talla-chip">
              <span class="talla-label">Talla real</span>
              <span class="talla-val">${p.tallaReal}</span>
            </div>
          </div>
          <div class="price-table">
            <div class="price-row">
              <span class="price-label">A ti te cuesta</span>
              <span class="price-val price-costo">${formatPeso(p.precioCosto)}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Lo puedes vender</span>
              <span class="price-val">${formatPeso(p.precioMin)} – ${formatPeso(p.precioMax)}</span>
            </div>
            <div class="price-row price-row--ganancia">
              <span class="price-label">Tu ganancia</span>
              <span class="price-val price-ganancia">+${formatPeso(ganMin)} – +${formatPeso(ganMax)}</span>
            </div>
          </div>
          <div class="card-actions">
            <a href="${buildWhatsappUrl(p)}"
               target="_blank"
               rel="noopener noreferrer"
               class="btn-whatsapp">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Compartir
            </a>
            <button class="btn-order" data-id="${p.id}">
              Agregar al carrito
            </button>
          </div>
        </div>
      </article>`;
  });

  container.innerHTML = `
    <div class="catalog-header">
      <h2 class="catalog-title">Catálogo</h2>
      <p class="catalog-subtitle">${productos.length} prendas disponibles</p>
    </div>
    <div class="catalog-grid">${cards.join("")}</div>`;

  container.querySelector(".catalog-grid").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-order");
    if (!btn) return;
    const added = addToCarrito(parseInt(btn.dataset.id));
    if (added) {
      btn.textContent = "✓ Agregado";
      btn.style.background = "#DEFF00";
      btn.style.color = "#130016";
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = "Agregar al carrito";
        btn.style.background = "";
        btn.style.color = "";
        btn.disabled = false;
      }, 1400);
    } else {
      btn.textContent = "Ya en carrito";
      setTimeout(() => { btn.textContent = "Agregar al carrito"; }, 1400);
    }
  });
}

// ── Bottom sheet: detalle de pedido ─────────────────────────────────────────

function createOrderDetailSheet() {
  if (document.getElementById("orderDetailOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "orderDetailOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-body" id="orderDetailBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOrderDetail();
  });
}

function openOrderDetail(id) {
  const p = pedidos.find((o) => o.id === id);
  if (!p) return;
  const { bg, color } = ESTADO_CONFIG[p.estado] || { bg: "#eee", color: "#333" };
  const total = p.prendas.reduce((sum, pr) => sum + pr.precio, 0);
  const countLabel = p.prendas.length === 1 ? "1 prenda" : `${p.prendas.length} prendas`;

  const items = p.prendas.map((pr) => `
    <div class="sheet-item">
      <span class="sheet-item-emoji" aria-hidden="true">${pr.emoji}</span>
      <div class="sheet-item-info">
        <p class="sheet-item-name">${pr.nombre}</p>
        <p class="sheet-item-brand">${pr.marca}</p>
      </div>
      <span class="sheet-item-price">${formatPeso(pr.precio)}</span>
    </div>`).join("");

  document.getElementById("orderDetailBody").innerHTML = `
    <div class="sheet-header">
      <div class="sheet-title-row">
        <h3 class="sheet-order-number">Pedido #${p.numero}</h3>
        <span class="status-badge" style="background:${bg};color:${color}">${p.estado}</span>
      </div>
      <p class="sheet-date">${formatFecha(p.fecha)}</p>
    </div>
    <p class="sheet-section-label">${countLabel}</p>
    <div class="sheet-items">${items}</div>
    <div class="sheet-total">
      <span class="sheet-total-label">Total pagado a ZETINA</span>
      <span class="sheet-total-value">${formatPeso(total)}</span>
    </div>`;

  document.getElementById("orderDetailOverlay").classList.add("open");
}

function closeOrderDetail() {
  document.getElementById("orderDetailOverlay").classList.remove("open");
}

// ── Render: Pedidos ─────────────────────────────────────────────────────────

function renderPedidos() {
  const container = document.querySelector("#pedidos .view-content");

  const orderCards = pedidos.map((p) => {
    const { bg, color } = ESTADO_CONFIG[p.estado] || { bg: "#eee", color: "#333" };
    const total = p.prendas.reduce((sum, pr) => sum + pr.precio, 0);
    const countLabel = p.prendas.length === 1 ? "1 prenda" : `${p.prendas.length} prendas`;

    const itemRows = p.prendas.map((pr) => `
      <div class="order-item-row">
        <span class="order-item-emoji" aria-hidden="true">${pr.emoji}</span>
        <span class="order-item-name">${pr.nombre}</span>
        <span class="order-item-sep">·</span>
        <span class="order-item-brand">${pr.marca}</span>
      </div>`).join("");

    return `
      <article class="order-card" data-id="${p.id}" data-estado="${p.estado}"
               role="button" tabindex="0" aria-label="Ver detalle Pedido #${p.numero}">
        <div class="order-card-head">
          <div class="order-number-row">
            <h3 class="order-number">Pedido #${p.numero}</h3>
            <span class="status-badge" style="background:${bg};color:${color}">${p.estado}</span>
          </div>
          <p class="order-date">${formatFecha(p.fecha)}</p>
        </div>
        <div class="order-items-preview">${itemRows}</div>
        <div class="order-card-foot">
          <span class="order-count-label">${countLabel}</span>
          <span class="order-total-amount">${formatPeso(total)}</span>
        </div>
      </article>`;
  }).join("");

  container.innerHTML = `
    <div class="pedidos-header">
      <h2 class="catalog-title">Mis Pedidos</h2>
      <p class="catalog-subtitle">${pedidos.length} pedidos realizados a ZETINA</p>
    </div>
    <div class="pedidos-filters">
      <button class="filter-btn active" data-filter="todos">Todos</button>
      <button class="filter-btn" data-filter="en-camino">En camino</button>
      <button class="filter-btn" data-filter="entregados">Entregados</button>
    </div>
    <div class="orders-list">${orderCards}</div>`;

  container.querySelector(".pedidos-filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    container.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    container.querySelectorAll(".order-card").forEach((card) => {
      const estado = card.dataset.estado;
      let visible = true;
      if (filter === "en-camino")  visible = estado === "En camino";
      if (filter === "entregados") visible = estado === "Entregado";
      card.style.display = visible ? "" : "none";
    });
  });

  container.querySelector(".orders-list").addEventListener("click", (e) => {
    const card = e.target.closest(".order-card");
    if (!card) return;
    openOrderDetail(parseInt(card.dataset.id));
  });
}

// ── Datos de clientes ────────────────────────────────────────────────────────

let clientes = [
  {
    id: 1,
    nombre: "María González",
    telefono: "5512345678",
    tallaRopa: "M",
    tallaPantalon: "30",
    notas: "Prefiere colores oscuros. Paga puntualmente.",
    compras: [
      { prenda: "Blusa Satinada Manga Larga",  marca: "ZARA",       fecha: "2026-05-10", monto: 350, pagado: true  },
      { prenda: "Vestido Floral Midi",          marca: "ZARA WOMAN", fecha: "2026-05-18", monto: 580, pagado: false },
    ],
  },
  {
    id: 2,
    nombre: "Sofía Ramírez",
    telefono: "5598765432",
    tallaRopa: "S",
    tallaPantalon: "28",
    notas: "Le encantan los vestidos y blusas ligeras.",
    compras: [
      { prenda: "Pantalón Skinny de Mezclilla", marca: "BERSHKA", fecha: "2026-05-05", monto: 450, pagado: true },
    ],
  },
  {
    id: 3,
    nombre: "Lucía Hernández",
    telefono: "5567891234",
    tallaRopa: "L",
    tallaPantalon: "32",
    notas: "Contactar solo por WhatsApp. Sin llamadas.",
    compras: [
      { prenda: "Chamarra de Cuero Sintético", marca: "PULL&BEAR", fecha: "2026-04-28", monto: 620, pagado: false },
      { prenda: "Falda Plisada Mini",           marca: "H&M",       fecha: "2026-05-12", monto: 280, pagado: false },
    ],
  },
];

const AVATAR_PALETTES = [
  { bg: "#855AA2", color: "#fff"     },
  { bg: "#130016", color: "#DEFF00"  },
  { bg: "#CCB8DD", color: "#130016"  },
];

function avatarPalette(id) {
  return AVATAR_PALETTES[(id - 1) % AVATAR_PALETTES.length];
}

function iniciales(nombre) {
  return nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function tienePendiente(c) {
  return c.compras.some((comp) => !comp.pagado);
}

function saveClientes() {
  try { localStorage.setItem("zetina_clientes", JSON.stringify(clientes)); } catch(e) {}
}

function loadClientes() {
  try {
    const stored = localStorage.getItem("zetina_clientes");
    if (stored) { clientes = JSON.parse(stored); } else { saveClientes(); }
  } catch(e) {}
}

// ── Render: Clientes ─────────────────────────────────────────────────────────

function buildClienteCard(c) {
  const { bg, color } = avatarPalette(c.id);
  const pendiente = tienePendiente(c);
  return `
    <article class="cliente-card" data-id="${c.id}" role="button" tabindex="0"
             aria-label="Ver detalle de ${c.nombre}">
      <div class="cliente-avatar" style="background:${bg};color:${color}">${iniciales(c.nombre)}</div>
      <div class="cliente-info">
        <div class="cliente-name-row">
          <p class="cliente-name">${c.nombre}</p>
          ${pendiente ? `<span class="badge-pendiente">Pago pendiente</span>` : ""}
        </div>
        <p class="cliente-talla">Talla ${c.tallaRopa} · Pantalón ${c.tallaPantalon}</p>
        <p class="cliente-phone">${c.telefono}</p>
      </div>
    </article>`;
}

function renderClientesList(container, query = "") {
  const filtered = query
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(query.toLowerCase()))
    : clientes;
  const list = container.querySelector(".clientes-list");
  if (!list) return;
  list.innerHTML = filtered.length
    ? filtered.map(buildClienteCard).join("")
    : `<div class="clientes-empty"><p class="clientes-empty-text">Sin resultados</p></div>`;
}

function renderClientes() {
  const container = document.querySelector("#clientes .view-content");
  container.innerHTML = `
    <div class="clientes-header">
      <h2 class="catalog-title">Clientes</h2>
      <p class="catalog-subtitle">${clientes.length} clientas registradas</p>
    </div>
    <div class="clientes-toolbar">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input class="search-input" id="clienteSearch" type="search" placeholder="Buscar clienta...">
      </div>
      <button class="btn-add-cliente" id="btnAddCliente" aria-label="Agregar clienta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
    <div class="clientes-list"></div>`;

  renderClientesList(container);

  container.querySelector("#clienteSearch").addEventListener("input", (e) => {
    renderClientesList(container, e.target.value.trim());
  });
  container.querySelector("#btnAddCliente").addEventListener("click", openClienteForm);
  container.querySelector(".clientes-list").addEventListener("click", (e) => {
    const card = e.target.closest(".cliente-card");
    if (card) openClienteDetail(parseInt(card.dataset.id));
  });
}

function createClienteDetailSheet() {
  if (document.getElementById("clienteDetailOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "clienteDetailOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-body" id="clienteDetailBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
}

function openClienteDetail(id) {
  const c = clientes.find((cl) => cl.id === id);
  if (!c) return;
  const { bg, color } = avatarPalette(c.id);
  const pendiente = tienePendiente(c);

  const comprasHTML = c.compras.length
    ? c.compras.map((comp) => `
        <div class="compra-row">
          <div class="compra-info">
            <p class="compra-prenda">${comp.prenda}</p>
            <p class="compra-meta">${comp.marca} · ${formatFecha(comp.fecha)}</p>
          </div>
          <div class="compra-right">
            <p class="compra-monto">${formatPeso(comp.monto)}</p>
            <span class="compra-status ${comp.pagado ? "compra-pagado" : "compra-pendiente"}">
              ${comp.pagado ? "Pagado" : "Pendiente"}
            </span>
          </div>
        </div>`).join("")
    : `<p class="compras-empty">Sin compras registradas</p>`;

  document.getElementById("clienteDetailBody").innerHTML = `
    <div class="detail-avatar-row">
      <div class="detail-avatar" style="background:${bg};color:${color}">${iniciales(c.nombre)}</div>
      <div>
        <h3 class="detail-nombre">${c.nombre}</h3>
        ${pendiente ? `<span class="badge-pendiente">Pago pendiente</span>` : ""}
      </div>
    </div>
    <div class="detail-fields">
      <div class="detail-field">
        <span class="detail-label">Teléfono</span>
        <span class="detail-value">${c.telefono}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Talla de ropa</span>
        <span class="detail-value">${c.tallaRopa}</span>
      </div>
      <div class="detail-field">
        <span class="detail-label">Talla de pantalón</span>
        <span class="detail-value">${c.tallaPantalon}</span>
      </div>
      ${c.notas ? `
      <div class="detail-field">
        <span class="detail-label">Notas</span>
        <span class="detail-value detail-notes">${c.notas}</span>
      </div>` : ""}
    </div>
    <a href="https://wa.me/52${c.telefono}" target="_blank" rel="noopener noreferrer"
       class="btn-wa-cliente">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
      Contactar por WhatsApp
    </a>
    <p class="sheet-section-label" style="margin-top:1.25rem">
      Historial de compras (${c.compras.length})
    </p>
    <div class="compras-list">${comprasHTML}</div>`;

  document.getElementById("clienteDetailOverlay").classList.add("open");
}

function createClienteFormSheet() {
  if (document.getElementById("clienteFormOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "clienteFormOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-body">
        <h3 class="cart-title" style="margin-bottom:1.25rem">Nueva clienta</h3>
        <form id="clienteForm" class="cliente-form">
          <div class="form-group">
            <label class="form-label" for="fNombre">Nombre completo</label>
            <input class="form-input" id="fNombre" name="nombre" type="text"
                   placeholder="Ej. Ana López" required autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label" for="fTelefono">Teléfono</label>
            <input class="form-input" id="fTelefono" name="telefono" type="tel"
                   placeholder="10 dígitos" required autocomplete="off">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="fTallaRopa">Talla de ropa</label>
              <select class="form-select" id="fTallaRopa" name="tallaRopa">
                <option>XS</option><option>S</option><option selected>M</option>
                <option>L</option><option>XL</option><option>XXL</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="fTallaPant">Talla pantalón</label>
              <input class="form-input" id="fTallaPant" name="tallaPantalon" type="text"
                     placeholder="Ej. 30" autocomplete="off">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="fNotas">Notas adicionales</label>
            <textarea class="form-textarea" id="fNotas" name="notas"
                      placeholder="Colores favoritos, estilo, forma de pago..."></textarea>
          </div>
          <button type="submit" class="btn-save-cliente">Guardar clienta</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  overlay.querySelector("#clienteForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    clientes.unshift({
      id: Date.now(),
      nombre: data.get("nombre").trim(),
      telefono: data.get("telefono").trim(),
      tallaRopa: data.get("tallaRopa"),
      tallaPantalon: data.get("tallaPantalon").trim(),
      notas: data.get("notas").trim(),
      compras: [],
    });
    saveClientes();
    overlay.classList.remove("open");
    e.target.reset();
    renderClientes();
  });
}

function openClienteForm() {
  document.getElementById("clienteFormOverlay").classList.add("open");
}

// ── Render: secciones vacías ────────────────────────────────────────────────

function renderSection(viewId, titulo) {
  const container = document.querySelector(`#${viewId} .view-content`);
  container.innerHTML = `
    <div class="catalog-header">
      <h2 class="catalog-title">${titulo}</h2>
    </div>`;
}

// ── Navegación ──────────────────────────────────────────────────────────────

function showView(viewId) {
  if (!VIEWS.includes(viewId)) viewId = "catalogo";

  document.querySelectorAll(".view").forEach((section) => {
    const isActive = section.id === viewId;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });

  document.querySelectorAll(".nav-item").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === viewId);
  });
}

function getViewFromHash() {
  const hash = location.hash.replace("#", "");
  return VIEWS.includes(hash) ? hash : "catalogo";
}

function navigate(viewId) {
  history.replaceState(null, "", `#${viewId}`);
  showView(viewId);
}

document.querySelector(".bottom-nav").addEventListener("click", (e) => {
  const link = e.target.closest(".nav-item");
  if (!link) return;
  e.preventDefault();
  navigate(link.dataset.view);
});

window.addEventListener("hashchange", () => {
  showView(getViewFromHash());
});

// ── Init ────────────────────────────────────────────────────────────────────

loadClientes();
renderCatalog();
renderPedidos();
renderClientes();
createOrderDetailSheet();
createClienteDetailSheet();
createClienteFormSheet();
createCartSheet();
document.getElementById("cartBtn").addEventListener("click", openCartSheet);
renderSection("cobros",   "Cobros");
renderSection("prendas",  "Mis Prendas");
renderSection("cuenta",   "Cuenta");
showView(getViewFromHash());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
