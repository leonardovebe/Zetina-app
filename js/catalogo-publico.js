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

function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('v') || params.get('slug') || '').trim();
}

function buildCardPublica(p) {
  const foto = p.foto;
  const tieneFotos = (p.fotos || []).length > 0;
  const imgHTML = foto
    ? `<img src="${foto}" alt="${p.nombre}" loading="lazy">`
    : `<span class="cp-card-emoji" aria-hidden="true">${p.emoji || '👗'}</span>`;
  return `
    <article class="cp-card" data-card-id="${p.id}">
      <div class="cp-card-img${tieneFotos ? ' cp-card-img--clickable' : ''}"${tieneFotos ? ` data-prenda-id="${p.id}"` : ''}${foto ? '' : ` style="background:${p.gradiente}"`}>
        ${imgHTML}
        ${(p.fotos || []).length > 1 ? `<span class="cp-card-multi" aria-hidden="true">📷 ${p.fotos.length}</span>` : ''}
      </div>
      <div class="cp-card-body">
        <p class="cp-card-nombre">${p.nombre || ''}</p>
        ${p.marca ? `<p class="cp-card-marca">${p.marca}</p>` : ''}
        <span class="cp-talla-chip">Talla ${p.tallaReal || '—'}</span>
        ${p.descripcionPublica ? `<p class="cp-card-desc">${p.descripcionPublica}</p>` : ''}
      </div>
    </article>`;
}

function todasFotosUrls(fotosPrendas) {
  return (fotosPrendas || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(f => fotoPublicUrl(f.url))
    .filter(Boolean);
}

async function fetchCatalogo() {
  const { data, error } = await db
    .from('prendas')
    .select('id, nombre, marca, emoji, gradiente, talla_real, descripcion_publica, fotos_prendas(url, orden)')
    .eq('disponible', true);
  if (error) { console.error('[cp] fetchCatalogo:', error); return []; }
  return (data || []).map(p => {
    const fotos = todasFotosUrls(p.fotos_prendas);
    return {
      id:        p.id,
      nombre:    p.nombre || '',
      marca:     p.marca  || '',
      emoji:     p.emoji  || '👗',
      gradiente: p.gradiente || 'linear-gradient(150deg, #16001C 0%, #855AA2 100%)',
      tallaReal: p.talla_real || '',
      descripcionPublica: p.descripcion_publica || '',
      fotos,
      foto:      fotos[0] || null,
    };
  });
}

async function fetchDisponible() {
  const { data, error } = await db
    .from('inventario_vendedoras')
    .select('id, prenda_id, estado, prendas(id, nombre, marca, emoji, gradiente, talla_real, descripcion_publica, fotos_prendas(url, orden))')
    .eq('vendedora_id', visionaria.id)
    .eq('estado', 'activo');
  if (error) { console.error('[cp] fetchDisponible:', error); return []; }
  return (data || []).map(inv => {
    const p = inv.prendas || {};
    const fotos = todasFotosUrls(p.fotos_prendas);
    return {
      id:        p.id || inv.prenda_id,
      nombre:    p.nombre || '',
      marca:     p.marca  || '',
      emoji:     p.emoji  || '👗',
      gradiente: p.gradiente || 'linear-gradient(150deg, #16001C 0%, #855AA2 100%)',
      tallaReal: p.talla_real || '',
      descripcionPublica: p.descripcion_publica || '',
      fotos,
      foto:      fotos[0] || null,
    };
  });
}

let itemsActuales = []; // items renderizados, para lookup al abrir el visor

function renderGrid(items) {
  itemsActuales = items;
  const cont = document.getElementById('cpContenido');
  if (!items.length) {
    cont.innerHTML = `<div class="cp-grid"><p class="cp-grid-empty">No hay prendas para mostrar.</p></div>`;
    return;
  }
  cont.innerHTML = `<div class="cp-grid">${items.map(buildCardPublica).join('')}</div>`;
}

// ── Visor de fotos (galería con swipe) ──────────────────────────────────────
const cpGallery = {
  overlay: null, img: null, dotsEl: null, counterEl: null,
  fotos: [], current: 0, touchStartX: 0,

  init() {
    const el = document.createElement('div');
    el.className = 'cpg-overlay';
    el.innerHTML = `
      <button class="cpg-close" id="cpgClose" aria-label="Cerrar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="cpg-stage" id="cpgStage">
        <img class="cpg-img" id="cpgImg" src="" alt="">
      </div>
      <div class="cpg-footer">
        <span class="cpg-counter" id="cpgCounter"></span>
        <div class="cpg-dots" id="cpgDots"></div>
      </div>`;
    document.body.appendChild(el);
    this.overlay   = el;
    this.img       = el.querySelector('#cpgImg');
    this.dotsEl    = el.querySelector('#cpgDots');
    this.counterEl = el.querySelector('#cpgCounter');

    el.querySelector('#cpgClose').addEventListener('click', () => this.close());
    el.addEventListener('click', e => { if (e.target === el) this.close(); });

    const stage = el.querySelector('#cpgStage');
    stage.addEventListener('touchstart', e => { this.touchStartX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 48) dx < 0 ? this.next() : this.prev();
    });
  },

  open(fotos) {
    if (!this.overlay) this.init();
    if (!fotos || !fotos.length) return;
    this.fotos   = fotos;
    this.current = 0;
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
    this.img.src = this.fotos[this.current];
    this.counterEl.textContent = `${this.current + 1}/${this.fotos.length}`;
    this.dotsEl.querySelectorAll('.cpg-dot').forEach((d, i) =>
      d.classList.toggle('cpg-dot--active', i === this.current));
  },

  renderDots() {
    this.dotsEl.innerHTML = this.fotos.length > 1
      ? this.fotos.map((_, i) => `<span class="cpg-dot${i === 0 ? ' cpg-dot--active' : ''}"></span>`).join('')
      : '';
  },
};

// ── Sheet de detalle de prenda ──────────────────────────────────────────────
const cpDetalle = {
  overlay: null, sheet: null, photoEl: null, img: null, dotsEl: null,
  nombreEl: null, marcaEl: null, tallaEl: null, descEl: null,
  fotos: [], current: 0, touchStartX: 0, dragStartY: 0, dragging: false,

  init() {
    const el = document.createElement('div');
    el.className = 'cpd-overlay';
    el.innerHTML = `
      <div class="cpd-sheet" id="cpdSheet">
        <div class="cpd-handle" id="cpdHandle"></div>
        <button class="cpd-close" id="cpdClose" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="cpd-photo" id="cpdPhoto">
          <img class="cpd-img" id="cpdImg" src="" alt="">
          <div class="cpd-dots" id="cpdDots"></div>
        </div>
        <div class="cpd-body">
          <h2 class="cpd-nombre" id="cpdNombre"></h2>
          <p class="cpd-marca" id="cpdMarca"></p>
          <span class="cpd-talla" id="cpdTalla"></span>
          <p class="cpd-desc" id="cpdDesc"></p>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.overlay  = el;
    this.sheet    = el.querySelector('#cpdSheet');
    this.photoEl  = el.querySelector('#cpdPhoto');
    this.img      = el.querySelector('#cpdImg');
    this.dotsEl   = el.querySelector('#cpdDots');
    this.nombreEl = el.querySelector('#cpdNombre');
    this.marcaEl  = el.querySelector('#cpdMarca');
    this.tallaEl  = el.querySelector('#cpdTalla');
    this.descEl   = el.querySelector('#cpdDesc');

    el.querySelector('#cpdClose').addEventListener('click', () => this.close());
    el.addEventListener('click', e => { if (e.target === el) this.close(); });

    // Swipe horizontal entre fotos
    this.photoEl.addEventListener('touchstart', e => { this.touchStartX = e.touches[0].clientX; }, { passive: true });
    this.photoEl.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) > 48) dx < 0 ? this.next() : this.prev();
    });

    // Swipe vertical hacia abajo (desde el handle) para cerrar
    const handle = el.querySelector('#cpdHandle');
    handle.addEventListener('touchstart', e => {
      this.dragStartY = e.touches[0].clientY;
      this.dragging = true;
      this.sheet.style.transition = 'none';
    }, { passive: true });
    handle.addEventListener('touchmove', e => {
      if (!this.dragging) return;
      const dy = e.touches[0].clientY - this.dragStartY;
      if (dy > 0) this.sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    handle.addEventListener('touchend', e => {
      if (!this.dragging) return;
      this.dragging = false;
      this.sheet.style.transition = '';
      const dy = e.changedTouches[0].clientY - this.dragStartY;
      if (dy > 100) this.close();
      else this.sheet.style.transform = '';
    }, { passive: true });
  },

  open(item) {
    if (!this.overlay) this.init();
    this.fotos = item.fotos || [];
    this.current = 0;

    this.nombreEl.textContent = item.nombre || '';
    this.marcaEl.textContent  = item.marca || '';
    this.marcaEl.hidden       = !item.marca;
    this.tallaEl.textContent  = `Talla ${item.tallaReal || '—'}`;
    this.descEl.textContent   = item.descripcionPublica || '';
    this.descEl.hidden        = !item.descripcionPublica;

    if (this.fotos.length) {
      this.photoEl.hidden = false;
      this.renderDots();
      this.showPhoto();
    } else {
      this.photoEl.hidden = true;
    }

    this.sheet.style.transform = '';
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    this.overlay.classList.remove('open');
    this.sheet.style.transform = '';
    document.body.style.overflow = '';
  },

  next() { if (this.current < this.fotos.length - 1) { this.current++; this.showPhoto(); } },
  prev() { if (this.current > 0)                     { this.current--; this.showPhoto(); } },

  showPhoto() {
    this.img.src = this.fotos[this.current];
    this.dotsEl.querySelectorAll('.cpd-dot').forEach((d, i) =>
      d.classList.toggle('cpd-dot--active', i === this.current));
  },

  renderDots() {
    this.dotsEl.innerHTML = this.fotos.length > 1
      ? this.fotos.map((_, i) => `<span class="cpd-dot${i === 0 ? ' cpd-dot--active' : ''}"></span>`).join('')
      : '';
  },
};

async function cargarTodo() {
  const cont = document.getElementById('cpContenido');
  cont.innerHTML = `<p class="cp-loading">Cargando…</p>`;

  const [catalogo, disponible] = await Promise.all([fetchCatalogo(), fetchDisponible()]);

  // Unir ambas fuentes evitando duplicados por id de prenda
  const porId = new Map();
  [...catalogo, ...disponible].forEach(item => {
    if (item && item.id != null && !porId.has(item.id)) porId.set(item.id, item);
  });

  renderGrid([...porId.values()]);
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

  document.getElementById('cpContenido').addEventListener('click', (e) => {
    // Tocar la foto (con galería) → visor a pantalla completa
    const imgDiv = e.target.closest('.cp-card-img[data-prenda-id]');
    if (imgDiv) {
      const item = itemsActuales.find(it => String(it.id) === imgDiv.dataset.prendaId);
      if (item && item.fotos && item.fotos.length) cpGallery.open(item.fotos);
      return;
    }
    // Tocar cualquier otra parte de la card → sheet de detalle
    const card = e.target.closest('.cp-card[data-card-id]');
    if (card) {
      const item = itemsActuales.find(it => String(it.id) === card.dataset.cardId);
      if (item) cpDetalle.open(item);
    }
  });

  cargarTodo();
}

init();
