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
const formatDateTime = (date) => {
  const d = new Date(date);
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('es-EC', { hour12: false });
  return `${day}/${month}/${year}, ${time}`;
};
const showToast = (msg) => {
  const el = $('#toast'); if(!el) return; el.textContent = msg; el.classList.remove('hidden');
  setTimeout(()=> el.classList.add('hidden'), 2200);
};

const SYSTEMS = [
  'Motor','Sistema de Transmisión','Dirección','Frenos','Suspensión','Elevavidrios',
  'Neumáticos','Sistema Eléctrico','Luces','Alarma de retroceso','Frenos', 'Refrigerante',
  'Hidráulico','Carrocería','Seguridad (extintor, conos)','Sistema de Combustible','Limpieza'
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
const codSelect = $('#codSelect'), cod = $('#cod'), placa = $('#placa'), km = $('#km'), fecha = $('#fecha');
const conductor = $('#conductor'), inspector = $('#inspector'), ubicacion = $('#ubicacion');
const obsGeneral = $('#obsGeneral');
const foto1 = $('#foto1'), foto2 = $('#foto2'), prev1 = $('#prev1'), prev2 = $('#prev2');
const aptoSi = $('#aptoSi'), aptoNo = $('#aptoNo');
const liveCodigo = $('#liveCodigo');
const btnGenerar = $('#btnGenerar'), btnImprimir = $('#btnImprimir'), btnLimpiar = $('#btnLimpiar');
const kmWarning = $('#kmWarning');

// Mapa de códigos de vehículo a placas
const vehiclePlateMap = {
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

const MAINTENANCE_ALERTS = {
  'ECO23': {
    motor: 83460,
    caja: 93271
  },
  'ECO62': {
    motor: 26652,
    caja: 41652
  },
  'ECO26': {
    motor: 134008,
    caja: 138536
  },
};
const ALERT_RANGE = 200;

// Available vehicle codes for the dropdown
const AVAILABLE_CODES = Object.keys(vehiclePlateMap);

// Defaults
if (fecha) fecha.value = nowLocal();
if (cod) {
  cod.disabled = true; // Initially disable the input field
  cod.classList.add('hidden'); // Initially hide the input field
}


// === Generador del código RDV: AÑOMES-CODVEH-RDV-0DÍA
function generateCode(baseDate){
  const d = baseDate || (fecha && fecha.value ? new Date(fecha.value) : new Date());
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  // En vez de "GDR" usar el código de vehículo ingresado
  let veh = 'GDR';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    veh = codSelect.value;
  } else if (cod && cod.value) {
    veh = cod.value.trim().toUpperCase();
  }
  // Formato: 2509-ECO62-RDV-009 (si no hay código, queda GDR como respaldo)
  return `${y}${m}-${veh}-RDV-0${day}-V0`;
}

function checkMaintenance() {
  if (!kmWarning) return;
  kmWarning.classList.add('hidden');
  kmWarning.textContent = '';
  
  let code = '';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    code = codSelect.value;
  } else if (cod && cod.value) {
    code = cod.value.toUpperCase();
  }
  
  const vehicleAlerts = MAINTENANCE_ALERTS[code];
  if (!vehicleAlerts) return; // No specific alerts for this vehicle
  
  const currentKm = parseInt(km.value, 10);
  if (isNaN(currentKm)) return;

  const msgs = []; // For upcoming maintenance
  const pastDueMsgs = []; // For maintenance passed by 100km

  // Check for motor maintenance
  if (vehicleAlerts.motor) {
    const motorTarget = vehicleAlerts.motor;
    if (currentKm >= (motorTarget - ALERT_RANGE) && currentKm <= motorTarget) {
      msgs.push(`⚠️ Mantenimiento de MOTOR próximo (${motorTarget - currentKm} km para ${motorTarget})`);
    } else if (currentKm > motorTarget + 100) {
      pastDueMsgs.push(`🚫 Mantenimiento de MOTOR (target ${motorTarget}km) excedido por ${currentKm - motorTarget}km. Contactar para actualizar.`);
    }
  }

  // Check for gearbox/crown maintenance
  if (vehicleAlerts.caja) {
    const cajaTarget = vehicleAlerts.caja;
    if (currentKm >= (cajaTarget - ALERT_RANGE) && currentKm <= cajaTarget) {
      msgs.push(`⚠️ Mantenimiento de CAJA/CORONA próximo (${cajaTarget - currentKm} km para ${cajaTarget})`);
    } else if (currentKm > cajaTarget + 100) {
      pastDueMsgs.push(`🚫 Mantenimiento de CAJA/CORONA (target ${cajaTarget}km) excedido por ${currentKm - cajaTarget}km. Contactar para actualizar: Estanislao L (LSM) o Kathy R.(LSM)`);
    }
  }
  
  if (pastDueMsgs.length > 0) {
    kmWarning.textContent = pastDueMsgs.join(' | ');
    kmWarning.classList.remove('hidden');
    showToast(pastDueMsgs[0]);
  } else if (msgs.length > 0) {
    kmWarning.textContent = msgs.join(' | ');
    kmWarning.classList.remove('hidden');
    showToast(msgs[0]);
  }
}

const updateLiveCode = () => {
  const code = generateCode();
  if (liveCodigo) liveCodigo.textContent = code;
  // Autocompletar placa
  if (cod && placa) {
    const vehicleCode = cod.value.toUpperCase();
    placa.value = vehiclePlateMap[vehicleCode] || '';
  }
  return code;
};

// Events
if (cod) cod.addEventListener('input', e => { cod.value = cod.value.toUpperCase(); updateLiveCode(); checkMaintenance(); saveDraft(); });
if (codSelect) codSelect.addEventListener('change', e => { 
  if (codSelect.value === 'OTRO') {
    cod.disabled = false;
    cod.classList.remove('hidden');
    cod.focus();
  } else {
    cod.value = codSelect.value;
    cod.disabled = true;
    cod.classList.add('hidden');
    updateLiveCode();
    checkMaintenance();
    saveDraft();
  }
});
if (fecha) fecha.addEventListener('change', ()=> { updateLiveCode(); saveDraft(); });
[placa, km, conductor, inspector, ubicacion, obsGeneral].forEach(el => el && el.addEventListener('input', () => { if(el === km) checkMaintenance(); saveDraft(); }));
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
  let selectedCod = '';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    selectedCod = codSelect.value;
  } else if (cod && cod.value) {
    selectedCod = cod.value;
  }
  const data = {
    cod: selectedCod || '', 
    codSelect: codSelect ? codSelect.value : '', 
    placa: placa && placa.value || '', km: km && km.value || '', fecha: fecha && fecha.value || '',
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
      if (codSelect) codSelect.value = '';
      if (cod) {
        cod.disabled = false;
        cod.value = '';
      }
      updateLiveCode();
      if (btnImprimir) {
        btnImprimir.disabled = true;
        btnImprimir.classList.remove('btn-highlight');
      }
      return; // salir sin cargar nada del almacenamiento
    }
  } catch(_) {}

  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    if (codSelect && d.codSelect) {
      codSelect.value = d.codSelect;
      if (d.codSelect === 'OTRO' && d.cod) {
        if (cod) {
          cod.disabled = false;
          cod.value = d.cod;
          cod.classList.remove('hidden');
        }
      } else if (d.codSelect !== 'OTRO') {
        if (cod) {
          cod.disabled = true;
          cod.value = d.codSelect;
          cod.classList.add('hidden');
        }
      }
    } else if (cod && d.cod) {
      // In case the saved draft doesn't have codSelect but has cod value
      cod.value = d.cod;
      if (AVAILABLE_CODES.includes(d.cod)) {
        codSelect.value = d.cod;
        cod.disabled = true;
        cod.classList.add('hidden');
      } else {
        codSelect.value = 'OTRO';
        cod.disabled = false;
        cod.classList.remove('hidden');
      }
    }
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
    checkMaintenance();
    
    // If the draft contains data, enable the print button and apply yellow styling
    if (btnImprimir) {
      btnImprimir.disabled = false;
      btnImprimir.classList.add('btn-highlight');
    }
  } catch(e){ console.warn('No se pudo cargar el borrador', e); }
}
loadDraft();

// Generate Report
function validar(){
  let vehicleCode = '';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    vehicleCode = codSelect.value;
  } else if (cod && cod.value) {
    vehicleCode = cod.value.trim().toUpperCase();
  }
  
  if (!vehicleCode) return 'Código del vehículo es obligatorio.';
  if (!placa || !placa.value.trim()) return 'La placa es obligatoria.';
  if (!km || !km.value || Number(km.value) < 0) return 'Kilometraje inválido.';
  if (!fecha || !fecha.value) return 'Fecha/hora obligatoria.';
  return null;
}
function fillReport(){
  const d = fecha && fecha.value ? new Date(fecha.value) : new Date();
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  const code = generateCode(d);

  const repCod = $('#rep-codigo'); if (repCod) repCod.textContent = code;
  $('#rep-fecha').textContent = formatDateTime(fecha.value);
  const repApto = $('#rep-apto'); repApto.textContent = aptoSi && aptoSi.checked ? 'OPERATIVO' : (aptoNo && aptoNo.checked ? 'MANT. PREVENTIVO' : 'MANT. CORRECTIVO');
  repApto.style.color = aptoSi && aptoSi.checked ? 'green' : 'red';
  let displayCode = '';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    displayCode = codSelect.value;
  } else if (cod && cod.value) {
    displayCode = cod.value.toUpperCase();
  }
  $('#rep-cod').textContent = displayCode;
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

let informeGenerado = false; // Variable para rastrear si ya se generó el informe

if (btnGenerar) btnGenerar.addEventListener('click', ()=>{
  const err = validar();
  if (err) { alert(err); return; }
  const code = fillReport();
  document.title = code;
  if (btnImprimir) {
    btnImprimir.disabled = false;
    btnImprimir.classList.add('btn-highlight');
  }
  showToast('Informe generado. Abriendo diálogo de impresión...');
  saveDraft();
  informeGenerado = true;
  
  // Ejecutar la impresión con un breve retraso para que el título se actualice
  setTimeout(() => {
    window.print();
  }, 200);
});

// Modificar el botón de imprimir para que imprima directamente si el informe ya fue generado
if (btnImprimir) btnImprimir.addEventListener('click', ()=>{
  if (btnImprimir.disabled) {
    // Si el botón está deshabilitado, significa que el informe no ha sido generado
    alert('Primero debe generar el informe antes de imprimirlo.');
    return;
  }
  window.print();
  showToast('Abriendo el diálogo de impresión...');
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
  if (codSelect) codSelect.value = '';
  if (cod) {
    cod.disabled = false;
    cod.value = '';
    cod.classList.add('hidden');
  }
  updateLiveCode();
  if (btnImprimir) {
    btnImprimir.disabled = true;
    btnImprimir.classList.remove('btn-highlight');
  }
  showToast('Formulario reiniciado.');
});

// Inicial
updateLiveCode();

// ====== CHATBOT LOGIC ======
document.addEventListener('DOMContentLoaded', () => {
  const chatbotContainer = document.getElementById('chatbot-container');
  const chatbotToggler = document.getElementById('chatbot-toggler');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotBody = document.getElementById('chatbot-body');
  const chatbotOptions = document.getElementById('chatbot-options');

  if (!chatbotContainer || !chatbotToggler || !chatbotClose || !chatbotBody || !chatbotOptions) {
    console.error('Chatbot elements not found');
    return;
  }

  chatbotToggler.addEventListener('click', () => {
    chatbotContainer.classList.toggle('hidden');
  });

  chatbotClose.addEventListener('click', () => {
    chatbotContainer.classList.add('hidden');
  });

  const showHelp = (topic) => {
    // Clear previous dynamic content
    const dynamicContent = chatbotBody.querySelectorAll('.user-message, .bot-response');
    dynamicContent.forEach(el => el.remove());

    let userMessage = '';
    let botResponse = '';

    switch (topic) {
      case 'datos':
        userMessage = 'Ayuda con Datos generales';
        botResponse = `
          <p>¡Claro! Aquí te explico cómo llenar la sección de <strong>Datos Generales</strong>:</p>
          <ul>
            <li><strong>Código del vehículo:</strong> Ingresa el identificador único. Ej: <code>ECO62, ECO04, ECO05</code>, <code>CAM-01</code>.</li>
            <li><strong>Placa:</strong> Escribe la placa del vehículo. Ej: <code>ABC 1234</code>.</li>
            <li><strong>Kilometraje actual:</strong> Pon el número sin puntos ni comas. Ej: <code>123456</code>.</li>
            <li><strong>Conductor:</strong> Tu nombre completo.</li>
          </ul>
        `;
        break;
      case 'sistemas':
        userMessage = 'Ayuda con Evaluación de sistemas';
        botResponse = `
          <p>Para la <strong>Evaluación de Sistemas</strong>, sigue estos pasos:</p>
          <ol>
            <li>Revisa cada sistema listado en el vehículo.</li>
            <li>Selecciona un estado en el menú desplegable:</li>
            <li>- <strong>OK:</strong> Si funciona correctamente.</li>
            <li>- <strong>Atención:</strong> Si necesita revisión pero no es urgente.</li>
            <li>- <strong>Reparar:</strong> Si es una falla crítica que impide la operación.</li>
            <li>Si eliges 'Atención' o 'Reparar', <strong>escribe una breve nota</strong> en el campo de observación. Ej: <code>Luz de freno quemada</code>.</li>
          </ol>
        `;
        break;
      case 'fotos':
        userMessage = 'Ayuda con Evidencia fotográfica';
        botResponse = `
          <p>En <strong>Evidencia Fotográfica</strong>, debes subir dos fotos obligatorias:</p>
          <ul>
            <li>Usa tu celular o tablet para tomar las fotos.</li>
            <li><strong>Foto 1:</strong> Una foto general del vehículo, que se vea completo.</li>
            <li><strong>Foto 2:</strong> Una foto de un detalle específico, como el tablero con el kilometraje, una llanta, o cualquier novedad que hayas reportado.</li>
            <li>Presiona "Seleccionar archivo" y toma la foto o elígela de tu galería.</li>
          </ul>
        `;
        break;
      case 'estado':
        userMessage = 'Ayuda con Estado del vehículo';
        botResponse = `
          <p>El <strong>Estado del Vehículo</strong> define su condición final tras la revisión:</p>
          <ul>
            <li><strong style="color: #16a34a;">OPERATIVO:</strong> El vehículo se puede operar sin problemas.</li>
            <li><strong style="color: #ef4444;">MANT. PREVENTIVO:</strong> Se que necesita un cambio de aceite y filtros. El vehículo entrará al taller y no puede usarse hasta entonces.</li>
            <li><strong style="color: #ef4444;">MANT. CORRECTIVO:</strong> Se encontró una falla importante. El vehículo debe ir a mecánica para ser reparado y no debe usarse hasta entonces.</li>
          </ul>
        `;
        break;
    }

    // Append user message
    const userBubble = document.createElement('div');
    userBubble.className = 'user-message';
    userBubble.innerHTML = `<p>${userMessage}</p>`;
    chatbotBody.appendChild(userBubble);

    // Append bot response after a short delay
    setTimeout(() => {
      const botBubble = document.createElement('div');
      botBubble.className = 'bot-message bot-response';
      botBubble.innerHTML = botResponse;
      chatbotBody.appendChild(botBubble);
      // Scroll to the bottom
      chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }, 300);
  };

  chatbotOptions.addEventListener('click', (e) => {
    const target = e.target.closest('.chatbot-option');
    if (target && target.dataset.topic) {
      showHelp(target.dataset.topic);
    }
  });
});