-- ============================================================
-- Migración: kilometraje dudoso
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Permite GUARDAR el informe aunque el kilometraje no sea coherente
-- (retrocede o salta demasiado). El reporte queda marcado y el análisis
-- lo excluye por defecto de los cálculos de km recorridos.
-- ============================================================

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS km_sospechoso BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS km_nota TEXT;

-- Índice parcial: normalmente son pocas filas
CREATE INDEX IF NOT EXISTS idx_reports_km_sospechoso
  ON reports(codigo_vehiculo)
  WHERE km_sospechoso;
