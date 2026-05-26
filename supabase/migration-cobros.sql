-- ── Migración: ventas y abonos con vendedora_id y estado ────────────────────
-- Ejecutar en Supabase → SQL Editor (una sola vez)

alter table ventas add column if not exists vendedora_id uuid references vendedoras(id) on delete cascade;
alter table ventas add column if not exists estado text not null default 'pendiente';

alter table abonos add column if not exists vendedora_id uuid references vendedoras(id) on delete cascade;
