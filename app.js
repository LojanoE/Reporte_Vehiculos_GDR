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

// ====== I18N ======
const I18N = {
  es: {
    pageTitle: 'RDV—GDR',
    section1Title: '1) Datos generales',
    codigoLabel: 'Código del vehículo',
    codigoPlaceholderSelect: 'Seleccionar código',
    codigoPlaceholderInput: 'Código',
    placaLabel: 'Placa',
    placaPlaceholder: 'ABC-1234',
    kmLabel: 'Kilometraje actual',
    kmPlaceholder: '123456',
    fechaLabel: 'Fecha y hora de la revisión',
    conductorLabel: 'Conductor responsable',
    conductorPlaceholder: 'Nombre completo',
    inspectorLabel: 'Inspector / Gestor GDR',
    ubicacionLabel: 'Ubicación',
    ubicacionPlaceholder: 'Ciudad / Frente / Taller',

    section2Title: '2) Evaluación de sistemas',
    evalNote: (attention, critical) => `Marca el estado de cada sistema. Si seleccionas <span class="text-yellow-400 font-semibold">${attention}</span> o <span class="text-red-400 font-semibold">${critical}</span>, agrega una observación.`,
    tableSistema: 'Sistema',
    tableEstado: 'Estado',
    tableObservacion: 'Observación (opcional)',
    estadoLegend: 'ESTADO',
    radioOperativo: 'OPERATIVO',
    radioPreventivo: 'MANT. PREVENTIVO',
    radioCorrectivo: 'MANT. CORRECTIVO',
    obsGeneralesLabel: 'Observaciones generales',
    obsGeneralesPlaceholder: 'Notas adicionales, recomendaciones, repuestos requeridos, etc.',

    section3Title: '3) Evidencia fotográfica (obligatoria)',
    foto1Label: 'Foto 1',
    foto1Alt: 'Vista previa 1',
    foto2Label: 'Foto 2',
    foto2Alt: 'Vista previa 2',

    btnGenerar: 'Generar informe',
    btnCompartir: 'Compartir',
    btnLimpiar: 'Limpiar',
    noteSugerencia: (code) => `Sugerencia: después de generar el informe, presiona el botón "Imprimir / Guardar PDF". Tu navegador usará el <span class="font-mono">${code}</span> como nombre sugerido del archivo.`,

    systems: [
      'Motor','Sistema de Transmisión','Dirección','Frenos','Suspensión','Elevavidrios',
      'Neumáticos','Sistema Eléctrico','Luces','Alarma de retroceso','Frenos', 'Refrigerante',
      'Hidráulico','Carrocería','Seguridad (extintor, conos)','Sistema de Combustible','Limpieza'
    ],
    statusOpts: [
      {v:'OK', t:'OK'},
      {v:'OBS', t:'Atención'},
      {v:'CRI', t:'Reparar'}
    ],
    sysNotePlaceholder: 'Observación / Nota (opcional)',
    sinPlaca: 'Sin placa',

    valCodigo: 'Código del vehículo es obligatorio.',
    valPlaca: 'La placa es obligatoria.',
    valKm: 'Kilometraje inválido.',
    valFecha: 'Fecha/hora obligatoria.',

    maintMotorProx: (kmDiff, target) => `⚠️ Mantenimiento de MOTOR próximo (${kmDiff} km para ${target})`,
    maintMotorPast: (kmDiff, target) => `🚫 Mantenimiento de MOTOR (target ${target}km) excedido por ${kmDiff}km. Contactar para actualizar.`,
    maintCajaProx: (kmDiff, target) => `⚠️ Mantenimiento de CAJA/CORONA próximo (${kmDiff} km para ${target})`,
    maintCajaPast: (kmDiff, target) => `🚫 Mantenimiento de CAJA/CORONA (target ${target}km) excedido por ${kmDiff}km. Contactar para actualizar: Estanislao L (LSM) o Kathy R.(LSM)`,

    toastGenerado: 'Informe generado. Abriendo diálogo de impresión...',
    alertImprimirPrimero: 'Primero debe generar el informe antes de imprimirlo.',
    toastAbriendoImpresion: 'Abriendo el diálogo de impresión...',
    confirmLimpiar: '¿Seguro que deseas limpiar el formulario y borrar el borrador guardado?',
    toastReiniciado: 'Formulario reiniciado.',

    chatbotHeader: 'Asistente de Ayuda',
    chatbotWelcome: '¡Hola! 👋 Estoy aquí para ayudarte a llenar el formulario. ¿Sobre qué sección necesitas ayuda?',
    chatbotOptDatos: '1) Datos generales',
    chatbotOptSistemas: '2) Evaluación de sistemas',
    chatbotOptEstado: '3) Estado del vehículo',
    chatbotOptFotos: '4) Evidencia fotográfica',

    helpDatosTitle: 'Ayuda con Datos generales',
    helpDatosBody: `
      <p>¡Claro! Aquí te explico cómo llenar la sección de <strong>Datos Generales</strong>:</p>
      <ul>
        <li><strong>Código del vehículo:</strong> Ingresa el identificador único. Ej: <code>ECO62, ECO04, ECO05</code>, <code>CAM-01</code>.</li>
        <li><strong>Placa:</strong> Escribe la placa del vehículo. Ej: <code>ABC 1234</code>.</li>
        <li><strong>Kilometraje actual:</strong> Pon el número sin puntos ni comas. Ej: <code>123456</code>.</li>
        <li><strong>Conductor:</strong> Tu nombre completo.</li>
      </ul>
    `,
    helpSistemasTitle: 'Ayuda con Evaluación de sistemas',
    helpSistemasBody: `
      <p>Para la <strong>Evaluación de Sistemas</strong>, sigue estos pasos:</p>
      <ol>
        <li>Revisa cada sistema listado en el vehículo.</li>
        <li>Selecciona un estado en el menú desplegable:</li>
        <li>- <strong>OK:</strong> Si funciona correctamente.</li>
        <li>- <strong>Atención:</strong> Si necesita revisión pero no es urgente.</li>
        <li>- <strong>Reparar:</strong> Si es una falla crítica que impide la operación.</li>
        <li>Si eliges 'Atención' o 'Reparar', <strong>escribe una breve nota</strong> en el campo de observación. Ej: <code>Luz de freno quemada</code>.</li>
      </ol>
    `,
    helpFotosTitle: 'Ayuda con Evidencia fotográfica',
    helpFotosBody: `
      <p>En <strong>Evidencia Fotográfica</strong>, debes subir dos fotos obligatorias:</p>
      <ul>
        <li>Usa tu celular o tablet para tomar las fotos.</li>
        <li><strong>Foto 1:</strong> Una foto general del vehículo, que se vea completo.</li>
        <li><strong>Foto 2:</strong> Una foto de un detalle específico, como el tablero con el kilometraje, una llanta, o cualquier novedad que hayas reportado.</li>
        <li>Presiona "Seleccionar archivo" y toma la foto o elígela de tu galería.</li>
      </ul>
    `,
    helpEstadoTitle: 'Ayuda con Estado del vehículo',
    helpEstadoBody: `
      <p>El <strong>Estado del Vehículo</strong> define su condición final tras la revisión:</p>
      <ul>
        <li><strong style="color: #16a34a;">OPERATIVO:</strong> El vehículo se puede operar sin problemas.</li>
        <li><strong style="color: #ef4444;">MANT. PREVENTIVO:</strong> Se que necesita un cambio de aceite y filtros. El vehículo entrará al taller y no puede usarse hasta entonces.</li>
        <li><strong style="color: #ef4444;">MANT. CORRECTIVO:</strong> Se encontró una falla importante. El vehículo debe ir a mecánica para ser reparado y no debe usarse hasta entonces.</li>
      </ul>
    `,
  },
  zh: {
    pageTitle: 'RDV—GDR',
    section1Title: '1) 基本信息',
    codigoLabel: '车辆编号',
    codigoPlaceholderSelect: '选择编号',
    codigoPlaceholderInput: '编号',
    placaLabel: '车牌',
    placaPlaceholder: 'ABC-1234',
    kmLabel: '当前里程',
    kmPlaceholder: '123456',
    fechaLabel: '检查日期和时间',
    conductorLabel: '负责驾驶员',
    conductorPlaceholder: '全名',
    inspectorLabel: '检查员 / GDR管理员',
    ubicacionLabel: '位置',
    ubicacionPlaceholder: '城市 / 作业面 / 车间',

    section2Title: '2) 系统评估',
    evalNote: (attention, critical) => `标记每个系统的状态。如果选择 <span class="text-yellow-400 font-semibold">${attention}</span> 或 <span class="text-red-400 font-semibold">${critical}</span>，请添加备注。`,
    tableSistema: '系统',
    tableEstado: '状态',
    tableObservacion: '备注（可选）',
    estadoLegend: '状态',
    radioOperativo: '可运行',
    radioPreventivo: '预防性维护',
    radioCorrectivo: '纠正性维护',
    obsGeneralesLabel: '一般备注',
    obsGeneralesPlaceholder: '额外备注、建议、所需备件等',

    section3Title: '3) 照片证据（必填）',
    foto1Label: '照片 1',
    foto1Alt: '预览 1',
    foto2Label: '照片 2',
    foto2Alt: '预览 2',

    btnGenerar: '生成报告',
    btnCompartir: '分享',
    btnLimpiar: '清空',
    noteSugerencia: (code) => `建议：生成报告后，点击“打印/保存PDF”按钮。浏览器将使用 <span class="font-mono">${code}</span> 作为建议的文件名。`,

    systems: [
      '发动机','传动系统','转向系统','刹车','悬挂系统','电动车窗',
      '轮胎','电气系统','灯光','倒车警报','刹车','冷却液',
      '液压系统','车身','安全（灭火器、锥形桶）','燃油系统','清洁'
    ],
    statusOpts: [
      {v:'OK', t:'正常'},
      {v:'OBS', t:'注意'},
      {v:'CRI', t:'需维修'}
    ],
    sysNotePlaceholder: '备注 / 说明（可选）',
    sinPlaca: '无车牌',

    valCodigo: '车辆编号为必填项。',
    valPlaca: '车牌为必填项。',
    valKm: '里程无效。',
    valFecha: '日期/时间为必填项。',

    maintMotorProx: (kmDiff, target) => `⚠️ 发动机保养即将到期（距${target}还有${kmDiff}公里）`,
    maintMotorPast: (kmDiff, target) => `🚫 发动机保养（目标${target}公里）已超期${kmDiff}公里。请联系更新。`,
    maintCajaProx: (kmDiff, target) => `⚠️ 变速箱/冠状齿轮保养即将到期（距${target}还有${kmDiff}公里）`,
    maintCajaPast: (kmDiff, target) => `🚫 变速箱/冠状齿轮保养（目标${target}公里）已超期${kmDiff}公里。请联系更新：Estanislao L (LSM) 或 Kathy R.(LSM)`,

    toastGenerado: '报告已生成。正在打开打印对话框...',
    alertImprimirPrimero: '打印前必须先生成报告。',
    toastAbriendoImpresion: '正在打开打印对话框...',
    confirmLimpiar: '确定要清空表单并删除已保存的草稿吗？',
    toastReiniciado: '表单已重置。',

    chatbotHeader: '帮助助手',
    chatbotWelcome: '你好！👋 我在这里帮助你填写表单。你需要哪个部分的帮助？',
    chatbotOptDatos: '1) 基本信息',
    chatbotOptSistemas: '2) 系统评估',
    chatbotOptEstado: '3) 车辆状态',
    chatbotOptFotos: '4) 照片证据',

    helpDatosTitle: '基本信息帮助',
    helpDatosBody: `
      <p>当然！以下是如何填写<strong>基本信息</strong>部分的说明：</p>
      <ul>
        <li><strong>车辆编号：</strong>输入唯一标识符。例如：<code>ECO62、ECO04、ECO05</code>、<code>CAM-01</code>。</li>
        <li><strong>车牌：</strong>输入车辆车牌。例如：<code>ABC 1234</code>。</li>
        <li><strong>当前里程：</strong>输入不带标点符号的数字。例如：<code>123456</code>。</li>
        <li><strong>驾驶员：</strong>你的全名。</li>
      </ul>
    `,
    helpSistemasTitle: '系统评估帮助',
    helpSistemasBody: `
      <p>进行<strong>系统评估</strong>时，请按以下步骤操作：</p>
      <ol>
        <li>检查车辆上列出的每个系统。</li>
        <li>在下拉菜单中选择状态：</li>
        <li>- <strong>正常：</strong>如果运行正常。</li>
        <li>- <strong>注意：</strong>如果需要检查但不紧急。</li>
        <li>- <strong>需维修：</strong>如果是阻止运行的严重故障。</li>
        <li>如果选择“注意”或“需维修”，<strong>请在备注栏中写下简短说明</strong>。例如：<code>刹车灯烧毁</code>。</li>
      </ol>
    `,
    helpFotosTitle: '照片证据帮助',
    helpFotosBody: `
      <p>在<strong>照片证据</strong>部分，你必须上传两张必填照片：</p>
      <ul>
        <li>使用手机或平板电脑拍照。</li>
        <li><strong>照片1：</strong>车辆全貌照片。</li>
        <li><strong>照片2：</strong>特定细节照片，如里程表、轮胎或你报告的任何异常。</li>
        <li>点击“选择文件”并从图库中拍照或选择照片。</li>
      </ul>
    `,
    helpEstadoTitle: '车辆状态帮助',
    helpEstadoBody: `
      <p><strong>车辆状态</strong>定义了检查后的最终状况：</p>
      <ul>
        <li><strong style="color: #16a34a;">可运行：</strong>车辆可以正常运行。</li>
        <li><strong style="color: #ef4444;">预防性维护：</strong>需要更换机油和滤清器。车辆将进入车间，在此之前不能使用。</li>
        <li><strong style="color: #ef4444;">纠正性维护：</strong>发现重大故障。车辆必须送修，在此之前不能使用。</li>
      </ul>
    `,
  },
  report: {
    repOperativo: 'OPERATIVO',
    repPreventivo: 'MANT. PREVENTIVO',
    repCorrectivo: 'MANT. CORRECTIVO',
    repStatusOK: 'OK',
    repStatusOBS: 'Atención',
    repStatusCRI: 'Crítico',
    repNoteEmpty: '—',
    repObsEmpty: '—',
    repConductorEmpty: '—',
    repInspectorEmpty: '—',
    repFoto1Cap: 'Foto 1',
    repFoto2Cap: 'Foto 2',
    repFirmaConductor: 'Firma Conductor',
    repFirmaInspector: 'Firma Inspector',
    repEvaluacionTitle: 'Evaluación de sistemas',
    repObsTitle: 'Observaciones generales',
    repTableSistema: 'Sistema',
    repTableEstado: 'Estado',
    repTableObservacion: 'Observación',
    repFechaHoraTH: 'Fecha y hora',
    repEstadoTH: 'ESTADO',
    repCodVehTH: 'Código vehículo',
    repPlacaTH: 'Placa',
    repKmTH: 'Kilometraje',
    repCodReporteTH: 'Cod. Reporte',
    repConductorTH: 'Conductor',
    repInspectorTH: 'Inspector',
  }
};

let currentLang = localStorage.getItem('RDV_GDR_LANG') || 'es';

function t(key, ...args) {
  const val = I18N[currentLang]?.[key];
  if (typeof val === 'function') return val(...args);
  if (val !== undefined) return val;
  // fallback a español
  const fallback = I18N.es[key];
  if (typeof fallback === 'function') return fallback(...args);
  return fallback || key;
}

function tr(key) {
  return I18N.report[key] || key;
}

function setLanguage(lang) {
  if (!I18N[lang]) lang = 'es';
  currentLang = lang;
  localStorage.setItem('RDV_GDR_LANG', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'es';
  translateUI();
  rebuildSystemsTable();
  updateLangButton();
  // Update live code display if it exists
  updateLiveCode();
}

function translateUI() {
  // Static texts in index.html via data-i18n attributes
  $$('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val !== undefined) {
      if (key === 'evalNote' || key === 'noteSugerencia') {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    }
  });

  // Chatbot header and welcome
  const chatbotHeader = $('#chatbot-header span');
  if (chatbotHeader) chatbotHeader.textContent = t('chatbotHeader');
  const chatbotWelcome = $('#chatbot-body .bot-message p');
  if (chatbotWelcome) chatbotWelcome.textContent = t('chatbotWelcome');

  // Chatbot options
  const opts = $$('#chatbot-options .chatbot-option');
  if (opts[0]) opts[0].textContent = t('chatbotOptDatos');
  if (opts[1]) opts[1].textContent = t('chatbotOptSistemas');
  if (opts[2]) opts[2].textContent = t('chatbotOptEstado');
  if (opts[3]) opts[3].textContent = t('chatbotOptFotos');

  // Image alts
  if (prev1) prev1.alt = t('foto1Alt');
  if (prev2) prev2.alt = t('foto2Alt');

  // Select placeholder
  if (codSelect) {
    const firstOpt = codSelect.querySelector('option[disabled]');
    if (firstOpt) firstOpt.textContent = t('codigoPlaceholderSelect');
  }

  // Inputs placeholders
  if (cod) cod.placeholder = t('codigoPlaceholderInput');
  if (placa) placa.placeholder = t('placaPlaceholder');
  if (km) km.placeholder = t('kmPlaceholder');
  if (conductor) conductor.placeholder = t('conductorPlaceholder');
  if (inspector) inspector.placeholder = t('inspectorPlaceholder');
  if (ubicacion) ubicacion.placeholder = t('ubicacionPlaceholder');
  if (obsGeneral) obsGeneral.placeholder = t('obsGeneralesPlaceholder');
}

function updateLangButton() {
  const btn = $('#lang-toggle');
  if (!btn) return;
  btn.innerHTML = currentLang === 'es'
    ? '<span>ES</span><span class="lang-sep">/</span><span class="lang-muted">中文</span>'
    : '<span class="lang-muted">ES</span><span class="lang-sep">/</span><span>中文</span>';
  btn.title = currentLang === 'es' ? 'Cambiar a chino' : 'Switch to Spanish';
}

// ====== Data Arrays ======
function getSystems() { return t('systems'); }
function getStatusOpts() { return t('statusOpts'); }

// ====== Build systems table ======
function buildSystemsTable() {
  const tbody = $('#sysTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const systems = getSystems();
  const opts = getStatusOpts();
  const notePlaceholder = t('sysNotePlaceholder');
  systems.forEach((name, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-2">${name}</td>
      <td class="p-2">
        <select class="sys-select" id="sys-${i}-sel" data-sys="${name}" data-sys-es="${I18N.es.systems[i]}">
          ${opts.map(o => `<option value="${o.v}">${o.t}</option>`).join('')}
        </select>
      </td>
      <td class="p-2"><input id="sys-${i}-note" class="sys-note" placeholder="${notePlaceholder}"></td>`;
    tbody.appendChild(tr);
  });
  // Re-attach listeners
  $$('select[id^=sys-]').forEach(el => el.addEventListener('change', ()=>{
    const anyCritical = $$('select[id^=sys-]').some(s=> s.value==='CRI');
    if (anyCritical && aptoNo) aptoNo.checked = true;
    saveDraft();
  }));
  $$('input[id^=sys-][id$=note]').forEach(el => el.addEventListener('input', saveDraft));
}

function rebuildSystemsTable() {
  // Save current values
  const currentValues = $$('select[id^=sys-]').map(s => ({val: s.value, note: $(`#${s.id.replace('-sel','-note')}`)?.value || ''}));
  buildSystemsTable();
  // Restore values
  currentValues.forEach((it, i) => {
    const s = document.querySelector(`#sys-${i}-sel`);
    const n = document.querySelector(`#sys-${i}-note`);
    if (s) s.value = it.val;
    if (n) n.value = it.note;
  });
}

// Build initially
buildSystemsTable();

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

// Mapa de códigos de vehículo a placas (valores fijos en español para el reporte)
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
  'ECO23': { motor: 88376, caja: 93271 },
  'ECO62': { motor: 31652, caja: 41652 },
  'ECO26': { motor: 134833, caja: 144044 },
  'ECO70': { motor: 20000, caja: 20000 },
  'ECO71': { motor: 15000, caja: 20000 },
  'ECO36': { motor: 214540, caja: 200679 },
  'M01':   { motor: 172841, caja: 182562 },
};
const ALERT_RANGE = 4000;

const AVAILABLE_CODES = Object.keys(vehiclePlateMap);

// Defaults
if (fecha) fecha.value = nowLocal();
if (cod) {
  cod.disabled = true;
  cod.classList.add('hidden');
}

// === Generador del código RDV: AÑOMES-CODVEH-RDV-0DÍA
function generateCode(baseDate){
  const d = baseDate || (fecha && fecha.value ? new Date(fecha.value) : new Date());
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  let veh = 'GDR';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    veh = codSelect.value;
  } else if (cod && cod.value) {
    veh = cod.value.trim().toUpperCase();
  }
  const version = d.getHours() >= 18 ? 'V1' : 'V0';
  return `${y}${m}-${veh}-RDV-0${day}-${version}`;
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
  if (!vehicleAlerts) return;

  const currentKm = parseInt(km.value, 10);
  if (isNaN(currentKm)) return;

  const msgs = [];
  const pastDueMsgs = [];

  if (vehicleAlerts.motor) {
    const motorTarget = vehicleAlerts.motor;
    if (currentKm >= (motorTarget - ALERT_RANGE) && currentKm <= motorTarget) {
      msgs.push(t('maintMotorProx', motorTarget - currentKm, motorTarget));
    } else if (currentKm > motorTarget + 100) {
      pastDueMsgs.push(t('maintMotorPast', currentKm - motorTarget, motorTarget));
    }
  }

  if (vehicleAlerts.caja) {
    const cajaTarget = vehicleAlerts.caja;
    if (currentKm >= (cajaTarget - ALERT_RANGE) && currentKm <= cajaTarget) {
      msgs.push(t('maintCajaProx', cajaTarget - currentKm, cajaTarget));
    } else if (currentKm > cajaTarget + 100) {
      pastDueMsgs.push(t('maintCajaPast', currentKm - cajaTarget, cajaTarget));
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
  const sys = $$('select[id^=sys-]').map(s => ({name: s.dataset.sysEs, val: s.value, note: $(`#${s.id.replace('-sel','-note')}`).value || ''}));
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
    sys, foto1Data, foto2Data, _t: new Date().toLocaleString(),
    lang: currentLang
  };
  try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){}
}
function loadDraft(){
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
      return;
    }
  } catch(_) {}

  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    // Restore language preference if saved in draft
    if (d.lang && I18N[d.lang]) {
      currentLang = d.lang;
      localStorage.setItem('RDV_GDR_LANG', currentLang);
    }
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

  if (!vehicleCode) return t('valCodigo');
  if (!placa || !placa.value.trim()) return t('valPlaca');
  if (!km || !km.value || Number(km.value) < 0) return t('valKm');
  if (!fecha || !fecha.value) return t('valFecha');
  return null;
}
function fillReport(){
  const d = fecha && fecha.value ? new Date(fecha.value) : new Date();
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  const code = generateCode(d);

  const repCod = $('#rep-codigo'); if (repCod) repCod.textContent = code;
  $('#rep-fecha').textContent = formatDateTime(fecha.value);
  const repApto = $('#rep-apto');
  repApto.textContent = aptoSi && aptoSi.checked ? tr('repOperativo') : (aptoNo && aptoNo.checked ? tr('repPreventivo') : tr('repCorrectivo'));
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
  $('#rep-arch').textContent = generateCode();
  const repObs = $('#rep-obs'); if (repObs) repObs.textContent = (obsGeneral && obsGeneral.value || tr('repObsEmpty'));
  $('#rep-conductor').textContent = conductor && conductor.value || tr('repConductorEmpty');
  $('#rep-inspector').textContent = inspector && inspector.value || tr('repInspectorEmpty');

  $('#rep-img1').src = foto1Data;
  $('#rep-img2').src = foto2Data;

  const body = $('#rep-sys-body');
  body.innerHTML = '';
  $$('select[id^=sys-]').forEach(s => {
    const note = $(`#${s.id.replace('-sel','-note')}`).value || '';
    const trEl = document.createElement('tr');
    const statusText = s.value==='OK' ? tr('repStatusOK') : (s.value==='OBS' ? tr('repStatusOBS') : tr('repStatusCRI'));
    trEl.innerHTML = `<td>${s.dataset.sysEs}</td><td>${statusText}</td><td>${note || tr('repNoteEmpty')}</td>`;
    body.appendChild(trEl);
  });

  if (liveCodigo) liveCodigo.textContent = code;
  return code;
}

let informeGenerado = false;

if (btnGenerar) btnGenerar.addEventListener('click', ()=>{
  const err = validar();
  if (err) { alert(err); return; }
  const code = fillReport();
  document.title = code;
  if (btnImprimir) {
    btnImprimir.disabled = false;
    btnImprimir.classList.add('btn-highlight');
  }
  showToast(t('toastGenerado'));
  saveDraft();
  informeGenerado = true;

  setTimeout(() => {
    window.print();
  }, 200);
});

if (btnImprimir) btnImprimir.addEventListener('click', ()=>{
  if (btnImprimir.disabled) {
    alert(t('alertImprimirPrimero'));
    return;
  }
  window.print();
  showToast(t('toastAbriendoImpresion'));
});
// Remove duplicate listener from original code
// if (btnImprimir) btnImprimir.addEventListener('click', ()=>{ ... }); // removed duplicate

if (btnLimpiar) btnLimpiar.addEventListener('click', ()=>{
  if (!confirm(t('confirmLimpiar'))) return;
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
  showToast(t('toastReiniciado'));
});

// Inicial
updateLiveCode();

// ====== CHATBOT LOGIC ======
document.addEventListener('DOMContentLoaded', () => {
  // Language toggle button
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      setLanguage(currentLang === 'es' ? 'zh' : 'es');
    });
  }
  updateLangButton();
  translateUI();

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
    const dynamicContent = chatbotBody.querySelectorAll('.user-message, .bot-response');
    dynamicContent.forEach(el => el.remove());

    let userMessage = '';
    let botResponse = '';

    switch (topic) {
      case 'datos':
        userMessage = t('helpDatosTitle');
        botResponse = t('helpDatosBody');
        break;
      case 'sistemas':
        userMessage = t('helpSistemasTitle');
        botResponse = t('helpSistemasBody');
        break;
      case 'fotos':
        userMessage = t('helpFotosTitle');
        botResponse = t('helpFotosBody');
        break;
      case 'estado':
        userMessage = t('helpEstadoTitle');
        botResponse = t('helpEstadoBody');
        break;
    }

    const userBubble = document.createElement('div');
    userBubble.className = 'user-message';
    userBubble.innerHTML = `<p>${userMessage}</p>`;
    chatbotBody.appendChild(userBubble);

    setTimeout(() => {
      const botBubble = document.createElement('div');
      botBubble.className = 'bot-message bot-response';
      botBubble.innerHTML = botResponse;
      chatbotBody.appendChild(botBubble);
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
