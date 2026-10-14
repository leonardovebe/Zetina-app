// Migración: puebla medidas_clienta con las ventas históricas.
// Uso: node migration.js   (Node 18+, sin dependencias)
//
// Recorre las ventas con clienta en orden de fecha y, por cada medida de la prenda vendida,
// aplica la misma regla que registrarMedidasAprendidas() en js/app.js:
//   confirmaciones + 1 y medida_valor = promedio ponderado.
// Para no contar dos veces una venta, se detiene si medidas_clienta ya tiene registros.

const fs   = require('fs');
const path = require('path');

const config = fs.readFileSync(path.join(__dirname, 'js', 'supabase-config.js'), 'utf8');
const SUPABASE_URL  = (config.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
const SUPABASE_ANON = (config.match(/eyJ[A-Za-z0-9._-]+/) || [])[0];
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('No se encontró la URL o la llave de Supabase en js/supabase-config.js');
  process.exit(1);
}

const HEADERS = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' };

async function rest(pathQuery, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQuery}`, { ...options, headers: { ...HEADERS, ...(options.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${pathQuery.split('?')[0]}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  const existentes = await rest('medidas_clienta?select=id&limit=1');
  if (existentes.length) {
    console.error('medidas_clienta ya tiene registros: la migración se detiene para no contar ventas dos veces.');
    process.exit(1);
  }

  const ventas = await rest(
    'ventas?select=cliente_id,prenda_id,fecha,' +
    'prendas(medida_1_nombre,medida_1_valor,medida_2_nombre,medida_2_valor,medida_3_nombre,medida_3_valor)' +
    '&cliente_id=not.is.null&order=fecha.asc'
  );

  // clienta_id|medida_nombre → { clienta_id, medida_nombre, valor, confirmaciones }
  const acumulado = new Map();
  let ventasConMedidas = 0;
  for (const v of ventas) {
    const p = v.prendas || {};
    const medidas = [1, 2, 3]
      .map(i => ({ nombre: p[`medida_${i}_nombre`], valor: p[`medida_${i}_valor`] }))
      .filter(m => m.nombre && m.valor != null);
    if (!medidas.length) continue;
    ventasConMedidas++;
    for (const m of medidas) {
      const key  = `${v.cliente_id}|${m.nombre}`;
      const prev = acumulado.get(key);
      const conf = (prev ? prev.confirmaciones : 0) + 1;
      const valor = prev ? (prev.valor * (conf - 1) + +m.valor) / conf : +m.valor;
      acumulado.set(key, { clienta_id: v.cliente_id, medida_nombre: m.nombre, valor, confirmaciones: conf });
    }
  }

  const ahora = new Date().toISOString();
  const filas = [...acumulado.values()].map(r => ({
    clienta_id:     r.clienta_id,
    medida_nombre:  r.medida_nombre,
    medida_valor:   Math.round(r.valor * 10) / 10,
    confirmaciones: r.confirmaciones,
    updated_at:     ahora,
  }));

  if (filas.length) {
    await rest('medidas_clienta?on_conflict=clienta_id,medida_nombre', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(filas),
    });
  }

  const clientas = new Set(filas.map(f => f.clienta_id)).size;
  console.log(`Ventas con clienta:        ${ventas.length}`);
  console.log(`Ventas con medidas:        ${ventasConMedidas}`);
  console.log(`Clientas con medidas:      ${clientas}`);
  console.log(`Registros en medidas_clienta: ${filas.length}`);
  const porNombre = {};
  filas.forEach(f => { porNombre[f.medida_nombre] = (porNombre[f.medida_nombre] || 0) + 1; });
  Object.entries(porNombre).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(`  · ${n}: ${c}`));
}

main().catch(err => { console.error('Error en la migración:', err.message); process.exit(1); });
