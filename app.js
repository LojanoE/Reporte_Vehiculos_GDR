
// ============== RDV ECSA | GDR ==============
// JS 100% estático. Sin dependencias.
// - Valida campos obligatorios
// - Previsualiza 2 fotos
// - Genera el INFORME y envía a la impresora (PDF)
// - Exporta/Importa JSON
// - Guarda/Carga último en localStorage

(() => {
  'use strict';

  // ---------- Utils ----------
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const byId = id => document.getElementById(id);
  const fmt2 = n => String(n).padStart(2, "0");
  const nowLocalISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = fmt2(d.getMonth() + 1);
    const dd = fmt2(d.getDate());
    const hh = fmt2(d.getHours());
    const mi = fmt2(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };
  const toast = (txt, type="success") => {
    const msg = byId("msg");
    msg.textContent = txt;
    msg.className = `msg banner ${type}`;
    setTimeout(() => { msg.textContent = ""; msg.className="msg"; }, 3200);
  };

  // ---------- Estado de sistemas ----------
  const estados = ["", "OK", "Observado", "Crítico"];
  const sysMap = [
    ["s_direccion","c_direccion","Sistema de Dirección"],
    ["s_electrico","c_electrico","Sistema Eléctrico"],
    ["s_fluidos","c_fluidos","Revisión de Fluidos"],
    ["s_frenos","c_frenos","Frenos"],
    ["s_suspension","c_suspension","Suspensión"],
    ["s_neumaticos","c_neumaticos","Neumáticos"],
    ["s_iluminacion","c_iluminacion","Iluminación / Señalización"],
    ["s_instrumentos","c_instrumentos","Instrumentos de tablero"],
    ["s_motor","c_motor","Motor / Transmisión"],
    ["s_carroceria","c_carroceria","Carrocería / Vidrios"],
    ["s_ac","c_ac","A/C / Calefacción"],
    ["s_seguridad","c_seguridad","Seguridad"],
    ["s_documentacion","c_documentacion","Documentación"]
  ];

  function populateSelects(){
    sysMap.forEach(([sid]) => {
      const sel = byId(sid);
      sel.innerHTML = estados.map(v => v ? `<option>${v}</option>` : `<option value="">Seleccione…</option>`).join("");
    });
  }

  // ---------- Fotos ----------
  let foto1Data = "", foto2Data = "";
  const bindPhoto = (fileInputId, imgPreviewId, setter) => {
    const inp = byId(fileInputId);
    const img = byId(imgPreviewId);
    inp.required = true;
    inp.addEventListener("change", e => {
      const f = e.target.files?.[0];
      if(!f){ img.src = ""; setter(""); return; }
      const reader = new FileReader();
      reader.onload = ev => {
        const data = String(ev.target.result);
        img.src = data;
        setter(data);
      };
      reader.readAsDataURL(f);
    });
  };

  // ---------- Codificación ----------
  function buildCodificacion(codigo, fechaLocal){
    // AAMM-RDV-CODIGO-DD
    if(!fechaLocal) return "";
    const [Y,M,D] = fechaLocal.split("T")[0].split("-");
    const AAMM = `${Y.slice(2)}${M}`;
    const DD = D;
    const cod = (codigo||"").toUpperCase().trim();
    return `${AAMM}-RDV-${cod}-${DD}`;
  }

  // ---------- Recolección / Validación ----------
  function collectData(requirePhotos=true){
    const codigo = byId("codigo_vehiculo").value.trim();
    const placa = byId("placa").value.trim();
    const km = byId("kilometraje").value;
    const fecha = byId("fecha_hora").value || nowLocalISO();
    const conductor = byId("conductor").value.trim();
    const inspector = byId("inspector").value.trim();
    const ubicacion = byId("ubicacion").value.trim();
    const estado_general = byId("estado_general").value;
    const apto = ($$('input[name="apto"]:checked')[0]?.value ?? "") === "si";

    if(!codigo || !km || !fecha || !conductor || !inspector || !ubicacion){
      throw new Error("Faltan campos obligatorios en Datos Generales.");
    }
    if(!estado_general){
      throw new Error("Seleccione el Estado general.");
    }
    if($$('input[name="apto"]:checked').length === 0){
      throw new Error("Indique si es Apto para servicio.");
    }
    if(requirePhotos && (!foto1Data || !foto2Data)){
      throw new Error("Debe cargar 2 fotos de evidencia.");
    }

    const sistemas = {};
    sysMap.forEach(([sid,cid,label]) => {
      sistemas[label] = {
        estado: byId(sid).value || "",
        comentarios: byId(cid).value.trim()
      };
    });

    const codificacion = buildCodificacion(codigo, fecha);
    const payload = {
      version: "1.0.0",
      codificacion,
      metadata:{
        codigo_vehiculo: codigo,
        placa: placa || undefined,
        kilometraje: Number(km),
        fecha_hora: fecha,
        conductor, inspector, ubicacion
      },
      estado_general,
      apto_servicio: apto,
      observaciones: byId("observaciones").value.trim(),
      acciones_correctivas: byId("acciones_correctivas").value.trim(),
      sistemas,
      fotos: [
        { data_url: foto1Data || "", nombre_archivo: "foto1" },
        { data_url: foto2Data || "", nombre_archivo: "foto2" }
      ],
      emision: {}
    };
    return payload;
  }

  // ---------- Render del Informe ----------
  function renderReport(data){
    byId("r_codificacion").textContent = data.codificacion || "—";
    byId("r_folio").textContent = data.codificacion || "—";
    byId("codificacionBadge").textContent = data.codificacion || "—";

    byId("r_codigo").textContent = data.metadata.codigo_vehiculo || "—";
    byId("r_placa").textContent = data.metadata.placa || "—";
    byId("r_fecha").textContent = data.metadata.fecha_hora || "—";
    byId("r_km").textContent = data.metadata.kilometraje ?? "—";
    byId("r_conductor").textContent = data.metadata.conductor || "—";
    byId("r_inspector").textContent = data.metadata.inspector || "—";
    byId("r_conductor_sig").textContent = data.metadata.conductor || "—";
    byId("r_inspector_sig").textContent = data.metadata.inspector || "—";
    byId("r_ubicacion").textContent = data.metadata.ubicacion || "—";

    byId("r_estado_general").textContent = data.estado_general || "—";
    byId("r_apto").textContent = data.apto_servicio ? "Sí" : "No";
    byId("r_obs").textContent = data.observaciones || "—";
    byId("r_acc").textContent = data.acciones_correctivas || "—";

    // Tabla sistemas
    const tbody = byId("r_tbl_body");
    tbody.innerHTML = "";
    Object.entries(data.sistemas).forEach(([nombre, obj]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${nombre}</td><td>${obj.estado || "—"}</td><td>${obj.comentarios || ""}</td>`;
      tbody.appendChild(tr);
    });

    // Fotos
    if(data.fotos?.[0]?.data_url) byId("r_foto1").src = data.fotos[0].data_url;
    if(data.fotos?.[1]?.data_url) byId("r_foto2").src = data.fotos[1].data_url;

    // Emisión
    const d = new Date();
    const em = `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())} ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
    byId("r_emitido").textContent = em;
  }

  // ---------- Persistencia ----------
  const KEY = "RDV_LAST_V1";
  const saveLocal = data => localStorage.setItem(KEY, JSON.stringify(data));
  const loadLocal = () => {
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    }catch{ return null; }
  };

  function populateForm(data){
    if(!data) return;
    byId("codigo_vehiculo").value = data.metadata.codigo_vehiculo ?? "";
    byId("placa").value = data.metadata.placa ?? "";
    byId("kilometraje").value = data.metadata.kilometraje ?? "";
    byId("fecha_hora").value = data.metadata.fecha_hora ?? nowLocalISO();
    byId("conductor").value = data.metadata.conductor ?? "";
    byId("inspector").value = data.metadata.inspector ?? "";
    byId("ubicacion").value = data.metadata.ubicacion ?? "";
    byId("estado_general").value = data.estado_general ?? "";
    $$('input[name="apto"]').forEach(r => r.checked = (data.apto_servicio ? r.value==="si" : r.value==="no"));

    sysMap.forEach(([sid,cid,label]) => {
      const s = data.sistemas?.[label];
      if(s){
        byId(sid).value = s.estado || "";
        byId(cid).value = s.comentarios || "";
      }
    });

    // Fotos
    foto1Data = data.fotos?.[0]?.data_url || "";
    foto2Data = data.fotos?.[1]?.data_url || "";
    if(foto1Data) byId("preview1").src = foto1Data; else byId("preview1").removeAttribute("src");
    if(foto2Data) byId("preview2").src = foto2Data; else byId("preview2").removeAttribute("src");

    byId("codificacionBadge").textContent = data.codificacion || "—";
  }

  // ---------- Export / Import ----------
  function exportJSON(data){
    const fname = (data.codificacion || "RDV").replaceAll("/","-") + ".json";
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJSON(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        try{ resolve(JSON.parse(String(ev.target.result))); }
        catch(e){ reject(e); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // ---------- Print flow ----------
  async function doPrint(){
    let data;
    try{
      data = collectData(true);
    }catch(e){
      toast(e.message, "error");
      return;
    }
    saveLocal(data);
    renderReport(data);

    // Mostrar solo el reporte al imprimir
    byId("formArea").classList.add("print-hide");
    byId("reportArea").classList.add("print-show");

    // Asegurar reflow antes de print (especialmente en Edge/Chrome mobiles)
    await new Promise(r => setTimeout(r, 150));
    window.print();

    // Revertir
    setTimeout(() => {
      byId("formArea").classList.remove("print-hide");
      byId("reportArea").classList.remove("print-show");
    }, 300);
    toast("Informe listo para PDF/impresión.");
  }

  // ---------- Event wiring ----------
  function bindEvents(){
    // fecha por defecto
    if(!byId("fecha_hora").value) byId("fecha_hora").value = nowLocalISO();

    bindPhoto("foto1","preview1", v => foto1Data = v);
    bindPhoto("foto2","preview2", v => foto2Data = v);

    byId("btnImprimir").addEventListener("click", doPrint);

    byId("btnGuardar").addEventListener("click", () => {
      try{
        const data = collectData(true);
        saveLocal(data);
        toast("Datos guardados localmente.");
      }catch(e){ toast(e.message, "error"); }
    });

    byId("btnCargar").addEventListener("click", () => {
      const data = loadLocal();
      if(!data){ toast("No hay un reporte previo guardado.", "warn"); return; }
      populateForm(data);
      toast("Datos cargados.");
    });

    byId("btnExport").addEventListener("click", () => {
      try{
        const data = collectData(true);
        exportJSON(data);
      }catch(e){ toast(e.message, "error"); }
    });

    byId("importFile").addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if(!f) return;
      try{
        const data = await importJSON(f);
        populateForm(data);
        saveLocal(data);
        renderReport(data);
        toast("JSON importado.");
      }catch(err){ toast("Archivo inválido.", "error"); }
      e.target.value = "";
    });

    // Actualiza codificación cuando cambia código o fecha
    const updateCod = () => {
      const cod = buildCodificacion(byId("codigo_vehiculo").value, byId("fecha_hora").value);
      byId("codificacionBadge").textContent = cod || "—";
    };
    byId("codigo_vehiculo").addEventListener("input", updateCod);
    byId("fecha_hora").addEventListener("change", updateCod);
    updateCod();
  }

  document.addEventListener("DOMContentLoaded", () => {
    populateSelects();
    bindEvents();
  });
})();
