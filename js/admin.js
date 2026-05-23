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
      await loadVendedoras();
    } else {
      errEl.textContent = 'Contraseña incorrecta';
    }
  });

  document.getElementById('adminLogout').addEventListener('click', () => {
    document.getElementById('adminPanel').hidden = true;
    document.getElementById('adminLogin').hidden = false;
    document.getElementById('adminPass').value = '';
    document.getElementById('adminLoginError').textContent = '';
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

// ── Init ──────────────────────────────────────────────────────────────────────

(function init() {
  initAdminLogin();

  document.getElementById('btnNuevaVendedora').addEventListener('click', () => openModal(null));
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('btnCancelar').addEventListener('click', closeModal);
  document.getElementById('vendedoraForm').addEventListener('submit', submitVendedoraForm);

  document.getElementById('vendedoraModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('vendedoraModal')) closeModal();
  });
})();
