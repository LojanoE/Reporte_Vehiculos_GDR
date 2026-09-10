/* ============================================================
   Análisis Quincenal — RDV GDR
   Comparativo de grupos de trabajo G1 (días 11–25) y G2 (26–10)
   ============================================================ */

(function () {
  'use strict';

  const GROUP_COLORS = { G1: '#34d399', G2: '#60a5fa' };

  let chartGroups = null;
  let groupPeriodStats = [];
  let selStats = [];                       // quincenas dentro del rango filtrado
  let selIdxSet = new Set();               // índices de quincena seleccionados
  let allPeriods = [];                     // todas las quincenas desde el ancla
  let allDataQ = [];                       // reportes desde el ancla
  let aggGroups = null;                    // agregados G1/G2 para exportar
  let vehicleRows = [];                    // filas calculadas por vehículo
  let grandRow = null;                     // fila TOTAL por vehículo
  let currentPeriodInfo = '';              // texto de la quincena actual
  let discardedTotalG = 0;                 // lecturas de km descartadas (tipeos)
  const perVehicleKm = new Map();          // vehículo -> Map(periodIndex -> km válido)
  const periodGroupByIndex = new Map();    // periodIndex -> 'G1'|'G2'
  const daysByGroup = { G1: 0, G2: 0 };    // días transcurridos por grupo (rango filtrado)

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(d) {
    if (!d) return '—';
    const x = d instanceof Date ? d : new Date(d);
    return x.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function endOfDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  function daysBetween(a, b) {
    return Math.floor((startOfDay(b) - startOfDay(a)) / (1000 * 60 * 60 * 24));
  }

  function destroyChart(chart) {
    if (chart) chart.destroy();
    return null;
  }

  function anchorDate() {
    const [y, m, d] = (window.WORK_GROUP_ANCHOR || '2026-08-11').split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  async function load() {
    const currentEl = document.getElementById('grp-current');

    if (typeof window.getWorkGroupPeriod !== 'function' || typeof getReportsFromSupabase !== 'function') {
      currentEl.textContent = 'Error: cliente de datos no cargado.';
      return;
    }

    const anchor = anchorDate();
    const res = await getReportsFromSupabase({
      startDate: window.WORK_GROUP_ANCHOR || '2026-08-11',
      limit: 5000
    });
    if (!res.ok) {
      currentEl.textContent = `Error cargando datos: ${res.error?.message || res.error}`;
      return;
    }

    const today = startOfDay(new Date());
    const data = (res.data || []).filter(r => new Date(r.fecha_hora) >= anchor);

    // ===== Quincena actual =====
    const cur = window.getWorkGroupPeriod(today);
    if (cur) {
      const remaining = daysBetween(today, cur.end) + 1;
      currentPeriodInfo = `Quincena actual: ${cur.group} · Del ${formatDate(cur.start)} al ${formatDate(cur.end)} · Quedan ${remaining} día(s)`;
      currentEl.innerHTML =
        `<span class="badge" style="background:${cur.group === 'G1' ? 'rgba(52,211,153,.2)' : 'rgba(96,165,250,.2)'};` +
        ` color:${GROUP_COLORS[cur.group]}; font-size:1rem;">${cur.group}</span> ` +
        `· Del <strong>${formatDate(cur.start)}</strong> al <strong>${formatDate(cur.end)}</strong> ` +
        `· Quedan <strong>${remaining}</strong> día(s)`;
    } else {
      currentPeriodInfo = `Las quincenas de trabajo inician el ${formatDate(anchor)}.`;
      currentEl.textContent = currentPeriodInfo;
    }

    // ===== Lista de quincenas desde el ancla hasta hoy =====
    allPeriods = [];
    {
      let y = anchor.getFullYear();
      let m = anchor.getMonth();
      while (true) {
        const g1 = window.getWorkGroupPeriod(new Date(y, m, 11));
        if (g1.start > today) break;
        allPeriods.push(g1);
        const g2 = window.getWorkGroupPeriod(new Date(y, m, 26));
        if (g2.start > today) break;
        allPeriods.push(g2);
        m++;
        if (m > 11) { m = 0; y++; }
      }
    }

    // ===== Km por quincena y vehículo (solo lecturas válidas) =====
    const byVehicle = new Map();
    data.forEach(r => {
      if (!r.codigo_vehiculo || r.kilometraje == null) return;
      if (!byVehicle.has(r.codigo_vehiculo)) byVehicle.set(r.codigo_vehiculo, []);
      byVehicle.get(r.codigo_vehiculo).push(r);
    });
    const kmByPeriod = new Map();
    discardedTotalG = 0;
    perVehicleKm.clear();
    byVehicle.forEach((list, veh) => {
      const { valid, discarded } = window.filterKmReadings(list);
      discardedTotalG += discarded;
      for (let i = 1; i < valid.length; i++) {
        const p = window.getWorkGroupPeriod(new Date(valid[i].fecha_hora));
        if (!p) continue;
        const delta = Math.max(0, valid[i].kilometraje - valid[i - 1].kilometraje);
        kmByPeriod.set(p.index, (kmByPeriod.get(p.index) || 0) + delta);
        if (!perVehicleKm.has(veh)) perVehicleKm.set(veh, new Map());
        const m = perVehicleKm.get(veh);
        m.set(p.index, (m.get(p.index) || 0) + delta);
      }
    });

    // ===== Stats por quincena (todas; el filtro se aplica en applyFilters) =====
    groupPeriodStats = allPeriods.map(p => {
      const inPeriod = data.filter(r => {
        const d = new Date(r.fecha_hora);
        return d >= p.start && d <= endOfDay(p.end);
      });
      let obs = 0, cri = 0;
      inPeriod.forEach(r => (Array.isArray(r.report_systems) ? r.report_systems : []).forEach(s => {
        if (s.estado === 'OBS') obs++;
        if (s.estado === 'CRI') cri++;
      }));
      const op = inPeriod.filter(r => r.estado_operativo === 'OPERATIVO').length;
      const effEnd = p.end > today ? today : p.end;
      const daysElapsed = daysBetween(p.start, effEnd) + 1;
      const km = kmByPeriod.get(p.index) || 0;
      return {
        ...p,
        reportes: inPeriod.length,
        obs,
        cri,
        op,
        pctOp: inPeriod.length ? Math.round((op / inPeriod.length) * 100) : null,
        km,
        kmDia: daysElapsed > 0 ? km / daysElapsed : 0,
        daysElapsed
      };
    });

    // ===== Datos base para las vistas filtradas =====
    allDataQ = data;
    periodGroupByIndex.clear();
    groupPeriodStats.forEach(s => periodGroupByIndex.set(s.index, s.group));

    populateQuincenaFilters();
    applyFilters();
  }

  // ===== Filtros de quincenas =====
  function quincenaLabel(p) {
    return `${p.group} · ${p.start.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })} al ${p.end.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })}`;
  }

  function populateQuincenaFilters() {
    const desde = document.getElementById('q-desde');
    const hasta = document.getElementById('q-hasta');
    if (!desde || !hasta) return;
    const opts = allPeriods.map(p => `<option value="${p.index}">${quincenaLabel(p)}</option>`).join('');
    desde.innerHTML = opts;
    hasta.innerHTML = opts;
    if (allPeriods.length) {
      desde.value = String(allPeriods[0].index);
      hasta.value = String(allPeriods[allPeriods.length - 1].index);
    }
  }

  function applyFilters() {
    const desde = document.getElementById('q-desde');
    const hasta = document.getElementById('q-hasta');
    let from = desde && desde.value !== '' ? +desde.value : null;
    let to = hasta && hasta.value !== '' ? +hasta.value : null;
    if (from != null && to != null && from > to) [from, to] = [to, from];

    selStats = groupPeriodStats.filter(s => (from == null || s.index >= from) && (to == null || s.index <= to));
    selIdxSet = new Set(selStats.map(s => s.index));
    daysByGroup.G1 = 0;
    daysByGroup.G2 = 0;
    selStats.forEach(s => { daysByGroup[s.group] += s.daysElapsed; });

    renderCompare();
    renderVehicleTable();
    renderDetail();
    renderChart();
  }

  // ===== Comparativo G1 vs G2 (rango filtrado) =====
  function renderCompare() {
    const tbody = document.getElementById('grp-compare-body');
    const noteEl = document.getElementById('grp-note');
    if (!tbody) return;

    const blank = () => ({ reportes: 0, obs: 0, cri: 0, op: 0, km: 0, days: 0, quincenas: 0 });
    const agg = { G1: blank(), G2: blank() };
    selStats.forEach(s => {
      const a = agg[s.group];
      a.reportes += s.reportes;
      a.obs += s.obs;
      a.cri += s.cri;
      a.op += s.op;
      a.km += s.km;
      a.days += s.daysElapsed;
      a.quincenas++;
    });
    aggGroups = agg;

    const fmtKm = v => Math.round(v).toLocaleString('es-EC');
    const row = (label, v1, v2) =>
      `<tr><td>${label}</td><td style="color:${GROUP_COLORS.G1}; font-weight:600;">${v1}</td>` +
      `<td style="color:${GROUP_COLORS.G2}; font-weight:600;">${v2}</td></tr>`;
    tbody.innerHTML = [
      row('Quincenas analizadas', agg.G1.quincenas, agg.G2.quincenas),
      row('Reportes', agg.G1.reportes, agg.G2.reportes),
      row('% Operativo',
        agg.G1.reportes ? Math.round((agg.G1.op / agg.G1.reportes) * 100) + '%' : '—',
        agg.G2.reportes ? Math.round((agg.G2.op / agg.G2.reportes) * 100) + '%' : '—'),
      row('Fallas en atención (OBS)', agg.G1.obs, agg.G2.obs),
      row('Fallas críticas (CRI)', agg.G1.cri, agg.G2.cri),
      row('Km recorridos', fmtKm(agg.G1.km), fmtKm(agg.G2.km)),
      row('Km diario promedio',
        agg.G1.days ? (agg.G1.km / agg.G1.days).toFixed(1) : '—',
        agg.G2.days ? (agg.G2.km / agg.G2.days).toFixed(1) : '—')
    ].join('');

    if (noteEl) {
      const rangeTxt = selStats.length
        ? `${selStats.length} quincena(s) en el análisis: ${quincenaLabel(selStats[0])} — ${quincenaLabel(selStats[selStats.length - 1])}`
        : 'Sin quincenas en el rango seleccionado';
      const parts = [rangeTxt];
      if (discardedTotalG > 0) {
        parts.push(`⚠️ ${discardedTotalG} lectura(s) de km descartada(s) por inconsistencia (posibles tipeos), excluidas del análisis`);
      }
      noteEl.textContent = parts.join(' · ');
    }
  }

  // ===== Detalle por quincena (rango filtrado) =====
  function renderDetail() {
    const detailBody = document.getElementById('grp-detail-body');
    if (!detailBody) return;
    const fmtKm = v => Math.round(v).toLocaleString('es-EC');
    detailBody.innerHTML = selStats.length
      ? selStats.map(s => `
        <tr>
          <td><span class="badge" style="background:${s.group === 'G1' ? 'rgba(52,211,153,.2)' : 'rgba(96,165,250,.2)'}; color:${GROUP_COLORS[s.group]};">${s.group}</span></td>
          <td>${formatDate(s.start)} al ${formatDate(s.end)}</td>
          <td>${s.reportes}</td>
          <td>${s.pctOp != null ? s.pctOp + '%' : '—'}</td>
          <td>${s.obs}</td>
          <td>${s.cri}</td>
          <td>${fmtKm(s.km)}</td>
          <td>${s.kmDia.toFixed(1)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="8" class="loading">Sin quincenas en el rango seleccionado</td></tr>';
  }


  // ===== Tabla por vehículo: G1 / G2 / Total =====
  function renderVehicleTable() {
    const body = document.getElementById('veh-table-body');
    if (!body) return;

    const vehicles = [...new Set(allDataQ.map(r => r.codigo_vehiculo).filter(Boolean))].sort()
      .filter(v => allDataQ.some(r => {
        if (r.codigo_vehiculo !== v) return false;
        const p = window.getWorkGroupPeriod(new Date(r.fecha_hora));
        return p && selIdxSet.has(p.index);
      }));
    const grand = { G1: { rep: 0, km: 0 }, G2: { rep: 0, km: 0 }, rep: 0, op: 0, obs: 0, cri: 0, km: 0 };
    const totalDays = daysByGroup.G1 + daysByGroup.G2;
    vehicleRows = [];

    vehicles.forEach(v => {
      const rs = allDataQ.filter(r => {
        if (r.codigo_vehiculo !== v) return false;
        const p = window.getWorkGroupPeriod(new Date(r.fecha_hora));
        return p && selIdxSet.has(p.index);
      });
      let obs = 0, cri = 0;
      rs.forEach(r => (Array.isArray(r.report_systems) ? r.report_systems : []).forEach(s => {
        if (s.estado === 'OBS') obs++;
        if (s.estado === 'CRI') cri++;
      }));
      const op = rs.filter(r => r.estado_operativo === 'OPERATIVO').length;

      // Reportes y km por grupo
      const rep = { G1: 0, G2: 0 };
      rs.forEach(r => {
        const p = window.getWorkGroupPeriod(new Date(r.fecha_hora));
        if (p) rep[p.group]++;
      });
      const km = { G1: 0, G2: 0 };
      const m = perVehicleKm.get(v);
      if (m) m.forEach((k, idx) => {
        const g = periodGroupByIndex.get(idx);
        if (g && selIdxSet.has(idx)) km[g] += k;
      });

      grand.G1.rep += rep.G1; grand.G1.km += km.G1;
      grand.G2.rep += rep.G2; grand.G2.km += km.G2;
      grand.rep += rs.length; grand.op += op; grand.obs += obs; grand.cri += cri;
      grand.km += km.G1 + km.G2;

      const kmTot = km.G1 + km.G2;
      vehicleRows.push({
        veh: v,
        repG1: rep.G1, kmG1: Math.round(km.G1), kmDiaG1: daysByGroup.G1 ? +(km.G1 / daysByGroup.G1).toFixed(1) : null,
        repG2: rep.G2, kmG2: Math.round(km.G2), kmDiaG2: daysByGroup.G2 ? +(km.G2 / daysByGroup.G2).toFixed(1) : null,
        rep: rs.length,
        pctOp: rs.length ? Math.round((op / rs.length) * 100) : null,
        obs, cri,
        kmTot: Math.round(kmTot),
        kmDiaTot: totalDays ? +(kmTot / totalDays).toFixed(1) : null
      });
    });

    grandRow = {
      repG1: grand.G1.rep, kmG1: Math.round(grand.G1.km),
      kmDiaG1: daysByGroup.G1 ? +(grand.G1.km / daysByGroup.G1).toFixed(1) : null,
      repG2: grand.G2.rep, kmG2: Math.round(grand.G2.km),
      kmDiaG2: daysByGroup.G2 ? +(grand.G2.km / daysByGroup.G2).toFixed(1) : null,
      rep: grand.rep,
      pctOp: grand.rep ? Math.round((grand.op / grand.rep) * 100) : null,
      obs: grand.obs, cri: grand.cri,
      kmTot: Math.round(grand.km),
      kmDiaTot: totalDays ? +(grand.km / totalDays).toFixed(1) : null
    };

    if (!vehicleRows.length) {
      body.innerHTML = '<tr><td colspan="13" class="loading">Sin datos de vehículos</td></tr>';
      return;
    }

    const fmt = n => n == null ? '—' : n.toLocaleString('es-EC');
    const rowHtml = r => `<tr>
      <td><strong>${escapeHtml(r.veh)}</strong></td>
      <td style="color:${GROUP_COLORS.G1};">${r.repG1}</td>
      <td style="color:${GROUP_COLORS.G1};">${fmt(r.kmG1)}</td>
      <td style="color:${GROUP_COLORS.G1};">${r.kmDiaG1 ?? '—'}</td>
      <td style="color:${GROUP_COLORS.G2};">${r.repG2}</td>
      <td style="color:${GROUP_COLORS.G2};">${fmt(r.kmG2)}</td>
      <td style="color:${GROUP_COLORS.G2};">${r.kmDiaG2 ?? '—'}</td>
      <td>${r.rep}</td>
      <td>${r.pctOp != null ? r.pctOp + '%' : '—'}</td>
      <td>${r.obs}</td>
      <td>${r.cri}</td>
      <td>${fmt(r.kmTot)}</td>
      <td>${r.kmDiaTot ?? '—'}</td>
    </tr>`;

    const rows = vehicleRows.map(rowHtml);
    const t = grandRow;
    rows.push(`<tr style="border-top:2px solid rgba(255,255,255,.25); font-weight:700;">
      <td>TOTAL</td>
      <td style="color:${GROUP_COLORS.G1};">${t.repG1}</td>
      <td style="color:${GROUP_COLORS.G1};">${fmt(t.kmG1)}</td>
      <td style="color:${GROUP_COLORS.G1};">${t.kmDiaG1 ?? '—'}</td>
      <td style="color:${GROUP_COLORS.G2};">${t.repG2}</td>
      <td style="color:${GROUP_COLORS.G2};">${fmt(t.kmG2)}</td>
      <td style="color:${GROUP_COLORS.G2};">${t.kmDiaG2 ?? '—'}</td>
      <td>${t.rep}</td>
      <td>${t.pctOp != null ? t.pctOp + '%' : '—'}</td>
      <td>${t.obs}</td>
      <td>${t.cri}</td>
      <td>${fmt(t.kmTot)}</td>
      <td>${t.kmDiaTot ?? '—'}</td>
    </tr>`);

    body.innerHTML = rows.join('');
  }

  // ===== Exportar a Excel =====
  function exportExcel() {
    if (!aggGroups || typeof XLSX === 'undefined') return;
    const hoy = new Date();
    const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Hoja 1: Comparativo G1 vs G2
    const a = aggGroups;
    const comparativo = [
      ['ANÁLISIS QUINCENAL POR GRUPO DE TRABAJO — RDV GDR'],
      [currentPeriodInfo],
      [selStats.length
        ? `Rango analizado: ${quincenaLabel(selStats[0])} — ${quincenaLabel(selStats[selStats.length - 1])}`
        : 'Sin quincenas en el rango seleccionado'],
      ['Generado', hoy.toLocaleString('es-EC')],
      ['Esquema', 'G1 = días 11–25 de cada mes · G2 = día 26 al 10 del mes siguiente'],
      [],
      ['Métrica', 'G1', 'G2'],
      ['Quincenas transcurridas', a.G1.quincenas, a.G2.quincenas],
      ['Reportes', a.G1.reportes, a.G2.reportes],
      ['% Operativo',
        a.G1.reportes ? Math.round((a.G1.op / a.G1.reportes) * 100) / 100 : null,
        a.G2.reportes ? Math.round((a.G2.op / a.G2.reportes) * 100) / 100 : null],
      ['Fallas en atención (OBS)', a.G1.obs, a.G2.obs],
      ['Fallas críticas (CRI)', a.G1.cri, a.G2.cri],
      ['Km recorridos', Math.round(a.G1.km), Math.round(a.G2.km)],
      ['Km diario promedio',
        a.G1.days ? +(a.G1.km / a.G1.days).toFixed(1) : null,
        a.G2.days ? +(a.G2.km / a.G2.days).toFixed(1) : null]
    ];

    // Hoja 2: Por vehículo (G1 / G2 / Total)
    const porVeh = [[
      'Vehículo',
      'Rep G1', 'Km G1', 'Km/día G1',
      'Rep G2', 'Km G2', 'Km/día G2',
      'Rep Total', '% Operativo', 'OBS', 'CRI', 'Km Total', 'Km/día Total'
    ]];
    vehicleRows.forEach(r => porVeh.push([
      r.veh, r.repG1, r.kmG1, r.kmDiaG1, r.repG2, r.kmG2, r.kmDiaG2,
      r.rep, r.pctOp != null ? r.pctOp / 100 : null, r.obs, r.cri, r.kmTot, r.kmDiaTot
    ]));
    if (grandRow) {
      porVeh.push([
        'TOTAL', grandRow.repG1, grandRow.kmG1, grandRow.kmDiaG1,
        grandRow.repG2, grandRow.kmG2, grandRow.kmDiaG2,
        grandRow.rep, grandRow.pctOp != null ? grandRow.pctOp / 100 : null,
        grandRow.obs, grandRow.cri, grandRow.kmTot, grandRow.kmDiaTot
      ]);
    }

    // Hoja 3: Detalle por quincena (rango filtrado)
    const detalle = [['Grupo', 'Periodo inicio', 'Periodo fin', 'Reportes', '% Operativo', 'OBS', 'CRI', 'Km recorridos', 'Km diario prom.']];
    selStats.forEach(s => detalle.push([
      s.group,
      formatDate(s.start),
      formatDate(s.end),
      s.reportes,
      s.pctOp != null ? s.pctOp / 100 : null,
      s.obs,
      s.cri,
      Math.round(s.km),
      +s.kmDia.toFixed(1)
    ]));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(comparativo);
    ws1['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Comparativo G1-G2');

    const ws2 = XLSX.utils.aoa_to_sheet(porVeh);
    ws2['!cols'] = [{ wch: 12 }, ...Array(12).fill({ wch: 11 })];
    // Formato porcentaje para columna % Operativo (índice 8)
    for (let i = 1; i < porVeh.length; i++) {
      const cell = ws2[XLSX.utils.encode_cell({ r: i, c: 8 })];
      if (cell && typeof cell.v === 'number') cell.z = '0%';
    }
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Vehículo');

    const ws3 = XLSX.utils.aoa_to_sheet(detalle);
    ws3['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
    for (let i = 1; i < detalle.length; i++) {
      const cell = ws3[XLSX.utils.encode_cell({ r: i, c: 4 })];
      if (cell && typeof cell.v === 'number') cell.z = '0%';
    }
    XLSX.utils.book_append_sheet(wb, ws3, 'Detalle Quincenas');

    XLSX.writeFile(wb, `Analisis_Quincenal_GDR_${hoyISO}.xlsx`);
  }

  function renderChart() {
    const canvas = document.getElementById('chart-groups');
    if (!canvas) return;
    const metric = (document.getElementById('grp-metric') || {}).value || 'kmDia';

    const METRICS = {
      reportes: { label: 'Reportes', get: s => s.reportes },
      cri: { label: 'Fallas críticas', get: s => s.cri },
      obs: { label: 'Fallas en atención', get: s => s.obs },
      pctOp: { label: '% Operativo', get: s => s.pctOp },
      km: { label: 'Km recorridos', get: s => Math.round(s.km) },
      kmDia: { label: 'Km diario promedio', get: s => Math.round(s.kmDia * 10) / 10 }
    };
    const m = METRICS[metric] || METRICS.kmDia;

    const labels = selStats.map(s =>
      `${s.group} · ${s.start.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })}`
    );
    const values = selStats.map(s => m.get(s));
    const colors = selStats.map(s => GROUP_COLORS[s.group]);

    chartGroups = destroyChart(chartGroups);
    chartGroups = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: m.label, data: values, backgroundColor: colors }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => {
                const s = selStats[items[0].dataIndex];
                return `${s.group} · ${formatDate(s.start)} al ${formatDate(s.end)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: metric === 'pctOp' ? 100 : undefined,
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,.1)' }
          },
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  const grpMetric = document.getElementById('grp-metric');
  if (grpMetric) grpMetric.addEventListener('change', renderChart);

  const btnExcel = document.getElementById('btn-excel');
  if (btnExcel) btnExcel.addEventListener('click', exportExcel);

  ['q-desde', 'q-hasta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFilters);
  });
  const btnTodas = document.getElementById('q-todas');
  if (btnTodas) btnTodas.addEventListener('click', () => {
    if (!allPeriods.length) return;
    document.getElementById('q-desde').value = String(allPeriods[0].index);
    document.getElementById('q-hasta').value = String(allPeriods[allPeriods.length - 1].index);
    applyFilters();
  });

  load();
})();
