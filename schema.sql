-- ============================================================
-- Esquema Supabase para Reporte Vehículos GDR
-- Ejecutar esto en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Tabla principal de reportes
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_reporte TEXT UNIQUE NOT NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado_operativo TEXT NOT NULL,
  codigo_vehiculo TEXT NOT NULL,
  placa TEXT,
  kilometraje INTEGER,
  conductor TEXT,
  inspector TEXT,
  ubicacion TEXT,
  obs_general TEXT,
  archivo TEXT,
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- Evaluación por sistema de cada reporte
CREATE TABLE IF NOT EXISTS report_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  nombre_es TEXT NOT NULL,
  nombre_ui TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('OK', 'OBS', 'CRI')),
  observacion TEXT,
  UNIQUE (report_id, nombre_es)
);

-- Metadatos de fotos (las imágenes reales quedan locales)
CREATE TABLE IF NOT EXISTS report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  foto_index INTEGER NOT NULL CHECK (foto_index IN (1, 2)),
  tiene_foto BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (report_id, foto_index)
);

-- Índices útiles para consultas del dashboard
CREATE INDEX IF NOT EXISTS idx_reports_fecha_hora ON reports(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_reports_codigo_vehiculo ON reports(codigo_vehiculo);
CREATE INDEX IF NOT EXISTS idx_reports_estado ON reports(estado_operativo);
CREATE INDEX IF NOT EXISTS idx_systems_report_id ON report_systems(report_id);
CREATE INDEX IF NOT EXISTS idx_systems_estado ON report_systems(estado);

-- ============================================================
-- Row Level Security (sin autenticación)
-- ============================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

-- Políticas para reports
CREATE POLICY "Allow anon select on reports"
  ON reports FOR SELECT USING (true);

CREATE POLICY "Allow anon insert on reports"
  ON reports FOR INSERT WITH CHECK (true);

-- Upsert por cod_reporte puede requerir UPDATE (reporte regenerado mismo día)
CREATE POLICY "Allow anon update on reports"
  ON reports FOR UPDATE USING (true) WITH CHECK (true);

-- Políticas para report_systems
CREATE POLICY "Allow anon select on report_systems"
  ON report_systems FOR SELECT USING (true);

CREATE POLICY "Allow anon insert on report_systems"
  ON report_systems FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update on report_systems"
  ON report_systems FOR UPDATE USING (true) WITH CHECK (true);

-- Políticas para report_photos
CREATE POLICY "Allow anon select on report_photos"
  ON report_photos FOR SELECT USING (true);

CREATE POLICY "Allow anon insert on report_photos"
  ON report_photos FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update on report_photos"
  ON report_photos FOR UPDATE USING (true) WITH CHECK (true);
