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
    'ECO70': { motor: 24681, caja: 24681 },
    'ECO71': { motor: 15000, caja: 20000 },
    'ECO36': { motor: 219886, caja: 219886 },
    'M01':   { motor: 172841, caja: 182562 },
  };

  window.ALERT_RANGE = 4000;

  window.OPERATIVE_STATUSES = {
    OPERATIVO: { label: 'Operativo', color: '#34d399' },
    'MANT. PREVENTIVO': { label: 'Mant. Preventivo', color: '#fbbf24' },
    'MANT. CORRECTIVO': { label: 'Mant. Correctivo', color: '#f87171' },
    INACTIVO: { label: 'Inactivo', color: '#94a3b8' }
  };
})();
