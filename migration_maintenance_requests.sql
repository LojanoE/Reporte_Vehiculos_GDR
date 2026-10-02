-- ============================================================
-- Solicitudes de mantenimiento ECSA (solicitud-mantenimiento.html)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Solicitudes de mantenimiento (hoja 1 del formulario ECSA)
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_solicitud TEXT UNIQUE NOT NULL,
  fecha DATE NOT NULL,
  codigo_vehiculo TEXT NOT NULL,
  marca TEXT,
  placa TEXT,
  kilometraje INTEGER,
  departamento TEXT,
  -- Firmas (texto libre, se eligen de request_signers pero se pueden editar)
  responsable_dept TEXT,
  solicitante TEXT,
  inspector_ge TEXT,
  responsable_mtto TEXT,
  aprobador TEXT,
  tipo_reparacion TEXT,
  taller_sugerido TEXT,
  -- [{ "causa": "...", "detalle": "...", "observacion": "..." }]
  fallas JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'EN_REPARACION', 'CERRADA')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mreq_fecha ON maintenance_requests(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mreq_vehiculo ON maintenance_requests(codigo_vehiculo);
CREATE INDEX IF NOT EXISTS idx_mreq_estado ON maintenance_requests(estado);

-- Personas que firman, editables desde la página (baja lógica con activo = false)
CREATE TABLE IF NOT EXISTS request_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL CHECK (rol IN
    ('responsable_dept', 'solicitante', 'inspector_ge', 'responsable_mtto', 'aprobador')),
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rol, nombre)
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_signers ENABLE ROW LEVEL SECURITY;

-- Sin DELETE para el anon key
CREATE POLICY "Allow anon select on maintenance_requests"
  ON maintenance_requests FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on maintenance_requests"
  ON maintenance_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on maintenance_requests"
  ON maintenance_requests FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon select on request_signers"
  ON request_signers FOR SELECT USING (true);
CREATE POLICY "Allow anon insert on request_signers"
  ON request_signers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update on request_signers"
  ON request_signers FOR UPDATE USING (true) WITH CHECK (true);

-- Datos iniciales tomados del Excel "Datos de camionetas" y de la solicitud de ejemplo
INSERT INTO request_signers (rol, nombre, orden) VALUES
  ('responsable_dept', 'Ing. César Vásquez', 1),
  ('responsable_dept', 'Ing. Andrés Vásquez', 2),
  ('responsable_dept', 'Ing. Hernán Gavilanes', 3),
  ('responsable_dept', 'Ing. Frans Celi', 4),
  ('responsable_dept', 'Zhang Congsong', 5),
  ('solicitante', 'Ing. Frans Celi', 1),
  ('solicitante', 'Ing. Jorge Beltrán', 2),
  ('solicitante', 'Ing. Juan Silverio', 3),
  ('inspector_ge', 'Hu Nan', 1),
  ('responsable_mtto', 'Li Lingzhi', 1),
  ('aprobador', 'Wang Hongliang/Dai Jianggen', 1)
ON CONFLICT (rol, nombre) DO NOTHING;
