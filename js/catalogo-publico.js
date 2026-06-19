// ── Catálogo público ZETINA ────────────────────────────────────────────────
// Página independiente: catalogo-publico.html?v=[slug]
// No depende de app.js ni de sesión/login.

const FOTOS_URL = `${SUPABASE_URL}/storage/v1/object/public/prenda-fotos`;

function fotoPublicUrl(raw) {
  if (!raw) return null;
  if (raw.startsWith('data:')) return raw;
  if (raw.startsWith('http')) return raw;
  return `${FOTOS_URL}/${raw}`;
}

let visionaria = null;        // { id, nombre }
let tabActiva  = 'catalogo';  // 'catalogo' | 'disponible'
const cache    = { catalogo: null, disponible: null }; // resultados memoizados

function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('v') || params.get('slug') || '').trim();
}

function buildCardPublica(p) {
  const foto = p.foto;
  const imgHTML = foto
    ? `<img src="${foto}" alt="${p.nombre}" loading="lazy">`
    : `<span class="cp-card-emoji" aria-hidden="true">${p.emoji || '👗'}</span>`;
  return `
    <article class="cp-card">
      <div class="cp-card-img"${foto ? '' : ` style="background:${p.gradiente}"`}>
        ${imgHTML}
      </div>
      <div class="cp-card-body">
        <p class="cp-card-nombre">${p.nombre || ''}</p>
        ${p.marca ? `<p class="cp-card-marca">${p.marca}</p>` : ''}
        <span class="cp-talla-chip">Talla ${p.tallaReal || '—'}</span>
      </div>
    </article>`;
}

function primeraFotoUrl(fotosPrendas) {
  const fotos = (fotosPrendas || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(f => fotoPublicUrl(f.url))
    .filter(Boolean);
  return fotos[0] || null;
}

async function fetchCatalogo() {
  const { data, error } = await db
    .from('prendas')
    .select('id, nombre, marca, emoji, gradiente, talla_real, fotos_prendas(url, orden)')
    .eq('disponible', true);
  if (error) { console.error('[cp] fetchCatalogo:', error); return []; }
  return (data || []).map(p => ({
    id:        p.id,
    nombre:    p.nombre || '',
    marca:     p.marca  || '',
    emoji:     p.emoji  || '👗',
    gradiente: p.gradiente || 'linear-gradient(150deg, #16001C 0%, #855AA2 100%)',
    tallaReal: p.talla_real || '',
    foto:      primeraFotoUrl(p.fotos_prendas),
  }));
}

async function fetchDisponible() {
  const { data, error } = await db
    .from('inventario_vendedoras')
    .select('id, prenda_id, estado, prendas(id, nombre, marca, emoji, gradiente, talla_real, fotos_prendas(url, orden))')
    .eq('vendedora_id', visionaria.id)
    .eq('estado', 'activo');
  if (error) { console.error('[cp] fetchDisponible:', error); return []; }
  return (data || []).map(inv => {
    const p = inv.prendas || {};
    return {
      id:        p.id || inv.prenda_id,
      nombre:    p.nombre || '',
      marca:     p.marca  || '',
      emoji:     p.emoji  || '👗',
      gradiente: p.gradiente || 'linear-gradient(150deg, #16001C 0%, #855AA2 100%)',
      tallaReal: p.talla_real || '',
      foto:      primeraFotoUrl(p.fotos_prendas),
    };
  });
}

function renderGrid(items) {
  const cont = document.getElementById('cpContenido');
  if (!items.length) {
    cont.innerHTML = `<div class="cp-grid"><p class="cp-grid-empty">No hay prendas para mostrar.</p></div>`;
    return;
  }
  cont.innerHTML = `<div class="cp-grid">${items.map(buildCardPublica).join('')}</div>`;
}

async function mostrarTab(tab) {
  tabActiva = tab;
  document.getElementById('cpTabCatalogo').classList.toggle('cp-tab--activo', tab === 'catalogo');
  document.getElementById('cpTabDisponible').classList.toggle('cp-tab--activo', tab === 'disponible');

  const cont = document.getElementById('cpContenido');

  if (cache[tab]) { renderGrid(cache[tab]); return; }

  cont.innerHTML = `<p class="cp-loading">Cargando…</p>`;
  const items = tab === 'catalogo' ? await fetchCatalogo() : await fetchDisponible();
  cache[tab] = items;
  // Solo renderizar si el usuario no cambió de tab mientras cargaba
  if (tabActiva === tab) renderGrid(items);
}

async function init() {
  const slug = getSlug();
  const titulo = document.getElementById('cpTitulo');

  if (!slug) {
    titulo.textContent = 'Catálogo no encontrado';
    document.getElementById('cpContenido').innerHTML = `<p class="cp-estado">No se especificó ninguna Visionaria.</p>`;
    return;
  }

  const { data, error } = await db
    .from('vendedoras')
    .select('id, nombre')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    titulo.textContent = 'Catálogo no encontrado';
    document.getElementById('cpContenido').innerHTML = `<p class="cp-estado">No encontramos este catálogo. Verifica el enlace.</p>`;
    return;
  }

  visionaria = { id: data.id, nombre: data.nombre };
  titulo.textContent = `Catálogo de ${data.nombre}`;
  document.getElementById('cpTabs').hidden = false;

  document.getElementById('cpTabCatalogo').addEventListener('click', () => mostrarTab('catalogo'));
  document.getElementById('cpTabDisponible').addEventListener('click', () => mostrarTab('disponible'));

  mostrarTab('catalogo');
}

init();
