/* ============================================================
   Reporte por Vehículo — RDV GDR
   Métricas, fallas detalladas, impresión PDF y exportación Excel
   ============================================================ */

(function () {
  'use strict';

  const els = {
    vehicle: document.getElementById('f-vehicle'),
    start: document.getElementById('f-start'),
    end: document.getElementById('f-end'),
    generate: document.getElementById('btn-generate'),
    print: document.getElementById('btn-print'),
    excel: document.getElementById('btn-excel'),
    reportArea: document.getElementById('report-area'),
    emptyMsg: document.getElementById('empty-msg'),
    repTitle: document.getElementById('rep-title'),
    repSubtitle: document.getElementById('rep-subtitle'),
    repGenerated: document.getElementById('rep-generated'),
    mTotal: document.getElementById('m-total'),
    mKmRange: document.getElementById('m-km-range'),
    mOperativo: document.getElementById('m-operativo'),
    mAtencion: document.getElementById('m-atencion'),
    mCriticas: document.getElementById('m-criticas'),
    mStreak: document.getElementById('m-streak'),
    mDrivers: document.getElementById('m-drivers'),
    tblDrivers: document.getElementById('tbl-drivers'),
    tblSystems: document.getElementById('tbl-systems'),
    tblDetail: document.getElementById('tbl-detail')
  };

  const PLATES = window.VEHICLE_PLATE_MAP || {};
  let currentData = [];
  let currentVehicle = '';

  const STATUS_LABEL = { OK: 'OK', OBS: 'Atención', CRI: 'Crítico' };

  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function daysBetween(a, b) {
    const x = new Date(a); x.setHours(0,0,0,0);
    const y = new Date(b); y.setHours(0,0,0,0);
    return Math.floor((y - x) / 86400000);
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function init() {
    // Vehículos desde constants
    const codes = Object.keys(PLATES);
    els.vehicle.innerHTML = codes.map(c => `<option value="${c}">${c} — ${PLATES[c]}</option>`).join('');
    if (codes.includes('ECO71')) els.vehicle.value = 'ECO71';

    // Default: últimos 90 días
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);
    els.start.value = start.toISOString().slice(0, 10);
    els.end.value = end.toISOString().slice(0, 10);

    // Soporta ?vehiculo=ECO71 en la URL
    const params = new URLSearchParams(location.search);
    const qv = params.get('vehiculo');
    if (qv && codes.includes(qv)) {
      els.vehicle.value = qv;
    }

    els.generate.addEventListener('click', generate);
    els.print.addEventListener('click', () => window.print());
    els.excel.addEventListener('click', exportExcel);

    // Auto-generar si vino con ?vehiculo=
    if (qv && codes.includes(qv)) generate();
  }

  async function generate() {
    currentVehicle = els.vehicle.value;
    const filters = {
      startDate: els.start.value,
      endDate: els.end.value,
      vehicle: currentVehicle,
      limit: 5000
    };

    els.emptyMsg.textContent = 'Cargando...';
    els.emptyMsg.classList.remove('hidden');
    els.reportArea.classList.add('hidden');

    const res = await getReportsFromSupabase(filters);
    if (!res.ok) {
      els.emptyMsg.textContent = 'Error cargando datos: ' + (res.error?.message || res.error);
      return;
    }

    currentData = (res.data || []).sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));

    if (!currentData.length) {
      els.emptyMsg.textContent = 'No hay reportes para este vehículo en el rango seleccionado.';
      els.print.disabled = true;
      els.excel.disabled = true;
      return;
    }

    render();
    els.emptyMsg.classList.add('hidden');
    els.reportArea.classList.remove('hidden');
    els.print.disabled = false;
    els.excel.disabled = false;
  }

  function computeMetrics(data) {
    const now = new Date();
    const kms = data.map(r => r.kilometraje).filter(k => k != null);
    const kmRange = kms.length > 1 ? (Math.max(...kms) - Math.min(...kms)) : 0;

    const operativos = data.filter(r => r.estado_operativo === 'OPERATIVO').length;
    const pctOp = Math.round((operativos / data.length) * 100);

    let nObs = 0, nCri = 0;
    const critDates = [];
    data.forEach(r => {
      (r.report_systems || []).forEach(s => {
        if (s.estado === 'OBS') nObs++;
        if (s.estado === 'CRI') { nCri++; critDates.push(new Date(r.fecha_hora)); }
      });
    });

    let streak = daysBetween(
      critDates.length ? Math.max(...critDates) : Math.min(...data.map(r => new Date(r.fecha_hora))),
      now
    );

    const drivers = new Map();
    data.forEach(r => {
      const c = (r.conductor || '').trim() || 'Sin registrar';
      drivers.set(c, (drivers.get(c) || 0) + 1);
    });

    return { kmRange, pctOp, nObs, nCri, streak, drivers };
  }

  function render() {
    const data = currentData;
    const m = computeMetrics(data);
    const plate = PLATES[currentVehicle] || '—';

    els.repTitle.textContent = `Reporte de ${currentVehicle} — Placa ${plate}`;
    els.repSubtitle.textContent = `Período: ${els.start.value} al ${els.end.value} (${daysBetween(els.start.value, els.end.value)} días)`;
    els.repGenerated.textContent = `Generado: ${fmtDate(new Date())}`;

    els.mTotal.textContent = data.length;
    els.mKmRange.textContent = m.kmRange.toLocaleString('es-EC');
    els.mOperativo.textContent = m.pctOp + '%';
    els.mAtencion.textContent = m.nObs;
    els.mCriticas.textContent = m.nCri;
    els.mStreak.textContent = m.streak;
    els.mDrivers.textContent = m.drivers.size;

    // Tabla conductores
    const sortedDrivers = [...m.drivers.entries()].sort((a, b) => b[1] - a[1]);
    els.tblDrivers.innerHTML = sortedDrivers.map(([name, count]) => `
      <tr>
        <td>${esc(name)}</td>
        <td>${count}</td>
        <td>${Math.round((count / data.length) * 100)}%</td>
      </tr>
    `).join('');

    // Tabla fallas por sistema
    const sysMap = new Map();
    data.forEach(r => {
      (r.report_systems || []).forEach(s => {
        if (s.estado === 'OK') return;
        if (!sysMap.has(s.nombre_es)) sysMap.set(s.nombre_es, { obs: 0, cri: 0 });
        if (s.estado === 'OBS') sysMap.get(s.nombre_es).obs++;
        if (s.estado === 'CRI') sysMap.get(s.nombre_es).cri++;
      });
    });
    const sortedSys = [...sysMap.entries()].sort((a, b) => (b[1].obs + b[1].cri) - (a[1].obs + a[1].cri));
    els.tblSystems.innerHTML = sortedSys.length
      ? sortedSys.map(([name, v]) => `
          <tr>
            <td>${esc(name)}</td>
            <td><span class="badge badge-warn">${v.obs}</span></td>
            <td><span class="badge badge-danger">${v.cri}</span></td>
            <td>${v.obs + v.cri}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Sin fallas registradas</td></tr>';

    // Detalle de reportes (solo fallas)
    els.tblDetail.innerHTML = data.map(r => {
      const fails = (r.report_systems || []).filter(s => s.estado !== 'OK');
      const failHtml = fails.length
        ? fails.map(s => {
            const cls = s.estado === 'CRI' ? 'badge-danger' : 'badge-warn';
            const obs = s.observacion ? ` — ${esc(s.observacion)}` : '';
            return `<div class="fail-item"><span class="badge ${cls}">${STATUS_LABEL[s.estado]}</span> <strong>${esc(s.nombre_es)}</strong>${obs}</div>`;
          }).join('')
        : '<span class="text-slate-400">Sin fallas</span>';

      const genObs = (r.obs_general || '').trim();
      const genObsHtml = genObs
        ? `<div style="margin-top:4px; font-size:.8rem; color:#94a3b8;"><em>Obs. generales:</em> ${esc(genObs)}</div>`
        : '';

      const estadoCls = r.estado_operativo === 'OPERATIVO' ? 'badge-ok' : 'badge-danger';

      return `
        <tr>
          <td>${fmtDate(r.fecha_hora)}</td>
          <td>${esc(r.conductor || '—')}</td>
          <td>${esc(r.inspector || '—')}</td>
          <td>${r.kilometraje != null ? r.kilometraje.toLocaleString('es-EC') : '—'}</td>
          <td><span class="badge ${estadoCls}">${esc(r.estado_operativo || '—')}</span></td>
          <td>${failHtml}${genObsHtml}</td>
        </tr>
      `;
    }).join('');
  }

  function exportExcel() {
    if (!currentData.length || typeof XLSX === 'undefined') return;

    const data = currentData;
    const m = computeMetrics(data);
    const plate = PLATES[currentVehicle] || '—';

    // Hoja 1: Resumen
    const resumen = [
      ['REPORTE DE VEHÍCULO'],
      ['Vehículo', currentVehicle],
      ['Placa', plate],
      ['Período', `${els.start.value} al ${els.end.value}`],
      ['Generado', fmtDate(new Date())],
      [],
      ['MÉTRICAS'],
      ['Total reportes', data.length],
      ['Km recorridos', m.kmRange],
      ['% Operativo', m.pctOp + '%'],
      ['Fallas en atención', m.nObs],
      ['Fallas críticas', m.nCri],
      ['Días sin críticas', m.streak],
      ['Conductores distintos', m.drivers.size]
    ];

    // Hoja 2: Detalle (una fila por reporte-falla)
    const detalle = [['Código reporte', 'Fecha', 'Conductor', 'Inspector', 'Km', 'Estado operativo', 'Sistema', 'Estado sistema', 'Observación sistema', 'Observaciones generales']];
    data.forEach(r => {
      const fails = (r.report_systems || []).filter(s => s.estado !== 'OK');
      if (!fails.length) {
        detalle.push([
          r.cod_reporte, fmtDate(r.fecha_hora), r.conductor || '', r.inspector || '',
          r.kilometraje ?? '', r.estado_operativo || '', '(sin fallas)', '', '', r.obs_general || ''
        ]);
      } else {
        fails.forEach(s => {
          detalle.push([
            r.cod_reporte, fmtDate(r.fecha_hora), r.conductor || '', r.inspector || '',
            r.kilometraje ?? '', r.estado_operativo || '', s.nombre_es,
            STATUS_LABEL[s.estado] || s.estado, s.observacion || '',
            r.obs_general || ''
          ]);
        });
      }
    });

    // Hoja 3: Conductores
    const cond = [['Conductor', 'Reportes', '% del total']];
    [...m.drivers.entries()].sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
      cond.push([name, count, Math.round((count / data.length) * 100) + '%']);
    });

    // Hoja 4: Fallas por sistema
    const sysMap = new Map();
    data.forEach(r => {
      (r.report_systems || []).forEach(s => {
        if (s.estado === 'OK') return;
        if (!sysMap.has(s.nombre_es)) sysMap.set(s.nombre_es, { obs: 0, cri: 0 });
        if (s.estado === 'OBS') sysMap.get(s.nombre_es).obs++;
        if (s.estado === 'CRI') sysMap.get(s.nombre_es).cri++;
      });
    });
    const sist = [['Sistema', 'Atención', 'Crítico', 'Total']];
    [...sysMap.entries()].sort((a, b) => (b[1].obs + b[1].cri) - (a[1].obs + a[1].cri))
      .forEach(([name, v]) => sist.push([name, v.obs, v.cri, v.obs + v.cri]));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalle), 'Detalle');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cond), 'Conductores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sist), 'Fallas por sistema');

    const fname = `Reporte_${currentVehicle}_${els.start.value}_${els.end.value}.xlsx`;
    XLSX.writeFile(wb, fname);
  }

  init();
})();
