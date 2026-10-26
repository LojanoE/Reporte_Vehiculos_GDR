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

    section2Title: '2) Inspección del vehículo',
    evalNote: 'Marca el código de cada ítem. Si eliges un código distinto de <span class="text-emerald-400 font-semibold">OK</span>, escribe una observación (obligatoria).',
    cedulaLabel: 'Cédula',
    induccionLabel: 'Posee inducción',
    tipoLicLabel: 'Tipo de licencia',
    cadLicLabel: 'Caducidad de licencia',
    puntosLicLabel: 'Puntos de licencia',
    anioLabel: 'Año',
    tonelajeLabel: 'Tonelaje',
    vigMatLabel: 'Vigencia de matrícula',
    vigRevLabel: 'Vigencia de revisión vehicular',
    btnTodoOk: 'Todo OK',
    sectionNA: 'No aplica a este vehículo',
    warnLicVencida: (f) => `⚠️ La licencia del conductor está VENCIDA (${f}).`,
    warnLicPorVencer: (d, f) => `⚠️ La licencia del conductor vence en ${d} día(s) (${f}).`,
    warnMatVencida: (f) => `⚠️ La matrícula del vehículo está VENCIDA (${f}).`,
    warnMatPorVencer: (d, f) => `⚠️ La matrícula vence en ${d} día(s) (${f}).`,
    warnRevVencida: (f) => `⚠️ La revisión vehicular está VENCIDA (${f}).`,
    warnRevPorVencer: (d, f) => `⚠️ La revisión vehicular vence en ${d} día(s) (${f}).`,
    warnSinInduccion: '⚠️ El conductor no posee inducción.',
    valObs: (name) => `Escribe una observación para: ${name}.`,
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
    fotoCamera: '📷 Cámara',
    fotoGallery: '🖼️ Galería',

    btnGenerar: 'Generar informe',
    btnCompartir: 'Compartir',
    btnLimpiar: 'Limpiar',
    noteSugerencia: (code) => `Sugerencia: después de generar el informe, presiona el botón "Imprimir / Guardar PDF". Tu navegador usará el <span class="font-mono">${code}</span> como nombre sugerido del archivo.`,

    systems: [
      'Motor','Sistema de Transmisión','Dirección','Frenos','Suspensión','Elevavidrios',
      'Neumáticos','Sistema Eléctrico','Luces','Alarma de retroceso','Refrigerante',
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
    valKmRetrocede: (last, f) => `⛔ El kilometraje es MENOR al último registrado (${last.toLocaleString()} km el ${f}). Verifica que no sea un tipeo.`,
    valKmSalto: (diff, last) => `⚠️ Salto de ${diff.toLocaleString()} km respecto al último registro (${last.toLocaleString()} km). Verifica que no sea un tipeo.`,
    confirmKmSospechoso: (msg) => `${msg}\n\n¿Guardar el informe de todos modos?\n\nAceptar = se guarda y el kilometraje queda MARCADO COMO DUDOSO (se excluye de los cálculos de km del análisis).\nCancelar = volver y corregir el kilometraje.`,
    toastKmSospechoso: '⚠️ Informe guardado con el kilometraje marcado como dudoso.',
    valFecha: 'Fecha/hora obligatoria.',
    valFoto: 'Las dos fotos son obligatorias.',

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
        <li>Presiona <strong>"Cámara"</strong> para tomar la foto al instante, o <strong>"Galería"</strong> para elegir una imagen ya guardada.</li>
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

    section2Title: '2) 车辆检查',
    evalNote: '为每个项目选择代码。如果选择非 <span class="text-emerald-400 font-semibold">OK</span> 的代码，必须填写备注。',
    cedulaLabel: '身份证号',
    induccionLabel: '已完成入职培训',
    tipoLicLabel: '驾照类型',
    cadLicLabel: '驾照到期日',
    puntosLicLabel: '驾照积分',
    anioLabel: '年份',
    tonelajeLabel: '吨位',
    vigMatLabel: '行驶证有效期',
    vigRevLabel: '车辆年检有效期',
    btnTodoOk: '全部正常',
    sectionNA: '不适用于此车辆',
    warnLicVencida: (f) => `⚠️ 驾驶员驾照已过期（${f}）。`,
    warnLicPorVencer: (d, f) => `⚠️ 驾驶员驾照将在 ${d} 天后到期（${f}）。`,
    warnMatVencida: (f) => `⚠️ 车辆行驶证已过期（${f}）。`,
    warnMatPorVencer: (d, f) => `⚠️ 行驶证将在 ${d} 天后到期（${f}）。`,
    warnRevVencida: (f) => `⚠️ 车辆年检已过期（${f}）。`,
    warnRevPorVencer: (d, f) => `⚠️ 车辆年检将在 ${d} 天后到期（${f}）。`,
    warnSinInduccion: '⚠️ 驾驶员未完成入职培训。',
    valObs: (name) => `请填写备注：${name}。`,
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
    fotoCamera: '📷 相机',
    fotoGallery: '🖼️ 相册',

    btnGenerar: '生成报告',
    btnCompartir: '分享',
    btnLimpiar: '清空',
    noteSugerencia: (code) => `建议：生成报告后，点击“打印/保存PDF”按钮。浏览器将使用 <span class="font-mono">${code}</span> 作为建议的文件名。`,

    systems: [
      '发动机','传动系统','转向系统','刹车','悬挂系统','电动车窗',
      '轮胎','电气系统','灯光','倒车警报','冷却液',
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
    valKmRetrocede: (last, f) => `⛔ 里程低于上次记录（${f} 为 ${last.toLocaleString()} 公里）。请确认是否输入有误。`,
    valKmSalto: (diff, last) => `⚠️ 与上次记录（${last.toLocaleString()} 公里）相差 ${diff.toLocaleString()} 公里，请确认是否输入有误。`,
    confirmKmSospechoso: (msg) => `${msg}\n\n仍要保存报告吗？\n\n确定 = 保存，并将里程标记为“存疑”（分析中的里程统计将排除该读数）。\n取消 = 返回修改里程。`,
    toastKmSospechoso: '⚠️ 报告已保存，里程已标记为存疑。',
    valFecha: '日期/时间为必填项。',
    valFoto: '两张照片均为必填项。',

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
        <li>点击<strong>“相机”</strong>立即拍照，或点击<strong>“相册”</strong>选择已保存的图片。</li>
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

// ====== Inspección (formato SE-PR-009-FOR-02 V03) ======
const SECTIONS = window.INSPECTION_SECTIONS || [];
const CODES = window.INSPECTION_CODES || [];
const CODE_TO_ESTADO = window.INSPECTION_CODE_TO_ESTADO || {};
const FORMATO_VERSION = window.INSPECTION_FORMAT
  ? `${window.INSPECTION_FORMAT.codigo} V${window.INSPECTION_FORMAT.version}` : 'SE-PR-009-FOR-02 V03';
const escHtml = (v) => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function codeLabel(c) { return `${c.v} – ${currentLang === 'zh' ? c.zh : c.es}`; }

function renderCodesLegend() {
  const el = $('#codesLegend');
  if (!el) return;
  el.textContent = CODES.map(codeLabel).join('   ·   ');
}

// Selects de ítems aplicables al vehículo (los no aplicables quedan deshabilitados)
function activeSelects() { return $$('select.sys-select').filter(s => !s.disabled); }

function setSelectEstado(sel) {
  sel.dataset.estado = CODE_TO_ESTADO[sel.value] || 'OK';
}

function buildSystemsTable() {
  const host = $('#sysSections');
  if (!host) return;
  host.innerHTML = '';
  let k = 0;
  SECTIONS.forEach((sec, si) => {
    const det = document.createElement('details');
    det.className = 'sys-section';
    det.dataset.sec = sec.id;
    if (sec.aplica) det.dataset.aplica = sec.aplica;
    if (si === 0) det.open = true;
    const title = currentLang === 'zh' ? sec.zh : sec.es;
    const opts = CODES.map(c => `<option value="${c.v}">${escHtml(codeLabel(c))}</option>`).join('');
    const rows = sec.items.map(it => {
      const name = currentLang === 'zh' ? it.zh : it.es;
      const i = k++;
      return `<div class="sys-row grid gap-2 p-2 border-t border-white/10" data-item-aplica="${it.aplica || ''}">
        <div class="text-sm">${escHtml(name)}</div>
        <select class="sys-select" id="sys-${i}-sel" data-sys="${escHtml(name)}" data-sys-es="${escHtml(it.es)}" data-sec="${sec.id}" data-estado="OK">${opts}</select>
        <input id="sys-${i}-note" class="sys-note sys-note-wide" placeholder="${escHtml(t('sysNotePlaceholder'))}">
      </div>`;
    }).join('');
    det.innerHTML = `<summary class="cursor-pointer select-none p-2 font-semibold bg-white/5 rounded-lg">${escHtml(title)}</summary>
      <div class="sys-body"><div class="p-2 flex items-center gap-2">
        <button type="button" class="btn-todo-ok text-xs px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40" data-sec="${sec.id}">${escHtml(t('btnTodoOk'))}</button>
      </div>${rows}</div>`;
    host.appendChild(det);
  });
  applyApplicability();
}

// Delegación de eventos (los selects se reconstruyen al cambiar de idioma)
(function wireSections() {
  const host = document.getElementById('sysSections');
  if (!host) return;
  host.addEventListener('change', (e) => {
    const sel = e.target.closest && e.target.closest('select.sys-select');
    if (!sel) return;
    setSelectEstado(sel);
    if (activeSelects().some(s => CODE_TO_ESTADO[s.value] === 'CRI') && aptoNo) aptoNo.checked = true;
    saveDraft();
  });
  host.addEventListener('input', (e) => {
    if (e.target.classList && e.target.classList.contains('sys-note')) saveDraft();
  });
  host.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.btn-todo-ok');
    if (!btn) return;
    $$(`select.sys-select[data-sec="${btn.dataset.sec}"]`).filter(s => !s.disabled).forEach(s => { s.value = 'OK'; setSelectEstado(s); });
    saveDraft();
  });
})();

// Valores por nombre_es (sobreviven a la reconstrucción por idioma o por vehículo)
function captureSysValues() {
  const m = {};
  $$('select.sys-select').forEach(s => {
    m[s.dataset.sysEs] = { val: s.value, note: ($(`#${s.id.replace('-sel','-note')}`) || {}).value || '' };
  });
  return m;
}
function restoreSysValues(m) {
  if (!m) return;
  $$('select.sys-select').forEach(s => {
    const it = m[s.dataset.sysEs];
    if (!it) return;
    let v = it.val || 'OK';
    if (v === 'OBS') v = 'VE'; // borradores del formato anterior
    if (v === 'CRI') v = 'FA';
    s.value = CODE_TO_ESTADO[v] ? v : 'OK';
    setSelectEstado(s);
    const n = $(`#${s.id.replace('-sel','-note')}`);
    if (n) n.value = it.note || '';
  });
}

function rebuildSystemsTable() {
  const saved = captureSysValues();
  const openSecs = $$('details.sys-section[open]').map(d => d.dataset.sec);
  buildSystemsTable();
  restoreSysValues(saved);
  $$('details.sys-section').forEach(d => { d.open = openSecs.includes(d.dataset.sec); });
  renderCodesLegend();
}

// Oculta/deshabilita grúa y pértiga según el vehículo elegido
function applyApplicability() {
  const veh = vehicleInfo(currentVehicleCode());
  $$('details.sys-section').forEach(det => {
    const secOk = det.dataset.aplica !== 'GRUA' || (veh && veh.tipo === 'GRUA');
    det.classList.toggle('hidden', !secOk);
    $$('.sys-row', det).forEach(row => {
      const itemOk = row.dataset.itemAplica !== 'PERTIGA' || (veh && veh.aplica_pertiga);
      const on = secOk && itemOk;
      row.classList.toggle('hidden', !on);
      const sel = $('select', row);
      if (sel) sel.disabled = !on;
    });
  });
}

// ====== Catálogos (vehículos y conductores) ======
function vehicleInfo(code) {
  if (!code) return null;
  return ((window.CATALOG && window.CATALOG.vehicles) || []).find(v => v.codigo_vehiculo === code && v.activo !== false) || null;
}
function vehicleCodes() {
  return ((window.CATALOG && window.CATALOG.vehicles) || []).filter(v => v.activo !== false).map(v => v.codigo_vehiculo);
}
function driverInfo(name) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return null;
  return ((window.CATALOG && window.CATALOG.drivers) || []).find(d => d.activo !== false && (d.nombre || '').trim().toLowerCase() === n) || null;
}

// Form elements
const form = $('#rdvForm');
const codSelect = $('#codSelect'), cod = $('#cod'), placa = $('#placa'), km = $('#km'), fecha = $('#fecha');
const conductor = $('#conductor'), inspector = $('#inspector'), ubicacion = $('#ubicacion');
const obsGeneral = $('#obsGeneral');
const prev1 = $('#prev1'), prev2 = $('#prev2');
const aptoSi = $('#aptoSi'), aptoNo = $('#aptoNo');
const liveCodigo = $('#liveCodigo');
const btnGenerar = $('#btnGenerar'), btnImprimir = $('#btnImprimir'), btnLimpiar = $('#btnLimpiar');
const kmWarning = $('#kmWarning');

// Mantenimiento: umbrales en constants.js
const MAINTENANCE_ALERTS = window.MAINTENANCE_ALERTS || {};
const ALERT_RANGE = window.ALERT_RANGE || 4000;

// Campos del encabezado que se rellenan desde los catálogos
const cedula = $('#cedula'), induccion = $('#induccion'), tipoLic = $('#tipoLic'), cadLic = $('#cadLic'), puntosLic = $('#puntosLic');
const anio = $('#anio'), tonelaje = $('#tonelaje'), vigMat = $('#vigMat'), vigRev = $('#vigRev');
const catalogWarn = $('#catalogWarn');
const HEADER_FIELDS = [cedula, tipoLic, cadLic, puntosLic, anio, tonelaje, vigMat, vigRev];

buildSystemsTable();
renderCodesLegend();

// Select de vehículos y lista de conductores desde el catálogo
function populateVehicleSelect() {
  if (!codSelect) return;
  const current = codSelect.value;
  const codes = vehicleCodes();
  if (!codes.length) return;
  Array.from(codSelect.querySelectorAll('option')).forEach(o => { if (!o.disabled && o.value !== 'OTRO') o.remove(); });
  codes.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    codSelect.appendChild(o);
  });
  if (current && codes.includes(current)) codSelect.value = current;
}
function populateDriversList() {
  const dl = $('#driversList');
  if (!dl) return;
  dl.innerHTML = '';
  ((window.CATALOG && window.CATALOG.drivers) || []).filter(d => d.activo !== false).forEach(d => {
    const o = document.createElement('option');
    o.value = d.nombre;
    dl.appendChild(o);
  });
}
function fillFromVehicle() {
  const v = vehicleInfo(currentVehicleCode());
  if (!v) { applyApplicability(); return; }
  if (placa) placa.value = v.placa || '';
  if (anio) anio.value = v.anio != null ? v.anio : '';
  if (tonelaje) tonelaje.value = v.tonelaje || '';
  if (vigMat) vigMat.value = v.vigencia_matricula || '';
  if (vigRev) vigRev.value = v.vigencia_revision || '';
  applyApplicability();
  checkCatalogWarnings();
}
function fillFromDriver() {
  const d = driverInfo(conductor && conductor.value);
  if (!d) { checkCatalogWarnings(); return; }
  if (cedula) cedula.value = d.cedula || '';
  if (induccion) induccion.checked = !!d.posee_induccion;
  if (tipoLic) tipoLic.value = d.tipo_licencia || '';
  if (cadLic) cadLic.value = d.caducidad_licencia || '';
  if (puntosLic) puntosLic.value = d.puntos_licencia != null ? d.puntos_licencia : '';
  checkCatalogWarnings();
}

// Avisos no bloqueantes de vencimientos (≤30 días)
function fmtDate(iso) {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function daysUntil(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const target = new Date(+m[1], +m[2] - 1, +m[3]);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}
function checkCatalogWarnings() {
  if (!catalogWarn) return;
  const msgs = [];
  const check = (iso, vencida, porVencer) => {
    const d = daysUntil(iso);
    if (d === null) return;
    if (d < 0) msgs.push(t(vencida, fmtDate(iso)));
    else if (d <= 30) msgs.push(t(porVencer, d, fmtDate(iso)));
  };
  if (conductor && conductor.value.trim()) {
    check(cadLic && cadLic.value, 'warnLicVencida', 'warnLicPorVencer');
    if (induccion && !induccion.checked && driverInfo(conductor.value)) msgs.push(t('warnSinInduccion'));
  }
  if (currentVehicleCode()) {
    check(vigMat && vigMat.value, 'warnMatVencida', 'warnMatPorVencer');
    check(vigRev && vigRev.value, 'warnRevVencida', 'warnRevPorVencer');
  }
  catalogWarn.innerHTML = msgs.map(m => `<div>${escHtml(m)}</div>`).join('');
  catalogWarn.classList.toggle('hidden', !msgs.length);
}
populateVehicleSelect();
populateDriversList();

// Defaults
if (fecha) fecha.value = nowLocal();
if (cod) {
  cod.disabled = true;
  cod.classList.add('hidden');
}

// === Generador del código RDV: AÑOMES-CODVEH-RDV-0DÍA-VN (versión auto-incremental)
let versionCache = { prefix: null, version: 0 };
let lastGeneratedCode = null;

function codePrefixFor(d) {
  const y = pad2(d.getFullYear() % 100), m = pad2(d.getMonth()+1), day = pad2(d.getDate());
  let veh = 'GDR';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    veh = codSelect.value;
  } else if (cod && cod.value) {
    veh = cod.value.trim().toUpperCase();
  }
  return `${y}${m}-${veh}-RDV-0${day}-`;
}

function versionFromCode(code, prefix) {
  if (!code || !code.startsWith(prefix)) return null;
  const m = code.slice(prefix.length).match(/^V(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

async function fetchNextVersion(prefix) {
  let max = -1;
  // 1) Supabase (reportes ya guardados de ese vehículo/día)
  if (window.SUPABASE_READY && navigator.onLine && window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient
        .from('reports')
        .select('cod_reporte')
        .ilike('cod_reporte', `${prefix}V%`);
      if (!error && Array.isArray(data)) {
        data.forEach(r => {
          const v = versionFromCode(r.cod_reporte, prefix);
          if (v !== null) max = Math.max(max, v);
        });
      }
    } catch (e) { /* sin conexión o error: continuar con otras fuentes */ }
  }
  // 2) Cola offline (IndexedDB)
  if (typeof getPendingReports === 'function') {
    try {
      const pending = await getPendingReports();
      pending.forEach(p => {
        const v = versionFromCode(p.header && p.header.cod_reporte, prefix);
        if (v !== null) max = Math.max(max, v);
      });
    } catch (e) {}
  }
  // 3) Contador local por prefijo (fallback offline)
  try {
    const lsVal = parseInt(localStorage.getItem('RDV_GDR_VER_' + prefix) || '-1', 10);
    if (!isNaN(lsVal)) max = Math.max(max, lsVal);
  } catch (e) {}
  return max + 1;
}

async function refreshVersionFor(prefix) {
  const next = await fetchNextVersion(prefix);
  versionCache = { prefix, version: next };
  return next;
}

function bumpVersion(prefix) {
  if (versionCache.prefix === prefix) versionCache.version += 1;
  else versionCache = { prefix, version: versionCache.version + 1 };
  try { localStorage.setItem('RDV_GDR_VER_' + prefix, String(versionCache.version)); } catch (e) {}
}

async function generateCode(baseDate){
  const d = baseDate || (fecha && fecha.value ? new Date(fecha.value) : new Date());
  const prefix = codePrefixFor(d);
  if (versionCache.prefix !== prefix) {
    await refreshVersionFor(prefix);
  }
  return `${prefix}V${versionCache.version}`;
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

// === Coherencia de kilometraje (detección de tipeos contra el último registro) ===
// No bloquea el guardado: si el dato es incoherente se pide confirmación y el
// reporte se guarda con km_sospechoso = true para que el análisis lo excluya.
let kmCoherenceSuspect = false;
let kmCoherenceMsg = '';
const LAST_KM_TTL_MS = 2 * 60 * 1000;
const lastKmCache = {}; // vehicleCode -> { data: { kilometraje, fecha_hora } | null, at: ms }

function currentVehicleCode() {
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') return codSelect.value;
  if (cod && cod.value) return cod.value.trim().toUpperCase();
  return '';
}

async function fetchLastKm(vehicleCode) {
  const cached = lastKmCache[vehicleCode];
  if (cached && (Date.now() - cached.at) < LAST_KM_TTL_MS) return cached.data;
  let result = null;
  if (window.SUPABASE_READY && navigator.onLine && typeof getLastKmFromSupabase === 'function') {
    try {
      const res = await getLastKmFromSupabase(vehicleCode);
      if (res.ok) {
        result = res.data || null;
        lastKmCache[vehicleCode] = { data: result, at: Date.now() };
      }
    } catch (e) { /* sin conexión: se omite la verificación y no se cachea */ }
  }
  return result;
}

async function checkKmCoherence() {
  kmCoherenceSuspect = false;
  kmCoherenceMsg = '';
  if (!kmWarning || !km) return;
  const code = currentVehicleCode();
  const currentKm = parseInt(km.value, 10);
  if (!code || isNaN(currentKm)) return;

  const last = await fetchLastKm(code);
  if (!last || last.kilometraje == null) return;

  // El usuario pudo cambiar vehículo/km mientras se consultaba
  if (currentVehicleCode() !== code || parseInt(km.value, 10) !== currentKm) return;

  const diff = currentKm - last.kilometraje;
  const f = new Date(last.fecha_hora).toLocaleDateString();
  if (diff < 0) {
    kmCoherenceSuspect = true;
    kmCoherenceMsg = t('valKmRetrocede', last.kilometraje, f);
  } else if (diff > (window.KM_MAX_JUMP || 1500)) {
    kmCoherenceSuspect = true;
    kmCoherenceMsg = t('valKmSalto', diff, last.kilometraje);
  }

  if (kmCoherenceMsg) {
    if (!kmWarning.textContent.includes(kmCoherenceMsg)) {
      kmWarning.textContent = kmWarning.textContent
        ? kmWarning.textContent + ' | ' + kmCoherenceMsg
        : kmCoherenceMsg;
    }
    kmWarning.classList.remove('hidden');
    kmWarning.style.color = diff < 0 ? '#f87171' : '';
    showToast(kmCoherenceMsg);
  }
}

const updateLiveCode = () => {
  const d = fecha && fecha.value ? new Date(fecha.value) : new Date();
  const prefix = codePrefixFor(d);
  const show = (v) => { if (liveCodigo) liveCodigo.textContent = `${prefix}V${v}`; };
  if (versionCache.prefix === prefix) {
    show(versionCache.version);
    return `${prefix}V${versionCache.version}`;
  }
  show('…');
  refreshVersionFor(prefix).then(v => {
    if (codePrefixFor(fecha && fecha.value ? new Date(fecha.value) : new Date()) === prefix) show(v);
  });
  return null;
};

// Events
if (cod) cod.addEventListener('input', e => { cod.value = cod.value.toUpperCase(); fillFromVehicle(); updateLiveCode(); checkMaintenance(); checkKmCoherence(); saveDraft(); });
if (codSelect) codSelect.addEventListener('change', e => {
  if (codSelect.value === 'OTRO') {
    cod.disabled = false;
    cod.classList.remove('hidden');
    cod.focus();
  } else {
    cod.value = codSelect.value;
    cod.disabled = true;
    cod.classList.add('hidden');
    fillFromVehicle();
    updateLiveCode();
    checkMaintenance();
    checkKmCoherence();
    saveDraft();
  }
});
if (fecha) fecha.addEventListener('change', ()=> { updateLiveCode(); saveDraft(); });

// Umbrales de mantenimiento y último km desde Supabase (editables en el dashboard).
// Se repite al volver a la app, al recuperar la red o al restaurar la pestaña,
// para no quedarse con datos viejos en celulares que mantienen la página viva.
let lastLiveRefresh = 0;
async function refreshLiveData(force) {
  const now = Date.now();
  if (!force && now - lastLiveRefresh < 60 * 1000) return;
  lastLiveRefresh = now;
  Object.keys(lastKmCache).forEach(k => delete lastKmCache[k]);
  if (typeof window.refreshMaintenanceAlerts === 'function') {
    try { await window.refreshMaintenanceAlerts(); } catch (e) {}
  }
  if (typeof window.refreshCatalogs === 'function') {
    try {
      await window.refreshCatalogs();
      populateVehicleSelect();
      populateDriversList();
      applyApplicability();
      checkCatalogWarnings();
    } catch (e) {}
  }
  checkMaintenance();
  checkKmCoherence();
}
refreshLiveData(true);

window.addEventListener('online', () => refreshLiveData(true));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { refreshLiveData(false); checkAppVersion(); }
});
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  // Restaurada desde bfcache: si el informe ya se generó, el formulario queda limpio
  if (informeGenerado) {
    try { localStorage.removeItem(KEY); } catch (err) {}
    resetFormState();
  }
  refreshLiveData(true);
  checkAppVersion();
});

// Si el navegador sirvió JS viejo desde caché, se detecta con version.json y se recarga una vez
const APP_VERSION = '261026-03';
let lastVersionCheck = 0;
async function checkAppVersion() {
  const now = Date.now();
  if (now - lastVersionCheck < 3 * 60 * 1000 || !navigator.onLine) return;
  lastVersionCheck = now;
  try {
    const res = await fetch('version.json?t=' + now, { cache: 'no-store' });
    if (!res.ok) return;
    const { v } = await res.json();
    if (v && v !== APP_VERSION && sessionStorage.getItem('RDV_GDR_RELOADED_FOR') !== v) {
      sessionStorage.setItem('RDV_GDR_RELOADED_FOR', v);
      sessionStorage.setItem('RDV_GDR_AUTO_RELOAD', '1');
      saveDraft();
      location.reload();
    }
  } catch (e) { /* sin red: se omite */ }
}
checkAppVersion();

[placa, km, conductor, inspector, ubicacion, obsGeneral].forEach(el => el && el.addEventListener('input', () => { if(el === km) { checkMaintenance(); checkKmCoherence(); } saveDraft(); }));
// Conductor del catálogo: al coincidir el nombre se rellenan cédula, inducción y licencia
if (conductor) conductor.addEventListener('change', () => { fillFromDriver(); saveDraft(); });
if (conductor) conductor.addEventListener('input', () => { if (driverInfo(conductor.value)) fillFromDriver(); });
HEADER_FIELDS.forEach(el => el && el.addEventListener('input', () => { checkCatalogWarnings(); saveDraft(); }));
if (induccion) induccion.addEventListener('change', () => { checkCatalogWarnings(); saveDraft(); });

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

const setupFotoInput = (selector, imgEl, setData) => {
  const el = $(selector);
  if (!el) return;
  el.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      readAndPreview(e.target.files[0], imgEl, (d) => { setData(d); saveDraft(); });
    }
  });
};

setupFotoInput('#foto1-camera', prev1, (d) => foto1Data = d);
setupFotoInput('#foto1-gallery', prev1, (d) => foto1Data = d);
setupFotoInput('#foto2-camera', prev2, (d) => foto2Data = d);
setupFotoInput('#foto2-gallery', prev2, (d) => foto2Data = d);

// Draft
const KEY = 'RDV_GDR_DRAFT';
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000; // un borrador más viejo se descarta
let informeGenerado = false;

// Deja el formulario en blanco (sin tocar el borrador guardado)
function resetFormState(){
  if (form) form.reset();
  foto1Data = null; foto2Data = null;
  if (prev1) prev1.classList.add('hidden');
  if (prev2) prev2.classList.add('hidden');
  if (fecha) fecha.value = nowLocal();
  if (codSelect) codSelect.value = '';
  if (cod) {
    cod.disabled = false;
    cod.value = '';
    cod.classList.add('hidden');
  }
  informeGenerado = false;
  kmCoherenceSuspect = false;
  kmCoherenceMsg = '';
  if (kmWarning) { kmWarning.textContent = ''; kmWarning.classList.add('hidden'); }
  $$('select.sys-select').forEach(setSelectEstado);
  applyApplicability();
  checkCatalogWarnings();
  updateLiveCode();
  if (btnImprimir) {
    btnImprimir.disabled = true;
    btnImprimir.classList.remove('btn-highlight');
  }
}

function saveDraft(){
  const sys = captureSysValues();
  const hdr = {
    cedula: cedula && cedula.value || '', induccion: !!(induccion && induccion.checked),
    tipoLic: tipoLic && tipoLic.value || '', cadLic: cadLic && cadLic.value || '', puntosLic: puntosLic && puntosLic.value || '',
    anio: anio && anio.value || '', tonelaje: tonelaje && tonelaje.value || '',
    vigMat: vigMat && vigMat.value || '', vigRev: vigRev && vigRev.value || ''
  };
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
    sys, hdr, foto1Data, foto2Data, _t: new Date().toLocaleString(), _ts: Date.now(),
    generado: informeGenerado,
    lang: currentLang
  };
  try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch(e){}
}
function loadDraft(){
  try {
    const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    const isReload = nav ? nav.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
    // Recarga automática por versión nueva: se conserva el borrador
    let autoReload = false;
    try {
      autoReload = sessionStorage.getItem('RDV_GDR_AUTO_RELOAD') === '1';
      sessionStorage.removeItem('RDV_GDR_AUTO_RELOAD');
    } catch(_) {}
    if (isReload && !autoReload) {
      try { localStorage.removeItem(KEY); } catch(e){}
      resetFormState();
      return;
    }
  } catch(_) {}

  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    // Borrador de un informe ya generado o demasiado viejo: no se restaura
    // (evita mostrar el kilometraje anterior en una inspección nueva)
    if (d.generado === true || !d._ts || (Date.now() - d._ts) > DRAFT_MAX_AGE_MS) {
      try { localStorage.removeItem(KEY); } catch(e){}
      resetFormState();
      return;
    }
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
      if (vehicleCodes().includes(d.cod)) {
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
    if (d.hdr) {
      if (cedula) cedula.value = d.hdr.cedula || '';
      if (induccion) induccion.checked = !!d.hdr.induccion;
      if (tipoLic) tipoLic.value = d.hdr.tipoLic || '';
      if (cadLic) cadLic.value = d.hdr.cadLic || '';
      if (puntosLic) puntosLic.value = d.hdr.puntosLic || '';
      if (anio) anio.value = d.hdr.anio || '';
      if (tonelaje) tonelaje.value = d.hdr.tonelaje || '';
      if (vigMat) vigMat.value = d.hdr.vigMat || '';
      if (vigRev) vigRev.value = d.hdr.vigRev || '';
    }
    applyApplicability();
    if (d.sys) {
      if (Array.isArray(d.sys)) {
        // borrador del formato anterior (lista por nombre_es)
        const m = {};
        d.sys.forEach(it => { if (it && it.name) m[it.name] = it; });
        restoreSysValues(m);
      } else {
        restoreSysValues(d.sys);
      }
    }
    checkCatalogWarnings();
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
  for (const sel of activeSelects()) {
    if (sel.value === 'OK') continue;
    const n = $(`#${sel.id.replace('-sel','-note')}`);
    if (!n || !n.value.trim()) {
      const det = sel.closest('details');
      if (det) det.open = true;
      if (n) n.focus();
      return t('valObs', sel.dataset.sys);
    }
  }
  if (!foto1Data || !foto2Data) return t('valFoto');
  return null;
}
async function fillReport(){
  const d = fecha && fecha.value ? new Date(fecha.value) : new Date();
  const code = await generateCode(d);
  lastGeneratedCode = code;

  const setTxt = (sel, v) => { const el = $(sel); if (el) el.textContent = v; };
  const aprueba = !!(aptoSi && aptoSi.checked);
  const repApto = $('#rep-apto');
  repApto.textContent = aprueba ? tr('repOperativo') : (aptoNo && aptoNo.checked ? tr('repPreventivo') : tr('repCorrectivo'));
  repApto.style.color = aprueba ? 'green' : 'red';
  setTxt('#rep-aprueba', aprueba ? 'APRUEBA' : 'NO APRUEBA');
  setTxt('#rep-fecha', formatDateTime(fecha.value));
  setTxt('#rep-conductor', conductor && conductor.value || tr('repConductorEmpty'));
  setTxt('#rep-cedula', cedula && cedula.value || '—');
  setTxt('#rep-induccion', induccion && induccion.checked ? 'SÍ' : 'NO');
  setTxt('#rep-tipolic', tipoLic && tipoLic.value || '—');
  setTxt('#rep-cadlic', `${fmtDate(cadLic && cadLic.value)} / ${puntosLic && puntosLic.value !== '' ? puntosLic.value : '—'} pts`);
  let displayCode = '';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    displayCode = codSelect.value;
  } else if (cod && cod.value) {
    displayCode = cod.value.toUpperCase();
  }
  setTxt('#rep-cod', displayCode);
  setTxt('#rep-placa', (placa && placa.value || '').toUpperCase());
  setTxt('#rep-anio', `${anio && anio.value || '—'} / ${tonelaje && tonelaje.value || '—'}`);
  setTxt('#rep-km', Number(km && km.value || 0).toLocaleString());
  setTxt('#rep-vigmat', fmtDate(vigMat && vigMat.value));
  setTxt('#rep-vigrev', fmtDate(vigRev && vigRev.value));
  setTxt('#rep-arch', code);
  const insp = inspector && inspector.value || tr('repInspectorEmpty');
  setTxt('#rep-inspector', insp);
  setTxt('#rep-conductor2', conductor && conductor.value || tr('repConductorEmpty'));
  setTxt('#rep-legend', CODES.map(c => `${c.v} = ${c.es}`).join('   ·   '));

  $('#rep-img1').src = foto1Data;
  $('#rep-img2').src = foto2Data;

  // Tablas por sección (siempre en español); solo ítems aplicables al vehículo.
  // Como en el formato: ítem | ESTADO. Las notas por ítem van a Observaciones.
  const itemNotes = [];
  const secHtml = (sec) => {
    const sels = $$(`select.sys-select[data-sec="${sec.id}"]`).filter(x => !x.disabled);
    if (!sels.length) return '';
    const rows = sels.map(x => {
      const note = ($(`#${x.id.replace('-sel','-note')}`).value || '').trim();
      if (note) itemNotes.push(`${x.dataset.sysEs} (${x.value}): ${note}`);
      return `<tr><td>${escHtml(x.dataset.sysEs)}</td><td class="rep-code">${x.value}</td></tr>`;
    }).join('');
    return `<table class="rep-table rep-sec"><thead><tr><th>${escHtml(sec.es)}</th><th class="rep-code">ESTADO</th></tr></thead><tbody>${rows}</tbody></table>`;
  };
  let left = '', right = '';
  SECTIONS.forEach(sec => {
    if (['A', 'B', 'GRUA'].includes(sec.id)) left += secHtml(sec);
    else right += secHtml(sec);
  });
  $('#rep-left').innerHTML = left;
  $('#rep-right').innerHTML = right;
  const gen = (obsGeneral && obsGeneral.value || '').trim();
  setTxt('#rep-obs', [gen, ...itemNotes].filter(Boolean).join('\n') || tr('repObsEmpty'));

  if (liveCodigo) liveCodigo.textContent = code;
  return code;
}

function getReportPayload() {
  const code = lastGeneratedCode || liveCodigo?.textContent || '';
  const version = code.includes('-') ? code.slice(code.lastIndexOf('-') + 1) : 'V0';

  let vehicleCode = '';
  if (codSelect && codSelect.value && codSelect.value !== 'OTRO') {
    vehicleCode = codSelect.value;
  } else if (cod && cod.value) {
    vehicleCode = cod.value.trim().toUpperCase();
  }

  const estadoOperativo = aptoSi && aptoSi.checked ? tr('repOperativo')
    : (aptoNo && aptoNo.checked ? tr('repPreventivo') : tr('repCorrectivo'));

  const systems = activeSelects().map(s => {
    const note = $(`#${s.id.replace('-sel','-note')}`)?.value || '';
    return {
      nombre_es: s.dataset.sysEs,
      nombre_ui: s.dataset.sys,
      estado: CODE_TO_ESTADO[s.value] || 'OK',
      observacion: note,
      seccion: s.dataset.sec,
      codigo: s.value || 'OK'
    };
  });
  const orNull = (el) => (el && el.value ? el.value : null);
  const toInt = (el) => { const n = parseInt(el && el.value, 10); return isNaN(n) ? null : n; };

  return {
    header: {
      cod_reporte: code,
      fecha_hora: fecha.value ? new Date(fecha.value).toISOString() : new Date().toISOString(),
      estado_operativo: estadoOperativo,
      codigo_vehiculo: vehicleCode,
      placa: placa && placa.value || '',
      kilometraje: parseInt(km && km.value || '0', 10),
      conductor: conductor && conductor.value || '',
      inspector: inspector && inspector.value || '',
      ubicacion: ubicacion && ubicacion.value || '',
      obs_general: obsGeneral && obsGeneral.value || '',
      archivo: code,
      version: version,
      cedula: cedula && cedula.value || '',
      posee_induccion: !!(induccion && induccion.checked),
      tipo_licencia: tipoLic && tipoLic.value || '',
      caducidad_licencia: orNull(cadLic),
      puntos_licencia: toInt(puntosLic),
      anio: toInt(anio),
      tonelaje: tonelaje && tonelaje.value || '',
      vigencia_matricula: orNull(vigMat),
      vigencia_revision: orNull(vigRev),
      formato_version: FORMATO_VERSION,
      km_sospechoso: !!kmMarcadoSospechoso,
      km_nota: kmMarcadoSospechoso ? kmCoherenceMsg : ''
    },
    systems,
    photos: [
      { index: 1, tiene_foto: !!foto1Data },
      { index: 2, tiene_foto: !!foto2Data }
    ]
  };
}

// El usuario confirmó guardar con un kilometraje incoherente en este informe
let kmMarcadoSospechoso = false;

if (btnGenerar) btnGenerar.addEventListener('click', async ()=>{
  const err = validar();
  if (err) { alert(err); return; }

  // Kilometraje incoherente: no se bloquea el informe. Se confirma con el
  // usuario y, si acepta, el reporte queda marcado como km dudoso.
  await checkKmCoherence();
  kmMarcadoSospechoso = false;
  if (kmCoherenceSuspect) {
    if (!confirm(t('confirmKmSospechoso', kmCoherenceMsg))) return;
    kmMarcadoSospechoso = true;
  }

  const code = await fillReport();
  document.title = code;
  if (btnImprimir) {
    btnImprimir.disabled = false;
    btnImprimir.classList.add('btn-highlight');
  }
  showToast(t('toastGenerado'));
  informeGenerado = true;
  saveDraft();

  // Incrementar versión para el siguiente reporte del mismo vehículo/día
  const dNow = fecha && fecha.value ? new Date(fecha.value) : new Date();
  bumpVersion(codePrefixFor(dNow));

  // Guardar en Supabase o cola offline
  if (typeof saveReportOnlineOrQueue === 'function') {
    try {
      const payload = getReportPayload();
      const res = await saveReportOnlineOrQueue(payload);
      if (res.synced) {
        showToast('Reporte guardado en la nube');
      } else if (res.queued) {
        showToast('Sin conexión: reporte guardado localmente. Se sincronizará automáticamente.');
      }
      if (kmMarcadoSospechoso) showToast(t('toastKmSospechoso'));
      // El km recién guardado pasa a ser la última lectura confiable
      if (!kmMarcadoSospechoso && payload.header && payload.header.kilometraje) {
        lastKmCache[payload.header.codigo_vehiculo] = {
          data: { kilometraje: payload.header.kilometraje, fecha_hora: new Date().toISOString() },
          at: Date.now()
        };
      }
    } catch (e) {
      console.warn('No se pudo guardar en Supabase:', e);
    }
  }

  setTimeout(() => {
    window.print();
  }, 500);
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
  resetFormState();
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
