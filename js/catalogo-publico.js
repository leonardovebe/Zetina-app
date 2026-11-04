// ── Catálogo público ZETINA ────────────────────────────────────────────────
// Página independiente: catalogo-publico.html?v=[slug]&talla=[talla]
// No depende de app.js ni de sesión/login.
// Al tocar una card se navega a prenda-publica.html?v=[slug]&p=[id].

const FOTOS_URL = `${SUPABASE_URL}/storage/v1/object/public/prenda-fotos`;

const PRENDA_COLS = 'id, numero, nombre, marca, emoji, gradiente, talla_real, created_at, fecha_adquisicion, fotos_prendas(url, orden)';
const ORDEN_TALLAS = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

const WA_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.46-9.46 9.46zm8.05-17.52A11.32 11.32 0 0 0 12.04.65C5.77.65.66 5.75.66 12.02c0 2 .52 3.96 1.52 5.68L.57 23.35l5.79-1.52a11.34 11.34 0 0 0 5.67 1.45h.01c6.27 0 11.38-5.1 11.38-11.37 0-3.04-1.18-5.9-3.33-8.05z"/></svg>`;

function fotoPublicUrl(raw) {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http')) return raw;
  return `${FOTOS_URL}/${raw}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let visionaria = null;        // { id, nombre, slug, waNumero }
let itemsTodos = [];          // lista combinada y ordenada
let tallaActiva = '';         // '' = Todas

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    slug:  (params.get('v') || params.get('slug') || '').trim(),
    talla: (params.get('talla') || '').trim().toUpperCase(),
  };
}

// ── Tallas ──────────────────────────────────────────────────────────────────
function tallasDe(tallaReal) {
  return String(tallaReal || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .split('/')
    .filter(Boolean);
}

function compararTallas(a, b) {
  const ia = ORDEN_TALLAS.indexOf(a), ib = ORDEN_TALLAS.indexOf(b);
  if (ia !== -1 || ib !== -1) {
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  }
  const na = parseFloat(a), nb = parseFloat(b);
  const numA = !isNaN(na) && /^\d/.test(a), numB = !isNaN(nb) && /^\d/.test(b);
  if (numA && numB) return na - nb;
  if (numA) return -1;
  if (numB) return 1;
  return a.localeCompare(b);
}

// ── WhatsApp ────────────────────────────────────────────────────────────────
function normalizarTelefono(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.length === 10 ? `52${digitos}` : digitos;
}

function linkPrenda(id, talla) {
  const qs = new URLSearchParams({ v: visionaria.slug, p: id });
  if (talla) qs.set('talla', talla);
  return `prenda-publica.html?${qs}`;
}

function waLink(item) {
  const urlPrenda = new URL(linkPrenda(item.id), window.location.href).href;
  const detalles = [item.marca, `talla ${item.tallaReal || '—'}`].filter(Boolean).join(', ');
  const msg = `Hola, me interesa esta prenda de tu catálogo: ${item.nombre} (${detalles}). ¿Me das más información? ${urlPrenda}`;
  return `https://wa.me/${visionaria.waNumero}?text=${encodeURIComponent(msg)}`;
}

// ── Datos ───────────────────────────────────────────────────────────────────
function todasFotosUrls(fotosPrendas) {
  return (fotosPrendas || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(f => fotoPublicUrl(f.url))
    .filter(Boolean);
}

function mapPrenda(p, fallbackId) {
  const fotos = todasFotosUrls(p.fotos_prendas);
  return {
    id:        p.id || fallbackId,
    numero:    p.numero || '',
    nombre:    p.nombre || '',
    marca:     p.marca  || '',
    emoji:     p.emoji  || '👗',
    gradiente: p.gradiente || 'linear-gradient(150deg, #16001C 0%, #855AA2 100%)',
    tallaReal: p.talla_real || '',
    tallas:    tallasDe(p.talla_real),
    fecha:     p.created_at || p.fecha_adquisicion || '',
    foto:      fotos[0] || null,
  };
}

async function fetchCatalogo() {
  const { data, error } = await db
    .from('prendas')
    .select(PRENDA_COLS)
    .eq('disponible', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('[cp] fetchCatalogo:', error); return []; }
  return (data || []).map(p => mapPrenda(p));
}

async function fetchDisponible() {
  const { data, error } = await db
    .from('inventario_vendedoras')
    .select(`id, prenda_id, estado, prendas(${PRENDA_COLS})`)
    .eq('vendedora_id', visionaria.id)
    .eq('estado', 'activo');
  if (error) { console.error('[cp] fetchDisponible:', error); return []; }
  return (data || []).map(inv => mapPrenda(inv.prendas || {}, inv.prenda_id));
}

// ── Render ──────────────────────────────────────────────────────────────────
function buildCardPublica(p) {
  const esJoy = p.numero.toUpperCase().startsWith('JOY-');
  const imgHTML = p.foto
    ? `<img src="${esc(p.foto)}" alt="${esc(p.nombre)}" loading="lazy">`
    : `<span class="cp-card-emoji" aria-hidden="true">${esc(p.emoji)}</span>`;
  return `
    <article class="cp-card${visionaria.waNumero ? ' cp-card--wa' : ''}">
      <a class="cp-card-link" href="${esc(linkPrenda(p.id, tallaActiva))}">
        <div class="cp-card-img"${p.foto ? '' : ` style="background:${esc(p.gradiente)}"`}>
          ${imgHTML}
          ${esJoy ? `<span class="cp-joy-tag">JOY</span>` : ''}
        </div>
        <div class="cp-card-body">
          <p class="cp-card-nombre">${esc(p.nombre)}</p>
          ${esJoy ? `<span class="cp-joy-line" aria-hidden="true"></span>` : ''}
          ${p.marca ? `<p class="cp-card-marca">${esc(p.marca)}</p>` : ''}
          <p class="cp-card-talla">Talla ${esc(p.tallaReal || '—')}</p>
        </div>
      </a>
      ${visionaria.waNumero ? `
        <a class="cp-wa-mini" href="${esc(waLink(p))}" target="_blank" rel="noopener" aria-label="Preguntar por WhatsApp">
          ${WA_ICON}<span>Preguntar</span>
        </a>` : ''}
    </article>`;
}

function renderChips() {
  const tallas = [...new Set(itemsTodos.flatMap(it => it.tallas))].sort(compararTallas);
  // Si la talla de la URL ya no existe en las prendas cargadas, volver a "Todas"
  if (tallaActiva && !tallas.includes(tallaActiva)) tallaActiva = '';
  const chip = (valor, texto) =>
    `<button type="button" class="cp-chip${valor === tallaActiva ? ' cp-chip--activo' : ''}" data-talla="${esc(valor)}">${esc(texto)}</button>`;
  document.getElementById('cpChips').innerHTML =
    chip('', 'Todas') + tallas.map(t => chip(t, t)).join('');
}

function renderLista() {
  const visibles = tallaActiva
    ? itemsTodos.filter(it => it.tallas.includes(tallaActiva))
    : itemsTodos;

  document.getElementById('cpConteo').textContent =
    `${visibles.length} ${visibles.length === 1 ? 'prenda' : 'prendas'}`;

  const cont = document.getElementById('cpContenido');
  if (!visibles.length) {
    cont.innerHTML = `<p class="cp-estado">${itemsTodos.length ? 'No hay prendas en esa talla por ahora' : 'No hay prendas para mostrar.'}</p>`;
    return;
  }
  cont.innerHTML = `<div class="cp-lista">${visibles.map(buildCardPublica).join('')}</div>`;
}

function setTalla(talla) {
  tallaActiva = talla;
  const url = new URL(window.location.href);
  if (talla) url.searchParams.set('talla', talla);
  else url.searchParams.delete('talla');
  history.replaceState(null, '', url);
  document.querySelectorAll('.cp-chip').forEach(c =>
    c.classList.toggle('cp-chip--activo', c.dataset.talla === talla));
  renderLista();
}

async function cargarTodo() {
  const cont = document.getElementById('cpContenido');
  cont.innerHTML = `<p class="cp-loading">Cargando…</p>`;

  const [catalogo, disponible] = await Promise.all([fetchCatalogo(), fetchDisponible()]);

  // Unir ambas fuentes evitando duplicados por id de prenda
  const porId = new Map();
  [...catalogo, ...disponible].forEach(item => {
    if (item && item.id != null && !porId.has(item.id)) porId.set(item.id, item);
  });

  // Más recientes primero (created_at, o fecha_adquisicion si falta)
  const ts = it => Date.parse(it.fecha) || 0;
  itemsTodos = [...porId.values()].sort((a, b) => ts(b) - ts(a));

  renderChips();
  document.getElementById('cpFiltros').hidden = !itemsTodos.length;
  renderLista();
}

async function init() {
  const { slug, talla } = getParams();
  const titulo = document.getElementById('cpTitulo');

  if (!slug) {
    titulo.textContent = 'Catálogo no encontrado';
    document.getElementById('cpContenido').innerHTML = `<p class="cp-estado">No se especificó ninguna Visionaria.</p>`;
    return;
  }

  const { data, error } = await db
    .from('vendedoras')
    .select('id, nombre, telefono')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    titulo.textContent = 'Catálogo no encontrado';
    document.getElementById('cpContenido').innerHTML = `<p class="cp-estado">No encontramos este catálogo. Verifica el enlace.</p>`;
    return;
  }

  visionaria = { id: data.id, nombre: data.nombre, slug, waNumero: normalizarTelefono(data.telefono) };
  tallaActiva = talla;
  titulo.textContent = `Catálogo de ${data.nombre}`;

  document.getElementById('cpChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.cp-chip');
    if (chip) setTalla(chip.dataset.talla);
  });

  cargarTodo();
}

init();
