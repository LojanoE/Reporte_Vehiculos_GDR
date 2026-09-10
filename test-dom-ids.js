// Verificación estática: todos los getElementById usados en los JS existen en su HTML
const fs = require('fs');

const pairs = [
  ['dashboard.js', 'dashboard.html'],
  ['app.js', 'index.html'],
  ['reporte-vehiculo.js', 'reporte-vehiculo.html']
];

let fail = 0;
for (const [jsFile, htmlFile] of pairs) {
  const js = fs.readFileSync(jsFile, 'utf8');
  const html = fs.readFileSync(htmlFile, 'utf8');
  const ids = new Set();
  for (const m of js.matchAll(/getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) ids.add(m[1]);
  for (const m of js.matchAll(/\$\(\s*['"`]#([A-Za-z0-9_-]+)['"`]\s*\)/g)) ids.add(m[1]);
  const missing = [...ids].filter(id => !html.includes(`id="${id}"`));
  // IDs dinámicos conocidos que no existen estáticamente en el HTML
  const dynamic = ['rep-codigo', 'rep-fecha', 'rep-apto', 'rep-cod', 'rep-placa', 'rep-km', 'rep-arch', 'rep-obs', 'rep-conductor', 'rep-inspector', 'rep-img1', 'rep-img2', 'rep-sys-body'];
  const realMissing = missing.filter(id => !dynamic.includes(id) && !/^sys-/.test(id));
  if (realMissing.length) { fail = 1; console.log(`FAIL ${jsFile}: IDs sin elemento en ${htmlFile}:`, realMissing); }
  else console.log(`PASS ${jsFile}: ${ids.size} IDs verificados en ${htmlFile}`);
}
process.exit(fail);
