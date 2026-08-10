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
})();
