/* ============================================================
   Dashboard — RDV GDR
   Carga datos de Supabase y renderiza KPIs + gráficas Chart.js
   ============================================================ */

(function () {
  'use strict';

  // ====== ADMIN AUTH GATE ======
  const ADMIN_HASH = '710c83b610f56dbaeec7b72e9a04e5fc6da450df6ff9b313f0f3b6fb3fcd11ba'; // SHA-256
  const AUTH_KEY = 'RDV_GDR_ADMIN';

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function showLogin() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('dashboard-content').style.visibility = 'hidden';
  }

  function hideLogin() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('dashboard-content').style.visibility = '';
  }

  function initAuth() {
    if (sessionStorage.getItem(AUTH_KEY) === '1') {
      hideLogin();
      return true;
    }
    showLogin();
    const input = document.getElementById('admin-password');
    const btn = document.getElementById('btn-login');
    const err = document.getElementById('login-error');

    const tryLogin = async () => {
      const hash = await sha256(input.value);
      if (hash === ADMIN_HASH) {
        sessionStorage.setItem(AUTH_KEY, '1');
        hideLogin();
        setDefaultDates();
        loadDashboard();
      } else {
        err.classList.remove('hidden');
        input.value = '';
        input.focus();
      }
    };

    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); });
    input.focus();
    return false;
  }

  const isAuthed = initAuth();

  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  });

  let chartReportsTime = null;
  let chartSystems = null;
  let chartStatus = null;
  let chartKm = null;
  let chartVehicleStatus = null;
  let chartCriticalTrend = null;
  let chartMaintTrend = null;
  let chartGroups = null;
  let groupPeriodStats = []; // stats por quincena para re-render del gráfico de grupos

  let allReportsCache = [];
  let currentData = [];
  let lastRefresh = null;
  let activePreset = 'last-month';
  let datesTouched = false;
  let autoPreset = true; // true mientras el rango de fechas provenga de un preset
  let programmaticUpdate = false; // evita marcar fechas como "tocadas" por eventos change espurios

  const els = {
    start: document.getElementById('filter-start'),
    end: document.getElementById('filter-end'),
    vehicle: document.getElementById('filter-vehicle'),
    codigo: document.getElementById('filter-codigo'),
    conductor: document.getElementById('filter-conductor'),
    status: document.getElementById('filter-status'),
    group: document.getElementById('filter-grupo'),
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

  const ESTADO_BADGE = {
    OPERATIVO: 'badge-ok',
    'MANT. PREVENTIVO': 'badge-warn',
    'MANT. CORRECTIVO': 'badge-danger',
    INACTIVO: 'badge-warn'
  };

  const SYS_BADGES = { OK: 'badge-ok', OBS: 'badge-warn', CRI: 'badge-danger' };
  const SYS_TEXTS = { OK: 'OK', OBS: 'Atención', CRI: 'Crítico' };

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

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

  // Fecha local del navegador en formato YYYY-MM-DD. Evita que toISOString()
  // use UTC y adelante/atrase un día según la zona horaria del usuario.
  function localISO(d = new Date()) {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
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
    programmaticUpdate = true;
    try {
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
      els.start.value = localISO(start);
      els.end.value = localISO(end);

      activePreset = name;
      datesTouched = false;
      autoPreset = true;
    } finally {
      // Liberar en el siguiente tick para que cualquier evento change espurio sea ignorado
      setTimeout(() => { programmaticUpdate = false; }, 0);
    }

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
    // Última lectura VÁLIDA por vehículo (se descartan tipeos de kilometraje)
    const byVehicle = new Map();
    data.forEach(r => {
      if (!r.codigo_vehiculo || r.kilometraje == null) return;
      if (!byVehicle.has(r.codigo_vehiculo)) byVehicle.set(r.codigo_vehiculo, []);
      byVehicle.get(r.codigo_vehiculo).push(r);
    });
    const latest = new Map();
    let discarded = 0;
    byVehicle.forEach((list, v) => {
      const res = typeof window.filterKmReadings === 'function'
        ? window.filterKmReadings(list)
        : { valid: list.slice().sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)), discarded: 0 };
      discarded += res.discarded;
      if (res.valid.length) latest.set(v, res.valid[res.valid.length - 1]);
    });

    const noteEl = document.getElementById('km-note');
    if (noteEl) {
      noteEl.textContent = discarded
        ? `⚠️ ${discarded} lectura(s) de kilometraje descartada(s) por inconsistencia (posibles tipeos) en el rango filtrado.`
        : '';
    }

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

  // ========== Análisis por grupo de trabajo (quincenas G1/G2) ==========

  const GROUP_COLORS = { G1: '#34d399', G2: '#60a5fa' };

  function groupAnchorDate() {
    const [y, m, d] = (window.WORK_GROUP_ANCHOR || '2026-09-11').split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function renderGroups() {
    const currentEl = document.getElementById('grp-current');
    const tbody = document.getElementById('grp-compare-body');
    const noteEl = document.getElementById('grp-note');
    if (!currentEl || !tbody) return;
    if (typeof window.getWorkGroupPeriod !== 'function') {
      currentEl.textContent = 'Módulo de grupos no disponible (constants.js desactualizado).';
      return;
    }

    const anchor = groupAnchorDate();
    const today = startOfDay(new Date());
    const periodDays = window.WORK_GROUP_PERIOD_DAYS || 15;
    const data = (allReportsCache.length ? allReportsCache : currentData)
      .filter(r => new Date(r.fecha_hora) >= anchor);

    // Tarjeta de quincena actual
    const cur = window.getWorkGroupPeriod(today);
    if (cur) {
      const remaining = daysBetween(today, cur.end) + 1;
      currentEl.innerHTML =
        `Quincena actual: <span class="badge ${cur.group === 'G1' ? 'badge-ok' : 'badge-warn'}` +
        ` style="background:${cur.group === 'G1' ? 'rgba(52,211,153,.2)' : 'rgba(96,165,250,.2)'};` +
        ` color:${GROUP_COLORS[cur.group]};">${cur.group}</span> ` +
        `· Del <strong>${formatDate(cur.start)}</strong> al <strong>${formatDate(cur.end)}</strong> ` +
        `· Quedan <strong>${remaining}</strong> día(s)`;
    } else {
      currentEl.textContent = `Las quincenas de trabajo inician el ${formatDate(anchor)}.`;
    }

    // Lista de quincenas desde el ancla hasta hoy
    const periods = [];
    for (let idx = 0; ; idx++) {
      const start = addDays(anchor, idx * periodDays);
      if (start > today) break;
      periods.push({ index: idx, group: idx % 2 === 0 ? 'G1' : 'G2', start, end: addDays(start, periodDays - 1) });
    }

    // Km por quincena y vehículo, solo con lecturas válidas (tipeos descartados)
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

    // Stats por quincena
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

    // Agregados por grupo
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

    if (noteEl) {
      const parts = [`Cobertura desde el ${formatDate(anchor)} · ${periods.length} quincena(s) transcurridas`];
      if (discardedTotal > 0) {
        parts.push(`⚠️ ${discardedTotal} lectura(s) de km descartada(s) por inconsistencia (posibles tipeos), excluidas del análisis`);
      }
      noteEl.textContent = parts.join(' · ');
    }

    renderGroupsChart();
  }

  function renderGroupsChart() {
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

  // ========== Maintenance ==========

  function getVehicleHistory(vehicle, sourceData) {
    const list = sourceData.filter(r => r.codigo_vehiculo === vehicle && r.kilometraje != null);
    if (typeof window.filterKmReadings === 'function') {
      return window.filterKmReadings(list).valid;
    }
    return list.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
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
    const shown = Math.min(data.length, 200);
    const meta = document.getElementById('reports-meta');
    if (meta) {
      const win = els.start.value && els.end.value
        ? `Del ${formatDate(els.start.value)} al ${formatDate(els.end.value)} · `
        : '';
      meta.textContent = lastRefresh
        ? `${win}Mostrando ${shown} de ${data.length} · Actualizado ${formatDateTime(lastRefresh)}`
        : `${win}Mostrando ${shown} de ${data.length}`;
    }

    if (!data.length) {
      els.tableBody.innerHTML = '<tr><td colspan="9" class="loading">No hay reportes</td></tr>';
      return;
    }
    const rows = data.slice(0, 200).map(r => `
      <tr class="report-row" data-cod="${escapeHtml(r.cod_reporte || '')}" style="cursor:pointer;" title="Ver detalle del reporte">
        <td>${escapeHtml(r.cod_reporte || '—')}</td>
        <td>${formatDateTime(r.fecha_hora)}</td>
        <td>${escapeHtml(r.codigo_vehiculo || '—')}</td>
        <td>${escapeHtml(r.placa || '—')}</td>
        <td>${r.kilometraje != null ? r.kilometraje.toLocaleString('es-EC') : '—'}</td>
        <td>${escapeHtml(r.estado_operativo || '—')}</td>
        <td>${escapeHtml(r.conductor || '—')}</td>
        <td>${escapeHtml(r.inspector || '—')}</td>
        <td><button class="btn btn-ghost" style="padding:.25rem .5rem; font-size:.75rem;">Ver</button></td>
      </tr>
    `).join('');
    els.tableBody.innerHTML = rows;
  }

  // ========== Modal detalle de reporte ==========

  function hideReportModal() {
    document.getElementById('report-modal').style.display = 'none';
  }

  function showReportModal(report) {
    if (!report) return;
    const set = (id, val) => { document.getElementById(id).textContent = val; };

    set('modal-cod', report.cod_reporte || '—');
    set('modal-fecha', formatDateTime(report.fecha_hora));
    set('modal-vehiculo', report.codigo_vehiculo || '—');
    set('modal-placa', report.placa || '—');
    set('modal-km', report.kilometraje != null ? report.kilometraje.toLocaleString('es-EC') : '—');
    set('modal-version', report.version || '—');
    set('modal-conductor', report.conductor || '—');
    set('modal-inspector', report.inspector || '—');
    set('modal-ubicacion', report.ubicacion || '—');

    const estado = report.estado_operativo || 'Desconocido';
    document.getElementById('modal-estado').innerHTML =
      `<span class="badge ${ESTADO_BADGE[estado] || 'badge-warn'}">${escapeHtml(estado)}</span>`;

    const systems = Array.isArray(report.report_systems) ? report.report_systems : [];
    const sysBody = document.getElementById('modal-systems');
    if (!systems.length) {
      sysBody.innerHTML = '<tr><td colspan="3" class="loading">Sin sistemas registrados</td></tr>';
    } else {
      sysBody.innerHTML = systems.map(s => `
        <tr>
          <td>${escapeHtml(s.nombre_es || '—')}</td>
          <td><span class="badge ${SYS_BADGES[s.estado] || 'badge-ok'}">${escapeHtml(SYS_TEXTS[s.estado] || s.estado || '—')}</span></td>
          <td>${escapeHtml(s.observacion) || '—'}</td>
        </tr>
      `).join('');
    }

    const obs = (report.obs_general || '').trim();
    document.getElementById('modal-obs').textContent = obs || '—';

    const photos = Array.isArray(report.report_photos) ? report.report_photos : [];
    const photoMap = {};
    photos.forEach(p => {
      if (p.foto_index === 1 || p.foto_index === 2) photoMap[p.foto_index] = p.tiene_foto;
    });
    set('modal-foto1', photoMap[1] ? 'Con foto' : 'Sin foto');
    set('modal-foto2', photoMap[2] ? 'Con foto' : 'Sin foto');

    document.getElementById('report-modal').style.display = 'flex';
  }

  // ========== Load / Filters ==========

  async function loadDashboard() {
    els.tableBody.innerHTML = '<tr><td colspan="9" class="loading">Cargando...</td></tr>';
    els.maintTableBody.innerHTML = '<tr><td colspan="7" class="loading">Cargando...</td></tr>';

    // Auto-corrige ventanas de fecha estancadas (pestaña abierta varios días,
    // sesión restaurada, evento change espurio, etc.): si el rango proviene de
    // un preset y su fecha fin ya quedó en el pasado, se recalcula relativo a hoy.
    const todayStr = localISO();
    if (autoPreset && (!els.start.value || !els.end.value || els.end.value < todayStr)) {
      console.log('[dashboard] auto-corrigiendo rango de fecha a hoy:', todayStr);
      setPreset(activePreset);
    }

    const filters = {
      startDate: els.start.value || undefined,
      endDate: els.end.value || undefined,
      vehicle: els.vehicle.value.trim() || undefined,
      codigo: els.codigo.value.trim() || undefined,
      conductor: els.conductor.value.trim() || undefined,
      status: els.status.value || undefined,
      limit: 5000
    };

    if (typeof getReportsFromSupabase !== 'function') {
      els.tableBody.innerHTML = '<tr><td colspan="9" class="loading">Error: cliente de Supabase no cargado</td></tr>';
      return;
    }

    // Load filtered data AND all data for maintenance projection (no date filter)
    const [filteredRes, allRes] = await Promise.all([
      getReportsFromSupabase(filters),
      getReportsFromSupabase({ limit: 5000 })
    ]);

    if (!filteredRes.ok || !allRes.ok) {
      const err = filteredRes.error || allRes.error;
      els.tableBody.innerHTML = `<tr><td colspan="9" class="loading">Error cargando datos: ${err?.message || err}</td></tr>`;
      return;
    }

    let data = filteredRes.data || [];
    allReportsCache = allRes.data || [];
    lastRefresh = new Date();

    // Filtro por grupo de trabajo (se deriva de la fecha, no está en la BD)
    const groupFilter = els.group && els.group.value;
    if (groupFilter && typeof window.getWorkGroupPeriod === 'function') {
      data = data.filter(r => {
        const p = window.getWorkGroupPeriod(new Date(r.fecha_hora));
        return p && p.group === groupFilter;
      });
    }
    currentData = data;

    renderKPIs(data);
    renderReportsTime(data);
    renderSystems(data);
    renderStatus(data);
    renderKm(data);
    renderVehicleStatus(data);
    renderCriticalTrend(data);
    renderGroups();
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
    els.codigo.value = '';
    els.conductor.value = '';
    els.status.value = '';
    if (els.group) els.group.value = '';
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

  // Selector de métrica del gráfico de grupos (re-render sin recargar datos)
  const grpMetric = document.getElementById('grp-metric');
  if (grpMetric) grpMetric.addEventListener('change', renderGroupsChart);

  // Botón refrescar (recarga sin re-loguear)
  const refreshBtn = document.getElementById('btn-refresh');
  if (refreshBtn) refreshBtn.addEventListener('click', loadDashboard);

  // Si el usuario edita las fechas manualmente, se respeta su rango
  [els.start, els.end].forEach(input => {
    if (input) input.addEventListener('change', () => {
      if (programmaticUpdate) return;
      datesTouched = true;
      autoPreset = false;
    });
  });

  // Click en fila de reportes -> modal de detalle
  if (els.tableBody) {
    els.tableBody.addEventListener('click', (e) => {
      const row = e.target.closest('tr.report-row');
      if (!row) return;
      const report = currentData.find(r => r.cod_reporte === row.dataset.cod);
      showReportModal(report);
    });
  }

  // Cierre del modal
  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', hideReportModal);
  const modal = document.getElementById('report-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) hideReportModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideReportModal();
  });

  // Init
  if (isAuthed) {
    setDefaultDates();
    loadDashboard();
  }
})();
