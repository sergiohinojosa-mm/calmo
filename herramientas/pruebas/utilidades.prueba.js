// Utilidades de ui.js que no tocan el DOM: esc, dayKey, addDays, dow y plural.
import { reloj, fecha } from './lib/entorno.js';
import { grupo, prueba, fin, verdad, igual } from './lib/prueba.js';
import { esc, dayKey, fromKey, addDays, dow, plural } from '../../web/js/ui.js';

grupo('esc');

prueba('escapa & < > " \' y deja lo demás igual', () => {
  igual(esc(`<a href="x" title='y'>Tom & Ana</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Ana&lt;/a&gt;');
  igual(esc('Respira por la nariz, Lía'), 'Respira por la nariz, Lía');
  igual(esc('<img src=x onerror=alert(1)>').includes('<'), false);
});

prueba('no rompe con null, undefined ni números, y no «desescapa»', () => {
  igual(esc(null), '');
  igual(esc(undefined), '');
  igual(esc(0), '0');
  igual(esc(42), '42');
  igual(esc('&amp;'), '&amp;amp;');
});

grupo('Fechas');

prueba('dayKey: fecha local AAAA-MM-DD con ceros, de Date, número o sin argumento (hoy)', () => {
  igual(dayKey(fecha(2026, 1, 5, 23, 59)), '2026-01-05');
  igual(dayKey(fecha(2026, 12, 31, 0, 0)), '2026-12-31');
  igual(dayKey(fecha(2026, 3, 9, 12).getTime()), '2026-03-09');
  reloj.fijar(2026, 6, 1, 0, 1);
  igual(dayKey(), '2026-06-01');
  reloj.fijar(2026, 6, 1, 23, 59);
  igual(dayKey(), '2026-06-01', 'a las 23:59 sigue siendo el mismo día local');
  igual(dayKey(fromKey('2026-02-28')), '2026-02-28', 'fromKey y dayKey son inversas');
});

prueba('addDays: suma y resta días cruzando mes y año, sin cambiar la fecha original', () => {
  const d = fecha(2026, 12, 30, 9, 15);
  const antes = d.getTime();
  igual(dayKey(addDays(d, 2)), '2027-01-01');
  igual(dayKey(addDays(d, -30)), '2026-11-30');
  igual(dayKey(addDays(fecha(2028, 2, 28), 1)), '2028-02-29', 'año bisiesto');
  igual(dayKey(addDays(fecha(2026, 3, 1), -1)), '2026-02-28');
  igual(addDays(d, 1).getHours(), 9, 'conserva la hora');
  igual(d.getTime(), antes, 'cambió la fecha original');
});

prueba('dow: lunes = 0 … domingo = 6', () => {
  // 1 de junio de 2026 es lunes.
  const esperado = [0, 1, 2, 3, 4, 5, 6, 0];
  esperado.forEach((n, i) => igual(dow(fecha(2026, 6, 1 + i, 12)), n, dayKey(fecha(2026, 6, 1 + i))));
});

grupo('plural');

prueba('plural: singular solo con 1', () => {
  igual(plural(1, 'hoja', 'hojas'), '1 hoja');
  igual(plural(0, 'hoja', 'hojas'), '0 hojas');
  igual(plural(2, 'hoja', 'hojas'), '2 hojas');
  igual(plural(25, 'insignia', 'insignias'), '25 insignias');
  verdad(plural(1.5, 'minuto', 'minutos').endsWith('minutos'));
});

await fin('utilidades.prueba.js');
