-- Agregar estado "Pagado" al flujo de pedidos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pedidos
  DROP CONSTRAINT IF EXISTS pedidos_estado_check;

ALTER TABLE pedidos
  ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN ('En proceso', 'Pagado', 'En camino', 'Entregado'));
