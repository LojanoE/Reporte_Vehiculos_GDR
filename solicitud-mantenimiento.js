/* ============================================================
   Solicitud de mantenimiento ECSA — lógica de la página
   ============================================================ */
(function () {
  'use strict';

  const MAX_FALLAS = 6;
  const ROLES = Object.keys(window.REQUEST_ROLES);
  const SISTEMAS = [
    'Motor', 'Sistema de Transmisión', 'Dirección', 'Frenos', 'Suspensión', 'Elevavidrios',
    'Neumáticos', 'Sistema Eléctrico', 'Luces', 'Alarma de retroceso', 'Refrigerante',
    'Hidráulico', 'Carrocería', 'Seguridad (extintor, conos)', 'Sistema de Combustible', 'Limpieza'
  ];
  const ESTADOS = { PENDIENTE: 'Pendiente', EN_REPARACION: 'En reparación', CERRADA: 'Cerrada' };
  const ESTADO_COLOR = { PENDIENTE: '#fbbf24', EN_REPARACION: '#60a5fa', CERRADA: '#34d399' };

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let signers = JSON.parse(JSON.stringify(window.REQUEST_SIGNERS_DEFAULT));
  let fotoData = null;
  let editingCode = null; // código de una solicitud cargada desde el historial

  function localISO(d) {
    d = d || new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function fmtFecha(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function setStatus(msg, color) {
    const el = $('status-msg');
    el.textContent = msg || '';
    el.style.color = color || '#94a3b8';
  }

  /* ---------- Firmantes ---------- */
  function renderDatalists() {
    $('datalists').innerHTML = ROLES.map(r =>
      `<datalist id="dl-${r}">${(signers[r] || []).map(n => `<option value="${esc(n)}">`).join('')}</datalist>`
    ).join('');
  }
  function applyDefaultSigners() {
    ROLES.forEach(r => {
      const el = $('f-' + r);
      if (!el.value && signers[r] && signers[r].length) el.value = signers[r][0];
    });
  }
  async function loadSigners() {
    const res = await window.getRequestSignersFromSupabase();
    if (res.ok && res.data) {
      ROLES.forEach(r => { if (res.data[r] && res.data[r].length) signers[r] = res.data[r]; });
    }
    renderDatalists();
  }
  function openSignersModal() {
    $('signers-fields').innerHTML = ROLES.map(r => `
      <label>${esc(window.REQUEST_ROLES[r])}
        <textarea id="sg-${r}" rows="5">${esc((signers[r] || []).join('\n'))}</textarea>
      </label>`).join('');
    $('signers-msg').textContent = '';
    $('signers-modal').classList.remove('hidden');
  }
  async function saveSignersModal() {
    const map = {};
    ROLES.forEach(r => {
      const seen = new Set();
      map[r] = $('sg-' + r).value.split('\n').map(s => s.trim()).filter(s => s && !seen.has(s) && seen.add(s));
    });
    const msg = $('signers-msg');
    msg.style.color = '#94a3b8';
    msg.textContent = 'Guardando…';
    const res = await window.saveRequestSignersToSupabase(map);
    if (!res.ok) {
      msg.style.color = '#f87171';
      msg.textContent = 'No se pudo guardar (¿sin conexión?).';
      return;
    }
    signers = map;
    renderDatalists();
    $('signers-modal').classList.add('hidden');
    setStatus('Firmantes actualizados.', '#34d399');
  }

  /* ---------- Fallas ---------- */
  function addFalla(f) {
    const body = $('fallas-body');
    if (body.rows.length >= MAX_FALLAS) return;
    f = f || {};
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="n"></td>
      <td><input type="text" class="fa-causa w-full" list="dl-sistemas" value="${esc(f.causa)}"></td>
      <td><textarea class="fa-detalle w-full" rows="2">${esc(f.detalle)}</textarea></td>
      <td><textarea class="fa-obs w-full" rows="2">${esc(f.observacion)}</textarea></td>
      <td><button type="button" class="btn btn-ghost btn-sm fa-del" title="Quitar">✕</button></td>`;
    tr.querySelector('.fa-del').addEventListener('click', () => {
      tr.remove();
      if (!body.rows.length) addFalla();
      renumber();
    });
    body.appendChild(tr);
    renumber();
  }
  function renumber() {
    [...$('fallas-body').rows].forEach((tr, i) => { tr.querySelector('.n').textContent = i + 1; });
    $('btn-add-falla').disabled = $('fallas-body').rows.length >= MAX_FALLAS;
  }
  function getFallas() {
    return [...$('fallas-body').rows].map(tr => ({
      causa: tr.querySelector('.fa-causa').value.trim(),
      detalle: tr.querySelector('.fa-detalle').value.trim(),
      observacion: tr.querySelector('.fa-obs').value.trim()
    })).filter(f => f.causa || f.detalle || f.observacion);
  }
  function setFallas(list) {
    $('fallas-body').innerHTML = '';
    (list && list.length ? list : [{}]).slice(0, MAX_FALLAS).forEach(addFalla);
  }

  /* ---------- Foto ---------- */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const w = Math.min(1400, img.width);
          const h = Math.round(img.height * (w / img.width));
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function showFoto() {
    $('foto-wrap').classList.toggle('hidden', !fotoData);
    if (fotoData) $('foto-prev').src = fotoData;
  }

  /* ---------- Vehículo ---------- */
  function fillEco() {
    const codes = Object.keys(window.VEHICLE_PLATE_MAP);
    $('f-eco').innerHTML = '<option value="">— Seleccionar —</option>' +
      codes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }
  async function onEcoChange() {
    const eco = $('f-eco').value;
    $('f-marca').value = window.VEHICLE_BRAND_MAP[eco] || '';
    $('f-placa').value = window.VEHICLE_PLATE_MAP[eco] || '';
    $('km-hint').textContent = '';
    if (!eco) return;
    const res = await window.getLastKmFromSupabase(eco);
    if (res.ok && res.data && res.data.kilometraje != null) {
      if (!$('f-km').value) $('f-km').value = res.data.kilometraje;
      $('km-hint').textContent = `Último reporte: ${res.data.kilometraje} km (${fmtFecha(String(res.data.fecha_hora).slice(0, 10))})`;
    }
  }

  /* ---------- Formulario <-> datos ---------- */
  function collect() {
    const row = {
      fecha: $('f-fecha').value,
      codigo_vehiculo: $('f-eco').value,
      marca: $('f-marca').value.trim(),
      placa: $('f-placa').value.trim(),
      kilometraje: $('f-km').value === '' ? null : parseInt($('f-km').value, 10),
      departamento: $('f-dept').value.trim(),
      tipo_reparacion: $('f-tipo').value.trim(),
      taller_sugerido: $('f-taller').value.trim(),
      fallas: getFallas()
    };
    ROLES.forEach(r => { row[r] = $('f-' + r).value.trim(); });
    return row;
  }
  function loadRow(r) {
    editingCode = r.cod_solicitud;
    $('f-fecha').value = r.fecha;
    $('f-eco').value = r.codigo_vehiculo;
    $('f-marca').value = r.marca || '';
    $('f-placa').value = r.placa || '';
    $('f-km').value = r.kilometraje == null ? '' : r.kilometraje;
    $('f-dept').value = r.departamento || '';
    $('f-tipo').value = r.tipo_reparacion || '';
    $('f-taller').value = r.taller_sugerido || '';
    ROLES.forEach(rol => { $('f-' + rol).value = r[rol] || ''; });
    setFallas(r.fallas);
    fotoData = null; showFoto();
    const b = $('edit-banner');
    b.textContent = `Editando la solicitud ${r.cod_solicitud}. Al guardar se actualizará (la foto no se guarda en la nube).`;
    b.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function resetForm() {
    editingCode = null;
    $('edit-banner').classList.add('hidden');
    $('f-fecha').value = localISO();
    $('f-eco').value = '';
    $('f-marca').value = ''; $('f-placa').value = ''; $('f-km').value = '';
    $('km-hint').textContent = '';
    $('f-dept').value = window.REQUEST_DEPT_DEFAULT;
    $('f-tipo').value = window.REQUEST_TIPO_DEFAULT;
    $('f-taller').value = window.REQUEST_TALLER_DEFAULT;
    ROLES.forEach(r => { $('f-' + r).value = ''; });
    applyDefaultSigners();
    setFallas([]);
    fotoData = null; $('f-foto').value = ''; showFoto();
    setStatus('');
  }
  function validate(row) {
    if (!row.fecha) return 'Indica la fecha de solicitud.';
    if (!row.codigo_vehiculo) return 'Selecciona el vehículo.';
    if (!row.fallas.length) return 'Agrega al menos una falla.';
    return null;
  }

  /* ---------- Documento imprimible ---------- */
  function fillPrint(row, cod) {
    const set = (k, v) => document.querySelectorAll(`[data-p="${k}"]`).forEach(el => { el.textContent = v == null ? '' : v; });
    set('cod', cod);
    set('fecha', fmtFecha(row.fecha));
    set('dept', row.departamento);
    set('eco', row.codigo_vehiculo);
    set('marca', row.marca);
    set('placa', row.placa);
    set('km', row.kilometraje == null ? '' : row.kilometraje + ' km');
    ROLES.forEach(r => set(r, row[r]));
    set('tipo', row.tipo_reparacion);
    set('taller', row.taller_sugerido);
    set('equipo', [row.codigo_vehiculo, row.marca, row.placa].filter(Boolean).join(' / '));
    set('modelo', row.marca);
    set('desc_falla', row.fallas.map((f, i) =>
      `${i + 1}. ${[f.causa, f.detalle].filter(Boolean).join(': ')}`).join('\n'));

    const body = $('p-fallas');
    body.innerHTML = '';
    const rows = Math.max(MAX_FALLAS, row.fallas.length);
    for (let i = 0; i < rows; i++) {
      const f = row.fallas[i] || {};
      const tr = document.createElement('tr');
      tr.className = 'r-falla';
      tr.innerHTML = `<td class="c">${f.causa || f.detalle || f.observacion ? i + 1 : ''}</td>
        <td colspan="2">${esc(f.causa)}</td><td colspan="3">${esc(f.detalle)}</td><td colspan="2">${esc(f.observacion)}</td>`;
      body.appendChild(tr);
    }
    $('p-foto').innerHTML = fotoData
      ? `<img src="${fotoData}" alt="Foto">`
      : '<span style="color:#888;font-size:8pt;">Fotografía 照片</span>';
  }
  function printDoc() {
    // Esperar a que las imágenes (logos y foto) estén listas antes de imprimir
    const imgs = [...document.querySelectorAll('#solicitud-print img')];
    Promise.all(imgs.map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })))
      .then(() => window.print());
  }

  /* ---------- Acciones ---------- */
  async function printOnly() {
    const row = collect();
    const err = validate(row);
    if (err) return setStatus(err, '#f87171');
    fillPrint(row, editingCode || '(sin guardar)');
    printDoc();
  }
  async function saveAndPrint() {
    const row = collect();
    const err = validate(row);
    if (err) return setStatus(err, '#f87171');
    const btn = $('btn-save-print');
    btn.disabled = true;
    setStatus('Guardando…');
    try {
      const cod = editingCode || await window.getNextRequestCode(row.codigo_vehiculo, row.fecha);
      const res = await window.saveMaintenanceRequestToSupabase(Object.assign({ cod_solicitud: cod }, row));
      if (res.ok) {
        editingCode = cod;
        setStatus(`Solicitud ${cod} guardada.`, '#34d399');
        loadHistory();
      } else {
        setStatus('No se pudo guardar en la nube (¿sin conexión?). Se imprime igualmente.', '#fbbf24');
      }
      fillPrint(row, res.ok ? cod : '(sin guardar)');
      printDoc();
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- Historial ---------- */
  let histRows = [];
  async function loadHistory() {
    const body = $('hist-body');
    const res = await window.getMaintenanceRequestsFromSupabase({});
    if (!res.ok) {
      body.innerHTML = '<tr><td colspan="6" class="text-slate-400">No se pudo cargar el historial (sin conexión).</td></tr>';
      return;
    }
    histRows = res.data;
    if (!histRows.length) {
      body.innerHTML = '<tr><td colspan="6" class="text-slate-400">Aún no hay solicitudes.</td></tr>';
      return;
    }
    body.innerHTML = histRows.map((r, i) => {
      const fallas = (r.fallas || []).map(f => f.causa).filter(Boolean).join(', ');
      const opts = Object.keys(ESTADOS).map(k =>
        `<option value="${k}"${k === r.estado ? ' selected' : ''}>${ESTADOS[k]}</option>`).join('');
      return `<tr>
        <td class="whitespace-nowrap">${esc(r.cod_solicitud)}</td>
        <td class="whitespace-nowrap">${fmtFecha(r.fecha)}</td>
        <td>${esc(r.codigo_vehiculo)}</td>
        <td>${esc(fallas)}</td>
        <td><select class="h-estado" data-cod="${esc(r.cod_solicitud)}" style="color:${ESTADO_COLOR[r.estado] || '#e2e8f0'}">${opts}</select></td>
        <td><button type="button" class="btn btn-ghost btn-sm h-load" data-i="${i}">Abrir / reimprimir</button></td>
      </tr>`;
    }).join('');
  }
  async function onHistClick(e) {
    const b = e.target.closest('.h-load');
    if (b) loadRow(histRows[+b.dataset.i]);
  }
  async function onHistChange(e) {
    const s = e.target.closest('.h-estado');
    if (!s) return;
    const res = await window.updateMaintenanceRequestStatusInSupabase(s.dataset.cod, s.value);
    if (res.ok) {
      s.style.color = ESTADO_COLOR[s.value];
      setStatus(`Estado de ${s.dataset.cod}: ${ESTADOS[s.value]}.`, '#34d399');
    } else {
      setStatus('No se pudo actualizar el estado.', '#f87171');
      loadHistory();
    }
  }

  /* ---------- Init ---------- */
  function init() {
    $('dl-sistemas').innerHTML = SISTEMAS.map(s => `<option value="${esc(s)}">`).join('');
    fillEco();
    renderDatalists();
    resetForm();

    $('f-eco').addEventListener('change', onEcoChange);
    $('btn-add-falla').addEventListener('click', () => addFalla());
    $('f-foto').addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      try { fotoData = await resizeImage(f); showFoto(); }
      catch (_) { setStatus('No se pudo leer la imagen.', '#f87171'); }
    });
    $('btn-quitar-foto').addEventListener('click', () => { fotoData = null; $('f-foto').value = ''; showFoto(); });
    $('btn-save-print').addEventListener('click', saveAndPrint);
    $('btn-print').addEventListener('click', printOnly);
    $('btn-clear').addEventListener('click', resetForm);
    $('btn-signers').addEventListener('click', openSignersModal);
    $('btn-signers-save').addEventListener('click', saveSignersModal);
    $('btn-signers-cancel').addEventListener('click', () => $('signers-modal').classList.add('hidden'));
    $('btn-refresh').addEventListener('click', loadHistory);
    $('hist-body').addEventListener('click', onHistClick);
    $('hist-body').addEventListener('change', onHistChange);

    loadSigners().then(() => { applyDefaultSigners(); });
    loadHistory();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
