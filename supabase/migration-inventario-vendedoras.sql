-- ── Inventario de vendedoras ─────────────────────────────────────────────────
-- Ejecutar en Supabase → SQL Editor (una sola vez)

create table if not exists inventario_vendedoras (
  id            uuid        primary key default gen_random_uuid(),
  vendedora_id  uuid        not null references vendedoras(id) on delete cascade,
  prenda_id     uuid        not null references prendas(id) on delete cascade,
  pedido_id     uuid        references pedidos(id) on delete set null,
  fecha_entrega date,
  estado        text        not null default 'activo' check (estado in ('activo', 'devuelto')),
  created_at    timestamptz not null default now()
);

alter table inventario_vendedoras disable row level security;
