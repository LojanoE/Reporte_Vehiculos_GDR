// ====== Helpers ======
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const pad2 = n => String(n).padStart(2,'0');
const nowLocal = () => {
  const d = new Date();
  const tzoffset = d.getTimezoneOffset();
  const local = new Date(d - tzoffset*60000);
  return local.toISOString().slice(0,16);
};
const showToast = (msg) => {
  const el = $('#toast'); if(!el) return; el.textContent = msg; el.classList.remove('hidden');
  setTimeout(()=> el.classList.add('hidden'), 2200);
};

const SYSTEMS = [
  'Motor','Sistema de Transmisión / Tracción','Dirección','Frenos','Suspensión',
  'Neumáticos','Sistema Eléctrico','Luces','Fluidos (aceite, refrigerante, etc.)',
  'Carrocería','Seguridad (extintor, conos)','Sistema de Combustible','Limpieza','Otros'
];
const STATUS_OPTS = [
  {v:'OK', t:'OK'},
  {v:'OBS', t:'Atención'},
  {v:'CRI', t:'Reparar'}
];

// Build systems table
const tbody = $('#sysTableBody');
if (tbody){
  SYSTEMS.forEach((name, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2">${name}</td>
      <td class="p-2">
        <select class="sys-select" id="sys-${i}-sel" data-sys="${name}">
          ${STATUS_OPTS.map(o => `<option value="${o.v}">${o.t}</option>`).join('')}
        </select>
      </td>
      <td class="p-2"><input id="sys-${i}-note" class="sys-note" placeholder="Observación / Nota (opcional)"></td>`;
    tbody.appendChild(tr);
  });
}

// Form elements
const form = $('#rdvForm');
const cod = $('#cod'), placa = $('#placa'), km = $('#km'), fecha = $('#fecha');
const conductor = $('#conductor'), inspector = $('#inspector'), ubicacion = $('#ubicacion');
const obsGeneral = $('#obsGeneral');
const foto1 = $('#foto1'), foto2 = $('#foto2'), prev1 = $('#prev1'), prev2 = $('#prev2');
const aptoSi = $('#aptoSi'), aptoNo = $('#aptoNo');
const liveCodigo = $('#liveCodigo');
const btnGenerar = $('#btnGenerar'), btnImprimir = $('#btnImprimir'), btnLimpiar = $('#btnLimpiar');

// Defaults
if (fecha) fecha.value = nowLocal();


// === Generador del código RDV: AÑOMES-CODVEH-RDV-0DÍA
function generateCode(baseDate){
  const d = baseDate || (fecha && fecha.value ? new Date(fecha.value) : new Date());
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  // En vez de "GDR" usar el código de vehículo ingresado
  const veh = (cod && cod.value ? cod.value.trim().toUpperCase() : 'GDR');
  // Formato: 2509-ECO62-RDV-009 (si no hay código, queda GDR como respaldo)
  return `${y}${m}-${veh}-RDV-0${day}`;
}



const updateLiveCode = () => {
  const code = generateCode();
  if (liveCodigo) liveCodigo.textContent = code;
  return code;
};

// Events
if (cod) cod.addEventListener('input', e => { cod.value = cod.value.toUpperCase(); updateLiveCode(); saveDraft(); });
if (fecha) fecha.addEventListener('change', ()=> { updateLiveCode(); saveDraft(); });
[placa, km, conductor, inspector, ubicacion, obsGeneral].forEach(el => el && el.addEventListener('input', saveDraft));
$$('select[id^=sys-]').forEach(el => el.addEventListener('change', ()=>{
  const anyCritical = $$('select[id^=sys-]').some(s=> s.value==='CRI');
  if (anyCritical && aptoNo) aptoNo.checked = true;
  saveDraft();
}));
$$('input[id^=sys-][id$=note]').forEach(el => el.addEventListener('input', saveDraft));

// Image previews + resize
const readAndPreview = (file, imgEl, cb) => {
  const reader = new FileReader();
  reader.onload = async () => {
    const dataURL = await resizeDataURL(reader.result, 1400);
    if (imgEl){ imgEl.src = dataURL; imgEl.classList.remove('hidden'); }
    cb && cb(dataURL);
  };
  reader.readAsDataURL(file);
};
async function resizeDataURL(dataURL, maxW=1400){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = dataURL;
  });
}
let foto1Data = null, foto2Data = null;
if (foto1) foto1.addEventListener('change', (e)=>{
  if (e.target.files && e.target.files[0]) readAndPreview(e.target.files[0], prev1, (d)=>{ foto1Data = d; saveDraft(); });
});
if (foto2) foto2.addEventListener('change', (e)=>{
  if (e.target.files && e.target.files[0]) readAndPreview(e.target.files[0], prev2, (d)=>{ foto2Data = d; saveDraft(); });
});

// Draft
const KEY = 'RDV_GDR_DRAFT';
function saveDraft(){
  const sys = $$('select[id^=sys-]').map(s => ({name: s.dataset.sys, val: s.value, note: $(`#${s.id.replace('-sel','-note')}`).value || ''}));
  const data = {
    cod: cod && cod.value || '', placa: placa && placa.value || '', km: km && km.value || '', fecha: fecha && fecha.value || '',
    conductor: conductor && conductor.value || '', inspector: inspector && inspector.value || '', ubicacion: ubicacion && ubicacion.value || '',
    obsGeneral: obsGeneral && obsGeneral.value || '', apto: aptoSi && aptoSi.checked ? 'SI' : 'NO',
    sys, foto1Data, foto2Data, _t: new Date().toLocaleString()
  };
  try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){}
}
function loadDraft(){
  // Si la navegación fue un "reload" del navegador, limpiar todo y no cargar borrador
  try {
    const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    const isReload = nav ? nav.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
    if (isReload) {
      try { localStorage.removeItem(KEY); } catch(e){}
      if (form) form.reset();
      foto1Data = null; foto2Data = null;
      if (prev1) prev1.classList.add('hidden');
      if (prev2) prev2.classList.add('hidden');
      if (fecha) fecha.value = nowLocal();
      updateLiveCode();
      if (btnImprimir) btnImprimir.disabled = true;
      return; // salir sin cargar nada del almacenamiento
    }
  } catch(_) {}

  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (cod) cod.value = d.cod || '';
    if (placa) placa.value = d.placa || '';
    if (km) km.value = d.km || '';
    if (fecha) fecha.value = d.fecha || nowLocal();
    if (conductor) conductor.value = d.conductor || '';
    if (inspector) inspector.value = d.inspector || '';
    if (ubicacion) ubicacion.value = d.ubicacion || '';
    if (obsGeneral) obsGeneral.value = d.obsGeneral || '';
    if (Array.isArray(d.sys)) {
      d.sys.forEach((it, i)=>{
        const s = document.querySelector(`#sys-${i}-sel`);
        const n = document.querySelector(`#sys-${i}-note`);
        if (s) s.value = it.val || 'OK';
        if (n) n.value = it.note || '';
      });
    }
    foto1Data = d.foto1Data || null;
    foto2Data = d.foto2Data || null;
    if (foto1Data && prev1) { prev1.src = foto1Data; prev1.classList.remove('hidden'); }
    if (foto2Data && prev2) { prev2.src = foto2Data; prev2.classList.remove('hidden'); }
    updateLiveCode();
  } catch(e){ console.warn('No se pudo cargar el borrador', e); }
}
loadDraft();

// Generate Report
function validar(){
  if (!cod || !cod.value.trim()) return 'Código del vehículo es obligatorio.';
  if (!placa || !placa.value.trim()) return 'La placa es obligatoria.';
  if (!km || !km.value || Number(km.value) < 0) return 'Kilometraje inválido.';
  if (!fecha || !fecha.value) return 'Fecha/hora obligatoria.';
  if (!foto1Data || !foto2Data) return 'Debes cargar dos fotos.';
  return null;
}
function fillReport(){
  const d = fecha && fecha.value ? new Date(fecha.value) : new Date();
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  const code = generateCode(d);

  const repCod = $('#rep-codigo'); if (repCod) repCod.textContent = code;
  $('#rep-fecha').textContent = new Date(fecha.value).toLocaleString();
  const repApto = $('#rep-apto'); repApto.textContent = aptoSi && aptoSi.checked ? 'OPERATIVO' : (aptoNo && aptoNo.checked ? 'MANT. PREVENTIVO' : 'MANT. CORRECTIVO');
  repApto.style.color = aptoSi && aptoSi.checked ? 'green' : 'red';
  $('#rep-cod').textContent = (cod && cod.value || '').toUpperCase();
  $('#rep-placa').textContent = (placa && placa.value || '').toUpperCase();
  $('#rep-km').textContent = Number(km && km.value || 0).toLocaleString();
  $('#rep-arch').textContent = generateCode();  // código del archivo en lugar de ubicación
  const repObs = $('#rep-obs'); if (repObs) repObs.textContent = (obsGeneral && obsGeneral.value || '—');
  $('#rep-conductor').textContent = conductor && conductor.value || '—';
  $('#rep-inspector').textContent = inspector && inspector.value || '—';

  $('#rep-img1').src = foto1Data;
  $('#rep-img2').src = foto2Data;

  const body = $('#rep-sys-body');
  body.innerHTML = '';
  $$('select[id^=sys-]').forEach(s => {
    const note = $(`#${s.id.replace('-sel','-note')}`).value || '';
    const tr = document.createElement('tr');
    const statusText = s.value==='OK' ? 'OK' : (s.value==='OBS' ? 'Atención' : 'Crítico');
    tr.innerHTML = `<td>${s.dataset.sys}</td><td>${statusText}</td><td>${note || '—'}</td>`;
    body.appendChild(tr);
  });

  if (liveCodigo) liveCodigo.textContent = code;
  return code;
}

if (btnGenerar) btnGenerar.addEventListener('click', ()=>{
  const err = validar();
  if (err) { alert(err); return; }
  const code = fillReport();
  document.title = code;
  if (btnImprimir) btnImprimir.disabled = false;
  showToast('Informe generado. Listo para imprimir/guardar PDF.');
  saveDraft();
});
if (btnImprimir) btnImprimir.addEventListener('click', ()=>{
  if (btnImprimir.disabled) return;
  window.print();
  showToast('Abriendo el diálogo de impresión...');
});
if (btnLimpiar) btnLimpiar.addEventListener('click', ()=>{
  if (!confirm('¿Seguro que deseas limpiar el formulario y borrar el borrador guardado?')) return;
  try{ localStorage.removeItem(KEY); }catch(e){}
  if (form) form.reset();
  foto1Data = null; foto2Data = null;
  if (prev1) prev1.classList.add('hidden'); if (prev2) prev2.classList.add('hidden');
  if (fecha) fecha.value = nowLocal();
  updateLiveCode();
  if (btnImprimir) btnImprimir.disabled = true;
  showToast('Formulario reiniciado.');
});

// Inicial
updateLiveCode();
