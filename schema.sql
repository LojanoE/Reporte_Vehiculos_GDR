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
  -- Kilometraje guardado pese a ser incoherente (el usuario lo confirmó).
  -- El análisis lo excluye por defecto de los cálculos de km recorridos.
  km_sospechoso BOOLEAN NOT NULL DEFAULT false,
  km_nota TEXT,
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

-- Umbrales de mantenimiento por vehículo, editables desde el dashboard
-- (ver migration_maintenance_alerts.sql para el detalle y los datos iniciales)
CREATE TABLE IF NOT EXISTS maintenance_alerts (
  codigo_vehiculo TEXT PRIMARY KEY,
  motor           INTEGER,
  caja            INTEGER,
  activo          BOOLEAN NOT NULL DEFAULT true,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solicitudes de mantenimiento ECSA y firmantes editables
-- (ver migration_maintenance_requests.sql para columnas, políticas y datos iniciales)

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
ALTER TABLE maintenance_alerts ENABLE ROW LEVEL SECURITY;

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

-- Políticas para maintenance_alerts (sin DELETE: se usa baja lógica con activo=false)
CREATE POLICY "Allow anon select on maintenance_alerts"
  ON maintenance_alerts FOR SELECT USING (true);

CREATE POLICY "Allow anon insert on maintenance_alerts"
  ON maintenance_alerts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update on maintenance_alerts"
  ON maintenance_alerts FOR UPDATE USING (true) WITH CHECK (true);


-- ============================================================
-- Formato SE-PR-009-FOR-02 V03 (catálogos y columnas nuevas)
-- Fuente: migration_inspeccion_v03.sql
-- ============================================================
-- ============================================================
-- Formato de inspección SE-PR-009-FOR-02 V03 (camionetas y camiones)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Es aditiva: no borra ni modifica datos existentes.
-- ============================================================

-- Catálogo de vehículos (datos del encabezado del formato)
CREATE TABLE IF NOT EXISTS vehicles (
  codigo_vehiculo    TEXT PRIMARY KEY,
  placa              TEXT,
  marca              TEXT,
  anio               INTEGER,
  tonelaje           TEXT,
  tipo               TEXT NOT NULL DEFAULT 'CAMIONETA'
                     CHECK (tipo IN ('CAMIONETA', 'CAMION', 'GRUA')),
  aplica_pertiga     BOOLEAN NOT NULL DEFAULT false,
  vigencia_matricula DATE,
  vigencia_revision  DATE,
  activo             BOOLEAN NOT NULL DEFAULT true,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Catálogo de conductores
CREATE TABLE IF NOT EXISTS drivers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             TEXT UNIQUE NOT NULL,
  cedula             TEXT,
  posee_induccion    BOOLEAN NOT NULL DEFAULT false,
  tipo_licencia      TEXT,
  caducidad_licencia DATE,
  puntos_licencia    INTEGER,
  activo             BOOLEAN NOT NULL DEFAULT true,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Sin DELETE para el anon key (baja lógica con activo = false)
CREATE POLICY "Allow anon select on vehicles"
  ON vehicles FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on vehicles"
  ON vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on vehicles"
  ON vehicles FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon select on drivers"
  ON drivers FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on drivers"
  ON drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on drivers"
  ON drivers FOR UPDATE USING (true) WITH CHECK (true);

-- Copia (snapshot) del encabezado en cada reporte: el reporte impreso no
-- cambia si después se edita el catálogo.
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS cedula TEXT,
  ADD COLUMN IF NOT EXISTS posee_induccion BOOLEAN,
  ADD COLUMN IF NOT EXISTS tipo_licencia TEXT,
  ADD COLUMN IF NOT EXISTS caducidad_licencia DATE,
  ADD COLUMN IF NOT EXISTS puntos_licencia INTEGER,
  ADD COLUMN IF NOT EXISTS anio INTEGER,
  ADD COLUMN IF NOT EXISTS tonelaje TEXT,
  ADD COLUMN IF NOT EXISTS vigencia_matricula DATE,
  ADD COLUMN IF NOT EXISTS vigencia_revision DATE,
  ADD COLUMN IF NOT EXISTS formato_version TEXT;

-- Sección del formato (A–G, GRUA, H) y código exacto elegido por el inspector.
-- `estado` sigue siendo OK/OBS/CRI (mapeado desde el código) para no romper
-- el dashboard ni el reporte por vehículo.
ALTER TABLE report_systems
  ADD COLUMN IF NOT EXISTS seccion TEXT,
  ADD COLUMN IF NOT EXISTS codigo TEXT
    CHECK (codigo IS NULL OR codigo IN ('OK', 'CO', 'FA', 'VE', 'RE', 'LI', 'CA'));
