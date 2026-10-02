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
      const reportRow = {
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
        km_sospechoso: !!header.km_sospechoso,
        km_nota: header.km_nota || '',
        synced_at: new Date().toISOString()
      };

      const upsertReport = row => client
        .from('reports')
        .upsert(row, { onConflict: 'cod_reporte' })
        .select('id, cod_reporte');

      let { data: reportRows, error: repError } = await upsertReport(reportRow);

      // Compatibilidad: si aún no se aplicó la migración de km dudoso en la
      // base, se reintenta sin esas columnas para no perder el reporte.
      if (repError && /km_sospechoso|km_nota/.test(repError.message || '')) {
        console.warn('Columnas km_sospechoso/km_nota ausentes. Aplica migration_km_sospechoso.sql en Supabase.');
        const { km_sospechoso, km_nota, ...legacyRow } = reportRow;
        ({ data: reportRows, error: repError } = await upsertReport(legacyRow));
      }

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

      const { data, error } = await (async () => {
        // Paginación: PostgREST devuelve máx. 1000 filas por petición
        const PAGE = 1000;
        let all = [];
        let from = 0;
        while (true) {
          const { data: chunk, error: chunkErr } = await query.range(from, from + PAGE - 1);
          if (chunkErr) throw chunkErr;
          all = all.concat(chunk || []);
          if (!chunk || chunk.length < PAGE) break;
          from += PAGE;
          if (filters.limit && all.length >= filters.limit) {
            all = all.slice(0, filters.limit);
            break;
          }
        }
        return { data: all, error: null };
      })();
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

  /**
   * Obtiene la última lectura de kilometraje registrada de un vehículo.
   * Se usa en el formulario para detectar tipeos (km que retrocede o salta demasiado).
   * @param {string} vehicleCode
   * @returns {Promise<{ok:boolean, data?:{kilometraje:number, fecha_hora:string}|null, error?:any}>}
   */
  async function getLastKm(vehicleCode) {
    try {
      const lastRows = cols => client
        .from('reports')
        .select(cols)
        .eq('codigo_vehiculo', vehicleCode)
        .not('kilometraje', 'is', null)
        .order('fecha_hora', { ascending: false })
        .limit(10);

      let { data, error } = await lastRows('kilometraje, fecha_hora, km_sospechoso');
      if (error && /km_sospechoso/.test(error.message || '')) {
        ({ data, error } = await lastRows('kilometraje, fecha_hora'));
      }
      if (error) throw error;

      // Se compara contra la última lectura CONFIABLE: las marcadas como
      // dudosas se saltan para no arrastrar el error al siguiente reporte.
      const rows = data || [];
      const last = rows.find(r => !r.km_sospechoso) || null;
      return { ok: true, data: last };
    } catch (err) {
      console.error('Error leyendo último kilometraje:', err);
      return { ok: false, data: null, error: err };
    }
  }

  /**
   * Lee los umbrales de mantenimiento (motor / caja) por vehículo.
   * @returns {Promise<{ok:boolean, data?:Object, updatedAt?:string|null, error?:any}>}
   *          data = { ECO23: {motor, caja}, ... }
   */
  async function getMaintenanceAlerts() {
    try {
      const { data, error } = await client
        .from('maintenance_alerts')
        .select('codigo_vehiculo, motor, caja, updated_at')
        .eq('activo', true)
        .order('codigo_vehiculo');

      if (error) throw error;

      const map = {};
      let updatedAt = null;
      (data || []).forEach(r => {
        map[r.codigo_vehiculo] = { motor: r.motor || 0, caja: r.caja || 0 };
        if (!updatedAt || r.updated_at > updatedAt) updatedAt = r.updated_at;
      });
      return { ok: true, data: map, updatedAt };
    } catch (err) {
      console.error('Error leyendo umbrales de mantenimiento:', err);
      return { ok: false, error: err };
    }
  }

  /**
   * Guarda los umbrales de mantenimiento. Los vehículos que ya no estén en el
   * mapa se marcan activo = false (el anon key no tiene permiso de DELETE).
   * @param {Object} map - { ECO23: {motor, caja}, ... }
   */
  async function saveMaintenanceAlerts(map) {
    try {
      const now = new Date().toISOString();
      const codes = Object.keys(map || {});
      const rows = codes.map(code => ({
        codigo_vehiculo: code,
        motor: map[code].motor || null,
        caja: map[code].caja || null,
        activo: true,
        updated_at: now
      }));

      if (rows.length) {
        const { error } = await client
          .from('maintenance_alerts')
          .upsert(rows, { onConflict: 'codigo_vehiculo' });
        if (error) throw error;
      }

      // Baja lógica de los que se quitaron del editor
      let deactivate = client
        .from('maintenance_alerts')
        .update({ activo: false, updated_at: now })
        .eq('activo', true);
      if (codes.length) {
        deactivate = deactivate.not('codigo_vehiculo', 'in', `(${codes.map(c => `"${c}"`).join(',')})`);
      }
      const { error: delError } = await deactivate;
      if (delError) throw delError;

      return { ok: true };
    } catch (err) {
      console.error('Error guardando umbrales de mantenimiento:', err);
      return { ok: false, error: err };
    }
  }

  /**
   * Carga los umbrales desde Supabase y los aplica sobre window.MAINTENANCE_ALERTS.
   * Si falla (sin conexión o tabla ausente) se mantienen los de constants.js.
   * @returns {Promise<boolean>} true si se aplicaron valores de la nube
   */
  async function refreshMaintenanceAlerts() {
    if (!navigator.onLine || typeof window.applyMaintenanceAlerts !== 'function') return false;
    const res = await getMaintenanceAlerts();
    if (!res.ok || !res.data || !Object.keys(res.data).length) return false;
    window.applyMaintenanceAlerts(res.data);
    return true;
  }

  // ====== Solicitudes de mantenimiento ECSA ======

  /**
   * Firmantes activos agrupados por rol: { solicitante: ['Ing. ...'], ... }
   */
  async function getRequestSigners() {
    try {
      const { data, error } = await client
        .from('request_signers')
        .select('rol, nombre, orden')
        .eq('activo', true)
        .order('orden')
        .order('nombre');
      if (error) throw error;
      const map = {};
      (data || []).forEach(r => { (map[r.rol] = map[r.rol] || []).push(r.nombre); });
      return { ok: true, data: map };
    } catch (err) {
      console.error('Error leyendo firmantes:', err);
      return { ok: false, error: err };
    }
  }

  /**
   * Guarda los firmantes. Los que ya no estén en la lista se marcan activo = false
   * (el anon key no tiene DELETE).
   * @param {Object} map - { rol: [nombre, ...] }
   */
  async function saveRequestSigners(map) {
    try {
      const now = new Date().toISOString();
      const rows = [];
      Object.keys(map || {}).forEach(rol => {
        const seen = new Set();
        (map[rol] || []).forEach((nombre, i) => {
          const n = String(nombre || '').trim();
          if (!n || seen.has(n)) return;
          seen.add(n);
          rows.push({ rol, nombre: n, orden: i + 1, activo: true, updated_at: now });
        });
      });

      // Baja lógica de todo lo activo, luego se reactiva/inserta lo vigente
      const { error: offError } = await client
        .from('request_signers')
        .update({ activo: false, updated_at: now })
        .eq('activo', true);
      if (offError) throw offError;

      if (rows.length) {
        const { error } = await client
          .from('request_signers')
          .upsert(rows, { onConflict: 'rol,nombre' });
        if (error) throw error;
      }
      return { ok: true };
    } catch (err) {
      console.error('Error guardando firmantes:', err);
      return { ok: false, error: err };
    }
  }

  /**
   * Siguiente código correlativo del mes: SM-YYMM-<ECO>-NN
   * @param {string} eco   - código de vehículo (ej. ECO62)
   * @param {string} fecha - YYYY-MM-DD
   */
  async function getNextRequestCode(eco, fecha) {
    const [y, m] = fecha.split('-');
    const prefix = `SM-${y.slice(2)}${m}-${eco}-`;
    let n = 1;
    try {
      const { data, error } = await client
        .from('maintenance_requests')
        .select('cod_solicitud')
        .like('cod_solicitud', `${prefix}%`);
      if (error) throw error;
      (data || []).forEach(r => {
        const k = parseInt(r.cod_solicitud.slice(prefix.length), 10);
        if (!isNaN(k) && k >= n) n = k + 1;
      });
    } catch (err) {
      console.error('Error calculando correlativo (se usa 01):', err);
    }
    return prefix + String(n).padStart(2, '0');
  }

  async function saveMaintenanceRequest(row) {
    try {
      const payload = Object.assign({}, row, { updated_at: new Date().toISOString() });
      const { error } = await client
        .from('maintenance_requests')
        .upsert(payload, { onConflict: 'cod_solicitud' });
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.error('Error guardando solicitud de mantenimiento:', err);
      return { ok: false, error: err };
    }
  }

  async function getMaintenanceRequests(filters) {
    try {
      const f = filters || {};
      let query = client
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(f.limit || 50);
      if (f.estado) query = query.eq('estado', f.estado);
      if (f.vehicle) query = query.eq('codigo_vehiculo', f.vehicle);
      const { data, error } = await query;
      if (error) throw error;
      return { ok: true, data: data || [] };
    } catch (err) {
      console.error('Error leyendo solicitudes de mantenimiento:', err);
      return { ok: false, data: [], error: err };
    }
  }

  async function updateMaintenanceRequestStatus(cod, estado) {
    try {
      const { error } = await client
        .from('maintenance_requests')
        .update({ estado, updated_at: new Date().toISOString() })
        .eq('cod_solicitud', cod);
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.error('Error actualizando estado de la solicitud:', err);
      return { ok: false, error: err };
    }
  }

  window.getRequestSignersFromSupabase = getRequestSigners;
  window.saveRequestSignersToSupabase = saveRequestSigners;
  window.getNextRequestCode = getNextRequestCode;
  window.saveMaintenanceRequestToSupabase = saveMaintenanceRequest;
  window.getMaintenanceRequestsFromSupabase = getMaintenanceRequests;
  window.updateMaintenanceRequestStatusInSupabase = updateMaintenanceRequestStatus;

  window.saveReportToSupabase = saveReport;
  window.getReportsFromSupabase = getReports;
  window.getStatsFromSupabase = getStats;
  window.getLastKmFromSupabase = getLastKm;
  window.getMaintenanceAlertsFromSupabase = getMaintenanceAlerts;
  window.saveMaintenanceAlertsToSupabase = saveMaintenanceAlerts;
  window.refreshMaintenanceAlerts = refreshMaintenanceAlerts;
})();
