/* ============================================================
   Análisis Quincenal — RDV GDR
   Comparativo de grupos de trabajo G1 (días 11–25) y G2 (26–10)
   ============================================================ */

(function () {
  'use strict';

  const GROUP_COLORS = { G1: '#34d399', G2: '#60a5fa' };

  let chartGroups = null;
  let groupPeriodStats = [];

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
    const tbody = document.getElementById('grp-compare-body');
    const detailBody = document.getElementById('grp-detail-body');
    const noteEl = document.getElementById('grp-note');

    if (typeof window.getWorkGroupPeriod !== 'function' || typeof getReportsFromSupabase !== 'function') {
      currentEl.textContent = 'Error: cliente de datos no cargado.';
      return;
    }

    const res = await getReportsFromSupabase({ limit: 5000 });
    if (!res.ok) {
      currentEl.textContent = `Error cargando datos: ${res.error?.message || res.error}`;
      return;
    }

    const anchor = anchorDate();
    const today = startOfDay(new Date());
    const data = (res.data || []).filter(r => new Date(r.fecha_hora) >= anchor);

    // ===== Quincena actual =====
    const cur = window.getWorkGroupPeriod(today);
    if (cur) {
      const remaining = daysBetween(today, cur.end) + 1;
      currentEl.innerHTML =
        `<span class="badge" style="background:${cur.group === 'G1' ? 'rgba(52,211,153,.2)' : 'rgba(96,165,250,.2)'};` +
        ` color:${GROUP_COLORS[cur.group]}; font-size:1rem;">${cur.group}</span> ` +
        `· Del <strong>${formatDate(cur.start)}</strong> al <strong>${formatDate(cur.end)}</strong> ` +
        `· Quedan <strong>${remaining}</strong> día(s)`;
    } else {
      currentEl.textContent = `Las quincenas de trabajo inician el ${formatDate(anchor)}.`;
    }

    // ===== Lista de quincenas desde el ancla hasta hoy =====
    const periods = [];
    {
      let y = anchor.getFullYear();
      let m = anchor.getMonth();
      while (true) {
        const g1 = window.getWorkGroupPeriod(new Date(y, m, 11));
        if (g1.start > today) break;
        periods.push(g1);
        const g2 = window.getWorkGroupPeriod(new Date(y, m, 26));
        if (g2.start > today) break;
        periods.push(g2);
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
    let discardedTotal = 0;
    byVehicle.forEach(list => {
      const { valid, discarded } = window.filterKmReadings(list);
      discardedTotal += discarded;
      for (let i = 1; i < valid.length; i++) {
        const p = window.getWorkGroupPeriod(new Date(valid[i].fecha_hora));
        if (!p) continue;
        kmByPeriod.set(p.index, (kmByPeriod.get(p.index) || 0) + (valid[i].kilometraje - valid[i - 1].kilometraje));
      }
    });

    // ===== Stats por quincena =====
    groupPeriodStats = periods.map(p => {
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

    // ===== Agregados por grupo =====
    const blank = () => ({ reportes: 0, obs: 0, cri: 0, op: 0, km: 0, days: 0, quincenas: 0 });
    const agg = { G1: blank(), G2: blank() };
    groupPeriodStats.forEach(s => {
      const a = agg[s.group];
      a.reportes += s.reportes;
      a.obs += s.obs;
      a.cri += s.cri;
      a.op += s.op;
      a.km += s.km;
      a.days += s.daysElapsed;
      a.quincenas++;
    });

    const fmtKm = v => Math.round(v).toLocaleString('es-EC');
    const row = (label, v1, v2) =>
      `<tr><td>${label}</td><td style="color:${GROUP_COLORS.G1}; font-weight:600;">${v1}</td>` +
      `<td style="color:${GROUP_COLORS.G2}; font-weight:600;">${v2}</td></tr>`;
    tbody.innerHTML = [
      row('Quincenas transcurridas', agg.G1.quincenas, agg.G2.quincenas),
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

    // ===== Detalle por quincena =====
    detailBody.innerHTML = groupPeriodStats.length
      ? groupPeriodStats.map(s => `
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
      : '<tr><td colspan="8" class="loading">Sin quincenas transcurridas</td></tr>';

    // ===== Nota =====
    if (noteEl) {
      const parts = [`${periods.length} quincena(s) transcurridas desde el ${formatDate(anchor)}`];
      if (discardedTotal > 0) {
        parts.push(`⚠️ ${discardedTotal} lectura(s) de km descartada(s) por inconsistencia (posibles tipeos), excluidas del análisis`);
      }
      noteEl.textContent = parts.join(' · ');
    }

    renderChart();
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

    const labels = groupPeriodStats.map(s =>
      `${s.group} · ${s.start.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })}`
    );
    const values = groupPeriodStats.map(s => m.get(s));
    const colors = groupPeriodStats.map(s => GROUP_COLORS[s.group]);

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
                const s = groupPeriodStats[items[0].dataIndex];
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

  load();
})();
