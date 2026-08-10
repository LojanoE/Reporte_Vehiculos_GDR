/* ============================================================
   Dashboard — RDV GDR
   Carga datos de Supabase y renderiza KPIs + gráficas Chart.js
   ============================================================ */

(function () {
  'use strict';

  let chartReportsTime = null;
  let chartSystems = null;
  let chartStatus = null;
  let chartKm = null;
  let chartVehicleStatus = null;
  let chartCriticalTrend = null;
  let chartMaintTrend = null;

  let allReportsCache = [];

  const els = {
    start: document.getElementById('filter-start'),
    end: document.getElementById('filter-end'),
    vehicle: document.getElementById('filter-vehicle'),
    status: document.getElementById('filter-status'),
    apply: document.getElementById('btn-apply'),
    reset: document.getElementById('btn-reset'),
    presets: document.getElementById('date-presets'),
    kpiTotal: document.getElementById('kpi-total'),
    kpiThisMonth: document.getElementById('kpi-this-month'),
    kpiCritical: document.getElementById('kpi-critical'),
    kpiOperativo: document.getElementById('kpi-operativo'),
    kpiStreak: document.getElementById('kpi-streak'),
    tableBody: document.getElementById('reports-table-body'),
    maintVehicle: document.getElementById('maint-vehicle'),
    maintTableBody: document.getElementById('maint-table-body')
  };

  const STATUS_COLORS = {
    OPERATIVO: '#34d399',
    'MANT. PREVENTIVO': '#fbbf24',
    'MANT. CORRECTIVO': '#f87171',
    INACTIVO: '#94a3b8'
  };

  const MAINTENANCE_ALERTS = window.MAINTENANCE_ALERTS || {};

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

  function addDays(d, days) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
  }

  function daysBetween(a, b) {
    return Math.floor((startOfDay(b) - startOfDay(a)) / (1000 * 60 * 60 * 24));
  }

  function groupBy(arr, keyFn) {
    const map = new Map();
    arr.forEach(item => {
      const k = keyFn(item);
      if (!k) return;
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }

  function sortMapByValue(map, asc = false) {
    const entries = Array.from(map.entries());
    entries.sort((a, b) => asc ? a[1] - b[1] : b[1] - a[1]);
    return entries;
  }

  function destroyChart(chart) {
    if (chart) { chart.destroy(); }
    return null;
  }

  // ========== Date presets ==========

  function setPreset(name) {
    const today = new Date();
    let start, end;
    switch (name) {
      case '7d':
        start = addDays(today, -7);
        end = today;
        break;
      case 'last-month':
      default:
        start = addDays(today, -30);
        end = today;
        break;
      case 'this-month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        break;
      case 'last-calendar-month': {
        const m = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
        const y = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
        start = new Date(y, m, 1);
        end = new Date(y, m + 1, 0);
        break;
      }
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = today;
        break;
    }
    els.start.value = start.toISOString().slice(0, 10);
    els.end.value = end.toISOString().slice(0, 10);

    // Update active button
    document.querySelectorAll('#date-presets .preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === name);
    });
  }

  // ========== KPIs ==========

  function renderKPIs(data) {
    const total = data.length;
    const now = new Date();
    const thisMonth = data.filter(r => {
      const d = new Date(r.fecha_hora);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    let critical = 0;
    data.forEach(r => {
      if (Array.isArray(r.report_systems)) {
        critical += r.report_systems.filter(s => s.estado === 'CRI').length;
      }
    });

    const operativos = data.filter(r => r.estado_operativo === 'OPERATIVO').length;
    const pct = total ? Math.round((operativos / total) * 100) : 0;

    // Días sin reportes críticos (desde el más reciente con CRI hasta hoy)
    let streak = '—';
    const critDates = data
      .filter(r => Array.isArray(r.report_systems) && r.report_systems.some(s => s.estado === 'CRI'))
      .map(r => new Date(r.fecha_hora));
    if (critDates.length > 0) {
      const lastCritical = new Date(Math.max(...critDates));
      streak = daysBetween(lastCritical, now);
    } else if (data.length > 0) {
      streak = daysBetween(new Date(Math.min(...data.map(r => new Date(r.fecha_hora)))), now);
    }

    els.kpiTotal.textContent = total;
    els.kpiThisMonth.textContent = thisMonth;
    els.kpiCritical.textContent = critical;
    els.kpiOperativo.textContent = pct + '%';
    els.kpiStreak.textContent = streak;
  }

  // ========== Charts ==========

  function renderReportsTime(data) {
    const counts = groupBy(data, r => {
      const d = new Date(r.fecha_hora);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(e => e[0]);
    const values = sorted.map(e => e[1]);

    chartReportsTime = destroyChart(chartReportsTime);
    const ctx = document.getElementById('chart-reports-time').getContext('2d');
    chartReportsTime = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Reportes por día',
          data: values,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52,211,153,.2)',
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  function renderSystems(data) {
    const counts = new Map();
    data.forEach(r => {
      if (!Array.isArray(r.report_systems)) return;
      r.report_systems.forEach(s => {
        if (s.estado === 'OK') return;
        counts.set(s.nombre_es, (counts.get(s.nombre_es) || 0) + 1);
      });
    });
    const sorted = sortMapByValue(counts).slice(0, 10);
    const labels = sorted.map(e => e[0]);
    const values = sorted.map(e => e[1]);

    chartSystems = destroyChart(chartSystems);
    const ctx = document.getElementById('chart-systems').getContext('2d');
    chartSystems = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Fallas (Atención + Crítico)',
          data: values,
          backgroundColor: '#f87171'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  function renderStatus(data) {
    const counts = groupBy(data, r => r.estado_operativo || 'Desconocido');
    const labels = Array.from(counts.keys());
    const values = labels.map(l => counts.get(l));
    const colors = labels.map(l => STATUS_COLORS[l] || '#94a3b8');

    chartStatus = destroyChart(chartStatus);
    const ctx = document.getElementById('chart-status').getContext('2d');
    chartStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#e2e8f0' } }
        }
      }
    });
  }

  function renderKm(data) {
    const latest = new Map();
    data.forEach(r => {
      const existing = latest.get(r.codigo_vehiculo);
      if (!existing || new Date(r.fecha_hora) > new Date(existing.fecha_hora)) {
        latest.set(r.codigo_vehiculo, r);
      }
    });
    const sorted = Array.from(latest.entries()).sort((a, b) => (b[1].kilometraje || 0) - (a[1].kilometraje || 0));
    const labels = sorted.map(e => e[0]);
    const values = sorted.map(e => e[1].kilometraje || 0);

    chartKm = destroyChart(chartKm);
    const ctx = document.getElementById('chart-km').getContext('2d');
    chartKm = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Kilometraje',
          data: values,
          backgroundColor: '#60a5fa'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  function renderVehicleStatus(data) {
    const vehicles = [...new Set(data.map(r => r.codigo_vehiculo).filter(Boolean))].sort();
    const statusKeys = ['OPERATIVO', 'MANT. PREVENTIVO', 'MANT. CORRECTIVO'];

    const datasets = statusKeys.map(status => ({
      label: status,
      data: vehicles.map(v => data.filter(r => r.codigo_vehiculo === v && r.estado_operativo === status).length),
      backgroundColor: STATUS_COLORS[status]
    }));

    chartVehicleStatus = destroyChart(chartVehicleStatus);
    const ctx = document.getElementById('chart-vehicle-status').getContext('2d');
    chartVehicleStatus = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: vehicles,
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#e2e8f0' } } },
        scales: {
          x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } },
          y: { stacked: true, beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  function renderCriticalTrend(data) {
    // Group CRI by week and system. Use top systems by total CRI count.
    const systemCounts = new Map();
    data.forEach(r => {
      if (!Array.isArray(r.report_systems)) return;
      r.report_systems.forEach(s => {
        if (s.estado === 'CRI') systemCounts.set(s.nombre_es, (systemCounts.get(s.nombre_es) || 0) + 1);
      });
    });
    const topSystems = sortMapByValue(systemCounts).slice(0, 6).map(e => e[0]);

    // Generate week buckets
    const dates = data.map(r => new Date(r.fecha_hora)).filter(d => !isNaN(d));
    if (dates.length === 0) {
      const ctx = document.getElementById('chart-critical-trend').getContext('2d');
      chartCriticalTrend = destroyChart(chartCriticalTrend);
      chartCriticalTrend = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Sin datos suficientes', color: '#94a3b8' } }
        }
      });
      return;
    }
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const buckets = [];
    let cur = startOfDay(minDate);
    while (cur <= maxDate) {
      buckets.push(new Date(cur));
      cur = addDays(cur, 7);
    }
    const labels = buckets.map(d => d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' }));

    const colors = ['#f87171', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa', '#f472b6'];
    const datasets = topSystems.map((sys, idx) => ({
      label: sys,
      data: buckets.map(bucket => {
        const next = addDays(bucket, 7);
        return data.filter(r => {
          const d = new Date(r.fecha_hora);
          if (d < bucket || d >= next) return false;
          return Array.isArray(r.report_systems) && r.report_systems.some(s => s.nombre_es === sys && s.estado === 'CRI');
        }).length;
      }),
      borderColor: colors[idx % colors.length],
      backgroundColor: colors[idx % colors.length],
      tension: 0.2
    }));

    chartCriticalTrend = destroyChart(chartCriticalTrend);
    const ctx = document.getElementById('chart-critical-trend').getContext('2d');
    chartCriticalTrend = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#e2e8f0' } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,.1)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  // ========== Maintenance ==========

  function getVehicleHistory(vehicle, sourceData) {
    return sourceData
      .filter(r => r.codigo_vehiculo === vehicle && r.kilometraje != null)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
  }

  function computeMaintenanceProjection(vehicle, history) {
    const alerts = MAINTENANCE_ALERTS[vehicle];
    if (!alerts || history.length === 0) return null;

    const latest = history[history.length - 1];
    const first = history[0];
    const days = daysBetween(new Date(first.fecha_hora), new Date(latest.fecha_hora));
    const kmDiff = latest.kilometraje - first.kilometraje;
    const kmPerDay = days > 0 ? kmDiff / days : 0;

    const today = new Date();
    const results = [];

    [['motor', alerts.motor], ['caja', alerts.caja]].forEach(([key, target]) => {
      if (!target) return;
      const remaining = target - latest.kilometraje;
      let status = 'ok';
      let projectedDate = null;

      if (remaining <= 0) {
        status = 'overdue';
      } else if (remaining <= 4000) {
        status = 'soon';
      }

      if (remaining > 0 && kmPerDay > 0) {
        projectedDate = addDays(today, Math.ceil(remaining / kmPerDay));
      }

      results.push({
        key,
        target,
        current: latest.kilometraje,
        remaining,
        kmPerDay,
        projectedDate,
        status
      });
    });

    return { latest, kmPerDay, projections: results };
  }

  function renderMaintenance(data) {
    // Populate vehicle selector
    const vehicles = [...new Set(data.map(r => r.codigo_vehiculo).filter(Boolean))].sort();
    els.maintVehicle.innerHTML = '<option value="">Todos los vehículos</option>' +
      vehicles.map(v => `<option value="${v}">${v}</option>`).join('');

    const selected = els.maintVehicle.value;
    const vehiclesToShow = selected ? [selected] : Object.keys(MAINTENANCE_ALERTS);

    const rows = [];
    vehiclesToShow.forEach(vehicle => {
      const history = getVehicleHistory(vehicle, allReportsCache.length ? allReportsCache : data);
      const proj = computeMaintenanceProjection(vehicle, history);
      if (!proj) return;
      proj.projections.forEach(p => {
        rows.push({ vehicle, ...p });
      });
    });

    if (!rows.length) {
      els.maintTableBody.innerHTML = '<tr><td colspan="7" class="loading">No hay datos de mantenimiento</td></tr>';
    } else {
      els.maintTableBody.innerHTML = rows.map(r => {
        const statusClass = r.status === 'ok' ? 'badge-ok' : (r.status === 'soon' ? 'badge-warn' : 'badge-danger');
        const statusText = r.status === 'ok' ? 'OK' : (r.status === 'soon' ? 'Próximo' : 'Excedido');
        return `
          <tr>
            <td>${r.vehicle}</td>
            <td>${r.key === 'motor' ? 'Motor' : 'Caja/Corona'}</td>
            <td>${r.current.toLocaleString('es-EC')}</td>
            <td>${r.target.toLocaleString('es-EC')}</td>
            <td>${r.remaining > 0 ? r.remaining.toLocaleString('es-EC') : '—'}</td>
            <td>${r.projectedDate ? formatDate(r.projectedDate) : '—'}</td>
            <td><span class="badge ${statusClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }

    renderMaintTrend(data, selected);
  }

  function renderMaintTrend(data, vehicle) {
    const vehicleToShow = vehicle || Object.keys(MAINTENANCE_ALERTS)[0];
    if (!vehicleToShow || !MAINTENANCE_ALERTS[vehicleToShow]) {
      chartMaintTrend = destroyChart(chartMaintTrend);
      return;
    }

    const history = getVehicleHistory(vehicleToShow, allReportsCache.length ? allReportsCache : data);
    if (history.length < 2) {
      const ctx = document.getElementById('chart-maint-trend').getContext('2d');
      chartMaintTrend = destroyChart(chartMaintTrend);
      chartMaintTrend = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { title: { display: true, text: 'Datos insuficientes para proyección', color: '#94a3b8' } }
        }
      });
      return;
    }

    const labels = history.map(r => formatDate(r.fecha_hora));
    const kmValues = history.map(r => r.kilometraje);
    const alerts = MAINTENANCE_ALERTS[vehicleToShow];
    const latest = history[history.length - 1];
    const first = history[0];
    const days = daysBetween(new Date(first.fecha_hora), new Date(latest.fecha_hora));
    const kmPerDay = days > 0 ? (latest.kilometraje - first.kilometraje) / days : 0;

    // Build projection datasets for motor and caja
    const motorTarget = alerts.motor;
    const cajaTarget = alerts.caja;
    const today = new Date();

    function projectionDataset(target, color, label) {
      if (!target) return null;
      const remaining = target - latest.kilometraje;
      if (remaining <= 0 || kmPerDay <= 0) return null;
      const daysToTarget = Math.ceil(remaining / kmPerDay);
      const projectedDate = addDays(today, daysToTarget);
      return {
        label: `${label} (proyección)`,
        data: [...Array(history.length).fill(null), latest.kilometraje, target],
        borderColor: color,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false
      };
    }

    // Extend labels for projected point
    const projLabels = [...labels, formatDate(today), formatDate(addDays(today, Math.max(
      motorTarget ? Math.ceil((motorTarget - latest.kilometraje) / kmPerDay) : 0,
      cajaTarget ? Math.ceil((cajaTarget - latest.kilometraje) / kmPerDay) : 0
    )))];

    const datasets = [{
      label: 'Km reales',
      data: [...kmValues, null, null],
      borderColor: '#60a5fa',
      backgroundColor: '#60a5fa',
      tension: 0.2
    }];

    const motorProj = projectionDataset(motorTarget, '#fbbf24', 'Motor');
    const cajaProj = projectionDataset(cajaTarget, '#f87171', 'Caja');
    if (motorProj) datasets.push(motorProj);
    if (cajaProj) datasets.push(cajaProj);

    // Threshold lines (horizontal)
    if (motorTarget) {
      datasets.push({
        label: 'Umbral motor',
        data: Array(projLabels.length).fill(motorTarget),
        borderColor: 'rgba(251,191,36,.5)',
        borderDash: [3, 3],
        pointRadius: 0,
        fill: false
      });
    }
    if (cajaTarget) {
      datasets.push({
        label: 'Umbral caja',
        data: Array(projLabels.length).fill(cajaTarget),
        borderColor: 'rgba(248,113,113,.5)',
        borderDash: [3, 3],
        pointRadius: 0,
        fill: false
      });
    }

    chartMaintTrend = destroyChart(chartMaintTrend);
    const ctx = document.getElementById('chart-maint-trend').getContext('2d');
    chartMaintTrend = new Chart(ctx, {
      type: 'line',
      data: { labels: projLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#e2e8f0' } } },
        scales: {
          y: { beginAtZero: false, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,.1)' } }
        }
      }
    });
  }

  // ========== Table ==========

  function renderTable(data) {
    if (!data.length) {
      els.tableBody.innerHTML = '<tr><td colspan="8" class="loading">No hay reportes</td></tr>';
      return;
    }
    const rows = data.slice(0, 50).map(r => `
      <tr>
        <td>${r.cod_reporte || '—'}</td>
        <td>${formatDateTime(r.fecha_hora)}</td>
        <td>${r.codigo_vehiculo || '—'}</td>
        <td>${r.placa || '—'}</td>
        <td>${r.kilometraje != null ? r.kilometraje.toLocaleString('es-EC') : '—'}</td>
        <td>${r.estado_operativo || '—'}</td>
        <td>${r.conductor || '—'}</td>
        <td>${r.inspector || '—'}</td>
      </tr>
    `).join('');
    els.tableBody.innerHTML = rows;
  }

  // ========== Load / Filters ==========

  async function loadDashboard() {
    els.tableBody.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';
    els.maintTableBody.innerHTML = '<tr><td colspan="7" class="loading">Cargando...</td></tr>';

    const filters = {
      startDate: els.start.value || undefined,
      endDate: els.end.value || undefined,
      vehicle: els.vehicle.value.trim() || undefined,
      status: els.status.value || undefined,
      limit: 5000
    };

    if (typeof getReportsFromSupabase !== 'function') {
      els.tableBody.innerHTML = '<tr><td colspan="8" class="loading">Error: cliente de Supabase no cargado</td></tr>';
      return;
    }

    // Load filtered data AND all data for maintenance projection (no date filter)
    const [filteredRes, allRes] = await Promise.all([
      getReportsFromSupabase(filters),
      getReportsFromSupabase({ limit: 5000 })
    ]);

    if (!filteredRes.ok || !allRes.ok) {
      const err = filteredRes.error || allRes.error;
      els.tableBody.innerHTML = `<tr><td colspan="8" class="loading">Error cargando datos: ${err?.message || err}</td></tr>`;
      return;
    }

    const data = filteredRes.data || [];
    allReportsCache = allRes.data || [];

    renderKPIs(data);
    renderReportsTime(data);
    renderSystems(data);
    renderStatus(data);
    renderKm(data);
    renderVehicleStatus(data);
    renderCriticalTrend(data);
    renderMaintenance(data);
    renderTable(data);
  }

  function setDefaultDates() {
    setPreset('last-month');
  }

  // Event listeners
  if (els.apply) els.apply.addEventListener('click', loadDashboard);
  if (els.reset) els.reset.addEventListener('click', () => {
    setPreset('last-month');
    els.vehicle.value = '';
    els.status.value = '';
    loadDashboard();
  });
  if (els.presets) {
    els.presets.addEventListener('click', (e) => {
      if (!e.target.classList.contains('preset-btn')) return;
      setPreset(e.target.dataset.preset);
      loadDashboard();
    });
  }
  if (els.maintVehicle) {
    els.maintVehicle.addEventListener('change', () => {
      renderMaintenance(allReportsCache.length ? allReportsCache : []);
    });
  }

  // Init
  setDefaultDates();
  loadDashboard();
})();
