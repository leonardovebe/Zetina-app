const VIEWS = ["catalogo", "pedidos", "clientes", "cobros", "prendas", "cuenta"];

// ── Datos del catálogo ──────────────────────────────────────────────────────

const productos = [
  {
    id: 1,
    nombre: "Blusa Satinada Manga Larga",
    marca: "ZARA",
    talla: "M",
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
    talla: "28",
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
    talla: "S",
    emoji: "👗",
    gradiente: "linear-gradient(150deg, #855AA2 0%, #130016 100%)",
    precioCosto: 320,
    precioMin: 500,
    precioMax: 640,
  },
];

// ── Utilidades ──────────────────────────────────────────────────────────────

function formatPeso(n) {
  return "$" + n.toLocaleString("es-MX");
}

function buildWhatsappUrl(p) {
  const ganMin = p.precioMin - p.precioCosto;
  const ganMax = p.precioMax - p.precioCosto;
  const texto =
    `✨ *${p.nombre}*\n` +
    `👗 Marca: ${p.marca}  |  Talla: ${p.talla}\n` +
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
          <span class="size-badge">Talla ${p.talla}</span>
        </div>
        <div class="product-info">
          <div class="product-meta">
            <span class="brand-chip">${p.marca}</span>
          </div>
          <h3 class="product-name">${p.nombre}</h3>
          <div class="price-table">
            <div class="price-row">
              <span class="price-label">Precio mayoreo</span>
              <span class="price-val price-costo">${formatPeso(p.precioCosto)}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Precio de venta</span>
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
showView(getViewFromHash());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
