// Test de lógica: quincenas G1/G2 + filtro de km (constants.js)
const fs = require('fs');
const vm = require('vm');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('constants.js', 'utf8'), sandbox);
const { getWorkGroupPeriod, filterKmReadings } = sandbox.window;

const fmt = d => d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name); if (!cond) process.exitCode = 1; };

// 1) Esquema mensual: G1 = 11–25, G2 = 26–10 (arranque 11/08/2026)
let p = getWorkGroupPeriod(new Date(2026, 7, 11));
check('11/08 es G1 (arranque)', p.group === 'G1' && fmt(p.start) === '11/08/2026' && fmt(p.end) === '25/08/2026' && p.index === 0);
p = getWorkGroupPeriod(new Date(2026, 7, 26));
check('26/08 es G2 ago', p.group === 'G2' && fmt(p.start) === '26/08/2026' && fmt(p.end) === '10/09/2026' && p.index === 1);
p = getWorkGroupPeriod(new Date(2026, 8, 5));
check('05/09 pertenece a G2 ago (26/08–10/09)', p.group === 'G2' && fmt(p.start) === '26/08/2026' && p.index === 1);
p = getWorkGroupPeriod(new Date(2026, 8, 11));
check('11/09 es G1 sep', p.group === 'G1' && fmt(p.start) === '11/09/2026' && fmt(p.end) === '25/09/2026' && p.index === 2);
p = getWorkGroupPeriod(new Date(2026, 8, 26));
check('26/09 es G2 sep', p.group === 'G2' && fmt(p.start) === '26/09/2026' && fmt(p.end) === '10/10/2026' && p.index === 3);
p = getWorkGroupPeriod(new Date(2026, 9, 10));
check('10/10 sigue G2 sep', p.group === 'G2' && p.index === 3);
p = getWorkGroupPeriod(new Date(2026, 9, 11));
check('11/10 vuelve a G1 oct', p.group === 'G1' && p.index === 4);
p = getWorkGroupPeriod(new Date(2027, 0, 5));
check('05/01/2027 es G2 dic (cruza año)', p.group === 'G2' && fmt(p.start) === '26/12/2026' && fmt(p.end) === '10/01/2027');
check('Antes del ancla devuelve null', getWorkGroupPeriod(new Date(2026, 7, 10)) === null);
check('G2 de feb: 26/02–10/03', (p = getWorkGroupPeriod(new Date(2027, 1, 26))) && fmt(p.end) === '10/03/2027');

// 2) Filtro de km (mediana local)
const mk = (km, d) => ({ kilometraje: km, fecha_hora: `2026-09-${String(d).padStart(2, '0')}T08:00:00` });
const kmsOf = res => res.valid.map(r => r.kilometraje).join(',');

let res = filterKmReadings([mk(12000, 1), mk(12500, 3), mk(125000, 5), mk(12900, 7)]);
check('Descarta pico 125000', res.discarded === 1 && kmsOf(res) === '12000,12500,12900');

res = filterKmReadings([mk(12000, 1), mk(1200, 3), mk(12500, 5)]);
check('Descarta valle 1200 sin tocar extremos', res.discarded === 1 && kmsOf(res) === '12000,12500');

res = filterKmReadings([mk(12000, 1), mk(12500, 3), mk(22000, 5), mk(12900, 7)]);
check('Descarta salto medio 22000', res.discarded === 1 && kmsOf(res) === '12000,12500,12900');

res = filterKmReadings([mk(12000, 1), mk(13500, 2)]);
check('2 lecturas: no filtra', res.discarded === 0);

// Caso cascada real (tipo ECO62): un pico aislado no debe arrastrar las lecturas buenas
res = filterKmReadings([17500, 17509, 18203, 20689, 18510, 18644, 18829].map((k, i) => mk(k, i + 1)));
check('Pico aislado 20689 descartado sin cascada', res.discarded === 1 && kmsOf(res) === '17500,17509,18203,18510,18644,18829');

// Serie limpia con uso real alto (800 km/día) no se toca
res = filterKmReadings([12000, 12800, 13600, 14400, 15200].map((k, i) => mk(k, i + 1)));
check('Ritmo real 800 km/día se conserva', res.discarded === 0);

res = filterKmReadings([]);
check('Lista vacía OK', res.valid.length === 0 && res.discarded === 0);

console.log('Listo.');
