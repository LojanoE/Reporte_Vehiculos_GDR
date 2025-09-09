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
  'Motor','Transmisión / Tracción','Dirección','Frenos','Suspensión',
  'Neumáticos','Iluminación delantera','Iluminación posterior','Líquido de frenos','Nivel de aceite motor', 'Refrigerante',
  'Carrocería','Extintor','Triángulos','Aire Acondicionado','Ventilación','Otros'
];
const STATUS_OPTS = [
  {v:'OK', t:'OK'},
  {v:'OBS', t:'Atención'},
  {v:'CRI', t:'Crítico'}
];

// ====== Build systems table ======
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

// ====== Form elements ======
const form = $('#rdvForm');
const cod = $('#cod'), placa = $('#placa'), km = $('#km'), fecha = $('#fecha');
const conductor = $('#conductor'), inspector = $('#inspector'), ubicacion = $('#ubicacion');
const obsGeneral = $('#obsGeneral');
const foto1 = $('#foto1'), foto2 = $('#foto2'), prev1 = $('#prev1'), prev2 = $('#prev2');
const aptoSi = $('#aptoSi'), aptoNo = $('#aptoNo');
const liveCodigo = $('#liveCodigo'), liveEstado = $('#liveEstado'), liveSaved = $('#liveSaved');
const btnGenerar = $('#btnGenerar'), btnImprimir = $('#btnImprimir'), btnLimpiar = $('#btnLimpiar');

// Defaults
if (fecha) fecha.value = nowLocal();

const updateLiveCode = () => {
  const d = fecha && fecha.value ? new Date(fecha.value) : new Date();
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  const code = `${y}${m}-RDV-${(cod && cod.value || '???').toUpperCase().replace(/\s+/g,'')}-${day}`;
  if (liveCodigo) liveCodigo.textContent = code;
  return code;
};

// Uppercase code; live code
if (cod) cod.addEventListener('input', e => { cod.value = cod.value.toUpperCase(); updateLiveCode(); saveDraft(); });
if (fecha) fecha.addEventListener('change', ()=> { updateLiveCode(); saveDraft(); });
[placa, km, conductor, inspector, ubicacion, obsGeneral].forEach(el => el && el.addEventListener('input', saveDraft));
$$('select[id^=sys-]').forEach(el => el.addEventListener('change', (ev)=>{
  // If any critical, set NO APTO
  const anyCritical = $$('select[id^=sys-]').some(s=> s.value==='CRI');
  if (anyCritical && aptoNo) { aptoNo.checked = true; }
  saveDraft();
}));
$$('input[id^=sys-][id$=note]').forEach(el => el.addEventListener('input', saveDraft));

// ====== Image previews + resize ======
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
  if (e.target.files && e.target.files[0]) {
    readAndPreview(e.target.files[0], prev1, (d)=>{ foto1Data = d; saveDraft(); });
  }
});
if (foto2) foto2.addEventListener('change', (e)=>{
  if (e.target.files && e.target.files[0]) {
    readAndPreview(e.target.files[0], prev2, (d)=>{ foto2Data = d; saveDraft(); });
  }
});

// ====== Draft (localStorage) ======
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
  if (liveSaved) liveSaved.textContent = data._t;
}
function loadDraft(){
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (cod) cod.value = d.cod || ''; if (placa) placa.value = d.placa || ''; if (km) km.value = d.km || '';
    if (fecha) fecha.value = d.fecha || nowLocal();
    if (conductor) conductor.value = d.conductor || ''; if (inspector) inspector.value = d.inspector || ''; if (ubicacion) ubicacion.value = d.ubicacion || '';
    if (obsGeneral) obsGeneral.value = d.obsGeneral || '';
    if (d.apto==='SI' && aptoSi) aptoSi.checked=true; else if (aptoNo) aptoNo.checked=true;
    if (Array.isArray(d.sys)) {
      d.sys.forEach((it, i)=>{
        const s = $(`#sys-${i}-sel`); const n = $(`#sys-${i}-note`);
        if (s) s.value = it.val || 'OK';
        if (n) n.value = it.note || '';
      });
    }
    foto1Data = d.foto1Data || null; foto2Data = d.foto2Data || null;
    if (foto1Data && prev1) { prev1.src = foto1Data; prev1.classList.remove('hidden'); }
    if (foto2Data && prev2) { prev2.src = foto2Data; prev2.classList.remove('hidden'); }
    if (liveSaved) liveSaved.textContent = d._t || '—';
    updateLiveCode();
  } catch(e){ console.warn('No se pudo cargar el borrador', e); }
}
loadDraft();

// ====== Generate Report ======
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
  const code = `${y}${m}-RDV-${(cod && cod.value || '').toUpperCase().replace(/\s+/g,'')}-${day}`;

  // Header
  const repCod = $('#rep-codigo'); if (repCod) repCod.textContent = code;
  const repFecha = $('#rep-fecha'); if (repFecha) repFecha.textContent = new Date(fecha.value).toLocaleString();
  const repApto = $('#rep-apto'); if (repApto){ repApto.textContent = aptoSi && aptoSi.checked ? 'APTO' : 'NO APTO'; repApto.style.color = aptoSi && aptoSi.checked ? 'green' : 'red'; }
  const repCodVeh = $('#rep-cod'); if (repCodVeh) repCodVeh.textContent = (cod && cod.value || '').toUpperCase();
  const repPlaca = $('#rep-placa'); if (repPlaca) repPlaca.textContent = (placa && placa.value || '').toUpperCase();
  const repKm = $('#rep-km'); if (repKm) repKm.textContent = Number(km && km.value || 0).toLocaleString();
  const repUbic = $('#rep-ubic'); if (repUbic) repUbic.textContent = ubicacion && ubicacion.value || '—';
  const repCond = $('#rep-conductor'); if (repCond) repCond.textContent = conductor && conductor.value || '—';
  const repInsp = $('#rep-inspector'); if (repInsp) repInsp.textContent = inspector && inspector.value || '—';

  // Systems
  const body = $('#rep-sys-body');
  if (body){
    body.innerHTML = '';
    $$('select[id^=sys-]').forEach(s => {
      const note = $(`#${s.id.replace('-sel','-note')}`).value || '';
      const tr = document.createElement('tr');
      const statusText = s.value==='OK' ? 'OK' : (s.value==='OBS' ? 'Atención' : 'Crítico');
      tr.innerHTML = `<td>${s.dataset.sys}</td><td>${statusText}</td><td>${note || '—'}</td>`;
      body.appendChild(tr);
    });
  }

  // Photos
  const repImg1 = $('#rep-img1'); if (repImg1) repImg1.src = foto1Data;
  const repImg2 = $('#rep-img2'); if (repImg2) repImg2.src = foto2Data;

  // Live panels
  if (liveEstado) liveEstado.textContent = 'Informe generado';
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

window.addEventListener('afterprint', ()=>{
  // document.title = 'RDV — GDR';
});

if (btnLimpiar) btnLimpiar.addEventListener('click', ()=>{
  if (!confirm('¿Seguro que deseas limpiar el formulario y borrar el borrador guardado?')) return;
  try{ localStorage.removeItem(KEY); }catch(e){}
  if (form) form.reset();
  foto1Data = null; foto2Data = null;
  if (prev1) prev1.classList.add('hidden'); if (prev2) prev2.classList.add('hidden');
  if (fecha) fecha.value = nowLocal();
  updateLiveCode();
  if (liveEstado) liveEstado.textContent = 'Pendiente';
  if (btnImprimir) btnImprimir.disabled = true;
  showToast('Formulario reiniciado.');
});

window.addEventListener('keydown', (e)=>{
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='p'){
    if (btnImprimir && btnImprimir.disabled){ e.preventDefault(); alert('Primero genera el informe.'); }
  }
});

// Inicial
updateLiveCode();
