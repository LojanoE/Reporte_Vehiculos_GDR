/* ============================================================
   Constants compartidas entre app.js y dashboard.js
   ============================================================ */

(function () {
  'use strict';

  // Umbrales de mantenimiento por vehículo (motor y caja/corona).
  // Valores de respaldo: la fuente real es la tabla maintenance_alerts de
  // Supabase, editable desde el dashboard. Se usan mientras carga o sin conexión.
  window.MAINTENANCE_ALERTS = {
    'ECO23': { motor: 98268, caja: 113268 },
    'ECO62': { motor: 36668, caja: 41652 },
    'ECO26': { motor: 134833, caja: 144044 },
    'ECO70': { motor: 29996, caja: 30006 },
    'ECO71': { motor: 20007, caja: 35007 },
    'ECO36': { motor: 228170, caja: 243170 },
    'M01':   { motor: 172841, caja: 182562 },
  };

  /**
   * Reemplaza los umbrales manteniendo la MISMA referencia de objeto:
   * app.js y dashboard.js capturan window.MAINTENANCE_ALERTS en una const al
   * cargar, así que reasignarlo no llegaría a esos módulos.
   * @param {Object} map - { ECO23: {motor, caja}, ... }
   */
  window.applyMaintenanceAlerts = function (map) {
    const target = window.MAINTENANCE_ALERTS;
    Object.keys(target).forEach(k => { delete target[k]; });
    Object.keys(map || {}).forEach(k => { target[k] = map[k]; });
    return target;
  };

  // Último mapa recibido de Supabase en este dispositivo: es mejor respaldo
  // offline que los valores de arriba, que pueden estar desactualizados.
  try {
    const saved = JSON.parse(localStorage.getItem('RDV_GDR_MAINT_ALERTS') || 'null');
    if (saved && saved.map && Object.keys(saved.map).length) window.applyMaintenanceAlerts(saved.map);
  } catch (e) { /* localStorage no disponible o JSON inválido: se usan los de respaldo */ }

  window.ALERT_RANGE = 4000;

  // Mapa de códigos de vehículo a placas
  window.VEHICLE_PLATE_MAP = {
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

  // Marca por vehículo (hoja "Datos de camionetas" del formulario ECSA)
  window.VEHICLE_BRAND_MAP = {
    'ECO04': 'FORD',
    'ECO05': 'FORD',
    'ECO06': 'FORD',
    'ECO23': 'FORD',
    'ECO26': 'FORD',
    'ECO36': 'FORD',
    'ECO62': 'JAC',
    'ECO70': 'JAC',
    'ECO71': 'JAC'
  };

  // ====== Solicitud de mantenimiento ECSA ======
  window.REQUEST_DEPT_DEFAULT = 'Departamento de Gestión de Depósitos de Relaves 尾矿库管理部';
  window.REQUEST_TIPO_DEFAULT = 'MTTO PREVENTIVO/CORRECTIVO 预防性/纠正性维护';
  window.REQUEST_TALLER_DEFAULT = 'Taller de mantenimiento para maquinarias y vehículos 工程机械与车辆维修车间';
  window.REQUEST_ROLES = {
    responsable_dept: 'Responsable de dept. del solicitante 设备报修单位负责人',
    solicitante: 'Solicitante de reparación 设备报修人',
    inspector_ge: 'Inspector del equipo 设备检查人',
    responsable_mtto: 'Responsable del dpto. de mantenimiento 维修部门负责人',
    aprobador: 'Aprobado por 审批人'
  };
  // Respaldo offline: la fuente real es la tabla request_signers de Supabase.
  window.REQUEST_SIGNERS_DEFAULT = {
    responsable_dept: ['Ing. César Vásquez', 'Ing. Andrés Vásquez', 'Ing. Hernán Gavilanes', 'Ing. Frans Celi', 'Zhang Congsong'],
    solicitante: ['Ing. Frans Celi', 'Ing. Jorge Beltrán', 'Ing. Juan Silverio'],
    inspector_ge: ['Hu Nan'],
    responsable_mtto: ['Li Lingzhi'],
    aprobador: ['Wang Hongliang/Dai Jianggen']
  };

  // ====== Formato de inspección SE-PR-009-FOR-02 V03 ======
  window.INSPECTION_FORMAT = { codigo: 'SE-PR-009-FOR-02', version: '03' };

  // Códigos del formato → estado agregado que usan dashboard y reportes.
  window.INSPECTION_CODES = [
    { v: 'OK', es: 'Bien', zh: '正常', estado: 'OK' },
    { v: 'CO', es: 'Corregir', zh: '纠正', estado: 'OBS' },
    { v: 'VE', es: 'Verificar', zh: '核查', estado: 'OBS' },
    { v: 'LI', es: 'Limpiar', zh: '清洁', estado: 'OBS' },
    { v: 'FA', es: 'Con falla', zh: '故障', estado: 'CRI' },
    { v: 'RE', es: 'Reparar', zh: '维修', estado: 'CRI' },
    { v: 'CA', es: 'Cambiar', zh: '更换', estado: 'CRI' }
  ];
  window.INSPECTION_CODE_TO_ESTADO = {};
  window.INSPECTION_CODES.forEach(c => { window.INSPECTION_CODE_TO_ESTADO[c.v] = c.estado; });

  // Fuente única de los ítems. `es` es el nombre que se guarda (nombre_es) y debe
  // ser único en todo el formato. aplica: 'GRUA' (solo camión grúa) o 'PERTIGA'
  // (solo vehículos con pértiga). La sección H no es del formato: conserva los
  // sistemas mecánicos del RDV anterior para no perder el histórico.
  window.INSPECTION_SECTIONS = [
    { id: 'A', es: 'A - Sistema eléctrico', zh: 'A - 电气系统', items: [
      { es: 'Faros delanteros', zh: '前大灯' },
      { es: 'Luces delanteras', zh: '前灯' },
      { es: 'Luces direccionales delanteras', zh: '前转向灯' },
      { es: 'Luces traseras', zh: '尾灯' },
      { es: 'Luces direccionales traseras', zh: '后转向灯' },
      { es: 'Luces de freno', zh: '刹车灯' },
      { es: 'Luces de retro (reversa)', zh: '倒车灯' },
      { es: 'Luces de parqueo', zh: '双闪灯' },
      { es: 'Bocinas/alarma acústica de retroceso', zh: '喇叭/倒车警报' },
      { es: 'Instrumental', zh: '仪表' },
      { es: 'Limpiaparabrisas, motor de plumas', zh: '雨刮器及电机' },
      { es: 'Desempañador', zh: '除雾器' },
      { es: 'Calefacción', zh: '暖风' }
    ] },
    { id: 'B', es: 'B - Cabina / chapería / protección', zh: 'B - 驾驶室/车身/防护', items: [
      { es: 'Panel de instrumentos', zh: '仪表盘' },
      { es: 'Puertas y asientos', zh: '车门和座椅' },
      { es: 'Manijas/trabas/alzavidrios', zh: '门把手/门锁/升降器' },
      { es: 'Espejos retrovisores', zh: '后视镜' },
      { es: 'Cinturones de seguridad', zh: '安全带' },
      { es: 'Vidrio parabrisas (sin trizaduras ni polarizados)', zh: '挡风玻璃（无裂纹、无贴膜）' },
      { es: 'Vidrio posterior', zh: '后挡玻璃' },
      { es: 'Ventilador', zh: '风扇' },
      { es: 'Parasoles', zh: '遮阳板' },
      { es: 'Apoya cabezas', zh: '头枕' },
      { es: 'Cable pasa corriente', zh: '搭电线' },
      { es: 'Pértiga (tajo de mina/relavera/mirador norte)', zh: '安全旗杆（矿坑/尾矿库/北观景台）', aplica: 'PERTIGA' }
    ] },
    { id: 'GRUA', es: 'Otros (aplica para camión grúa)', zh: '其他（适用于吊车）', aplica: 'GRUA', items: [
      { es: 'Brazo y estructura', zh: '吊臂和结构' },
      { es: 'Ganchos', zh: '吊钩' },
      { es: 'Poleas', zh: '滑轮' },
      { es: 'Cable', zh: '钢丝绳' },
      { es: 'Estabilizador', zh: '支腿' }
    ] },
    { id: 'C', es: 'C - Frenos', zh: 'C - 制动', items: [
      { es: 'Frenos: funcionamiento', zh: '制动：功能' },
      { es: 'Frenos: efectividad', zh: '制动：效能' },
      { es: 'Freno de seguridad (mano)', zh: '手刹' }
    ] },
    { id: 'D', es: 'D - Neumáticos', zh: 'D - 轮胎', items: [
      { es: 'Neumáticos: labrado', zh: '轮胎：花纹' },
      { es: 'Neumáticos: sin cortes, ni rayaduras', zh: '轮胎：无割伤、无划痕' },
      { es: 'Neumáticos: otros', zh: '轮胎：其他' }
    ] },
    { id: 'E', es: 'E - Sistema de combustible', zh: 'E - 燃油系统', items: [
      { es: 'Estado de mangueras', zh: '软管状态' },
      { es: 'Estanqueidad', zh: '密封性' },
      { es: 'Emanaciones al habitáculo', zh: '驾驶室内异味/泄漏' },
      { es: 'Estado de la tapa de combustible', zh: '油箱盖状态' }
    ] },
    { id: 'F', es: 'F - Dotación de equipo', zh: 'F - 设备配备', items: [
      { es: 'Gata (tijera/hidráulico)', zh: '千斤顶（剪式/液压）' },
      { es: 'Llave / tuerca P / ruedas', zh: '扳手/轮胎螺母' },
      { es: 'Rueda de emergencia', zh: '备胎' },
      { es: 'Conos de 70 cm (mín. 2; camión grúa 4)', zh: '70厘米锥形桶（至少2个；吊车4个）' },
      { es: 'Tacos de poliuretano y/o madera según su peso', zh: '聚氨酯/木制楔块' },
      { es: 'Extintor PQS (10 lib. camioneta - 20 lib. camión)', zh: '干粉灭火器（皮卡10磅/卡车20磅）' },
      { es: 'Kit de contingencia para hidrocarburos', zh: '油品泄漏应急包' },
      { es: 'Botiquín de primeros auxilios', zh: '急救箱' },
      { es: 'Medidor de presión', zh: '气压表' },
      { es: 'Linterna de mano', zh: '手电筒' },
      { es: 'Sticker de identificación de la empresa', zh: '公司标识贴' }
    ] },
    { id: 'G', es: 'G - Dotación EPP conductor', zh: 'G - 驾驶员个人防护装备', items: [
      { es: 'Ropa de trabajo con cinta reflectiva', zh: '带反光条工作服' },
      { es: 'Zapatos de seguridad', zh: '安全鞋' },
      { es: 'Gafas oscuras o blancas', zh: '护目镜（深色或透明）' },
      { es: 'Guantes', zh: '手套' },
      { es: 'Chaleco reflectivo naranja', zh: '橙色反光背心' },
      { es: 'Casco amarillo', zh: '黄色安全帽' }
    ] },
    { id: 'H', es: 'H - Mecánica GDR (adicional)', zh: 'H - GDR机械检查（附加）', extra: true, items: [
      { es: 'Motor', zh: '发动机' },
      { es: 'Sistema de Transmisión', zh: '传动系统' },
      { es: 'Dirección', zh: '转向系统' },
      { es: 'Suspensión', zh: '悬挂系统' },
      { es: 'Refrigerante', zh: '冷却液' },
      { es: 'Hidráulico', zh: '液压系统' },
      { es: 'Limpieza', zh: '清洁' }
    ] }
  ];

  // Sistemas del RDV anterior (16) → sección nueva, para agrupar el histórico.
  window.LEGACY_SYSTEM_SECTION = {
    'Motor': 'H', 'Sistema de Transmisión': 'H', 'Dirección': 'H', 'Suspensión': 'H',
    'Refrigerante': 'H', 'Hidráulico': 'H', 'Limpieza': 'H',
    'Sistema Eléctrico': 'A', 'Luces': 'A', 'Alarma de retroceso': 'A',
    'Elevavidrios': 'B', 'Carrocería': 'B',
    'Frenos': 'C', 'Neumáticos': 'D', 'Sistema de Combustible': 'E',
    'Seguridad (extintor, conos)': 'F'
  };

  /** Sección ('A'…'H') de un ítem guardado: usa `seccion` o, en reportes viejos, el mapa legado. */
  window.getSectionForSystem = function (nombreEs, seccion) {
    if (seccion) return seccion;
    if (window.LEGACY_SYSTEM_SECTION[nombreEs]) return window.LEGACY_SYSTEM_SECTION[nombreEs];
    for (const sec of window.INSPECTION_SECTIONS) {
      if (sec.items.some(i => i.es === nombreEs)) return sec.id;
    }
    return null;
  };

  // Respaldo offline de los catálogos: la fuente real son las tablas vehicles y
  // drivers de Supabase (editables desde el dashboard).
  window.VEHICLES_DEFAULT = Object.keys(window.VEHICLE_PLATE_MAP).map(cod => ({
    codigo_vehiculo: cod,
    placa: window.VEHICLE_PLATE_MAP[cod],
    marca: window.VEHICLE_BRAND_MAP[cod] || '',
    anio: null, tonelaje: '', tipo: 'CAMIONETA', aplica_pertiga: false,
    vigencia_matricula: null, vigencia_revision: null, activo: true
  }));
  window.DRIVERS_DEFAULT = [];

  // Catálogos vivos (se mutan en el lugar, igual que MAINTENANCE_ALERTS). Arrancan
  // con lo último recibido de Supabase en este dispositivo o con los respaldos.
  window.CATALOG = { vehicles: window.VEHICLES_DEFAULT.slice(), drivers: window.DRIVERS_DEFAULT.slice() };
  window.applyCatalogs = function (cat) {
    if (cat && Array.isArray(cat.vehicles) && cat.vehicles.length) window.CATALOG.vehicles.splice(0, Infinity, ...cat.vehicles);
    if (cat && Array.isArray(cat.drivers)) window.CATALOG.drivers.splice(0, Infinity, ...cat.drivers);
    return window.CATALOG;
  };
  try {
    window.applyCatalogs(JSON.parse(localStorage.getItem('RDV_GDR_CATALOG') || 'null'));
  } catch (e) { /* sin localStorage o JSON inválido: quedan los respaldos */ }

  window.OPERATIVE_STATUSES = {
    OPERATIVO: { label: 'Operativo', color: '#34d399' },
    'MANT. PREVENTIVO': { label: 'Mant. Preventivo', color: '#fbbf24' },
    'MANT. CORRECTIVO': { label: 'Mant. Correctivo', color: '#f87171' },
    INACTIVO: { label: 'Inactivo', color: '#94a3b8' }
  };

  // ====== Grupos de trabajo por quincena ======
  // Esquema mensual: G1 = días 11–25 de cada mes; G2 = día 26 al 10 del mes
  // siguiente. La primera quincena arranca el 11/08/2026 (G1 de agosto).
  window.WORK_GROUP_ANCHOR = '2026-08-11'; // inicio de la primera G1 (fecha local)

  /**
   * Devuelve la quincena (grupo de trabajo) a la que pertenece una fecha.
   * @param {Date} date
   * @returns {null | {index:number, group:'G1'|'G2', start:Date, end:Date}}
   *          null si la fecha es anterior al arranque (11/08/2026).
   */
  window.getWorkGroupPeriod = function (date) {
    const [ay, am] = window.WORK_GROUP_ANCHOR.split('-').map(Number);
    const y = date.getFullYear();
    const m = date.getMonth(); // 0-based
    const day = date.getDate();
    let group, start, end, periodMonth;
    if (day >= 11 && day <= 25) {
      group = 'G1';
      start = new Date(y, m, 11);
      end = new Date(y, m, 25);
      periodMonth = y * 12 + m;
    } else if (day >= 26) {
      group = 'G2';
      start = new Date(y, m, 26);
      end = new Date(y, m + 1, 10);
      periodMonth = y * 12 + m;
    } else { // días 1–10: cola de la G2 del mes anterior
      group = 'G2';
      start = new Date(y, m - 1, 26);
      end = new Date(y, m, 10);
      periodMonth = y * 12 + (m - 1);
    }
    const anchorMonth = ay * 12 + (am - 1);
    const index = (periodMonth - anchorMonth) * 2 + (group === 'G1' ? 0 : 1);
    if (index < 0) return null;
    return { index, group, start, end };
  };

  // ====== Coherencia de kilometraje ======
  window.KM_MAX_JUMP = 1500;       // salto máximo plausible entre dos reportes
  window.KM_MAX_DAILY_RATE = 1000; // km/día máximo plausible de la flota

  /**
   * Filtra lecturas de kilometraje erróneas (tipeos) de UN vehículo.
   *
   * Dos filtros independientes:
   *  1. Marcadas en el formulario: el informe se guardó con km incoherente y
   *     el usuario lo confirmó (km_sospechoso = true). Se excluyen salvo que
   *     se pida includeFlagged.
   *  2. Heurística: mediana local de la ventana ±3 lecturas; una lectura se
   *     descarta si se desvía de su vecindario más que la tolerancia (adaptada
   *     al ritmo de reporteo del vehículo). Robusta ante picos aislados en
   *     ambas direcciones y no genera descartes en cascada.
   *
   * @param {Array} reports - reportes del mismo vehículo (cualquier orden)
   * @param {{includeFlagged?: boolean}} [options] - incluir las marcadas como dudosas
   * @returns {{valid: Array, discarded: number, flagged: number, excluded: number}}
   *          valid queda ordenado asc por fecha
   */
  window.filterKmReadings = function (reports, options) {
    const includeFlagged = !!(options && options.includeFlagged);
    let flagged = 0;
    const sorted = (reports || [])
      .filter(r => {
        if (r.kilometraje == null || isNaN(new Date(r.fecha_hora))) return false;
        if (r.km_sospechoso) {
          flagged++;
          if (!includeFlagged) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    const excludedFlagged = includeFlagged ? 0 : flagged;
    if (sorted.length <= 2) {
      return { valid: sorted, discarded: 0, flagged, excluded: excludedFlagged };
    }

    const kms = sorted.map(r => r.kilometraje);
    const times = sorted.map(r => new Date(r.fecha_hora).getTime());
    const median = arr => {
      const s = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    };

    const W = 3;
    const valid = [];
    let discarded = 0;
    for (let i = 0; i < sorted.length; i++) {
      const lo = Math.max(0, i - W);
      const hi = Math.min(sorted.length - 1, i + W);
      const med = median(kms.slice(lo, hi + 1)); // incluye i: la mediana es robusta al tipeo
      const windowDays = Math.max(1, (times[hi] - times[lo]) / 86400000);
      const stepDays = windowDays / Math.max(1, hi - lo); // días típicos entre reportes
      const tol = Math.max(window.KM_MAX_JUMP, 2 * stepDays * window.KM_MAX_DAILY_RATE);
      if (Math.abs(kms[i] - med) > tol) { discarded++; continue; }
      valid.push(sorted[i]);
    }
    return { valid, discarded, flagged, excluded: discarded + excludedFlagged };
  };
})();
