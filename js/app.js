const VIEWS = ["catalogo", "pedidos", "clientes", "cobros", "prendas", "cuenta"];

// ── Carrito ──────────────────────────────────────────────────────────────────

let carrito = [];

function addToCarrito(id) {
  const producto = catalogo.find((p) => p.id === id);
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

async function confirmarPedido() {
  if (!carrito.length || !VENDEDORA_ID) throw new Error('Carrito vacío o sesión inválida');

  const { data: pedido, error: errPedido } = await db
    .from('pedidos')
    .insert([{ vendedora_id: VENDEDORA_ID, estado: 'En proceso' }])
    .select()
    .single();

  if (errPedido) throw new Error(errPedido.message);

  const detalles = carrito.map(p => ({
    pedido_id: pedido.id,
    prenda_id: p.id,
    nombre:    p.nombre,
    marca:     p.marca,
    emoji:     p.emoji,
    precio:    p.precioCosto,
  }));

  const { error: errDetalles } = await db
    .from('detalle_pedidos')
    .insert(detalles);

  if (errDetalles) throw new Error(errDetalles.message);

  const prendaIds = carrito.map((p) => p.id).filter(Boolean);
  if (prendaIds.length) {
    await db.from('prendas').update({ disponible: false }).in('id', prendaIds);
  }

  return pedido;
}

function updateCartBadge() {
  const btn = document.getElementById("cartBtn");
  const badge = document.getElementById("cartBadge");
  if (!btn) return;
  btn.hidden = carrito.length === 0;
  badge.textContent = carrito.length;
}

function buildCartWhatsappUrl() {
  const nombreVendedora = perfil ? perfil.nombre : '';
  const lines = carrito.map((p) =>
    `${p.emoji} *${p.numero || formatZtId(p.id)}* — ${p.nombre} | Talla ${p.tallaEtiqueta} | ${formatPeso(p.precioCosto)}`
  );
  const msg =
    `Hola ZETINA! 👋 Soy *${nombreVendedora}* y quisiera hacer el siguiente pedido:\n\n` +
    lines.join("\n") +
    `\n\n💰 *Total a pagar: ${formatPeso(totalCarrito())}*\n\n¡Gracias! 🛍️`;
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
        <p class="prenda-id">ID: ${p.numero || formatZtId(p.id)}</p>
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
    <button class="btn-confirmar-pedido" id="btnConfirmarPedido">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
      Confirmar pedido
    </button>
    <p class="cart-error" id="cartError" hidden></p>`;
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
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="cart-body" id="cartSheetBody"></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCartSheet();
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", closeCartSheet);

  overlay.querySelector("#cartSheetBody").addEventListener("click", async (e) => {
    if (e.target.closest("#btnConfirmarPedido")) {
      const btn = document.getElementById("btnConfirmarPedido");
      const errEl = document.getElementById("cartError");
      if (errEl) errEl.hidden = true;
      const waUrl = buildCartWhatsappUrl();
      btn.disabled = true;
      btn.textContent = "Guardando pedido…";
      try {
        await confirmarPedido();
        clearCarrito();
        closeCartSheet();
        Promise.all([loadPedidos(), loadCatalogo()]).then(() => {
          renderPedidos();
          renderCatalog();
        });
        window.location.href = waUrl;
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg> Confirmar pedido`;
        if (errEl) {
          errEl.textContent = "No se pudo guardar el pedido. Verifica tu conexión e intenta de nuevo.";
          errEl.hidden = false;
        }
      }
      return;
    }
    if (e.target.closest("#cartClearBtn")) {
      clearCarrito();
      closeCartSheet();
      return;
    }
    const removeBtn = e.target.closest(".cart-item-remove");
    if (removeBtn) {
      const id = removeBtn.dataset.id;
      carrito = carrito.filter((p) => p.id !== id);
      updateCartBadge();
      refreshCartSheet();
    }
  });
}

// ── Auth / Sesión ────────────────────────────────────────────────────────────

const SESSION_KEY = 'zetina_session';

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSession(v) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: v.id, nombre: v.nombre }));
  localStorage.setItem('zetina_vendedora_id', v.id);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('zetina_vendedora_id');
}

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('login-hidden');
}

function hideLoginScreen() {
  document.getElementById('loginScreen').classList.add('login-hidden');
}

function initLoginForm() {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const errorEl  = document.getElementById('loginError');
    const btn      = document.getElementById('loginBtn');

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Verificando…';

    try {
      const { data, error } = await db
        .from('vendedoras')
        .select('id, nombre, email, password_hash, password_temporal, credito, foto_url')
        .eq('email', email)
        .single();

      if (error || !data || !data.password_hash) {
        throw new Error('Email o contraseña incorrectos');
      }

      const hash = await hashPassword(password);
      if (hash !== data.password_hash) {
        throw new Error('Email o contraseña incorrectos');
      }

      hideLoginScreen();
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';

      if (data.password_temporal) {
        showChangePasswordScreen({ id: data.id, nombre: data.nombre, credito: data.credito || 0, foto_url: data.foto_url });
        return;
      }

      saveSession(data);
      VENDEDORA_ID = data.id;
      perfil = { nombre: data.nombre, credito: data.credito || 0, foto: data.foto_url || null };
      await initApp();
    } catch (err) {
      errorEl.textContent = err.message;
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    }
  });
}

function showChangePasswordScreen(userData) {
  const screen = document.getElementById('changePasswordScreen');
  screen.classList.remove('login-hidden');
  document.getElementById('newPassword').value     = '';
  document.getElementById('confirmPassword').value = '';
  document.getElementById('changePasswordError').textContent = '';

  document.getElementById('changePasswordForm').onsubmit = async (e) => {
    e.preventDefault();
    const newPass     = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const errEl = document.getElementById('changePasswordError');
    const btn   = document.getElementById('changePasswordBtn');

    errEl.textContent = '';

    if (newPass.length < 6) {
      errEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (newPass !== confirmPass) {
      errEl.textContent = 'Las contraseñas no coinciden';
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    try {
      const hash = await hashPassword(newPass);
      const { error } = await db.from('vendedoras')
        .update({ password_hash: hash, password_temporal: false })
        .eq('id', userData.id);

      if (error) throw new Error('Error al guardar. Intenta de nuevo.');

      screen.classList.add('login-hidden');
      saveSession(userData);
      VENDEDORA_ID = userData.id;
      perfil = { nombre: userData.nombre, credito: userData.credito || 0, foto: userData.foto_url || null };
      await initApp();
    } catch (err) {
      errEl.textContent = err.message;
      btn.disabled    = false;
      btn.textContent = 'Guardar contraseña';
    }
  };
}

// ── Catálogo desde Supabase ──────────────────────────────────────────────────

let catalogo = [];
let catalogFiltros = { categorias: new Set(), tallas: new Set(), marcas: new Set(), precio: null };

// URL base del bucket público de fotos en Supabase Storage
const FOTOS_URL = `${SUPABASE_URL}/storage/v1/object/public/prenda-fotos`;

// Construye la URL pública correcta sin importar cómo esté guardada en la BD
function fotoPublicUrl(raw) {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;   // base64 de la galería de la vendedora
  if (raw.startsWith('http')) return raw;    // ya es URL completa de Supabase Storage
  return `${FOTOS_URL}/${raw}`;             // path relativo → URL pública completa
}

// Convierte cualquier URL de Supabase Storage al endpoint de transformación de imagen
function toTransformUrl(url, width, quality = 80, resize = 'contain') {
  if (!url || url.startsWith('data:')) return url;
  const m = url.match(/^(https?:\/\/[^/]+\/storage\/v1\/)(?:object\/public|render\/image\/public)\/(.+?)(\?.*)?$/);
  if (!m) return url;
  return `${m[1]}render/image/public/${m[2]}?width=${width}&quality=${quality}&resize=${resize}`;
}

async function loadCatalogo() {
  // No filtramos por 'baja' porque: a) cuando se da de baja también se pone disponible=false,
  // y b) la columna puede no existir si el schema-admin.sql no se ejecutó todavía.
  const { data, error } = await db
    .from('prendas')
    .select('id, numero, nombre, marca, categoria, emoji, gradiente, talla_etiqueta, talla_real, precio_costo, precio_min, precio_max, descripcion, fotos_prendas(url)')
    .eq('disponible', true)
    .order('created_at', { ascending: false });

  if (error) { console.error('loadCatalogo:', error.message); return; }

  catalogo = (data || []).map((p) => {
    const fotos = (p.fotos_prendas || []).map(f => fotoPublicUrl(f.url)).filter(Boolean);
    return {
      id:            p.id,
      numero:        p.numero    || null,
      nombre:        p.nombre,
      marca:         p.marca     || '',
      categoria:     p.categoria || '',
      emoji:         p.emoji     || '👚',
      tallaEtiqueta: p.talla_etiqueta || '',
      tallaReal:     p.talla_real     || '',
      precioCosto:   p.precio_costo   || 0,
      precioMin:     p.precio_min     || 0,
      precioMax:     p.precio_max     || 0,
      gradiente:     p.gradiente || 'linear-gradient(150deg, #130016 0%, #855AA2 100%)',
      descripcion:   p.descripcion || '',
      fotos,
      foto:          fotos[0] || null,
    };
  });
}

// ── Datos de pedidos (compras de la vendedora a ZETINA) ─────────────────────

let pedidosDB = [];

async function loadPedidos() {
  if (!VENDEDORA_ID) return;
  const { data, error } = await db
    .from('pedidos')
    .select(`id, estado, created_at,
             detalle_pedidos ( id, nombre, marca, emoji, precio )`)
    .eq('vendedora_id', VENDEDORA_ID)
    .order('created_at', { ascending: false });

  if (error) { console.error('loadPedidos:', error.message); return; }

  const count = (data || []).length;
  pedidosDB = (data || []).map((p, idx) => {
    const detalles = p.detalle_pedidos || [];
    return {
      id:     p.id,
      numero: String(count - idx).padStart(3, '0'),
      fecha:  p.created_at.split('T')[0],
      estado: p.estado,
      total:  detalles.reduce((sum, d) => sum + (d.precio || 0), 0),
      prendas: detalles.map(d => ({
        id:     d.id,
        nombre: d.nombre || 'Prenda',
        marca:  d.marca  || '',
        emoji:  d.emoji  || '👚',
        precio: d.precio,
      })),
    };
  });
}

// ── Inventario de la vendedora ───────────────────────────────────────────────

let inventario = [];
let devoluciones = []; // prenda_ids con estado "Pendiente"

async function loadInventario() {
  if (!VENDEDORA_ID) return;
  const { data, error } = await db
    .from('inventario_vendedoras')
    .select('id, prenda_id, pedido_id, fecha_entrega, prendas(*, fotos_prendas(*))')
    .eq('vendedora_id', VENDEDORA_ID)
    .eq('estado', 'activo')
    .order('created_at', { ascending: false });
  if (error) { console.error('loadInventario:', error); return; }

  inventario = (data || []).map(inv => {
    const p = inv.prendas || {};
    const fotos = (p.fotos_prendas || []).map(f => ({ id: f.id, url: fotoPublicUrl(f.url) })).filter(f => f.url);
    return {
      id: inv.prenda_id,
      invId: inv.id,
      numero: p.numero || null,
      nombre: p.nombre || '',
      marca: p.marca || '',
      emoji: p.emoji || '👚',
      tallaEtiqueta: p.talla_etiqueta || '',
      tallaReal: p.talla_real || '',
      precioCosto: p.precio_costo || 0,
      precioMin: p.precio_min || 0,
      precioMax: p.precio_max || 0,
      gradiente: p.gradiente || 'linear-gradient(150deg, #130016 0%, #855AA2 100%)',
      descripcion: p.descripcion || '',
      fotos,
      fechaEntrega: inv.fecha_entrega,
    };
  });

}

async function loadDevoluciones() {
  if (!VENDEDORA_ID) return;
  const { data } = await db
    .from('devoluciones')
    .select('prenda_id')
    .eq('vendedora_id', VENDEDORA_ID)
    .eq('estado', 'Pendiente');
  devoluciones = (data || []).map(d => d.prenda_id);
}

async function marcarVendida(prendaId) {
  await db.from('prendas').update({ disponible: false }).eq('id', prendaId);
}

async function insertPrenda(prenda) {
  const { data } = await db.from('prendas').insert([{
    vendedora_id: VENDEDORA_ID,
    nombre: prenda.nombre,
    marca: prenda.marca,
    emoji: prenda.emoji,
    talla_etiqueta: prenda.tallaEtiqueta,
    talla_real: prenda.tallaReal,
    precio_costo: prenda.precioCosto,
    precio_min: prenda.precioMin,
    precio_max: prenda.precioMax,
    gradiente: prenda.gradiente,
  }]).select().single();
  return data;
}

const ESTADO_CONFIG = {
  "En proceso": { bg: "#855AA2", color: "#ffffff" },
  "Pagado":     { bg: "#FF9500", color: "#ffffff" },
  "En camino":  { bg: "#CCB8DD", color: "#130016" },
  "Entregado":  { bg: "#DEFF00", color: "#130016" },
};

const MESES_ES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function formatFecha(iso) {
  const [y, m, d] = iso.split("-");
  return `${parseInt(d)} ${MESES_ES[parseInt(m) - 1]}. ${y}`;
}

// ── Utilidades ──────────────────────────────────────────────────────────────

function showToast(msg, duration = 2800) {
  document.querySelector(".zt-toast")?.remove();
  const t = document.createElement("div");
  t.className = "zt-toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("zt-toast--visible"));
  setTimeout(() => {
    t.classList.remove("zt-toast--visible");
    t.addEventListener("transitionend", () => t.remove(), { once: true });
  }, duration);
}

function formatPeso(n) {
  return "$" + n.toLocaleString("es-MX");
}

function formatZtId(id) {
  const s = String(id);
  return s.includes('-') ? 'ZT-' + s.slice(0, 8).toUpperCase() : 'ZT-' + s.padStart(3, '0');
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

// ── Galería de fotos ────────────────────────────────────────────────────────

const gallery = {
  overlay: null, img: null, titleEl: null, dotsEl: null, waBtn: null, dlBtn: null,
  fotos: [], current: 0, touchStartX: 0, prenda: null,

  init() {
    const el = document.createElement('div');
    el.className = 'gallery-overlay';
    el.innerHTML = `
      <div class="gallery-header">
        <div class="gallery-title" id="galleryTitle"></div>
        <button class="gallery-close" id="galleryClose" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="gallery-stage" id="galleryStage">
        <img class="gallery-img" id="galleryImg" src="" alt="">
      </div>
      <div class="gallery-footer">
        <div class="gallery-dots" id="galleryDots"></div>
        <div class="gallery-actions">
          <a class="gallery-btn gallery-btn--wa" id="galleryWa" href="#" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
            Compartir
          </a>
          <button class="gallery-btn gallery-btn--dl" id="galleryDl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Descargar
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.overlay = el;
    this.img     = document.getElementById('galleryImg');
    this.titleEl = document.getElementById('galleryTitle');
    this.dotsEl  = document.getElementById('galleryDots');
    this.waBtn   = document.getElementById('galleryWa');
    this.dlBtn   = document.getElementById('galleryDl');

    document.getElementById('galleryClose').addEventListener('click', () => this.close());
    this.dlBtn.addEventListener('click', () => this.download());

    const stage = document.getElementById('galleryStage');
    stage.addEventListener('touchstart', e => { this.touchStartX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 48) dx < 0 ? this.next() : this.prev();
    });
  },

  open(prendaId) {
    if (!this.overlay) this.init();
    const p = catalogo.find(x => String(x.id) === String(prendaId));
    if (!p) return;
    this.prenda  = p;
    this.fotos   = p.fotos && p.fotos.length ? p.fotos : (p.foto ? [p.foto] : []);
    if (!this.fotos.length) return;
    this.current = 0;
    this.titleEl.textContent = p.nombre;
    this.renderDots();
    this.showPhoto();
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.overlay.classList.remove('open');
    document.body.style.overflow = '';
  },

  next() { if (this.current < this.fotos.length - 1) { this.current++; this.showPhoto(); } },
  prev() { if (this.current > 0)                     { this.current--; this.showPhoto(); } },

  showPhoto() {
    const url = this.fotos[this.current];
    this.img.src = toTransformUrl(url, 800);
    this.img.alt = this.prenda.nombre;
    this.dotsEl.querySelectorAll('.gallery-dot').forEach((d, i) =>
      d.classList.toggle('active', i === this.current));
    this.waBtn.href = `https://wa.me/?text=${encodeURIComponent(this.prenda.nombre + ' - ' + this.prenda.marca + '\n' + url)}`;
    // Precargar imágenes adyacentes en segundo plano
    [this.current - 1, this.current + 1].forEach((i) => {
      if (i >= 0 && i < this.fotos.length) {
        const pre = new Image();
        pre.src = toTransformUrl(this.fotos[i], 800);
      }
    });
  },

  renderDots() {
    this.dotsEl.innerHTML = this.fotos.length > 1
      ? this.fotos.map((_, i) => `<span class="gallery-dot${i === 0 ? ' active' : ''}"></span>`).join('')
      : '';
  },

  async download() {
    const url = this.fotos[this.current];
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${this.prenda.nombre.replace(/\s+/g, '-')}-${this.current + 1}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch { window.open(url, '_blank'); }
  },
};

// ── Catálogo: helpers de filtros ─────────────────────────────────────────────

function filtrarCatalogo() {
  return catalogo.filter((p) => {
    if (catalogFiltros.categorias.size && !catalogFiltros.categorias.has(p.categoria)) return false;
    if (catalogFiltros.tallas.size && !catalogFiltros.tallas.has(p.tallaReal)) return false;
    if (catalogFiltros.marcas.size && !catalogFiltros.marcas.has(p.marca)) return false;
    if (catalogFiltros.precio) {
      const pm = p.precioMin;
      if (catalogFiltros.precio === 'lt500'     && pm >= 500)                   return false;
      if (catalogFiltros.precio === '500-1000'  && (pm < 500  || pm >= 1000))   return false;
      if (catalogFiltros.precio === '1000-2000' && (pm < 1000 || pm >= 2000))   return false;
      if (catalogFiltros.precio === 'gt2000'    && pm < 2000)                   return false;
    }
    return true;
  });
}

function buildCatalogCard(p) {
  const ganMin  = p.precioMin - p.precioCosto;
  const ganMax  = p.precioMax - p.precioCosto;
  const idLabel = p.numero || formatZtId(p.id);
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-image${p.foto ? ' product-image--foto' : ''} product-image--clickable"
           data-gallery-id="${p.id}"
           ${!p.foto ? `style="background:${p.gradiente}"` : ''}>
        ${p.foto
          ? `<img class="product-img" src="${p.foto}" alt="${p.nombre}" loading="lazy">`
          : `<span class="product-emoji" aria-hidden="true">${p.emoji}</span>`}
      </div>
      <div class="product-info">
        <div class="product-meta">
          <span class="brand-chip">${p.marca}</span>
        </div>
        <h3 class="product-name">${p.nombre}</h3>
        <p class="prenda-id">ID: ${idLabel}</p>
        <div class="talla-row">
          <div class="talla-chip">
            <span class="talla-label">Talla etiqueta</span>
            <span class="talla-val">${p.tallaEtiqueta || '—'}</span>
          </div>
          <div class="talla-chip">
            <span class="talla-label">Talla real</span>
            <span class="talla-val">${p.tallaReal || '—'}</span>
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
        <button class="btn-desc-catalogo" data-desc-id="${p.id}" type="button">Cómo vender</button>
        <div class="card-actions">
          <a href="${buildWhatsappUrl(p)}"
             target="_blank" rel="noopener noreferrer"
             class="btn-whatsapp">
            <svg class="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="${WA_PATH}"/>
            </svg>
            Compartir
          </a>
          <button class="btn-order" data-id="${p.id}">
            Agregar al carrito
          </button>
        </div>
      </div>
    </article>`;
}

function buildCatalogCards(items) {
  if (!items.length) return `<p class="catalog-empty-filtros">No se encontraron prendas</p>`;
  return items.map(buildCatalogCard).join('');
}

function actualizarUiFiltros(container, total) {
  const n = catalogFiltros.categorias.size + catalogFiltros.tallas.size + catalogFiltros.marcas.size + (catalogFiltros.precio ? 1 : 0);
  const btn = container.querySelector("#btnFiltrar");
  if (btn) {
    btn.classList.toggle("btn-filtrar--active", n > 0);
    btn.querySelector(".btn-filtrar-label").textContent = n > 0 ? `Filtrar · ${n}` : "Filtrar";
  }
  container.querySelector("#filtrosLimpiar")?.classList.toggle("filtros-limpiar-btn--hidden", n === 0);
  container.querySelector("#catalogGrid").innerHTML = buildCatalogCards(filtrarCatalogo());
  const sub = container.querySelector("#catalogSubtitle");
  if (sub) {
    const shown = filtrarCatalogo().length;
    sub.textContent = shown === total
      ? `${total} prenda${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''}`
      : `${shown} de ${total} prenda${total !== 1 ? 's' : ''}`;
  }
}

// ── Render: Catálogo ────────────────────────────────────────────────────────

function renderCatalog() {
  const container = document.querySelector("#catalogo .view-content");
  catalogFiltros = { categorias: new Set(), tallas: new Set(), marcas: new Set(), precio: null };

  if (!catalogo.length) {
    container.innerHTML = `
      <div class="catalog-header">
        <h2 class="catalog-title">Catálogo</h2>
        <p class="catalog-subtitle">0 prendas disponibles</p>
      </div>
      <div class="catalog-empty">
        <p class="catalog-empty-icon">👗</p>
        <p class="catalog-empty-text">El catálogo está vacío.<br>Pronto habrá prendas disponibles.</p>
      </div>`;
    return;
  }

  const cats   = [...new Set(catalogo.map(p => p.categoria).filter(Boolean))].sort();
  const tallas = [...new Set(catalogo.map(p => p.tallaReal).filter(Boolean))].sort();
  const marcas = [...new Set(catalogo.map(p => p.marca).filter(Boolean))].sort();
  const precioOpts = [
    { label: 'Menos de $500',  valor: 'lt500' },
    { label: '$500–$1,000',    valor: '500-1000' },
    { label: '$1,000–$2,000',  valor: '1000-2000' },
    { label: 'Más de $2,000',  valor: 'gt2000' },
  ];

  const seccion = (label, chips) => chips.length ? `
    <div class="filtros-seccion">
      <p class="filtros-seccion-label">${label}</p>
      <div class="filtros-chips-row">${chips}</div>
    </div>` : '';

  const total = catalogo.length;
  container.innerHTML = `
    <div class="catalog-header">
      <div class="catalog-header-row">
        <div>
          <h2 class="catalog-title">Catálogo</h2>
          <p class="catalog-subtitle" id="catalogSubtitle">${total} prenda${total !== 1 ? 's' : ''} disponible${total !== 1 ? 's' : ''}</p>
        </div>
        <button class="btn-filtrar" id="btnFiltrar" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span class="btn-filtrar-label">Filtrar</span>
        </button>
      </div>
    </div>
    <div class="filtros-panel" id="filtrosPanel" hidden>
      <div class="filtros-panel-top">
        <button class="filtros-limpiar-btn filtros-limpiar-btn--hidden" id="filtrosLimpiar">Limpiar todos</button>
      </div>
      ${seccion('Categoría', cats.map(c => `<button class="filtro-chip" data-tipo="categoria" data-valor="${c}">${c}</button>`).join(''))}
      ${seccion('Talla', tallas.map(t => `<button class="filtro-chip" data-tipo="talla" data-valor="${t}">${t}</button>`).join(''))}
      ${seccion('Marca', marcas.map(m => `<button class="filtro-chip" data-tipo="marca" data-valor="${m}">${m}</button>`).join(''))}
      ${seccion('Precio', precioOpts.map(o => `<button class="filtro-chip" data-tipo="precio" data-valor="${o.valor}">${o.label}</button>`).join(''))}
    </div>
    <div class="catalog-grid" id="catalogGrid">${buildCatalogCards(catalogo)}</div>`;

  container.querySelector("#btnFiltrar").addEventListener("click", () => {
    const panel = container.querySelector("#filtrosPanel");
    const btn   = container.querySelector("#btnFiltrar");
    panel.hidden = !panel.hidden;
    btn.setAttribute("aria-expanded", String(!panel.hidden));
  });

  container.querySelector("#filtrosPanel").addEventListener("click", (e) => {
    if (e.target.closest("#filtrosLimpiar")) {
      catalogFiltros = { categorias: new Set(), tallas: new Set(), marcas: new Set(), precio: null };
      container.querySelectorAll(".filtro-chip.active").forEach(c => c.classList.remove("active"));
      actualizarUiFiltros(container, total);
      return;
    }
    const chip = e.target.closest(".filtro-chip");
    if (!chip) return;
    const tipo  = chip.dataset.tipo;
    const valor = chip.dataset.valor;
    if (tipo === "categoria") {
      catalogFiltros.categorias.has(valor) ? catalogFiltros.categorias.delete(valor) : catalogFiltros.categorias.add(valor);
      chip.classList.toggle("active");
    } else if (tipo === "talla") {
      catalogFiltros.tallas.has(valor) ? catalogFiltros.tallas.delete(valor) : catalogFiltros.tallas.add(valor);
      chip.classList.toggle("active");
    } else if (tipo === "marca") {
      catalogFiltros.marcas.has(valor) ? catalogFiltros.marcas.delete(valor) : catalogFiltros.marcas.add(valor);
      chip.classList.toggle("active");
    } else if (tipo === "precio") {
      if (catalogFiltros.precio === valor) {
        catalogFiltros.precio = null;
        chip.classList.remove("active");
      } else {
        container.querySelectorAll('[data-tipo="precio"]').forEach(c => c.classList.remove("active"));
        catalogFiltros.precio = valor;
        chip.classList.add("active");
      }
    }
    actualizarUiFiltros(container, total);
  });

  container.querySelector("#catalogGrid").addEventListener("click", (e) => {
    const descBtn = e.target.closest(".btn-desc-catalogo");
    if (descBtn) {
      const p = catalogo.find((x) => String(x.id) === descBtn.dataset.descId);
      if (p) openPrendaDetalle(p, false);
      return;
    }
    const imgDiv = e.target.closest("[data-gallery-id]");
    if (imgDiv && !e.target.closest(".btn-order") && !e.target.closest(".btn-whatsapp")) {
      gallery.open(imgDiv.dataset.galleryId);
      return;
    }
    const btn = e.target.closest(".btn-order");
    if (btn) {
      const added = addToCarrito(btn.dataset.id);
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
      return;
    }
    if (!e.target.closest(".btn-whatsapp")) {
      const card = e.target.closest(".product-card");
      if (card) {
        const p = catalogo.find((x) => x.id === card.dataset.id);
        if (p) openPrendaDetalle(p, false);
      }
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
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sheet-body" id="orderDetailBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOrderDetail();
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", closeOrderDetail);
}

function openOrderDetail(id) {
  const p = pedidosDB.find((o) => o.id === id);
  if (!p) return;
  const { bg, color } = ESTADO_CONFIG[p.estado] || { bg: "#eee", color: "#333" };
  const total = p.total;
  const countLabel = p.prendas.length === 1 ? "1 prenda" : `${p.prendas.length} prendas`;

  const items = p.prendas.map((pr) => `
    <div class="sheet-item">
      <span class="sheet-item-emoji" aria-hidden="true">${pr.emoji}</span>
      <div class="sheet-item-info">
        <p class="sheet-item-name">${pr.nombre}</p>
        <p class="sheet-item-brand">${pr.marca}</p>
        <p class="prenda-id">ID: ${formatZtId(pr.id)}</p>
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

  if (!pedidosDB.length) {
    container.innerHTML = `
      <div class="pedidos-header">
        <h2 class="catalog-title">Mis Pedidos</h2>
        <p class="catalog-subtitle">Sin pedidos realizados</p>
      </div>
      <div class="catalog-empty">
        <p class="catalog-empty-icon">📦</p>
        <p class="catalog-empty-text">Aún no tienes pedidos</p>
      </div>`;
    return;
  }

  const orderCards = pedidosDB.map((p) => {
    const { bg, color } = ESTADO_CONFIG[p.estado] || { bg: "#eee", color: "#333" };
    const total = p.total;
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
      <p class="catalog-subtitle">${pedidosDB.length} pedido${pedidosDB.length !== 1 ? 's' : ''} realizados a ZETINA</p>
    </div>
    <div class="pedidos-filters">
      <button class="filter-btn active" data-filter="todos">Todos</button>
      <button class="filter-btn" data-filter="pagados">Pagados</button>
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
      if (filter === "pagados")    visible = estado === "Pagado";
      if (filter === "en-camino")  visible = estado === "En camino";
      if (filter === "entregados") visible = estado === "Entregado";
      card.style.display = visible ? "" : "none";
    });
  });

  container.querySelector(".orders-list").addEventListener("click", (e) => {
    const card = e.target.closest(".order-card");
    if (!card) return;
    openOrderDetail(card.dataset.id);
  });
}

// ── Datos de clientes ────────────────────────────────────────────────────────

let clientes = [];

const AVATAR_PALETTES = [
  { bg: "#855AA2", color: "#fff"     },
  { bg: "#DEFF00", color: "#130016"  },
  { bg: "#CCB8DD", color: "#130016"  },
];

function avatarPalette(id) {
  const hash = String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
}

function iniciales(nombre) {
  return nombre.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function tienePendiente(c) {
  const totalPrendas = (c.compras || []).reduce((s, comp) => s + comp.monto, 0);
  const totalPagado  = (c.pagos   || []).reduce((s, p)    => s + p.monto,    0);
  return totalPrendas > totalPagado;
}

const MESES_FULL = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function formatCumpleanos(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${parseInt(d)} de ${MESES_FULL[parseInt(m) - 1]}`;
}

async function loadClientes() {
  const { data, error } = await db
    .from('clientes')
    .select('*')
    .eq('vendedora_id', VENDEDORA_ID)
    .order('created_at', { ascending: false });
  if (!error && data) {
    clientes = data.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      telefono: row.telefono || '',
      tallaRopa: row.talla_ropa || '',
      tallaPantalon: row.talla_pantalon || '',
      tallaCalzado: row.talla_calzado || '',
      fechaCumpleanos: row.fecha_cumpleanos || '',
      notas: row.notas || '',
      compras: [],
      pagos: [],
    }));
  }
}

async function loadCobrosData() {
  const clienteIds = clientes.map((c) => c.id);
  if (!clienteIds.length) return;
  const [{ data: ventas }, { data: abonos }] = await Promise.all([
    db.from('ventas').select('*').in('cliente_id', clienteIds).order('fecha', { ascending: false }),
    db.from('abonos').select('*').in('cliente_id', clienteIds).order('fecha', { ascending: false }),
  ]);
  clientes.forEach((c) => {
    c.compras = (ventas || [])
      .filter((v) => v.cliente_id === c.id)
      .map((v) => ({ id: v.id, prendaId: v.prenda_id || null, prenda: v.nombre_prenda || '', marca: v.marca || '', fecha: v.fecha || '', monto: v.monto || 0 }));
    c.pagos = (abonos || [])
      .filter((a) => a.cliente_id === c.id)
      .map((a) => ({ id: a.id, fecha: a.fecha || '', monto: a.monto || 0 }));
  });
}

// ── Render: Clientes ─────────────────────────────────────────────────────────

function buildClienteCard(c) {
  const pendiente = tienePendiente(c);
  return `
    <article class="cliente-card" data-id="${c.id}" role="button" tabindex="0"
             aria-label="Ver detalle de ${c.nombre}">
      <div class="cliente-card-head">
        <div class="cliente-avatar">${iniciales(c.nombre)}</div>
        <div class="cliente-head-info">
          <p class="cliente-name">${c.nombre}</p>
          ${pendiente ? `<span class="badge-pendiente">Pago pendiente</span>` : ""}
        </div>
      </div>
      <div class="cliente-card-body">
        <p class="cliente-talla">Talla ${c.tallaRopa} · Pantalón ${c.tallaPantalon}${c.tallaCalzado ? ` · Calzado ${c.tallaCalzado}` : ""}</p>
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
  const emptyMsg = query
    ? "Sin resultados"
    : "Aún no tienes clientes registradas";
  list.innerHTML = filtered.length
    ? filtered.map(buildClienteCard).join("")
    : `<div class="clientes-empty"><p class="clientes-empty-text">${emptyMsg}</p></div>`;
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
    if (card) openClienteDetail(card.dataset.id);
  });
}

function createClienteDetailSheet() {
  if (document.getElementById("clienteDetailOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "clienteDetailOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="detail-sheet-handle-row">
        <div class="sheet-drag-handle"></div>
      </div>
      <div class="detail-sheet-topbar">
        <button class="btn-close-detail" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <button class="btn-edit-detail" aria-label="Editar clienta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
      <div class="sheet-body" id="clienteDetailBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-close-detail").addEventListener("click", () => {
    overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-edit-detail").addEventListener("click", () => {
    const id = overlay.dataset.currentId;
    if (id) openClienteEdit(id);
  });
  overlay.querySelector(".sheet-body").addEventListener("click", async (e) => {
    const ventaBtn = e.target.closest(".btn-registrar-venta");
    if (ventaBtn) openVentaForm(ventaBtn.dataset.id);
    const delBtn = e.target.closest(".btn-eliminar-cliente");
    if (delBtn) {
      if (!confirm("¿Eliminar esta clienta? Esta acción no se puede deshacer.")) return;
      const id = delBtn.dataset.id;
      const { error } = await db.from('clientes').delete().eq('id', id);
      if (!error) {
        clientes = clientes.filter((cl) => cl.id !== id);
        overlay.classList.remove("open");
        renderClientes();
      }
    }
  });
}

function openClienteDetail(id) {
  const c = clientes.find((cl) => cl.id === id);
  if (!c) return;
  const pendiente = tienePendiente(c);

  const comprasHTML = c.compras.length
    ? c.compras.map((comp) => `
        <div class="compra-card">
          <div class="compra-card-head">
            <span class="compra-prenda">${comp.prenda}</span>
          </div>
          <div class="compra-card-body">
            <span class="compra-meta">${comp.marca} · ${formatFecha(comp.fecha)}</span>
            <span class="compra-monto">${formatPeso(comp.monto)}</span>
          </div>
        </div>`).join("")
    : `<p class="compras-empty">Sin compras registradas</p>`;

  document.getElementById("clienteDetailBody").innerHTML = `
    <div class="detail-nombre-row">
      <h3 class="detail-nombre">${c.nombre}</h3>
      ${pendiente ? `<span class="badge-pendiente">Pago pendiente</span>` : ""}
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
      ${c.tallaCalzado ? `
      <div class="detail-field">
        <span class="detail-label">Talla de calzado</span>
        <span class="detail-value">${c.tallaCalzado}</span>
      </div>` : ""}
      ${c.fechaCumpleanos ? `
      <div class="detail-field">
        <span class="detail-label">Cumpleaños</span>
        <span class="detail-value">${formatCumpleanos(c.fechaCumpleanos)}</span>
      </div>` : ""}
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
    <button class="btn-registrar-venta" data-id="${c.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Registrar venta
    </button>
    <p class="sheet-section-label">
      Historial de compras (${c.compras.length})
    </p>
    <div class="compras-list">${comprasHTML}</div>
    <button class="btn-eliminar-cliente" data-id="${c.id}">
      Eliminar clienta
    </button>`;

  const detailOverlay = document.getElementById("clienteDetailOverlay");
  detailOverlay.dataset.currentId = c.id;
  detailOverlay.classList.add("open");
}

function createClienteFormSheet() {
  if (document.getElementById("clienteFormOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "clienteFormOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
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
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="fTallaCalzado">Talla de calzado</label>
              <input class="form-input" id="fTallaCalzado" name="tallaCalzado" type="text"
                     placeholder="Ej. 24.5" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label" for="fCumpleanos">Cumpleaños</label>
              <input class="form-input" id="fCumpleanos" name="fechaCumpleanos" type="date">
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
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));

  overlay.querySelector("#clienteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    const data = new FormData(e.target);
    const { data: row, error } = await db.from('clientes').insert({
      vendedora_id: VENDEDORA_ID,
      nombre: data.get("nombre").trim(),
      telefono: data.get("telefono").trim(),
      talla_ropa: data.get("tallaRopa"),
      talla_pantalon: data.get("tallaPantalon").trim(),
      talla_calzado: data.get("tallaCalzado").trim(),
      fecha_cumpleanos: data.get("fechaCumpleanos") || null,
      notas: data.get("notas").trim(),
    }).select().single();
    btn.disabled = false;
    btn.textContent = "Guardar clienta";
    if (error || !row) return;
    clientes.unshift({
      id: row.id,
      nombre: row.nombre,
      telefono: row.telefono || '',
      tallaRopa: row.talla_ropa || '',
      tallaPantalon: row.talla_pantalon || '',
      tallaCalzado: row.talla_calzado || '',
      fechaCumpleanos: row.fecha_cumpleanos || '',
      notas: row.notas || '',
      compras: [],
      pagos: [],
    });
    overlay.classList.remove("open");
    e.target.reset();
    renderClientes();
  });
}

function openClienteForm() {
  document.getElementById("clienteFormOverlay").classList.add("open");
}

function createClienteEditSheet() {
  if (document.getElementById("clienteEditOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "clienteEditOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sheet-body">
        <h3 class="cart-title" style="margin-bottom:1.25rem">Editar clienta</h3>
        <form id="clienteEditForm" class="cliente-form">
          <div class="form-group">
            <label class="form-label" for="eNombre">Nombre completo</label>
            <input class="form-input" id="eNombre" name="nombre" type="text"
                   placeholder="Ej. Ana López" required autocomplete="off">
          </div>
          <div class="form-group">
            <label class="form-label" for="eTelefono">Teléfono</label>
            <input class="form-input" id="eTelefono" name="telefono" type="tel"
                   placeholder="10 dígitos" required autocomplete="off">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="eTallaRopa">Talla de ropa</label>
              <select class="form-select" id="eTallaRopa" name="tallaRopa">
                <option>XS</option><option>S</option><option>M</option>
                <option>L</option><option>XL</option><option>XXL</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="eTallaPant">Talla pantalón</label>
              <input class="form-input" id="eTallaPant" name="tallaPantalon" type="text"
                     placeholder="Ej. 30" autocomplete="off">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="eTallaCalzado">Talla de calzado</label>
              <input class="form-input" id="eTallaCalzado" name="tallaCalzado" type="text"
                     placeholder="Ej. 24.5" autocomplete="off">
            </div>
            <div class="form-group">
              <label class="form-label" for="eCumpleanos">Cumpleaños</label>
              <input class="form-input" id="eCumpleanos" name="fechaCumpleanos" type="date">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="eNotas">Notas adicionales</label>
            <textarea class="form-textarea" id="eNotas" name="notas"
                      placeholder="Colores favoritos, estilo, forma de pago..."></textarea>
          </div>
          <button type="submit" class="btn-save-cliente">Guardar cambios</button>
        </form>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));

  overlay.querySelector("#clienteEditForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    const id = overlay.dataset.editId;
    const data = new FormData(e.target);
    const updates = {
      nombre: data.get("nombre").trim(),
      telefono: data.get("telefono").trim(),
      talla_ropa: data.get("tallaRopa"),
      talla_pantalon: data.get("tallaPantalon").trim(),
      talla_calzado: data.get("tallaCalzado").trim(),
      fecha_cumpleanos: data.get("fechaCumpleanos") || null,
      notas: data.get("notas").trim(),
    };
    const { error } = await db.from('clientes').update(updates).eq('id', id);
    btn.disabled = false;
    btn.textContent = "Guardar cambios";
    if (error) return;
    const c = clientes.find((cl) => cl.id === id);
    if (c) {
      c.nombre = updates.nombre;
      c.telefono = updates.telefono;
      c.tallaRopa = updates.talla_ropa;
      c.tallaPantalon = updates.talla_pantalon;
      c.tallaCalzado = updates.talla_calzado;
      c.fechaCumpleanos = updates.fecha_cumpleanos || '';
      c.notas = updates.notas;
    }
    overlay.classList.remove("open");
    renderClientes();
    openClienteDetail(id);
  });
}

function openClienteEdit(id) {
  const c = clientes.find((cl) => cl.id === id);
  if (!c) return;
  const overlay = document.getElementById("clienteEditOverlay");
  overlay.dataset.editId = id;

  overlay.querySelector("#eNombre").value = c.nombre;
  overlay.querySelector("#eTelefono").value = c.telefono;
  overlay.querySelector("#eTallaRopa").value = c.tallaRopa;
  overlay.querySelector("#eTallaPant").value = c.tallaPantalon;
  overlay.querySelector("#eTallaCalzado").value = c.tallaCalzado;
  overlay.querySelector("#eCumpleanos").value = c.fechaCumpleanos;
  overlay.querySelector("#eNotas").value = c.notas;

  overlay.classList.add("open");
}

// ── Venta ────────────────────────────────────────────────────────────────────

function getMisPrendas() {
  return inventario;
}

let currentVentaClienteId = null;

function createVentaFormSheet() {
  if (document.getElementById("ventaFormOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "ventaFormOverlay";
  overlay.className = "venta-form-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sheet-body">
        <h3 class="cart-title" style="margin-bottom:1.25rem">Registrar venta</h3>
        <form id="ventaForm" class="cliente-form">
          <div class="form-group">
            <label class="form-label" for="fPrenda">Prenda vendida</label>
            <select class="form-select" id="fPrenda" name="prendaKey" required></select>
          </div>
          <div class="form-group">
            <label class="form-label" for="fMonto">Precio de venta</label>
            <input class="form-input" id="fMonto" name="monto" type="number"
                   min="1" step="1" placeholder="Ej. 350" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="fFechaVenta">Fecha de venta</label>
            <input class="form-input" id="fFechaVenta" name="fecha" type="date" required>
          </div>
          <button type="submit" class="btn-save-cliente">Guardar venta</button>
          <p id="ventaFormError" style="display:none;color:#e53e3e;font-size:0.875rem;margin-top:0.5rem;text-align:center"></p>
        </form>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));

  overlay.querySelector("#ventaForm").addEventListener("submit", async (e) => {
    console.log('[ventaForm] submit disparado');
    e.preventDefault();
    const form  = e.target;
    const btn   = form.querySelector("button[type=submit]");
    const errEl = form.querySelector("#ventaFormError");

    const showErr = (msg) => {
      console.error('[ventaForm]', msg);
      if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
    };

    if (errEl) errEl.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Guardando…";

    try {
      const formData   = new FormData(form);
      const parts      = formData.get("prendaKey").split("|");
      const prendaIdStr = parts[0] || '';
      const nombre      = parts[1] || '';
      const marca       = parts[2] || '';
      const UUID_RE     = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const prendaId    = UUID_RE.test(prendaIdStr) ? prendaIdStr : null;

      const c = clientes.find((cl) => cl.id === currentVentaClienteId);
      if (!c) {
        showErr('Clienta no encontrada, id: ' + currentVentaClienteId);
        btn.disabled = false; btn.textContent = "Guardar venta"; return;
      }

      const payload = {
        cliente_id:    currentVentaClienteId,
        vendedora_id:  VENDEDORA_ID,
        prenda_id:     prendaId,
        nombre_prenda: nombre,
        marca,
        fecha:  formData.get("fecha"),
        monto:  parseFloat(formData.get("monto")) || 0,
        estado: 'pendiente',
      };
      console.log('[ventaForm] payload:', payload);

      const { data: venta, error } = await db.from('ventas').insert(payload).select().single();

      btn.disabled = false;
      btn.textContent = "Guardar venta";

      if (error) {
        showErr(`Error Supabase (${error.code}): ${error.message}`);
        return;
      }
      if (!venta) {
        showErr('Sin respuesta de Supabase. Intenta de nuevo.');
        return;
      }

      console.log('[ventaForm] guardado:', venta);
      c.compras.unshift({ id: venta.id, prendaId: venta.prenda_id, prenda: venta.nombre_prenda || nombre, marca: venta.marca || '', fecha: venta.fecha, monto: venta.monto });
      if (prendaId) {
        await marcarVendida(prendaId);
        inventario = inventario.filter((p) => p.id !== prendaId);
        renderMisPrendas();
      }
      overlay.classList.remove("open");
      form.reset();
      openClienteDetail(currentVentaClienteId);
      renderCobros();
    } catch (err) {
      console.error('[ventaForm] excepción inesperada:', err);
      btn.disabled = false;
      btn.textContent = "Guardar venta";
      showErr('Error inesperado: ' + err.message);
    }
  });
}

function openVentaForm(clienteId) {
  currentVentaClienteId = clienteId;
  const select = document.getElementById("fPrenda");
  const prendas = getMisPrendas();
  select.innerHTML = prendas.length
    ? prendas.map((p) => `<option value="${p.id}|${p.nombre}|${p.marca}">${p.emoji} ${p.nombre} — ${p.marca} | ID: ${formatZtId(p.id)}</option>`).join("")
    : `<option value="Otra prenda|">Sin prendas en inventario</option>`;
  document.getElementById("fFechaVenta").value = new Date().toISOString().split("T")[0];
  document.getElementById("ventaFormOverlay").classList.add("open");
}

// ── Devoluciones ────────────────────────────────────────────────────────────

function createDevolucionSheet() {
  if (document.getElementById("devolucionOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "devolucionOverlay";
  overlay.className = "venta-form-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sheet-body">
        <h3 class="cart-title" style="margin-bottom:0.25rem">Reportar devolución</h3>
        <p class="devolucion-prenda-info" id="devolucionPrendaInfo"></p>
        <form id="devolucionForm" class="cliente-form">
          <div class="form-group">
            <label class="form-label" for="fMotivo">Motivo</label>
            <select class="form-select" id="fMotivo" name="motivo" required>
              <option value="">Selecciona un motivo…</option>
              <option value="cambio_talla">Cambio de talla</option>
              <option value="defecto">Defecto</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="fNota">Nota adicional (opcional)</label>
            <textarea class="form-textarea" id="fNota" name="nota" placeholder="Describe el problema…"></textarea>
          </div>
          <button type="submit" class="btn-save-cliente">Enviar solicitud</button>
        </form>
        <div class="devolucion-confirmacion" id="devolucionConfirmacion">
          <span class="devolucion-check" aria-hidden="true">✅</span>
          <p class="devolucion-msg">Tu solicitud fue enviada, ZETINA te contactará por WhatsApp para coordinar el envío</p>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));

  overlay.querySelector("#devolucionForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Enviando…";

    const formData = new FormData(e.target);
    const prendaId = overlay.dataset.prendaId;
    const motivo = formData.get("motivo");
    const nota = formData.get("nota") || null;

    // Construir mensaje WA antes del await para tenerlo listo siempre
    const p = inventario.find(x => x.id === prendaId);
    const motivoLabel = { cambio_talla: "Cambio de talla", defecto: "Defecto", otro: "Otro" }[motivo] || motivo;
    const waTexto = [
      `Hola ZETINA, quiero reportar una devolución:`,
      `Vendedora: ${perfil.nombre}`,
      `ID prenda: ${formatZtId(prendaId)}`,
      `Prenda: ${p ? p.nombre : prendaId}`,
      `Motivo: ${motivoLabel}`,
      nota ? `Nota: ${nota}` : null,
    ].filter(Boolean).join("\n");
    const waUrl = `https://wa.me/525579346962?text=${encodeURIComponent(waTexto)}`;

    // Guardar en Supabase (error no bloquea el flujo)
    const { error } = await db.from("devoluciones").insert([{
      prenda_id: prendaId,
      vendedora_id: VENDEDORA_ID,
      motivo,
      nota,
      estado: "Pendiente",
    }]);

    btn.disabled = false;
    btn.textContent = "Enviar solicitud";

    if (!error && !devoluciones.includes(prendaId)) devoluciones.push(prendaId);
    if (!error) renderMisPrendas();
    if (error) console.error("devolucion insert:", error.message);

    // Abrir WhatsApp siempre, haya o no error en Supabase
    e.target.reset();
    overlay.querySelector("#devolucionForm").style.display = "none";
    overlay.querySelector("#devolucionConfirmacion").style.display = "flex";
    window.location.href = waUrl;
  });
}

function openDevolucionForm(prendaId) {
  const overlay = document.getElementById("devolucionOverlay");
  overlay.dataset.prendaId = prendaId;
  const p = inventario.find(x => x.id === prendaId);
  document.getElementById("devolucionPrendaInfo").textContent = p ? `${p.emoji} ${p.nombre} — ${p.marca}` : "";
  overlay.querySelector("#devolucionForm").style.display = "";
  overlay.querySelector("#devolucionConfirmacion").style.display = "none";
  overlay.querySelector("#fMotivo").value = "";
  overlay.querySelector("#fNota").value = "";
  overlay.classList.add("open");
}

// ── Sheet: Vendida ──────────────────────────────────────────────────────────

function renderVendidaClientasList(overlay, query) {
  const list = overlay.querySelector("#vendidaClientesList");
  if (!clientes.length) {
    list.innerHTML = `<p class="vendida-empty">No tienes clientas registradas.<br>
      <a class="vendida-empty-link" href="#clientes">Ir a Clientes →</a></p>`;
    list.querySelector(".vendida-empty-link").addEventListener("click", () => overlay.classList.remove("open"));
    return;
  }
  const filtered = query
    ? clientes.filter(c => c.nombre.toLowerCase().includes(query))
    : clientes;
  if (!filtered.length) {
    list.innerHTML = `<p class="vendida-empty">Sin resultados</p>`;
    return;
  }
  list.innerHTML = filtered.map(c => {
    const pal = avatarPalette(c.id);
    return `<button class="vendida-cliente-item" data-cliente-id="${c.id}">
      <div class="vendida-cliente-avatar" style="background:${pal.bg};color:${pal.color}">${iniciales(c.nombre)}</div>
      <span class="vendida-cliente-nombre">${c.nombre}</span>
    </button>`;
  }).join("");
}

function createVendidaSheet() {
  if (document.getElementById("vendidaOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "vendidaOverlay";
  overlay.className = "venta-form-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="sheet-body" id="vendidaStep1">
        <h3 class="vendida-sheet-title" id="vendidaTitulo"></h3>
        <input class="search-input vendida-busqueda" id="vendidaBusqueda" type="search"
               placeholder="Buscar clienta…" autocomplete="off" autocorrect="off" spellcheck="false">
        <div class="vendida-clientes-list" id="vendidaClientesList"></div>
      </div>

      <div class="sheet-body" id="vendidaStep2" hidden>
        <button class="vendida-back-btn" id="vendidaBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          Volver
        </button>
        <div class="vendida-resumen" id="vendidaResumen"></div>
        <div class="form-group" style="margin-top:1rem">
          <label class="form-label" for="vendidaPrecio">Precio de venta</label>
          <input class="form-input" type="number" id="vendidaPrecio" min="0" step="1" inputmode="numeric">
        </div>
        <button class="btn-confirmar-venta" id="vendidaConfirmar">Confirmar venta</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));

  overlay.querySelector("#vendidaBusqueda").addEventListener("input", (e) => {
    renderVendidaClientasList(overlay, e.target.value.trim().toLowerCase());
  });

  overlay.querySelector("#vendidaClientesList").addEventListener("click", (e) => {
    const item = e.target.closest(".vendida-cliente-item");
    if (!item) return;
    const c = clientes.find(x => x.id === item.dataset.clienteId);
    const p = inventario.find(x => x.id === overlay.dataset.prendaId);
    if (!c || !p) return;
    overlay.dataset.clienteId = c.id;
    const pal = avatarPalette(c.id);
    overlay.querySelector("#vendidaResumen").innerHTML = `
      <div class="vendida-resumen-row">
        <div class="vendida-resumen-avatar" style="background:${pal.bg};color:${pal.color}">${iniciales(c.nombre)}</div>
        <div>
          <p class="vendida-resumen-clienta">${c.nombre}</p>
          <p class="vendida-resumen-prenda">${p.nombre} — ${p.marca}</p>
        </div>
      </div>`;
    overlay.querySelector("#vendidaPrecio").value = p.precioMax || "";
    overlay.querySelector("#vendidaStep1").hidden = true;
    overlay.querySelector("#vendidaStep2").hidden = false;
  });

  overlay.querySelector("#vendidaBack").addEventListener("click", () => {
    overlay.querySelector("#vendidaStep1").hidden = false;
    overlay.querySelector("#vendidaStep2").hidden = true;
  });

  overlay.querySelector("#vendidaConfirmar").addEventListener("click", async () => {
    const btn = overlay.querySelector("#vendidaConfirmar");
    const p = inventario.find(x => x.id === overlay.dataset.prendaId);
    const c = clientes.find(x => x.id === overlay.dataset.clienteId);
    if (!p || !c) return;
    const precioVenta = parseFloat(overlay.querySelector("#vendidaPrecio").value) || p.precioMax;

    btn.disabled = true;
    btn.textContent = "Registrando…";

    try {
      const { error: ve } = await db.from("ventas").insert([{
        vendedora_id:  VENDEDORA_ID,
        cliente_id:    c.id,
        prenda_id:     p.id,
        nombre_prenda: p.nombre,
        marca:         p.marca,
        fecha:         new Date().toISOString().split("T")[0],
        monto:         precioVenta,
        estado:        "pendiente",
      }]);
      if (ve) throw ve;

      const { error: ie } = await db.from("inventario_vendedoras").delete().eq("id", p.invId);
      if (ie) throw ie;

      inventario = inventario.filter(x => x.invId !== p.invId);
      overlay.classList.remove("open");
      renderMisPrendas();
      renderCobros();

      showToast("¡Venta registrada! 🎉");

      const tel = (c.telefono || "").replace(/\D/g, "");
      if (tel) {
        const waMsg = `Hola ${c.nombre}, gracias por adquirir ${p.nombre} 💜 Te escribo de parte de ZETINA Moda Selecta.`;
        setTimeout(() => window.open(`https://wa.me/521${tel}?text=${encodeURIComponent(waMsg)}`, "_blank"), 600);
      }
    } catch (err) {
      console.error("vendida:", err);
      btn.disabled = false;
      btn.textContent = "Confirmar venta";
      showToast("Error al registrar. Intenta de nuevo.");
    }
  });
}

function openVendidaSheet(prendaId) {
  createVendidaSheet();
  const overlay = document.getElementById("vendidaOverlay");
  const p = inventario.find(x => x.id === prendaId);
  if (!p) return;
  overlay.dataset.prendaId = prendaId;
  overlay.dataset.clienteId = "";
  overlay.querySelector("#vendidaTitulo").textContent = `¿A quién le vendiste ${p.nombre}?`;
  overlay.querySelector("#vendidaBusqueda").value = "";
  overlay.querySelector("#vendidaStep1").hidden = false;
  overlay.querySelector("#vendidaStep2").hidden = true;
  renderVendidaClientasList(overlay, "");
  overlay.classList.add("open");
}

// ── Render: Mis Prendas ─────────────────────────────────────────────────────

function buildInvCard(p) {
  const fotos = p.fotos || [];
  const primeraFoto = fotos.find(f => f.url);
  const pendiente = devoluciones.includes(p.id);
  return `
    <article class="inv-card" data-id="${p.id}" role="button" tabindex="0">
      <div class="inv-card-img" style="background:${p.gradiente}"${fotos.length ? ` data-galeria-id="${p.id}"` : ''}>
        ${primeraFoto
          ? `<img class="inv-card-foto" src="${primeraFoto.url}" alt="${p.nombre}" loading="lazy">`
          : `<span class="inv-card-emoji" aria-hidden="true">${p.emoji}</span>`}
        ${pendiente ? `<span class="inv-devolucion-badge">Devolución pendiente</span>` : ""}
      </div>
      <div class="inv-card-body">
        <p class="inv-card-id">${p.numero || formatZtId(p.id)}</p>
        <p class="inv-card-nombre">${p.nombre}</p>
        <p class="inv-card-marca">${p.marca}</p>
        <div class="inv-tallas">
          <span class="inv-talla-chip">Etq&nbsp;<strong>${p.tallaEtiqueta}</strong></span>
          <span class="inv-talla-chip">Real&nbsp;<strong>${p.tallaReal}</strong></span>
        </div>
        <p class="inv-precio-rango">${formatPeso(p.precioMax)}</p>
        <button class="btn-inv-info" data-info="${p.id}" aria-label="Ver descripción">
          Ver descripción
        </button>
        <div class="inv-card-secondary-actions">
          <button class="btn-inv-vendida" data-vendida-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
            Vendida
          </button>
          ${!pendiente ? `
          <button class="btn-inv-devolucion" data-devolucion="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="11" height="11"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            Devolución
          </button>` : ""}
          <button class="btn-inv-eliminar" data-inv-id="${p.invId}" data-prenda-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="11" height="11"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Eliminar
          </button>
        </div>
      </div>
    </article>`;
}

function renderMisPrendas() {
  const container = document.querySelector("#prendas .view-content");

  const renderGrid = (items) => items.length
    ? items.map(buildInvCard).join("")
    : `<p class="inv-empty">Sin prendas disponibles</p>`;

  container.innerHTML = `
    <div class="catalog-header">
      <h2 class="catalog-title">Mis Prendas</h2>
      <p class="catalog-subtitle">${inventario.length} prenda${inventario.length !== 1 ? "s" : ""} disponible${inventario.length !== 1 ? "s" : ""}</p>
    </div>
    <div class="clientes-search-row">
      <input class="search-input" id="prendasBusqueda" type="search"
             placeholder="Buscar por ID, nombre o marca…" autocomplete="off"
             autocorrect="off" spellcheck="false">
    </div>
    <div class="inv-grid" id="invGrid">${renderGrid(inventario)}</div>`;

  container.querySelector("#prendasBusqueda").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtradas = q
      ? inventario.filter((p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.marca.toLowerCase().includes(q) ||
          formatZtId(p.id).toLowerCase().includes(q))
      : inventario;
    container.querySelector("#invGrid").innerHTML = renderGrid(filtradas);
  });

  container.onclick = (e) => {
    const imgDiv = e.target.closest(".inv-card-img[data-galeria-id]");
    if (imgDiv) { openGaleria(imgDiv.dataset.galeriaId); return; }
    const infoBtn = e.target.closest(".btn-inv-info");
    if (infoBtn) {
      const p = inventario.find((x) => x.id === infoBtn.dataset.info);
      if (p) openPrendaDetalle(p, true);
      return;
    }
    const vendidaBtn = e.target.closest(".btn-inv-vendida");
    if (vendidaBtn) { openVendidaSheet(vendidaBtn.dataset.vendidaId); return; }
    const devBtn = e.target.closest(".btn-inv-devolucion");
    if (devBtn) { openDevolucionForm(devBtn.dataset.devolucion); return; }
    const eliminarBtn = e.target.closest(".btn-inv-eliminar");
    if (eliminarBtn) {
      if (!confirm("¿Seguro que quieres eliminar esta prenda de tu inventario?")) return;
      const invId = eliminarBtn.dataset.invId;
      db.from('inventario_vendedoras').delete().eq('id', invId).then(({ error }) => {
        if (error) { console.error('eliminar prenda:', error.message); return; }
        inventario = inventario.filter((p) => p.invId !== invId);
        renderMisPrendas();
      });
      return;
    }
    const card = e.target.closest(".inv-card");
    if (!card) return;
    const p = inventario.find((x) => x.id === card.dataset.id);
    if (p) openPrendaDetalle(p, true);
  };
}

// ── Detalle de prenda (descripción) ─────────────────────────────────────────

function buildDescripcionSections(rawDesc) {
  const text = (rawDesc || '').trim();
  if (!text) return `<p class="pd-empty">Sin descripción disponible</p>`;

  // El admin guarda la descripción como JSON estructurado
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (_) {}

  if (parsed && typeof parsed === 'object') {
    const { por_que_vale, cliente_ideal, como_presentarla,
            general, material, composicion, cuidado, como_usar } = parsed;
    let html = '';

    if (por_que_vale) html += `
      <div class="pd-section">
        <h4 class="pd-section-title">Por qué vale lo que cuesta</h4>
        <p class="pd-section-text">${por_que_vale.replace(/\n/g, '<br>')}</p>
      </div>`;

    if (cliente_ideal) html += `
      <div class="pd-section">
        <h4 class="pd-section-title">Cliente ideal</h4>
        <p class="pd-section-text">${cliente_ideal.replace(/\n/g, '<br>')}</p>
      </div>`;

    if (como_presentarla) html += `
      <div class="pd-section">
        <h4 class="pd-section-title">Cómo presentarla</h4>
        <p class="pd-section-text">${como_presentarla.replace(/\n/g, '<br>')}</p>
      </div>`;

    if (general) html += `
      <div class="pd-section">
        <h4 class="pd-section-title">Descripción general</h4>
        <p class="pd-section-text">${general.replace(/\n/g, '<br>')}</p>
      </div>`;

    const fichaItems = [
      material    && { key: 'Material',    val: material },
      composicion && { key: 'Composición', val: composicion },
      cuidado     && { key: 'Cuidados',    val: cuidado },
    ].filter(Boolean);

    if (fichaItems.length) {
      const rows = fichaItems.map(({ key, val }) =>
        `<div class="pd-ficha-row"><span class="pd-ficha-key">${key}</span><span class="pd-ficha-val">${val}</span></div>`
      ).join('');
      html += `
        <div class="pd-section">
          <h4 class="pd-section-title">Ficha técnica</h4>
          <div class="pd-ficha">${rows}</div>
        </div>`;
    }

    if (como_usar) html += `
      <div class="pd-section">
        <h4 class="pd-section-title">Cómo usar y combinar</h4>
        <p class="pd-section-text">${como_usar.replace(/\n/g, '<br>')}</p>
      </div>`;

    return html || `<div class="pd-section"><p class="pd-section-text">${text}</p></div>`;
  }

  // Fallback: texto libre — detectar marcadores si los hay
  const FICHA_RE = /^(material|composici[oó]n|cuidados?|instrucciones?|tela|tejido|lavado)\s*:/i;
  const USO_RE   = /^c[oó]mo\s+(usar|combinar|llevarlo?|usarlo?)/i;

  const lines    = text.split('\n');
  const hasFicha = lines.some(l => FICHA_RE.test(l.trim()));
  const hasUso   = lines.some(l => USO_RE.test(l.trim()));

  if (!hasFicha && !hasUso) {
    return `<div class="pd-section"><p class="pd-section-text">${text.replace(/\n/g, '<br>')}</p></div>`;
  }

  const general = [], ficha = [], uso = [];
  let mode = 'general';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (USO_RE.test(line)) {
      mode = 'uso';
      const afterColon = line.includes(':') ? line.slice(line.indexOf(':') + 1).trim() : '';
      if (afterColon) uso.push(afterColon);
    } else if (FICHA_RE.test(line)) {
      mode = 'ficha';
      ficha.push(line);
    } else if (mode === 'uso')   { uso.push(line);     }
    else if  (mode === 'ficha')  { ficha.push(line);   }
    else                         { general.push(line); }
  }

  let html = '';

  if (general.length) html += `
    <div class="pd-section">
      <h4 class="pd-section-title">Descripción general</h4>
      <p class="pd-section-text">${general.join('<br>')}</p>
    </div>`;

  if (ficha.length) {
    const rows = ficha.map(line => {
      const idx = line.indexOf(':');
      return idx > 0
        ? `<div class="pd-ficha-row"><span class="pd-ficha-key">${line.slice(0, idx)}</span><span class="pd-ficha-val">${line.slice(idx + 1).trim()}</span></div>`
        : `<div class="pd-ficha-row"><span class="pd-ficha-val">${line}</span></div>`;
    }).join('');
    html += `
      <div class="pd-section">
        <h4 class="pd-section-title">Ficha técnica</h4>
        <div class="pd-ficha">${rows}</div>
      </div>`;
  }

  if (uso.length) html += `
    <div class="pd-section">
      <h4 class="pd-section-title">Cómo usar y combinar</h4>
      <p class="pd-section-text">${uso.join('<br>')}</p>
    </div>`;

  return html || `<div class="pd-section"><p class="pd-section-text">${text.replace(/\n/g, '<br>')}</p></div>`;
}

function createPrendaDetalleSheet() {
  if (document.getElementById("prendaDetalleOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "prendaDetalleOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="detail-sheet-handle-row">
        <div class="sheet-drag-handle"></div>
      </div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <span class="pd-sheet-title" id="prendaDetalleTitle"></span>
      </div>
      <div class="sheet-body" id="prendaDetalleBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.querySelector(".sheet-body").addEventListener("click", (e) => {
    if (e.target.closest(".btn-ver-fotos")) {
      overlay.classList.remove("open");
      openGaleria(overlay.dataset.prendaId);
    }
  });
}

function openPrendaDetalle(p, fromInventario = false) {
  const overlay = document.getElementById("prendaDetalleOverlay");
  overlay.dataset.prendaId = p.id;
  document.getElementById("prendaDetalleTitle").textContent =
    fromInventario ? 'Descripción' : 'Cómo vender esta prenda';
  document.getElementById("prendaDetalleBody").innerHTML = `
    <div class="pd-header">
      <span class="pd-marca">${p.marca}</span>
      <h3 class="pd-nombre">${p.nombre}</h3>
    </div>
    <div class="pd-chips">
      <span class="pd-chip">Talla etiq. <strong>${p.tallaEtiqueta || '—'}</strong></span>
      <span class="pd-chip">Talla real <strong>${p.tallaReal || '—'}</strong></span>
    </div>
    ${buildDescripcionSections(p.descripcion)}`;
  overlay.classList.add("open");
}

// ── Galería de fotos ────────────────────────────────────────────────────────

let galeriaCurrentIdx = 0;
let galeriaTotalSlides = 0;

function loadGaleriaSlide(idx) {
  const carousel = document.getElementById("galeriaCarousel");
  if (!carousel) return;
  const slide = carousel.children[idx];
  if (!slide) return;
  const img = slide.querySelector("img[data-src]");
  if (img) { img.src = img.dataset.src; img.removeAttribute("data-src"); }
}

function goToGaleriaSlide(idx) {
  if (idx < 0 || idx >= galeriaTotalSlides) return;
  const carousel = document.getElementById("galeriaCarousel");
  if (!carousel) return;
  Array.from(carousel.children).forEach((slide, i) => {
    slide.classList.remove("active", "prev");
    if (i === idx) slide.classList.add("active");
    else if (i < idx) slide.classList.add("prev");
  });
  galeriaCurrentIdx = idx;
  document.querySelectorAll(".galeria-dot").forEach((d, i) =>
    d.classList.toggle("galeria-dot--active", i === idx));
  loadGaleriaSlide(idx - 1);
  loadGaleriaSlide(idx);
  loadGaleriaSlide(idx + 1);
}

function createGaleriaSheet() {
  const overlay = document.createElement("div");
  overlay.className = "order-detail-overlay";
  overlay.id = "galeriaOverlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet galeria-sheet">
      <div class="detail-sheet-handle-row"><div class="sheet-drag-handle"></div></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar galería">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="galeria-prenda-info" id="galeriaPrendaInfo"></div>
      <div class="galeria-carousel-wrap">
        <div class="galeria-carousel" id="galeriaCarousel"></div>
        <div class="galeria-dots" id="galeriaDots"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  const carousel = document.getElementById("galeriaCarousel");

  // Touch swipe navigation
  let touchStartX = 0;
  let touchStartY = 0;
  let swiping = false;

  carousel.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    swiping = false;
  }, { passive: true });

  carousel.addEventListener("touchmove", (e) => {
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    if (dx > dy && dx > 8) swiping = true;
  }, { passive: true });

  carousel.addEventListener("touchend", (e) => {
    if (!swiping) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -40) goToGaleriaSlide(galeriaCurrentIdx + 1);
    else if (dx > 40) goToGaleriaSlide(galeriaCurrentIdx - 1);
  }, { passive: true });

  carousel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const prendaId = overlay.dataset.prendaId;
    const p = inventario.find((item) => item.id === prendaId);
    if (!p) return;
    const fotoId = btn.dataset.fotoId;
    const foto = (p.fotos || []).find((f) => String(f.id) === fotoId);
    if (!foto) return;

    if (btn.dataset.action === "descargar") {
      const a = document.createElement("a");
      a.href = foto.url;
      a.download = `${p.nombre.replace(/\s+/g, "_")}_${fotoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (btn.dataset.action === "compartir") {
      compartirFotoWA(p, foto);
    }
  });
}

async function compartirFotoWA(p, foto) {
  if (!navigator.share) return;
  try {
    const res = await fetch(foto.url);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const file = new File([blob], `${p.nombre.replace(/\s+/g, "_")}.${ext}`, { type: blob.type });
    const data = { files: [file], text: `${p.emoji} *${p.nombre}*\n${p.marca} · Talla ${p.tallaReal}` };
    if (navigator.canShare && navigator.canShare(data)) {
      await navigator.share(data);
    } else {
      await navigator.share({ text: data.text });
    }
  } catch (_) {}
}

function refreshGaleriaCarousel(p) {
  const carousel = document.getElementById("galeriaCarousel");
  const dots     = document.getElementById("galeriaDots");
  const fotos    = p.fotos || [];

  if (fotos.length === 0) {
    carousel.innerHTML = `
      <div class="galeria-empty">
        <p class="galeria-empty-icon">📷</p>
        <p class="galeria-empty-text">Esta prenda aún no tiene fotos</p>
      </div>`;
    dots.innerHTML = "";
    return;
  }

  carousel.innerHTML = fotos.map((foto, i) => {
    const transformUrl = toTransformUrl(foto.url, 800);
    const imgAttr = i === 0 ? `src="${transformUrl}"` : `data-src="${transformUrl}"`;
    return `
    <div class="galeria-slide${i === 0 ? " active" : ""}">
      <div class="galeria-img-wrap">
        <img class="galeria-img" ${imgAttr} alt="">
      </div>
      <div class="galeria-slide-actions">
        <button class="btn-galeria-action btn-galeria-dl" data-action="descargar" data-foto-id="${foto.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar
        </button>
        <button class="btn-galeria-action btn-galeria-wa" data-action="compartir" data-foto-id="${foto.id}">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
          Compartir
        </button>
      </div>
    </div>`;
  }).join("");

  galeriaTotalSlides = fotos.length;
  galeriaCurrentIdx = 0;

  dots.innerHTML = fotos.map((_, i) =>
    `<span class="galeria-dot${i === 0 ? " galeria-dot--active" : ""}"></span>`).join("");
}

function openGaleria(prendaId) {
  const overlay = document.getElementById("galeriaOverlay");
  const p = inventario.find((item) => item.id === prendaId);
  if (!p) return;
  overlay.dataset.prendaId = prendaId;

  document.getElementById("galeriaPrendaInfo").innerHTML = `
    <p class="galeria-prenda-id">ID: ${p.numero || formatZtId(p.id)}</p>
    <h3 class="galeria-prenda-nombre">${p.nombre}</h3>`;

  refreshGaleriaCarousel(p);
  overlay.classList.add("open");
  loadGaleriaSlide(1);
}

// ── Perfil (Mi Cuenta) ──────────────────────────────────────────────────────

let VENDEDORA_ID = null;
let perfil = { nombre: "Vendedora Zetina", credito: 0 };

async function loadPerfil() {
  if (!VENDEDORA_ID) return;
  const { data } = await db.from('vendedoras').select('*').eq('id', VENDEDORA_ID).single();
  if (data) {
    perfil = { nombre: data.nombre, credito: data.credito || 0, foto: data.foto_url || null };
  }
}

async function savePerfil() {
  if (!VENDEDORA_ID) return;
  await db.from('vendedoras').update({
    nombre: perfil.nombre,
    credito: perfil.credito || 0,
    foto_url: perfil.foto || null,
  }).eq('id', VENDEDORA_ID);
}

const NIVELES = ["Stylist", "Estrella", "Líder", "Directora"];

function getNivel() {
  const totalVendido = clientes.reduce((sum, c) =>
    sum + (c.compras || []).reduce((s, comp) => s + comp.monto, 0), 0);
  if (totalVendido >= 50000) return "Directora";
  if (totalVendido >= 20000) return "Líder";
  if (totalVendido >= 5000)  return "Estrella";
  return "Stylist";
}

function getCuentaStats() {
  let totalVendido = 0, totalCobrado = 0;
  clientes.forEach((c) => {
    totalVendido += (c.compras || []).reduce((s, comp) => s + comp.monto, 0);
    totalCobrado += (c.pagos   || []).reduce((s, p)    => s + p.monto,    0);
  });
  const totalPorCobrar = Math.max(0, totalVendido - totalCobrado);
  return { totalVendido, totalCobrado, totalPorCobrar, totalClientas: clientes.length, prendas: inventario.length };
}

function renderCuenta() {
  const container = document.querySelector("#cuenta .view-content");
  const nivel = getNivel();
  const stats = getCuentaStats();
  const iniciales = perfil.nombre.trim().split(" ").slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const avatarContent = perfil.foto
    ? `<img src="${perfil.foto}" alt="${perfil.nombre}" class="cuenta-avatar-img">`
    : iniciales;
  const ayudaUrl = `https://wa.me/525579346962?text=${encodeURIComponent(`Hola ZETINA, soy ${perfil.nombre} y necesito ayuda con mi cuenta. 😊`)}`;

  container.innerHTML = `
    <div class="cuenta-header">
      <button class="cuenta-avatar cuenta-avatar--btn" id="btnAvatarFoto" aria-label="Cambiar foto de perfil">
        ${avatarContent}
        <span class="cuenta-avatar-cam" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </span>
      </button>
      <h2 class="cuenta-nombre">${perfil.nombre}</h2>
      <div class="cuenta-badges-row">
        <span class="cuenta-nivel-badge">${nivel}</span>
      </div>
    </div>

    <div class="cuenta-stats-grid">
      <div class="cuenta-stat-card cuenta-stat-card--vendido">
        <span class="cuenta-stat-label">Total vendido</span>
        <span class="cuenta-stat-value cuenta-stat-value--vendido">${formatPeso(stats.totalVendido)}</span>
      </div>
      <div class="cuenta-stat-card">
        <span class="cuenta-stat-label">Total cobrado</span>
        <span class="cuenta-stat-value">${formatPeso(stats.totalCobrado)}</span>
      </div>
      <div class="cuenta-stat-card cuenta-stat-card--accent">
        <span class="cuenta-stat-label">Por cobrar</span>
        <span class="cuenta-stat-value">${formatPeso(stats.totalPorCobrar)}</span>
      </div>
      <div class="cuenta-stat-card">
        <span class="cuenta-stat-label">Clientas</span>
        <span class="cuenta-stat-value cuenta-stat-value--num">${stats.totalClientas}</span>
      </div>
      <div class="cuenta-stat-card">
        <span class="cuenta-stat-label">Prendas en inventario</span>
        <span class="cuenta-stat-value cuenta-stat-value--num">${stats.prendas}</span>
      </div>
      <div class="cuenta-stat-card cuenta-stat-card--credito">
        <span class="cuenta-stat-label">Crédito por devoluciones</span>
        <span class="cuenta-stat-value">${formatPeso(perfil.credito || 0)}</span>
      </div>
    </div>

    <div class="cuenta-actions">
      <button class="cuenta-action-btn" id="btnEditarPerfil">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Editar perfil
      </button>
      <a href="${ayudaUrl}" target="_blank" rel="noopener noreferrer" class="cuenta-action-btn cuenta-action-btn--wa">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
        ¿Necesitas ayuda?
      </a>
      <button class="cuenta-action-btn cuenta-action-btn--danger" id="btnCerrarSesion">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
      </button>
    </div>
    <input type="file" id="avatarFileInput" accept="image/*" hidden>`;

  container.querySelector("#btnEditarPerfil").addEventListener("click", openPerfilEdit);
  container.querySelector("#btnCerrarSesion").addEventListener("click", openCerrarSesion);

  const avatarInput = container.querySelector("#avatarFileInput");
  container.querySelector("#btnAvatarFoto").addEventListener("click", () => avatarInput.click());
  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      perfil.foto = ev.target.result;
      await savePerfil();
      renderCuenta();
    };
    reader.readAsDataURL(file);
  });
}

// ── Sheet: editar perfil ────────────────────────────────────────────────────

function createPerfilEditSheet() {
  const overlay = document.createElement("div");
  overlay.className = "order-detail-overlay";
  overlay.id = "perfilEditOverlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="detail-sheet-handle-row"><div class="sheet-drag-handle"></div></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sheet-body">
        <h3 class="cart-title" style="margin-bottom:1.25rem">Editar perfil</h3>
        <form id="perfilForm" class="cliente-form">
          <div class="form-group">
            <label class="form-label" for="fPerfilNombre">Nombre</label>
            <input class="form-input" id="fPerfilNombre" name="nombre" type="text" required>
          </div>
          <div class="form-group">
            <label class="form-label" for="fPerfilCredito">Crédito por devoluciones ($)</label>
            <input class="form-input" id="fPerfilCredito" name="credito" type="number" min="0" step="1" placeholder="0">
          </div>
          <button type="submit" class="btn-save-cliente">Guardar cambios</button>
        </form>
        <p class="perfil-credito-hint">El crédito se muestra en tu perfil principal.</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  overlay.querySelector("#perfilForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    perfil.nombre  = data.get("nombre").trim() || perfil.nombre;
    perfil.credito = parseFloat(data.get("credito")) || 0;
    await savePerfil();
    overlay.classList.remove("open");
    renderCuenta();
  });
}

function openPerfilEdit() {
  const overlay = document.getElementById("perfilEditOverlay");
  overlay.querySelector("#fPerfilNombre").value  = perfil.nombre;
  overlay.querySelector("#fPerfilCredito").value = perfil.credito || "";
  overlay.classList.add("open");
}

// ── Sheet: cerrar sesión ────────────────────────────────────────────────────

function createCerrarSesionSheet() {
  const overlay = document.createElement("div");
  overlay.className = "order-detail-overlay";
  overlay.id = "cerrarSesionOverlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="detail-sheet-handle-row"><div class="sheet-drag-handle"></div></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="sheet-body" style="text-align:center;padding:1rem 1.25rem 2rem">
        <p style="font-size:3rem;margin-bottom:0.5rem">👋</p>
        <h3 class="cart-title" style="margin-bottom:0.5rem">¿Cerrar sesión?</h3>
        <p style="color:#666;font-size:0.9375rem;margin-bottom:1.75rem">Tus datos se conservan en este dispositivo.</p>
        <button class="btn-save-cliente" id="btnConfirmarCerrar" style="background:#130016;color:#fff;margin-bottom:0.75rem">Sí, cerrar sesión</button>
        <button class="btn-cerrar-abono" id="btnCancelarCerrar">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.querySelector("#btnCancelarCerrar").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  overlay.querySelector("#btnConfirmarCerrar").addEventListener("click", () => {
    clearSession();
    location.reload();
  });
}

function openCerrarSesion() {
  document.getElementById("cerrarSesionOverlay").classList.add("open");
}

// ── Render: Cobros ──────────────────────────────────────────────────────────

function renderCobros() {
  const container = document.querySelector("#cobros .view-content");

  if (!clientes.length) {
    container.innerHTML = `
      <div class="cobros-header">
        <h2 class="catalog-title">Cuentas</h2>
      </div>
      <div class="clientes-empty">
        <p class="clientes-empty-text">Aún no tienes cuentas registradas</p>
      </div>`;
    return;
  }

  const totalPorCobrar = clientes.reduce((sum, c) => {
    const tp   = (c.compras || []).reduce((s, comp) => s + comp.monto, 0);
    const tpag = (c.pagos   || []).reduce((s, p)    => s + p.monto,    0);
    return sum + Math.max(0, tp - tpag);
  }, 0);

  const cards = clientes.map((c) => {
    const totalPrendas = (c.compras || []).reduce((s, comp) => s + comp.monto, 0);
    const totalPagado  = (c.pagos   || []).reduce((s, p)    => s + p.monto,    0);
    const saldo = totalPrendas - totalPagado;
    const alCorriente = saldo <= 0;
    return `
      <article class="cobro-cliente-card" data-id="${c.id}" role="button" tabindex="0">
        <div class="cobro-cliente-head">
          <h3 class="cobro-cliente-nombre">${c.nombre}</h3>
          ${alCorriente
            ? `<span class="cobro-badge cobro-badge--ok">Al corriente</span>`
            : `<span class="cobro-badge cobro-badge--debe">${formatPeso(saldo)}</span>`}
        </div>
        <div class="cobro-cliente-body">
          <div class="cobro-stat">
            <span class="cobro-stat-label">Prendas</span>
            <span class="cobro-stat-val">${c.compras.length}</span>
          </div>
          <div class="cobro-stat">
            <span class="cobro-stat-label">Vendido</span>
            <span class="cobro-stat-val">${formatPeso(totalPrendas)}</span>
          </div>
          <div class="cobro-stat">
            <span class="cobro-stat-label">Pagado</span>
            <span class="cobro-stat-val">${formatPeso(totalPagado)}</span>
          </div>
        </div>
      </article>`;
  }).join("");

  container.innerHTML = `
    <div class="cobros-header">
      <h2 class="catalog-title">Cuentas</h2>
      <p class="catalog-subtitle">${clientes.length} clienta${clientes.length !== 1 ? "s" : ""}</p>
    </div>
    <div class="cobros-total-bar">
      <span class="cobros-total-label">Total por cobrar</span>
      <span class="cobros-total-value">${formatPeso(totalPorCobrar)}</span>
    </div>
    <div class="clientes-search-row">
      <input class="search-input" id="cuentasBusqueda" type="search"
             placeholder="Buscar clienta…" autocomplete="off" autocorrect="off"
             spellcheck="false">
    </div>
    <div class="cobros-list" id="cobrosListContainer">${cards}</div>`;

  container.querySelector("#cuentasBusqueda").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    container.querySelectorAll(".cobro-cliente-card").forEach((card) => {
      const nombre = card.querySelector(".cobro-cliente-nombre").textContent.toLowerCase();
      card.style.display = nombre.includes(q) ? "" : "none";
    });
  });

  container.querySelector(".cobros-list").addEventListener("click", (e) => {
    const card = e.target.closest(".cobro-cliente-card");
    if (card) openCobrosDetail(card.dataset.id);
  });
}

function createCobrosDetailSheet() {
  if (document.getElementById("cobrosDetailOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "cobrosDetailOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sheet-body" id="cobrosDetailBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.querySelector(".sheet-body").addEventListener("click", async (e) => {
    if (e.target.closest(".btn-registrar-abono")) {
      openAbonoForm(overlay.dataset.clienteId);
      return;
    }
    const delBtn = e.target.closest(".btn-delete-abono");
    if (delBtn) {
      if (!confirm("¿Seguro que quieres eliminar este abono?")) return;
      const abonoId   = delBtn.dataset.abonoId;
      const clienteId = overlay.dataset.clienteId;
      delBtn.disabled = true;
      const { error } = await db.from('abonos').delete().eq('id', abonoId);
      if (error) { delBtn.disabled = false; console.error('delete abono:', error); return; }
      const c = clientes.find((cl) => cl.id === clienteId);
      if (c) c.pagos = (c.pagos || []).filter((p) => p.id !== abonoId);
      openCobrosDetail(clienteId);
      renderCobros();
    }
  });
}

function openCobrosDetail(id) {
  const c = clientes.find((cl) => cl.id === id);
  if (!c) return;

  const totalPrendas = (c.compras || []).reduce((s, comp) => s + comp.monto, 0);
  const totalPagado  = (c.pagos   || []).reduce((s, p)    => s + p.monto,    0);
  const saldo = totalPrendas - totalPagado;
  const alCorriente = saldo <= 0;

  const comprasHTML = c.compras.length
    ? c.compras.map((comp) => `
        <div class="cta-row">
          <div class="cta-info">
            ${comp.prendaId ? `<p class="cta-prenda-id">ID: ${formatZtId(comp.prendaId)}</p>` : ""}
            <p class="cta-nombre">${comp.prenda}</p>
            <p class="cta-meta">${comp.marca} · ${formatFecha(comp.fecha)}</p>
          </div>
          <span class="cta-monto">${formatPeso(comp.monto)}</span>
        </div>`).join("")
    : `<p class="cta-empty">Sin prendas registradas</p>`;

  const pagosHTML = (c.pagos || []).length
    ? [...(c.pagos || [])].reverse().map((p) => `
        <div class="cta-row">
          <div class="cta-info">
            <p class="cta-nombre">Abono</p>
            <p class="cta-meta">${formatFecha(p.fecha)}</p>
          </div>
          <div class="cta-row-end">
            <span class="cta-monto cta-monto--abono">${formatPeso(p.monto)}</span>
            <button class="btn-delete-abono" data-abono-id="${p.id}" aria-label="Eliminar abono">✕</button>
          </div>
        </div>`).join("")
    : `<p class="cta-empty">Sin abonos registrados</p>`;

  const overlay = document.getElementById("cobrosDetailOverlay");
  overlay.dataset.clienteId = c.id;

  document.getElementById("cobrosDetailBody").innerHTML = `
    <h3 class="detail-nombre" style="margin-bottom:1.25rem">${c.nombre}</h3>
    <p class="sheet-section-label">Prendas vendidas (${c.compras.length})</p>
    <div class="cta-list">${comprasHTML}</div>
    <div class="cta-subtotal">
      <span class="cta-subtotal-label">Total prendas</span>
      <span class="cta-subtotal-val">${formatPeso(totalPrendas)}</span>
    </div>
    <p class="sheet-section-label" style="margin-top:1.5rem">Abonos registrados</p>
    <div class="cta-list">${pagosHTML}</div>
    <div class="cta-subtotal">
      <span class="cta-subtotal-label">Total pagado</span>
      <span class="cta-subtotal-val">${formatPeso(totalPagado)}</span>
    </div>
    <div class="cta-saldo ${alCorriente ? "cta-saldo--ok" : "cta-saldo--debe"}">
      <span class="cta-saldo-label">Saldo restante</span>
      <span class="cta-saldo-val">${alCorriente ? "Al corriente" : formatPeso(saldo)}</span>
    </div>
    <button class="btn-registrar-abono">+ Registrar abono</button>`;

  overlay.classList.add("open");
}

function createAbonoFormSheet() {
  if (document.getElementById("abonoFormOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "abonoFormOverlay";
  overlay.className = "order-detail-overlay";
  overlay.innerHTML = `
    <div class="order-detail-sheet">
      <div class="sheet-drag-handle"></div>
      <div class="sheet-topbar">
        <button class="btn-sheet-close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sheet-body" id="abonoSheetBody"></div>
    </div>`;
  document.body.appendChild(overlay);

  function closeAbono() {
    overlay.classList.remove("open");
    const id = overlay.dataset.clienteId;
    if (id) { openCobrosDetail(id); renderCobros(); }
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAbono();
  });
  overlay.querySelector(".btn-sheet-close").addEventListener("click", closeAbono);
}

function _showAbonoConfirmacion(overlay, c, monto, fecha) {
  const totalPrendas = (c.compras || []).reduce((s, comp) => s + comp.monto, 0);
  const totalPagado  = (c.pagos   || []).reduce((s, p)    => s + p.monto,    0);
  const saldo = totalPrendas - totalPagado;
  const alCorriente = saldo <= 0;

  const prendaReciente = (c.compras || [])[0];
  const prendaLinea    = prendaReciente ? `Prenda: ${prendaReciente.prenda}\n` : '';
  const saldoLinea     = alCorriente
    ? "Saldo restante: ¡Al corriente! ✅"
    : `Saldo restante: ${formatPeso(saldo)}`;

  const mensaje =
    `Hola ${c.nombre} 🌟\n\n` +
    `Te confirmamos tu abono de ${formatPeso(monto)} el ${formatFecha(fecha)}.\n\n` +
    prendaLinea +
    saldoLinea + `\n\n` +
    `¡Gracias por tu pago! 🙏`;

  const waUrl = `https://wa.me/52${c.telefono}?text=${encodeURIComponent(mensaje)}`;

  document.getElementById("abonoSheetBody").innerHTML = `
    <div class="abono-conf">
      <div class="abono-conf-icon">✅</div>
      <p class="abono-conf-title">Abono registrado</p>
      <p class="abono-conf-detalle">${formatPeso(monto)} · ${formatFecha(fecha)}</p>
      <div class="abono-conf-saldo ${alCorriente ? "abono-conf-saldo--ok" : "abono-conf-saldo--debe"}">
        <span class="abono-conf-saldo-label">Saldo restante</span>
        <span class="abono-conf-saldo-val">${alCorriente ? "Al corriente" : formatPeso(saldo)}</span>
      </div>
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-wa-comprobante">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${WA_PATH}"/></svg>
        Enviar comprobante por WhatsApp
      </a>
      <button class="btn-cerrar-abono">Cerrar</button>
    </div>`;

  document.querySelector(".btn-cerrar-abono").addEventListener("click", () => {
    overlay.classList.remove("open");
    openCobrosDetail(c.id);
    renderCobros();
  });
}

function openAbonoForm(clienteId) {
  const overlay = document.getElementById("abonoFormOverlay");
  overlay.dataset.clienteId = clienteId;

  document.getElementById("abonoSheetBody").innerHTML = `
    <h3 class="cart-title" style="margin-bottom:1.25rem">Registrar abono</h3>
    <form id="abonoForm" class="cliente-form">
      <div class="form-group">
        <label class="form-label" for="fFechaAbono">Fecha</label>
        <input class="form-input" id="fFechaAbono" name="fecha" type="date" required>
      </div>
      <div class="form-group">
        <label class="form-label" for="fMontoAbono">Monto del abono</label>
        <input class="form-input" id="fMontoAbono" name="monto" type="number"
               min="1" step="1" placeholder="Ej. 200" required>
      </div>
      <button type="submit" class="btn-save-cliente">Guardar abono</button>
    </form>`;

  overlay.querySelector("#fFechaAbono").value = new Date().toISOString().split("T")[0];
  overlay.classList.add("open");

  overlay.querySelector("#abonoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Guardando…";
    const clienteId = overlay.dataset.clienteId;
    const c = clientes.find((cl) => cl.id === clienteId);
    if (!c) { btn.disabled = false; btn.textContent = "Guardar abono"; return; }
    const data = new FormData(e.target);
    const fecha = data.get("fecha");
    const monto = parseFloat(data.get("monto")) || 0;
    const { data: abono, error } = await db.from('abonos').insert({
      cliente_id: clienteId,
      vendedora_id: VENDEDORA_ID,
      monto,
      fecha,
    }).select().single();
    btn.disabled = false;
    btn.textContent = "Guardar abono";
    if (error || !abono) return;
    if (!c.pagos) c.pagos = [];
    c.pagos.push({ id: abono.id, fecha: abono.fecha, monto: abono.monto });
    _showAbonoConfirmacion(overlay, c, monto, fecha);
  });
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

  if (viewId === "catalogo" && 'clearAppBadge' in navigator) navigator.clearAppBadge();
  if (viewId === "cobros") renderCobros();
  if (viewId === "cuenta") renderCuenta();
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

async function initApp() {
  document.querySelector("#catalogo .view-content").innerHTML =
    '<div class="catalog-loading"><span>Cargando catálogo…</span></div>';

  await loadPerfil();
  await Promise.all([loadCatalogo(), loadInventario(), loadPedidos(), loadDevoluciones(), loadClientes()]);
  await loadCobrosData();

  renderCatalog();
  renderPedidos();
  renderClientes();
  renderCobros();
  renderMisPrendas();
  renderCuenta();
  showView(getViewFromHash());

  db.channel(`pedidos-rt-${VENDEDORA_ID}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'pedidos',
      filter: `vendedora_id=eq.${VENDEDORA_ID}`,
    }, async () => {
      await loadPedidos();
      renderPedidos();
    })
    .subscribe();

  db.channel('prendas-catalogo-rt')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'prendas',
    }, async () => {
      await loadCatalogo();
      renderCatalog();
    })
    .subscribe();
}

(async () => {
  createOrderDetailSheet();
  createClienteDetailSheet();
  createClienteFormSheet();
  createClienteEditSheet();
  createVentaFormSheet();
  createDevolucionSheet();
  createVendidaSheet();
  createCobrosDetailSheet();
  createAbonoFormSheet();
  createCartSheet();
  createGaleriaSheet();
  createPrendaDetalleSheet();
  createPerfilEditSheet();
  createCerrarSesionSheet();
  document.getElementById("cartBtn").addEventListener("click", openCartSheet);

  initLoginForm();

  const session = getSession();
  if (!session) return; // login screen ya está visible por defecto

  VENDEDORA_ID = session.id;
  perfil = { nombre: session.nombre, credito: 0, foto: null };
  hideLoginScreen();
  await initApp();
})();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}
