// Test de lógica: quincenas G1/G2 + filtro de km (constants.js)
const fs = require('fs');
const vm = require('vm');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('constants.js', 'utf8'), sandbox);
const { getWorkGroupPeriod, filterKmReadings } = sandbox.window;

const fmt = d => d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name); if (!cond) process.exitCode = 1; };

// 1) Casos del usuario: G1 11-25 sep, G2 26 sep - 10 oct
let p = getWorkGroupPeriod(new Date(2026, 8, 11));
check('11/09 es G1', p.group === 'G1' && fmt(p.start) === '11/09/2026' && fmt(p.end) === '25/09/2026');
p = getWorkGroupPeriod(new Date(2026, 8, 25));
check('25/09 sigue G1', p.group === 'G1' && p.index === 0);
p = getWorkGroupPeriod(new Date(2026, 8, 26));
check('26/09 es G2', p.group === 'G2' && fmt(p.start) === '26/09/2026' && fmt(p.end) === '10/10/2026');
p = getWorkGroupPeriod(new Date(2026, 9, 10));
check('10/10 sigue G2', p.group === 'G2');
p = getWorkGroupPeriod(new Date(2026, 9, 11));
check('11/10 vuelve a G1', p.group === 'G1' && p.index === 2);
p = getWorkGroupPeriod(new Date(2026, 11, 31));
check('31/12 cae en alguna quincena', p && (p.group === 'G1' || p.group === 'G2'));
p = getWorkGroupPeriod(new Date(2027, 5, 15));
check('Funciona en 2027', p && p.index > 0);
check('Antes del ancla devuelve null', getWorkGroupPeriod(new Date(2026, 8, 10)) === null);

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
