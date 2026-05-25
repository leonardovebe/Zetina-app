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
      detalle_pedidos ( id, nombre, marca, emoji, precio )
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
          ${accion}
        </div>
      </article>`;
  }).join('');

  list.querySelectorAll('.ap-estado-btn').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstado(btn.dataset.id, btn.dataset.estado));
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

// ── Tabs ──────────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', String(isActive));
  });
  document.getElementById('tabVendedoras').hidden = tabId !== 'vendedoras';
  document.getElementById('tabPedidos').hidden    = tabId !== 'pedidos';
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
})();
