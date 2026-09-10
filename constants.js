/* ============================================================
   Constants compartidas entre app.js y dashboard.js
   ============================================================ */

(function () {
  'use strict';

  // Umbrales de mantenimiento por vehículo (motor y caja/corona)
  window.MAINTENANCE_ALERTS = {
    'ECO23': { motor: 93408, caja: 93408 },
    'ECO62': { motor: 31652, caja: 41652 },
    'ECO26': { motor: 134833, caja: 144044 },
    'ECO70': { motor: 25000, caja: 25000 },
    'ECO71': { motor: 15000, caja: 20000 },
    'ECO36': { motor: 219886, caja: 219886 },
    'M01':   { motor: 172841, caja: 182562 },
  };

  window.ALERT_RANGE = 4000;

  // Mapa de códigos de vehículo a placas
  window.VEHICLE_PLATE_MAP = {
    'ECO04': 'PCX 9910',
    'ECO05': 'PCX 9915',
    'ECO06': 'PCX 9919',
    'ECO23': 'PDI 5797',
    'ECO26': 'PDI 5814',
    'ECO36': 'PDI 5771',
    'ECO62': 'ZBA 1564',
    'ECO70': 'ABQ 2836',
    'ECO71': 'ABQ 2837',
    'M01': 'PCX 9943',
    'GE-16': 'Sin placa',
    'BZ-01': 'Sin placa'
  };

  window.OPERATIVE_STATUSES = {
    OPERATIVO: { label: 'Operativo', color: '#34d399' },
    'MANT. PREVENTIVO': { label: 'Mant. Preventivo', color: '#fbbf24' },
    'MANT. CORRECTIVO': { label: 'Mant. Correctivo', color: '#f87171' },
    INACTIVO: { label: 'Inactivo', color: '#94a3b8' }
  };

  // ====== Grupos de trabajo por quincena ======
  // Esquema mensual: G1 = días 11–25 de cada mes; G2 = día 26 al 10 del mes
  // siguiente. La primera quincena arranca el 11/08/2026 (G1 de agosto).
  window.WORK_GROUP_ANCHOR = '2026-08-11'; // inicio de la primera G1 (fecha local)

  /**
   * Devuelve la quincena (grupo de trabajo) a la que pertenece una fecha.
   * @param {Date} date
   * @returns {null | {index:number, group:'G1'|'G2', start:Date, end:Date}}
   *          null si la fecha es anterior al arranque (11/08/2026).
   */
  window.getWorkGroupPeriod = function (date) {
    const [ay, am] = window.WORK_GROUP_ANCHOR.split('-').map(Number);
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-based
    const day = date.getDate();
    let group, start, end, periodMonth;
    if (day >= 11 && day <= 25) {
      group = 'G1';
      start = new Date(y, m, 11);
      end = new Date(y, m, 25);
      periodMonth = y * 12 + m;
    } else if (day >= 26) {
      group = 'G2';
      start = new Date(y, m, 26);
      end = new Date(y, m + 1, 10);
      periodMonth = y * 12 + m;
    } else { // días 1–10: cola de la G2 del mes anterior
      group = 'G2';
      start = new Date(y, m - 1, 26);
      end = new Date(y, m, 10);
      periodMonth = y * 12 + (m - 1);
    }
    const anchorMonth = ay * 12 + (am - 1);
    const index = (periodMonth - anchorMonth) * 2 + (group === 'G1' ? 0 : 1);
    if (index < 0) return null;
    return { index, group, start, end };
  };

  // ====== Coherencia de kilometraje ======
  window.KM_MAX_JUMP = 1500;       // salto máximo plausible entre dos reportes
  window.KM_MAX_DAILY_RATE = 1000; // km/día máximo plausible de la flota

  /**
   * Filtra lecturas de kilometraje erróneas (tipeos) de UN vehículo.
   * Usa la mediana local de la ventana ±3 lecturas: una lectura se descarta
   * si se desvía de su vecindario más que la tolerancia (adaptada al ritmo
   * de reporteo del vehículo). Robusta ante picos aislados en ambas
   * direcciones y no genera descartes en cascada.
   * @param {Array} reports - reportes del mismo vehículo (cualquier orden)
   * @returns {{valid: Array, discarded: number}} valid queda ordenado asc por fecha
   */
  window.filterKmReadings = function (reports) {
    const sorted = (reports || [])
      .filter(r => r.kilometraje != null && !isNaN(new Date(r.fecha_hora)))
      .slice()
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    if (sorted.length <= 2) return { valid: sorted, discarded: 0 };

    const kms = sorted.map(r => r.kilometraje);
    const times = sorted.map(r => new Date(r.fecha_hora).getTime());
    const median = arr => {
      const s = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const W = 3;
    const valid = [];
    let discarded = 0;
    for (let i = 0; i < sorted.length; i++) {
      const lo = Math.max(0, i - W);
      const hi = Math.min(sorted.length - 1, i + W);
      const med = median(kms.slice(lo, hi + 1)); // incluye i: la mediana es robusta al tipeo
      const windowDays = Math.max(1, (times[hi] - times[lo]) / 86400000);
      const stepDays = windowDays / Math.max(1, hi - lo); // días típicos entre reportes
      const tol = Math.max(window.KM_MAX_JUMP, 2 * stepDays * window.KM_MAX_DAILY_RATE);
      if (Math.abs(kms[i] - med) > tol) { discarded++; continue; }
      valid.push(sorted[i]);
    }
    return { valid, discarded };
  };
})();
