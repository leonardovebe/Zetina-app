// ── Detalle público de prenda ZETINA ───────────────────────────────────────
// Página independiente: prenda-publica.html?v=[slug]&p=[id]&talla=[talla]
// No depende de app.js ni de sesión/login. Nunca muestra precios ni datos internos.

const FOTOS_URL = `${SUPABASE_URL}/storage/v1/object/public/prenda-fotos`;

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

function normalizarTelefono(tel) {
  const digitos = String(tel || '').replace(/\D/g, '');
  if (!digitos) return null;
  return digitos.length === 10 ? `52${digitos}` : digitos;
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    slug:  (params.get('v') || '').trim(),
    id:    (params.get('p') || '').trim(),
    talla: (params.get('talla') || '').trim(),
  };
}

function mostrarEstado(msg) {
  document.getElementById('ppContenido').innerHTML = `<p class="cp-estado">${esc(msg)}</p>`;
}

// ── Secciones ───────────────────────────────────────────────────────────────
function formatMedida(valor) {
  const v = String(valor).trim();
  return /^\d+([.,]\d+)?$/.test(v) ? `${v} cm` : v;
}

function medidasDe(p) {
  return [1, 2, 3]
    .map(n => ({ nombre: p[`medida_${n}_nombre`], valor: p[`medida_${n}_valor`] }))
    .filter(m => m.valor != null && String(m.valor).trim() !== '')
    .map(m => `${m.nombre || 'Medida'} · ${formatMedida(m.valor)}`);
}

function composicionDe(rawDesc) {
  let parsed = null;
  try { parsed = JSON.parse(rawDesc || ''); } catch (_) {}
  if (!parsed || typeof parsed !== 'object') return [];
  return [
    parsed.material    && { key: 'Material',    val: parsed.material },
    parsed.composicion && { key: 'Composición', val: parsed.composicion },
  ].filter(Boolean);
}

// ── Galería (scroll-snap con puntos) ────────────────────────────────────────
function buildGaleria(p, fotos) {
  if (!fotos.length) {
    return `<div class="pp-galeria"><div class="pp-slide pp-slide--vacio" style="background:${esc(p.gradiente || 'linear-gradient(150deg, #16001C 0%, #855AA2 100%)')}">
      <span class="cp-card-emoji" aria-hidden="true">${esc(p.emoji || '👗')}</span></div></div>`;
  }
  const slides = fotos.map((url, i) =>
    `<div class="pp-slide"><img src="${esc(url)}" alt="${esc(p.nombre)} — foto ${i + 1}"${i ? ' loading="lazy"' : ''}></div>`).join('');
  const dots = fotos.length > 1
    ? `<div class="pp-dots">${fotos.map((_, i) => `<span class="pp-dot${i === 0 ? ' pp-dot--activo' : ''}"></span>`).join('')}</div>`
    : '';
  return `<div class="pp-galeria-wrap"><div class="pp-galeria" id="ppGaleria">${slides}</div>${dots}</div>`;
}

function initGaleria() {
  const gal = document.getElementById('ppGaleria');
  if (!gal) return;
  const dots = document.querySelectorAll('.pp-dot');
  if (!dots.length) return;
  gal.addEventListener('scroll', () => {
    const i = Math.round(gal.scrollLeft / gal.clientWidth);
    dots.forEach((d, j) => d.classList.toggle('pp-dot--activo', j === i));
  }, { passive: true });
}

// ── Render ──────────────────────────────────────────────────────────────────
function render(p) {
  const fotos = (p.fotos_prendas || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map(f => fotoPublicUrl(f.url))
    .filter(Boolean);
  const esJoy = String(p.numero || '').toUpperCase().startsWith('JOY-');
  const medidas = medidasDe(p);
  const composicion = composicionDe(p.descripcion);

  document.title = `${p.nombre || 'Prenda'} · ZETINA`;
  document.getElementById('ppContenido').innerHTML = `
    <div class="pp-foto">
      ${buildGaleria(p, fotos)}
      ${esJoy ? `<span class="cp-joy-tag">JOY</span>` : ''}
    </div>
    <section class="pp-info">
      <h1 class="pp-nombre">${esc(p.nombre)}</h1>
      ${esJoy ? `<span class="cp-joy-line" aria-hidden="true"></span>` : ''}
      ${p.marca ? `<p class="pp-marca">${esc(p.marca)}</p>` : ''}
      <p class="pp-talla">Talla ${esc(p.talla_real || '—')}</p>
      ${p.descripcion_publica ? `<p class="pp-desc">${esc(p.descripcion_publica).replace(/\n/g, '<br>')}</p>` : ''}
      ${medidas.length ? `
        <div class="pp-seccion">
          <h2 class="pp-seccion-titulo">Medidas</h2>
          <ul class="pp-lista">${medidas.map(m => `<li>${esc(m)}</li>`).join('')}</ul>
        </div>` : ''}
      ${composicion.length ? `
        <div class="pp-seccion">
          <h2 class="pp-seccion-titulo">Composición</h2>
          <ul class="pp-lista">${composicion.map(c => `<li><span class="pp-lista-key">${c.key}</span> ${esc(c.val)}</li>`).join('')}</ul>
        </div>` : ''}
    </section>`;
  initGaleria();
}

function setupWhatsApp(p, waNumero, slug) {
  const btn = document.getElementById('ppWa');
  if (!waNumero) { btn.hidden = true; return; }
  const urlPrenda = new URL(`prenda-publica.html?${new URLSearchParams({ v: slug, p: p.id })}`, window.location.href).href;
  const detalles = [p.marca, `talla ${p.talla_real || '—'}`].filter(Boolean).join(', ');
  const msg = `Hola, me interesa esta prenda de tu catálogo: ${p.nombre || ''} (${detalles}). ¿Me das más información? ${urlPrenda}`;
  btn.href = `https://wa.me/${waNumero}?text=${encodeURIComponent(msg)}`;
  btn.innerHTML = `${WA_ICON}<span>Pedir información por WhatsApp</span>`;
  btn.hidden = false;
  document.body.classList.add('pp-body--con-wa');
}

async function init() {
  const { slug, id, talla } = getParams();

  const volverQs = new URLSearchParams({ v: slug });
  if (talla) volverQs.set('talla', talla);
  document.getElementById('ppVolver').href = `catalogo-publico.html?${volverQs}`;

  if (!slug || !id) { mostrarEstado('No encontramos esta prenda. Verifica el enlace.'); return; }

  const { data: vend, error: errVend } = await db
    .from('vendedoras')
    .select('id, telefono')
    .eq('slug', slug)
    .maybeSingle();
  if (errVend || !vend) { mostrarEstado('No encontramos este catálogo. Verifica el enlace.'); return; }

  const [{ data: p, error }, { data: inv }] = await Promise.all([
    db.from('prendas')
      .select('id, numero, nombre, marca, emoji, gradiente, talla_real, descripcion_publica, descripcion, disponible, medida_1_nombre, medida_1_valor, medida_2_nombre, medida_2_valor, medida_3_nombre, medida_3_valor, fotos_prendas(url, orden)')
      .eq('id', id)
      .maybeSingle(),
    db.from('inventario_vendedoras')
      .select('id')
      .eq('vendedora_id', vend.id)
      .eq('prenda_id', id)
      .eq('estado', 'activo')
      .limit(1),
  ]);

  // Solo mostrar prendas que forman parte del catálogo (general o inventario activo de la Visionaria)
  if (error || !p || (!p.disponible && !(inv && inv.length))) {
    mostrarEstado('Esta prenda ya no está disponible.');
    return;
  }

  render(p);
  setupWhatsApp(p, normalizarTelefono(vend.telefono), slug);
}

init();
