const VIEWS = ["catalogo", "pedidos", "clientes", "cobros", "prendas", "cuenta"];

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
              Hacer pedido
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

renderCatalog();
renderPedidos();
createOrderDetailSheet();
renderSection("clientes", "Clientes");
renderSection("cobros",   "Cobros");
renderSection("prendas",  "Mis Prendas");
renderSection("cuenta",   "Cuenta");
showView(getViewFromHash());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
