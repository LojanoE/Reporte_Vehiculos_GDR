/* ============================================================
   Offline Queue — IndexedDB + sincronización automática
   Guarda reportes pendientes y los sube cuando hay conexión.
   ============================================================ */

(function () {
  'use strict';

  const DB_NAME = 'RDV_GDR_DB';
  const DB_VERSION = 1;
  const STORE_NAME = 'pending_reports';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB no soportado'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true });
          store.createIndex('cod_reporte', 'header.cod_reporte', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
    return dbPromise;
  }

  /**
   * Guarda un reporte en la cola local.
   * @param {Object} payload - mismo formato que saveReportToSupabase
   * @returns {Promise<number>} localId
   */
  async function queueReport(payload) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry = {
        ...payload,
        createdAt: new Date().toISOString(),
        attempts: 0
      };
      const request = store.add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los reportes pendientes.
   */
  async function getPendingReports() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina un reporte de la cola local (después de sincronizar).
   */
  async function deletePendingReport(localId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(localId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Incrementa contador de intentos fallidos.
   */
  async function bumpAttempts(localId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(localId);
      getReq.onsuccess = () => {
        const entry = getReq.result;
        if (!entry) { resolve(); return; }
        entry.attempts = (entry.attempts || 0) + 1;
        entry.lastAttempt = new Date().toISOString();
        const putReq = store.put(entry);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  /**
   * Sincroniza todos los reportes pendientes con Supabase.
   * @returns {Promise<{synced:number, failed:number, errors:Array}>}
   */
  async function syncPendingReports() {
    const result = { synced: 0, failed: 0, errors: [] };
    if (!window.SUPABASE_READY || !window.saveReportToSupabase) {
      result.errors.push('Supabase no está disponible');
      return result;
    }

    const pending = await getPendingReports();
    // Ordenar por fecha de creación
    pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const item of pending) {
      try {
        const res = await window.saveReportToSupabase(item);
        if (res.ok) {
          await deletePendingReport(item.localId);
          result.synced++;
        } else {
          await bumpAttempts(item.localId);
          result.failed++;
          result.errors.push({ cod_reporte: item.header?.cod_reporte, error: res.error?.message || res.error });
        }
      } catch (err) {
        await bumpAttempts(item.localId);
        result.failed++;
        result.errors.push({ cod_reporte: item.header?.cod_reporte, error: err.message });
      }
    }

    return result;
  }

  /**
   * Guarda un reporte: intenta Supabase primero; si falla, cola local.
   * @returns {Promise<{ok:boolean, synced:boolean, queued:boolean, error?:any}>}
   */
  async function saveReportOnlineOrQueue(payload) {
    if (window.SUPABASE_READY && navigator.onLine && window.saveReportToSupabase) {
      const res = await window.saveReportToSupabase(payload);
      if (res.ok) {
        return { ok: true, synced: true, queued: false, reportId: res.reportId };
      }
    }
    // Sin conexión o falló: guardar localmente
    await queueReport(payload);
    return { ok: true, synced: false, queued: true };
  }

  /**
   * Devuelve la cantidad de reportes pendientes.
   */
  async function countPending() {
    const pending = await getPendingReports();
    return pending.length;
  }

  // Sincronización automática al detectar conexión
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      console.log('[RDV] Conexión detectada. Sincronizando...');
      const result = await syncPendingReports();
      console.log('[RDV] Sync resultado:', result);
      if (result.synced > 0 && typeof showToast === 'function') {
        showToast(`${result.synced} reporte(s) sincronizado(s)`);
      }
    });
  }

  window.queueReport = queueReport;
  window.getPendingReports = getPendingReports;
  window.deletePendingReport = deletePendingReport;
  window.syncPendingReports = syncPendingReports;
  window.saveReportOnlineOrQueue = saveReportOnlineOrQueue;
  window.countPendingReports = countPending;
})();
