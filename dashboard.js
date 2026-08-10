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

  const els = {
    start: document.getElementById('filter-start'),
    end: document.getElementById('filter-end'),
    vehicle: document.getElementById('filter-vehicle'),
    status: document.getElementById('filter-status'),
    apply: document.getElementById('btn-apply'),
    reset: document.getElementById('btn-reset'),
    kpiTotal: document.getElementById('kpi-total'),
    kpiThisMonth: document.getElementById('kpi-this-month'),
    kpiCritical: document.getElementById('kpi-critical'),
    kpiOperativo: document.getElementById('kpi-operativo'),
    tableBody: document.getElementById('reports-table-body')
  };

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

    els.kpiTotal.textContent = total;
    els.kpiThisMonth.textContent = thisMonth;
    els.kpiCritical.textContent = critical;
    els.kpiOperativo.textContent = pct + '%';
  }

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
    const colors = ['#34d399', '#fbbf24', '#f87171', '#94a3b8'];

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
    // Último kilometraje reportado por vehículo
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

  async function loadDashboard() {
    els.tableBody.innerHTML = '<tr><td colspan="8" class="loading">Cargando...</td></tr>';

    const filters = {
      startDate: els.start.value || undefined,
      endDate: els.end.value || undefined,
      vehicle: els.vehicle.value.trim() || undefined,
      status: els.status.value || undefined,
      limit: 2000
    };

    if (typeof getReportsFromSupabase !== 'function') {
      els.tableBody.innerHTML = '<tr><td colspan="8" class="loading">Error: cliente de Supabase no cargado</td></tr>';
      return;
    }

    const res = await getReportsFromSupabase(filters);
    if (!res.ok) {
      els.tableBody.innerHTML = `<tr><td colspan="8" class="loading">Error cargando datos: ${res.error?.message || res.error}</td></tr>`;
      return;
    }

    const data = res.data || [];
    renderKPIs(data);
    renderReportsTime(data);
    renderSystems(data);
    renderStatus(data);
    renderKm(data);
    renderTable(data);
  }

  function setDefaultDates() {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    els.end.value = end.toISOString().slice(0, 10);
    els.start.value = start.toISOString().slice(0, 10);
  }

  // Event listeners
  if (els.apply) els.apply.addEventListener('click', loadDashboard);
  if (els.reset) els.reset.addEventListener('click', () => {
    els.start.value = '';
    els.end.value = '';
    els.vehicle.value = '';
    els.status.value = '';
    loadDashboard();
  });

  // Init
  setDefaultDates();
  loadDashboard();
})();
