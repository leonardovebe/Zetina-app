-- ═══════════════════════════════════════════════════════
--  ZETINA — Esquema de base de datos
--  Ejecutar completo en: Supabase → SQL Editor → New query
-- ═══════════════════════════════════════════════════════

-- ── Vendedoras ────────────────────────────────────────────────────────────────
create table if not exists vendedoras (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null default 'Vendedora Zetina',
  telefono   text,
  email      text,
  foto_url   text,
  credito    numeric     not null default 0,
  created_at timestamptz not null default now()
);

-- ── Prendas (inventario propio de la vendedora) ───────────────────────────────
create table if not exists prendas (
  id             uuid        primary key default gen_random_uuid(),
  vendedora_id   uuid        references vendedoras(id) on delete cascade,
  nombre         text        not null,
  marca          text,
  emoji          text        default '👚',
  talla_etiqueta text,
  talla_real     text,
  precio_costo   numeric     not null default 0,
  precio_min     numeric     not null default 0,
  precio_max     numeric     not null default 0,
  gradiente      text,
  disponible     boolean     not null default true,
  created_at     timestamptz not null default now()
);

-- ── Fotos de prendas ──────────────────────────────────────────────────────────
create table if not exists fotos_prendas (
  id         uuid        primary key default gen_random_uuid(),
  prenda_id  uuid        not null references prendas(id) on delete cascade,
  url        text        not null,
  created_at timestamptz not null default now()
);

-- ── Pedidos a ZETINA ──────────────────────────────────────────────────────────
create table if not exists pedidos (
  id           uuid        primary key default gen_random_uuid(),
  vendedora_id uuid        references vendedoras(id) on delete cascade,
  numero       text,
  fecha        date,
  estado       text        not null default 'En proceso',
  created_at   timestamptz not null default now(),
  constraint pedidos_estado_check check (estado in ('En proceso', 'En camino', 'Entregado'))
);

-- ── Detalle de pedidos ────────────────────────────────────────────────────────
create table if not exists detalle_pedidos (
  id         uuid        primary key default gen_random_uuid(),
  pedido_id  uuid        not null references pedidos(id) on delete cascade,
  nombre     text,
  marca      text,
  emoji      text,
  precio     numeric     not null default 0,
  created_at timestamptz not null default now()
);

-- ── Clientes de la vendedora ──────────────────────────────────────────────────
create table if not exists clientes (
  id               uuid        primary key default gen_random_uuid(),
  vendedora_id     uuid        references vendedoras(id) on delete cascade,
  nombre           text        not null,
  telefono         text,
  talla_ropa       text,
  talla_pantalon   text,
  talla_calzado    text,
  fecha_cumpleanos date,
  notas            text,
  created_at       timestamptz not null default now()
);

-- ── Ventas (prendas vendidas a clientas) ──────────────────────────────────────
create table if not exists ventas (
  id           uuid        primary key default gen_random_uuid(),
  cliente_id   uuid        not null references clientes(id) on delete cascade,
  prenda_id    uuid        references prendas(id) on delete set null,
  nombre_prenda text,
  marca        text,
  fecha        date,
  monto        numeric     not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Abonos (pagos de clientas) ────────────────────────────────────────────────
create table if not exists abonos (
  id         uuid        primary key default gen_random_uuid(),
  cliente_id uuid        not null references clientes(id) on delete cascade,
  fecha      date,
  monto      numeric     not null default 0,
  created_at timestamptz not null default now()
);

-- ── Migración: contraseña de vendedoras ──────────────────────────────────────
-- Ejecutar en Supabase → SQL Editor (una sola vez)
alter table vendedoras add column if not exists password_hash text;

-- ── Migración: contraseña temporal ────────────────────────────────────────────
-- Indica si la vendedora debe cambiar su contraseña al primer inicio de sesión
alter table vendedoras add column if not exists password_temporal boolean not null default false;

-- ═══════════════════════════════════════════════════════
--  Row Level Security — deshabilitado para uso inicial
--  (habilitar cuando se agregue autenticación)
-- ═══════════════════════════════════════════════════════
alter table vendedoras    disable row level security;
alter table prendas       disable row level security;
alter table fotos_prendas disable row level security;
alter table pedidos       disable row level security;
alter table detalle_pedidos disable row level security;
alter table clientes      disable row level security;
alter table ventas        disable row level security;
alter table abonos        disable row level security;
