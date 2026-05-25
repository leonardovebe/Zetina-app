-- ── Devoluciones ────────────────────────────────────────────────────────────
-- Ejecutar en Supabase → SQL Editor (una sola vez)

create table if not exists devoluciones (
  id           uuid        primary key default gen_random_uuid(),
  prenda_id    uuid        not null references prendas(id) on delete cascade,
  vendedora_id uuid        not null references vendedoras(id) on delete cascade,
  motivo       text        not null check (motivo in ('cambio_talla', 'defecto', 'otro')),
  nota         text,
  estado       text        not null default 'Pendiente',
  created_at   timestamptz not null default now()
);

alter table devoluciones disable row level security;
