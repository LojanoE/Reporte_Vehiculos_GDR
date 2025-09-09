
// ============== RDV ECSA | GDR ==============
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const byId = id => document.getElementById(id);
  const fmt2 = n => String(n).padStart(2, "0");
  const nowLocalISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}T${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
  };
  const toast = (t, type="success") => {
    const m = byId("msg"); m.textContent = t; m.className = `msg banner ${type}`;
    setTimeout(()=>{ m.textContent=""; m.className="msg"; }, 3200);
  };

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

  let foto1Data="", foto2Data="";
  const bindPhoto = (fid, pid, setter) => {
    const inp = byId(fid), img = byId(pid);
    inp.required = true;
    inp.addEventListener("change", e => {
      const f = e.target.files?.[0]; if(!f){ img.removeAttribute("src"); setter(""); return; }
      const r = new FileReader();
      r.onload = ev => { const d = String(ev.target.result); img.src = d; setter(d); };
      r.readAsDataURL(f);
    });
  };

  function buildCod(codigo, fecha){
    if(!fecha) return "";
    const [Y,M,D] = fecha.split("T")[0].split("-");
    return `${Y.slice(2)}${M}-RDV-${(codigo||"").toUpperCase().trim()}-${D}`;
  }

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

    if(!codigo || !km || !fecha || !conductor || !inspector || !ubicacion) throw new Error("Faltan campos obligatorios.");
    if(!estado_general) throw new Error("Seleccione el Estado general.");
    if($$('input[name="apto"]:checked').length === 0) throw new Error("Indique si es Apto para servicio.");
    if(requirePhotos && (!foto1Data || !foto2Data)) throw new Error("Debe cargar 2 fotos de evidencia.");

    const sistemas={};
    sysMap.forEach(([sid,cid,label]) => {
      sistemas[label] = { estado: byId(sid).value || "", comentarios: byId(cid).value.trim() };
    });

    const cod = buildCod(codigo, fecha);
    return {
      version:"1.0.0",
      codificacion: cod,
      metadata:{ codigo_vehiculo: codigo, placa: placa || undefined, kilometraje:Number(km), fecha_hora:fecha, conductor, inspector, ubicacion },
      estado_general,
      apto_servicio: apto,
      observaciones: byId("observaciones").value.trim(),
      acciones_correctivas: byId("acciones_correctivas").value.trim(),
      sistemas,
      fotos:[ {data_url: foto1Data||"", nombre_archivo:"foto1"}, {data_url: foto2Data||"", nombre_archivo:"foto2"} ],
      emision:{}
    };
  }

  function renderReport(d){
    byId("r_codificacion").textContent = d.codificacion||"—";
    byId("r_folio").textContent = d.codificacion||"—";
    byId("codificacionBadge").textContent = d.codificacion||"—";
    byId("r_codigo").textContent = d.metadata.codigo_vehiculo||"—";
    byId("r_placa").textContent = d.metadata.placa||"—";
    byId("r_fecha").textContent = d.metadata.fecha_hora||"—";
    byId("r_km").textContent = d.metadata.kilometraje??"—";
    byId("r_conductor").textContent = d.metadata.conductor||"—";
    byId("r_inspector").textContent = d.metadata.inspector||"—";
    byId("r_conductor_sig").textContent = d.metadata.conductor||"—";
    byId("r_inspector_sig").textContent = d.metadata.inspector||"—";
    byId("r_ubicacion").textContent = d.metadata.ubicacion||"—";
    byId("r_estado_general").textContent = d.estado_general||"—";
    byId("r_apto").textContent = d.apto_servicio ? "Sí" : "No";
    byId("r_obs").textContent = d.observaciones||"—";
    byId("r_acc").textContent = d.acciones_correctivas||"—";

    const tb = byId("r_tbl_body");
    tb.innerHTML = "";
    Object.entries(d.sistemas).forEach(([nombre, obj]) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${nombre}</td><td>${obj.estado||"—"}</td><td>${obj.comentarios||""}</td>`;
      tb.appendChild(tr);
    });
    if(d.fotos?.[0]?.data_url) byId("r_foto1").src = d.fotos[0].data_url;
    if(d.fotos?.[1]?.data_url) byId("r_foto2").src = d.fotos[1].data_url;
    const t = new Date(); byId("r_emitido").textContent = `${t.getFullYear()}-${fmt2(t.getMonth()+1)}-${fmt2(t.getDate())} ${fmt2(t.getHours())}:${fmt2(t.getMinutes())}`;
  }

  const KEY = "RDV_LAST_V1";
  const saveLocal = d => localStorage.setItem(KEY, JSON.stringify(d));
  const loadLocal = () => { try{ return JSON.parse(localStorage.getItem(KEY)||"null"); }catch{ return null; } };

  function populateForm(d){
    if(!d) return;
    byId("codigo_vehiculo").value = d.metadata.codigo_vehiculo??"";
    byId("placa").value = d.metadata.placa??"";
    byId("kilometraje").value = d.metadata.kilometraje??"";
    byId("fecha_hora").value = d.metadata.fecha_hora??nowLocalISO();
    byId("conductor").value = d.metadata.conductor??"";
    byId("inspector").value = d.metadata.inspector??"";
    byId("ubicacion").value = d.metadata.ubicacion??"";
    byId("estado_general").value = d.estado_general??"";
    $$('input[name="apto"]').forEach(r => r.checked = (d.apto_servicio ? r.value==="si" : r.value==="no"));
    sysMap.forEach(([sid,cid,label]) => {
      const s = d.sistemas?.[label]; if(s){ byId(sid).value = s.estado||""; byId(cid).value = s.comentarios||""; }
    });
    foto1Data = d.fotos?.[0]?.data_url||""; foto2Data = d.fotos?.[1]?.data_url||"";
    if(foto1Data) byId("preview1").src = foto1Data; else byId("preview1").removeAttribute("src");
    if(foto2Data) byId("preview2").src = foto2Data; else byId("preview2").removeAttribute("src");
    byId("codificacionBadge").textContent = d.codificacion||"—";
  }

  function exportJSON(d){
    const fname = (d.codificacion||"RDV") + ".json";
    const blob = new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname; a.click(); URL.revokeObjectURL(a.href);
  }

  // --------- NUEVO: Imprimir en ventana aparte (compatibilidad Edge/Pages) ---------
  function printInNewWindow(){
    const reportHTML = byId("reportArea").innerHTML;
    const cssHref = "styles.css";
    const win = window.open("", "_blank", "noopener");
    if(!win){ toast("El navegador bloqueó la ventana. Habilita emergentes para este sitio.", "warn"); return; }
    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informe RDV — ECSA | GDR</title>
<link rel="stylesheet" href="${cssHref}">
<style>
  body{ background:#fff !important; color:#111 !important; }
  .card{ box-shadow:none; border-color:#c9d2de; background:#fff }
  .print-show{ display:block !important }
</style>
</head>
<body>
<section class="card report print-show">
${reportHTML}
</section>
<script>
  window.addEventListener('load', ()=>{ setTimeout(()=>{ window.print(); }, 150); });
<\/script>
</body></html>`);
    win.document.close();
  }

  async function doPrint(){
    let data;
    try{ data = collectData(true); }
    catch(e){ toast(e.message, "error"); return; }
    saveLocal(data);
    renderReport(data);
    // Intento directo
    try{
      window.focus();
      setTimeout(()=>window.print(), 80);
      // Además, abre la ventana de compatibilidad (varios Edge/Pages no muestran print directo)
      setTimeout(()=>printInNewWindow(), 400);
    }catch{ printInNewWindow(); }
    toast("Abriendo diálogo de impresión…");
  }

  function bindEvents(){
    if(!byId("fecha_hora").value) byId("fecha_hora").value = nowLocalISO();
    bindPhoto("foto1","preview1", v => foto1Data = v);
    bindPhoto("foto2","preview2", v => foto2Data = v);
    byId("btnImprimir").addEventListener("click", doPrint);
    byId("btnGuardar").addEventListener("click", ()=>{ try{ const d = collectData(true); saveLocal(d); toast("Datos guardados localmente."); }catch(e){ toast(e.message,"error"); } });
    byId("btnCargar").addEventListener("click", ()=>{ const d = loadLocal(); if(!d){ toast("No hay un reporte previo guardado.","warn"); return; } populateForm(d); toast("Datos cargados."); });
    byId("btnExport").addEventListener("click", ()=>{ try{ exportJSON(collectData(true)); }catch(e){ toast(e.message,"error"); } });
    byId("importFile").addEventListener("change", async e => {
      const f = e.target.files?.[0]; if(!f) return;
      try{ const txt = await f.text(); const d = JSON.parse(txt); populateForm(d); saveLocal(d); renderReport(d); toast("JSON importado."); }
      catch{ toast("Archivo inválido.", "error"); }
      e.target.value = "";
    });
    const updateCod = () => byId("codificacionBadge").textContent = buildCod(byId("codigo_vehiculo").value, byId("fecha_hora").value) || "—";
    byId("codigo_vehiculo").addEventListener("input", updateCod);
    byId("fecha_hora").addEventListener("change", updateCod);
    updateCod();
  }

  document.addEventListener("DOMContentLoaded", ()=>{ populateSelects(); bindEvents(); });
})();
