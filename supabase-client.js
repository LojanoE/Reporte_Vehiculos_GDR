/* ============================================================
   Supabase Client — Reporte Vehículos GDR
   No build step; loaded as regular script via index.html
   ============================================================ */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://dzmhhlsttqygjvfabdxx.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6bWhobHN0dHF5Z2p2ZmFiZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTE3MDAsImV4cCI6MjA5MDcyNzcwMH0._Gf0G2gpV_9QAYqFx1Kn6TN0lFDq3LxmBdNI82Suj-o';

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('Supabase library not loaded. Reports will work offline only.');
    window.SUPABASE_READY = false;
    return;
  }

  // fetch sin caché: evita que el navegador sirva respuestas viejas del API
  const noStoreFetch = (url, opts) => fetch(url, Object.assign({}, opts, { cache: 'no-store' }));

  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: noStoreFetch }
  });
  window.SUPABASE_READY = true;
  window.supabaseClient = client;

  /**
   * Guarda un reporte completo en Supabase.
   * @param {Object} payload
   * @param {Object} payload.header - datos del reporte
   * @param {Array}  payload.systems - evaluaciones por sistema
   * @param {Array}  payload.photos  - [{index:1|2, tiene_foto:bool}]
   * @returns {Promise<{ok:boolean, error?:any}>}
   */
  async function saveReport(payload) {
    try {
      const header = payload.header || {};
      const systems = payload.systems || [];
      const photos = payload.photos || [];

      // 1) Insertar/actualizar reporte (upsert por cod_reporte)
      const { data: reportRows, error: repError } = await client
        .from('reports')
        .upsert({
          cod_reporte: header.cod_reporte,
          fecha_hora: header.fecha_hora,
          estado_operativo: header.estado_operativo,
          codigo_vehiculo: header.codigo_vehiculo,
          placa: header.placa,
          kilometraje: header.kilometraje,
          conductor: header.conductor,
          inspector: header.inspector,
          ubicacion: header.ubicacion,
          obs_general: header.obs_general,
          archivo: header.archivo,
          version: header.version,
          synced_at: new Date().toISOString()
        }, { onConflict: 'cod_reporte' })
        .select('id, cod_reporte');

      if (repError) throw repError;
      if (!reportRows || !reportRows.length) throw new Error('No se pudo obtener el ID del reporte');

      const reportId = reportRows[0].id;

      // 2) Insertar/actualizar sistemas
      if (systems.length > 0) {
        const systemsPayload = systems.map(s => ({
          report_id: reportId,
          nombre_es: s.nombre_es,
          nombre_ui: s.nombre_ui || s.nombre_es,
          estado: s.estado,
          observacion: s.observacion || ''
        }));

        const { error: sysError } = await client
          .from('report_systems')
          .upsert(systemsPayload, { onConflict: 'report_id,nombre_es' });

        if (sysError) throw sysError;
      }

      // 3) Insertar/actualizar metadatos de fotos
      if (photos.length > 0) {
        const photosPayload = photos.map(p => ({
          report_id: reportId,
          foto_index: p.index,
          tiene_foto: !!p.tiene_foto
        }));

        const { error: photoError } = await client
          .from('report_photos')
          .upsert(photosPayload, { onConflict: 'report_id,foto_index' });

        if (photoError) throw photoError;
      }

      return { ok: true, reportId };
    } catch (err) {
      console.error('Error guardando en Supabase:', err);
      return { ok: false, error: err };
    }
  }

  /**
   * Obtiene reportes con filtros opcionales.
   * @param {Object} filters
   * @param {string} filters.startDate - ISO date string (inclusive)
   * @param {string} filters.endDate   - ISO date string (inclusive)
   * @param {string} filters.vehicle   - código de vehículo
   * @param {string} filters.codigo    - código de reporte (fragmento)
   * @param {string} filters.conductor - nombre del conductor
   * @param {string} filters.status    - estado operativo
   * @param {number} filters.limit     - máximo de filas
   * @returns {Promise<{ok:boolean, data?:Array, error?:any}>}
   */
  async function getReports(filters) {
    try {
      let query = client
        .from('reports')
        .select('*, report_systems(*), report_photos(*)')
        .order('fecha_hora', { ascending: false });

      if (filters.limit) query = query.limit(filters.limit);

      if (filters.startDate) {
        // Construir la fecha con componentes locales para respetar la zona horaria
        // del navegador y evitar interpretaciones UTC inesperadas.
        const [y, m, d] = filters.startDate.split('-').map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        query = query.gte('fecha_hora', start.toISOString());
      }
      if (filters.endDate) {
        const [y, m, d] = filters.endDate.split('-').map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        query = query.lte('fecha_hora', end.toISOString());
      }
      if (filters.vehicle) {
        query = query.ilike('codigo_vehiculo', `%${filters.vehicle}%`);
      }
      if (filters.codigo) {
        query = query.ilike('cod_reporte', `%${filters.codigo}%`);
      }
      if (filters.conductor) {
        query = query.ilike('conductor', `%${filters.conductor}%`);
      }
      if (filters.status) {
        query = query.eq('estado_operativo', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { ok: true, data: data || [] };
    } catch (err) {
      console.error('Error leyendo reportes:', err);
      return { ok: false, data: [], error: err };
    }
  }

  /**
   * Obtiene métricas agregadas para KPIs.
   */
  async function getStats() {
    try {
      const { data, error } = await client
        .from('reports')
        .select('id, estado_operativo, fecha_hora, codigo_vehiculo, kilometraje, report_systems(estado, nombre_es)');

      if (error) throw error;
      return { ok: true, data: data || [] };
    } catch (err) {
      console.error('Error leyendo estadísticas:', err);
      return { ok: false, data: [], error: err };
    }
  }

  window.saveReportToSupabase = saveReport;
  window.getReportsFromSupabase = getReports;
  window.getStatsFromSupabase = getStats;
})();
