-- ============================================================
-- FIX: políticas UPDATE para permitir upsert (sincronización offline)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE POLICY "Allow anon update on reports"
  ON reports FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon update on report_systems"
  ON report_systems FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon update on report_photos"
  ON report_photos FOR UPDATE USING (true) WITH CHECK (true);
