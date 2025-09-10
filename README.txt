RDV — Impresión en 2 hojas (A4)
- Hoja 1: encabezado + tabla + observaciones
- Hoja 2: fotos + firmas (2 columnas + área de firmas)

Qué se cambió
1) index.html: se añadió un encabezado de impresión dentro de #report (rep-topbar) con el código del informe (id=rep-codigo).
2) styles.css: reglas @media print para:
   - ocultar portada/formulario en impresión,
   - forzar salto antes de fotos,
   - colocar fotos en 2 columnas con altura 95mm,
   - mantener firmas en la misma página,
   - tamaño A4 con margen 10mm.
3) app.js: marca 'mprint' en body en móviles (por compatibilidad), sin afectar escritorio.

Cómo usar
- Llenar formulario → Generar informe → Imprimir.
- El PDF resultante tendrá exactamente 2 páginas siempre que se suban 2 fotos (requeridas).
