// ── Contraseña del administrador ─────────────────────────────────────────────
// Cambia este valor por la contraseña que prefieras
const ADMIN_PASSWORD = 'Zetina2024!';

// ── Utilidades ───────────────────────────────────────────────────────────────

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function iniciales(nombre) {
  return nombre.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Auth del administrador ───────────────────────────────────────────────────

function initAdminLogin() {
  document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass  = document.getElementById('adminPass').value;
    const errEl = document.getElementById('adminLoginError');
    errEl.textContent = '';
    if (pass === ADMIN_PASSWORD) {
      document.getElementById('adminLogin').hidden = true;
      document.getElementById('adminPanel').hidden = false;
      initPedidosRealtime();
      await loadVendedoras();
    } else {
      errEl.textContent = 'Contraseña incorrecta';
    }
  });

  document.getElementById('adminLogout').addEventListener('click', () => {
    if (pedidosChannel) { pedidosChannel.unsubscribe(); pedidosChannel = null; }
    pedidosAdmin = [];
    document.getElementById('adminPanel').hidden = true;
    document.getElementById('adminLogin').hidden = false;
    document.getElementById('adminPass').value = '';
    document.getElementById('adminLoginError').textContent = '';
    switchTab('vendedoras');
  });
}

// ── Carga y render de vendedoras ─────────────────────────────────────────────

let vendedoras = [];

async function loadVendedoras() {
  document.getElementById('vendedorasList').innerHTML = '<p class="admin-state-msg">Cargando…</p>';

  const { data, error } = await db
    .from('vendedoras')
    .select('id, nombre, email, telefono, password_hash, password_temporal, credito, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('vendedorasList').innerHTML =
      `<p class="admin-state-msg" style="color:#ff7b7b">Error al cargar: ${error.message}</p>`;
    return;
  }

  vendedoras = data || [];
  renderVendedoras();
}

function renderVendedoras() {
  const list = document.getElementById('vendedorasList');

  if (!vendedoras.length) {
    list.innerHTML = '<p class="admin-state-msg">No hay vendedoras registradas todavía.</p>';
    return;
  }

  list.innerHTML = vendedoras.map(v => {
    let badge;
    if (!v.password_hash) {
      badge = '<span class="vstatus vstatus--none">Sin acceso</span>';
    } else if (v.password_temporal) {
      badge = '<span class="vstatus vstatus--temp">Contraseña temporal</span>';
    } else {
      badge = '<span class="vstatus vstatus--ok">Activa</span>';
    }
    return `
      <div class="vendedora-card">
        <div class="vcard-avatar">${iniciales(v.nombre)}</div>
        <div class="vcard-info">
          <p class="vcard-nombre">${v.nombre}</p>
          <p class="vcard-sub">${v.email || '—'} ${v.telefono ? '· ' + v.telefono : ''}</p>
        </div>
        <div class="vcard-status">${badge}</div>
        <button class="admin-btn-edit" data-id="${v.id}" aria-label="Editar ${v.nombre}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('.admin-btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = vendedoras.find(x => x.id === btn.dataset.id);
      if (v) openModal(v);
    });
  });
}

// ── Modal crear / editar ─────────────────────────────────────────────────────

let editingId = null;

function openModal(v = null) {
  editingId = v ? v.id : null;
  const isEdit = !!v;

  document.getElementById('modalTitle').textContent = isEdit ? 'Editar vendedora' : 'Nueva vendedora';
  document.getElementById('fNombre').value   = isEdit ? v.nombre        : '';
  document.getElementById('fEmail').value    = isEdit ? (v.email    || '') : '';
  document.getElementById('fTelefono').value = isEdit ? (v.telefono || '') : '';
  document.getElementById('fPassword').value = '';
  document.getElementById('formError').textContent = '';

  const passInput = document.getElementById('fPassword');
  const passHint  = document.getElementById('fPasswordHint');

  if (isEdit) {
    passInput.placeholder = '••••••••';
    passInput.required    = false;
    passHint.hidden       = false;
  } else {
    passInput.placeholder = 'Mínimo 6 caracteres';
    passInput.required    = true;
    passHint.hidden       = true;
  }

  document.getElementById('vendedoraModal').hidden = false;
  document.getElementById('fNombre').focus();
}

function closeModal() {
  document.getElementById('vendedoraModal').hidden = true;
  editingId = null;
}

async function submitVendedoraForm(e) {
  e.preventDefault();
  const errEl = document.getElementById('formError');
  const btn   = document.getElementById('btnGuardar');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  const nombre   = document.getElementById('fNombre').value.trim();
  const email    = document.getElementById('fEmail').value.trim().toLowerCase();
  const telefono = document.getElementById('fTelefono').value.trim();
  const password = document.getElementById('fPassword').value;

  try {
    if (!nombre) throw new Error('El nombre es obligatorio');

    const updates = {
      nombre,
      email:    email    || null,
      telefono: telefono || null,
    };

    if (password) {
      if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      updates.password_hash     = await hashPassword(password);
      updates.password_temporal = true;
    } else if (!editingId) {
      throw new Error('La contraseña temporal es obligatoria para nuevas vendedoras');
    }

    if (editingId) {
      const { error } = await db.from('vendedoras').update(updates).eq('id', editingId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from('vendedoras').insert([{ ...updates, credito: 0 }]);
      if (error) throw new Error(error.message);
    }

    closeModal();
    await loadVendedoras();
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

// ── Utilidades de formato ────────────────────────────────────────────────────

const MESES_ES_ADMIN = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtFecha(iso) {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)} ${MESES_ES_ADMIN[parseInt(m) - 1]}. ${y}`;
}

function fmtPeso(n) {
  return '$' + n.toLocaleString('es-MX');
}

// ── Pedidos (vista admin) ─────────────────────────────────────────────────────

let pedidosAdmin = [];
let pedidosChannel = null;

const ESTADO_SIGUIENTE = {
  'En proceso': 'En camino',
  'En camino':  'Entregado',
};

const ESTADO_ADMIN_CONFIG = {
  'En proceso': { bg: '#855AA2', color: '#ffffff' },
  'En camino':  { bg: '#CCB8DD', color: '#130016' },
  'Entregado':  { bg: '#DEFF00', color: '#130016' },
};

async function loadPedidosTodos() {
  document.getElementById('pedidosList').innerHTML =
    '<p class="admin-state-msg">Cargando pedidos…</p>';

  const { data, error } = await db
    .from('pedidos')
    .select(`
      id, estado, created_at,
      vendedoras ( id, nombre ),
      detalle_pedidos ( id, prenda_id, nombre, marca, emoji, precio )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('pedidosList').innerHTML =
      `<p class="admin-state-msg" style="color:#ff7b7b">Error: ${error.message}</p>`;
    return;
  }

  const rows = data || [];
  pedidosAdmin = rows.map((p, idx) => {
    const detalles = p.detalle_pedidos || [];
    return {
      id:        p.id,
      numero:    String(rows.length - idx).padStart(3, '0'),
      fecha:     p.created_at.split('T')[0],
      createdAt: p.created_at,
      estado:    p.estado,
      total:     detalles.reduce((sum, d) => sum + (d.precio || 0), 0),
      vendedora: p.vendedoras?.nombre || 'Desconocida',
      prendas:   detalles.map(d => ({
        nombre: d.nombre || 'Prenda',
        marca:  d.marca  || '',
        emoji:  d.emoji  || '👚',
        precio: d.precio,
      })),
      prendaIds: detalles.map(d => d.prenda_id).filter(Boolean),
    };
  });

  const sub = document.getElementById('pedidosSubtitle');
  if (sub) sub.textContent = `${rows.length} pedido${rows.length !== 1 ? 's' : ''} en total`;

  renderPedidosAdmin();
}

function renderPedidosAdmin() {
  const list = document.getElementById('pedidosList');

  if (!pedidosAdmin.length) {
    list.innerHTML = '<p class="admin-state-msg">No hay pedidos todavía.</p>';
    return;
  }

  const ahoraMs = Date.now();

  list.innerHTML = pedidosAdmin.map(p => {
    const cfg = ESTADO_ADMIN_CONFIG[p.estado] || { bg: '#eee', color: '#333' };
    const siguiente = ESTADO_SIGUIENTE[p.estado];
    const esNuevo = (ahoraMs - new Date(p.createdAt).getTime()) < 60 * 60 * 1000;

    const prendaRows = p.prendas.map(pr => `
      <div class="ap-prenda-row">
        <span class="ap-prenda-emoji" aria-hidden="true">${pr.emoji}</span>
        <span class="ap-prenda-nombre">${pr.nombre}</span>
        <span class="ap-prenda-marca">${pr.marca}</span>
        <span class="ap-prenda-precio">${fmtPeso(pr.precio)}</span>
      </div>`).join('');

    const accion = siguiente
      ? `<button class="ap-estado-btn" data-id="${p.id}" data-estado="${siguiente}">
           Marcar <strong>${siguiente}</strong>
         </button>`
      : `<span class="ap-estado-final">✓ Entregado</span>`;

    return `
      <article class="ap-card">
        <div class="ap-card-head">
          <div class="ap-card-title-row">
            <div class="ap-card-title-info">
              <span class="ap-vendedora">${p.vendedora}</span>
              <span class="ap-numero">Pedido #${p.numero}</span>
            </div>
            <div class="ap-card-title-right">
              ${esNuevo ? '<span class="ap-nuevo-badge">Nuevo</span>' : ''}
              <span class="ap-estado-badge" style="background:${cfg.bg};color:${cfg.color}">${p.estado}</span>
            </div>
          </div>
          <p class="ap-fecha">${fmtFecha(p.fecha)}</p>
        </div>
        <div class="ap-prendas">${prendaRows || '<p class="ap-sin-prendas">Sin prendas</p>'}</div>
        <div class="ap-card-foot">
          <span class="ap-total">Total: <strong>${fmtPeso(p.total)}</strong></span>
          <div class="ap-foot-actions">
            ${accion}
            <button class="ap-eliminar-btn" data-id="${p.id}">Eliminar</button>
          </div>
        </div>
      </article>`;
  }).join('');

  list.querySelectorAll('.ap-estado-btn').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstado(btn.dataset.id, btn.dataset.estado));
  });
  list.querySelectorAll('.ap-eliminar-btn').forEach(btn => {
    btn.addEventListener('click', () => eliminarPedido(btn.dataset.id));
  });
}

async function cambiarEstado(pedidoId, nuevoEstado) {
  const btn = document.querySelector(`.ap-estado-btn[data-id="${pedidoId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  const { error } = await db
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId);

  if (error) {
    if (btn) { btn.disabled = false; btn.textContent = 'Error, reintentar'; }
    return;
  }

  const p = pedidosAdmin.find(x => x.id === pedidoId);
  if (p) p.estado = nuevoEstado;
  renderPedidosAdmin();
}

async function eliminarPedido(pedidoId) {
  const elBtn = document.querySelector(`.ap-eliminar-btn[data-id="${pedidoId}"]`);
  if (elBtn) { elBtn.disabled = true; elBtn.textContent = 'Eliminando…'; }

  const p = pedidosAdmin.find(x => x.id === pedidoId);
  if (p && p.prendaIds.length) {
    await db.from('prendas').update({ disponible: true }).in('id', p.prendaIds);
  }

  const { error } = await db.from('pedidos').delete().eq('id', pedidoId);
  if (error) {
    if (elBtn) { elBtn.disabled = false; elBtn.textContent = 'Eliminar'; }
    return;
  }

  pedidosAdmin = pedidosAdmin.filter(x => x.id !== pedidoId);
  const sub = document.getElementById('pedidosSubtitle');
  if (sub) sub.textContent = `${pedidosAdmin.length} pedido${pedidosAdmin.length !== 1 ? 's' : ''} en total`;
  renderPedidosAdmin();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function mostrarToast(msg) {
  const toast = document.getElementById('adminToast');
  const msgEl = document.getElementById('adminToastMsg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.hidden = false;
  clearTimeout(toast._timer);
  requestAnimationFrame(() => {
    toast.classList.add('admin-toast--visible');
  });
  toast._timer = setTimeout(() => {
    toast.classList.remove('admin-toast--visible');
    setTimeout(() => { toast.hidden = true; }, 300);
  }, 5000);
}

// ── Realtime (admin escucha todos los pedidos) ───────────────────────────────

function initPedidosRealtime() {
  if (pedidosChannel) return;

  pedidosChannel = db.channel('admin-pedidos-global')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'pedidos',
    }, (payload) => {
      const vend = vendedoras.find(v => v.id === payload.new.vendedora_id);
      const nombre = vend?.nombre || 'una vendedora';
      mostrarToast(`Nuevo pedido de ${nombre}`);
      document.getElementById('pedidosNewDot').hidden = false;
      if (!document.getElementById('tabPedidos').hidden) {
        loadPedidosTodos();
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'pedidos',
    }, () => {
      if (!document.getElementById('tabPedidos').hidden) {
        loadPedidosTodos();
      }
    })
    .subscribe();
}

// ── Categorias de prendas ─────────────────────────────────────────────────────

let categoriasCache = [];

async function loadCategorias() {
  const { data, error } = await db
    .from('categorias_prendas')
    .select('id, nombre')
    .order('nombre', { ascending: true });
  console.log('[categorias] data:', data, '| error:', error);
  categoriasCache = data || [];
}

function fillCategoriaSelect(selectEl, valorActual = '') {
  const opts = categoriasCache.map(c =>
    `<option value="${c.nombre}"${c.nombre === valorActual ? ' selected' : ''}>${c.nombre}</option>`
  ).join('');
  selectEl.innerHTML =
    `<option value="">Seleccionar categoria...</option>${opts}<option value="__nueva__">+ Nueva categoria</option>`;
  if (valorActual && valorActual !== '__nueva__') selectEl.value = valorActual;
}

function onCategoriaChange(selectEl, nuevaWrapEl) {
  const isNueva = selectEl.value === '__nueva__';
  nuevaWrapEl.hidden = !isNueva;
  const input = nuevaWrapEl.querySelector('input');
  input.required = isNueva;
  if (!isNueva) input.value = '';
}

async function resolverCategoria(selectEl, nuevaInputEl) {
  if (selectEl.value !== '__nueva__') return selectEl.value || null;
  const nombre = nuevaInputEl.value.trim();
  if (!nombre) throw new Error('Ingresa el nombre de la nueva categoria');
  const { error } = await db.from('categorias_prendas').insert([{ nombre }]);
  if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
    throw new Error('Error al crear categoria: ' + error.message);
  }
  await loadCategorias();
  return nombre;
}

// ── Prendas (admin) ───────────────────────────────────────────────────────────

let prendasAdmin = [];

async function loadPrendasAdmin() {
  document.getElementById('prendasAdminList').innerHTML = '<p class="admin-state-msg">Cargando...</p>';

  const { data, error } = await db
    .from('prendas')
    .select('id, numero, nombre, marca, categoria, emoji, talla_etiqueta, talla_real, precio_costo, precio_min, precio_max, descripcion, gradiente, medida_1_nombre, medida_1_valor, medida_2_nombre, medida_2_valor, disponible')
    .order('created_at', { ascending: false });

  if (error) {
    document.getElementById('prendasAdminList').innerHTML =
      `<p class="admin-state-msg" style="color:#ff7b7b">Error al cargar: ${error.message}</p>`;
    return;
  }

  prendasAdmin = data || [];
  const sub = document.getElementById('prendasAdminSubtitle');
  if (sub) sub.textContent = `${prendasAdmin.length} prenda${prendasAdmin.length !== 1 ? 's' : ''}`;
  renderPrendasAdmin();
}

function renderPrendasAdmin() {
  const list = document.getElementById('prendasAdminList');
  if (!prendasAdmin.length) {
    list.innerHTML = '<p class="admin-state-msg">No hay prendas en el catalogo todavia.</p>';
    return;
  }

  list.innerHTML = prendasAdmin.map(p => {
    const dispBadge = p.disponible
      ? '<span class="vstatus vstatus--ok">Disponible</span>'
      : '<span class="vstatus vstatus--none">No disponible</span>';
    const sub = [p.marca, p.categoria].filter(Boolean).join(' · ');
    return `
      <div class="prenda-admin-card">
        <span class="pac-emoji" aria-hidden="true">${p.emoji || '\u{1F45A}'}</span>
        <div class="pac-info">
          <p class="pac-nombre">${p.nombre}</p>
          ${sub ? `<p class="pac-sub">${sub}</p>` : ''}
          <p class="pac-precios">$${(p.precio_min || 0).toLocaleString('es-MX')} – $${(p.precio_max || 0).toLocaleString('es-MX')}</p>
        </div>
        <div class="pac-right">
          ${dispBadge}
          <button class="admin-btn-edit pac-edit-btn" data-id="${p.id}" aria-label="Editar ${p.nombre}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.pac-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = prendasAdmin.find(x => x.id === btn.dataset.id);
      if (p) openEditPrendaModal(p);
    });
  });
}

// ── Formulario subir prenda ───────────────────────────────────────────────────

async function submitSubirPrenda(e) {
  e.preventDefault();
  const errEl = document.getElementById('subirPrendaError');
  const btn   = document.getElementById('btnSubirPrenda');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Subiendo...';

  try {
    const nombre = document.getElementById('spNombre').value.trim();
    if (!nombre) throw new Error('El nombre es obligatorio');

    const categoria = await resolverCategoria(
      document.getElementById('spCategoria'),
      document.getElementById('spNuevaCat')
    );

    const { error } = await db.from('prendas').insert([{
      nombre,
      marca:          document.getElementById('spMarca').value.trim()          || null,
      emoji:          document.getElementById('spEmoji').value.trim()           || '\u{1F45A}',
      categoria,
      talla_etiqueta: document.getElementById('spTallaEtiqueta').value.trim()  || null,
      talla_real:     document.getElementById('spTallaReal').value.trim()      || null,
      precio_costo:   parseFloat(document.getElementById('spPrecioCosto').value) || 0,
      precio_min:     parseFloat(document.getElementById('spPrecioMin').value)   || 0,
      precio_max:     parseFloat(document.getElementById('spPrecioMax').value)   || 0,
      descripcion:    document.getElementById('spDescripcion').value.trim()    || null,
      disponible:     true,
    }]);

    if (error) throw new Error(error.message);

    document.getElementById('subirPrendaForm').reset();
    document.getElementById('spNuevaCatWrap').hidden = true;
    fillCategoriaSelect(document.getElementById('spCategoria'));
    await loadPrendasAdmin();
    mostrarToast('Prenda subida al catalogo');
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Subir prenda';
  }
}

// ── Modal editar prenda ───────────────────────────────────────────────────────

let editingPrendaId = null;

function openEditPrendaModal(p) {
  editingPrendaId = p.id;
  document.getElementById('epNombre').value        = p.nombre           || '';
  document.getElementById('epEmoji').value         = p.emoji            || '';
  document.getElementById('epMarca').value         = p.marca            || '';
  document.getElementById('epTallaEtiqueta').value = p.talla_etiqueta   || '';
  document.getElementById('epTallaReal').value     = p.talla_real       || '';
  document.getElementById('epPrecioCosto').value   = p.precio_costo     || '';
  document.getElementById('epPrecioMin').value     = p.precio_min       || '';
  document.getElementById('epPrecioMax').value     = p.precio_max       || '';
  document.getElementById('epDescripcion').value   = p.descripcion      || '';
  document.getElementById('epDisponible').checked  = !!p.disponible;
  document.getElementById('editPrendaError').textContent = '';

  const selectEl  = document.getElementById('epCategoria');
  const nuevaWrap = document.getElementById('epNuevaCatWrap');
  fillCategoriaSelect(selectEl, p.categoria || '');
  nuevaWrap.hidden = true;
  nuevaWrap.querySelector('input').value    = '';
  nuevaWrap.querySelector('input').required = false;

  document.getElementById('prendaEditModal').hidden = false;
  document.getElementById('epNombre').focus();
}

function closeEditPrendaModal() {
  document.getElementById('prendaEditModal').hidden = true;
  editingPrendaId = null;
}

async function submitEditPrenda(e) {
  e.preventDefault();
  const errEl = document.getElementById('editPrendaError');
  const btn   = document.getElementById('btnGuardarPrenda');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const nombre = document.getElementById('epNombre').value.trim();
    if (!nombre) throw new Error('El nombre es obligatorio');

    const categoria = await resolverCategoria(
      document.getElementById('epCategoria'),
      document.getElementById('epNuevaCat')
    );

    const updates = {
      nombre,
      marca:          document.getElementById('epMarca').value.trim()          || null,
      emoji:          document.getElementById('epEmoji').value.trim()           || '\u{1F45A}',
      categoria,
      talla_etiqueta: document.getElementById('epTallaEtiqueta').value.trim()  || null,
      talla_real:     document.getElementById('epTallaReal').value.trim()      || null,
      precio_costo:   parseFloat(document.getElementById('epPrecioCosto').value) || 0,
      precio_min:     parseFloat(document.getElementById('epPrecioMin').value)   || 0,
      precio_max:     parseFloat(document.getElementById('epPrecioMax').value)   || 0,
      descripcion:    document.getElementById('epDescripcion').value.trim()    || null,
      disponible:     document.getElementById('epDisponible').checked,
    };

    const { error } = await db.from('prendas').update(updates).eq('id', editingPrendaId);
    if (error) throw new Error(error.message);

    closeEditPrendaModal();
    await loadPrendasAdmin();
    mostrarToast('Prenda actualizada');
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });
  document.getElementById('tabVendedoras').hidden = tabId !== 'vendedoras';
  document.getElementById('tabPedidos').hidden    = tabId !== 'pedidos';
  document.getElementById('tabPrendas').hidden    = tabId !== 'prendas';
}

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const target = tab.dataset.tab;
      switchTab(target);
      if (target === 'pedidos') {
        document.getElementById('pedidosNewDot').hidden = true;
        await loadPedidosTodos();
      }
      if (target === 'prendas') {
        await loadCategorias();
        fillCategoriaSelect(document.getElementById('spCategoria'));
        await loadPrendasAdmin();
      }
    });
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

(function init() {
  initAdminLogin();
  initTabs();

  document.getElementById('btnNuevaVendedora').addEventListener('click', () => openModal(null));
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('btnCancelar').addEventListener('click', closeModal);
  document.getElementById('vendedoraForm').addEventListener('submit', submitVendedoraForm);
  document.getElementById('vendedoraModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('vendedoraModal')) closeModal();
  });

  document.getElementById('subirPrendaForm').addEventListener('submit', submitSubirPrenda);
  document.getElementById('spCategoria').addEventListener('change', () =>
    onCategoriaChange(document.getElementById('spCategoria'), document.getElementById('spNuevaCatWrap')));

  document.getElementById('editPrendaForm').addEventListener('submit', submitEditPrenda);
  document.getElementById('prendaModalClose').addEventListener('click', closeEditPrendaModal);
  document.getElementById('btnCancelarPrenda').addEventListener('click', closeEditPrendaModal);
  document.getElementById('prendaEditModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('prendaEditModal')) closeEditPrendaModal();
  });
  document.getElementById('epCategoria').addEventListener('change', () =>
    onCategoriaChange(document.getElementById('epCategoria'), document.getElementById('epNuevaCatWrap')));
})();
