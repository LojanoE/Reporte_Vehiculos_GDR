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
