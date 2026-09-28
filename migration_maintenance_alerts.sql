-- ============================================================
-- Migración: umbrales de mantenimiento editables
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Mueve los kilometrajes objetivo de motor y caja/corona (antes
-- hardcodeados en constants.js → MAINTENANCE_ALERTS) a la base, para
-- poder editarlos desde el dashboard sin tocar el código.
--
-- Baja lógica: al borrar una línea en el editor se marca activo = false
-- (el anon key no tiene permiso de DELETE).
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_alerts (
  codigo_vehiculo TEXT PRIMARY KEY,
  motor           INTEGER,
  caja            INTEGER,
  activo          BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE maintenance_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select on maintenance_alerts" ON maintenance_alerts;
CREATE POLICY "Allow anon select on maintenance_alerts"
  ON maintenance_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert on maintenance_alerts" ON maintenance_alerts;
CREATE POLICY "Allow anon insert on maintenance_alerts"
  ON maintenance_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update on maintenance_alerts" ON maintenance_alerts;
CREATE POLICY "Allow anon update on maintenance_alerts"
  ON maintenance_alerts FOR UPDATE USING (true) WITH CHECK (true);

-- Valores iniciales: los que estaban en constants.js
INSERT INTO maintenance_alerts (codigo_vehiculo, motor, caja) VALUES
  ('ECO23',  93408,  93408),
  ('ECO62',  31652,  41652),
  ('ECO26', 134833, 144044),
  ('ECO70',  25000,  25000),
  ('ECO71',  15000,  20000),
  ('ECO36', 219886, 219886),
  ('M01',   172841, 182562)
ON CONFLICT (codigo_vehiculo) DO NOTHING;
