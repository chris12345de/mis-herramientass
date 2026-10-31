/* Calculadoras del Hogar - lógica compartida. Se carga al final de cada calculadora. */

/* ==== GUÍAS Y TRIVIA ==== */
function mostrarGuia(idGuia, cardId) {
  document.getElementById(cardId).style.display = 'none';
  document.getElementById(idGuia).style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function ocultarGuia(cardId, idGuia) {
  document.getElementById(idGuia).style.display = 'none';
  document.getElementById(cardId).style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* La trivia (estadoTrivias, verificarTrivia, mostrarResultadoFinal, reiniciarTrivia) está DENTRO de cada calculadora, como en la web original,
   para que funcione aunque este archivo no se cargue. Si la editas, cambia las 5 páginas por igual (pruebas/test_sitio.py lo comprueba). */

/* ==== CÁLCULOS (funciones puras, sin DOM: se prueban con Node) ==== */
const Calc = (function () {
  function redondear(x, d) { const f = Math.pow(10, d); return Math.round(x * f) / f; }
  // Redondeo hacia arriba seguro para punto flotante.
  // Un resultado que matemáticamente es un entero puede salir como n +/- unos pocos ULP
  // (p. ej. 3.0000000000000004) por los errores de la aritmética binaria. Solo se admite esa
  // diferencia, medida de forma RELATIVA: 32 ULP = n * 32 * Number.EPSILON (~7e-15 * n), muy por
  // debajo de cualquier cantidad real. Cualquier excedente mayor sube a la unidad siguiente
  // (3.0000004 -> 4, 1.01 -> 2). Un valor positivo, por pequeño que sea, nunca da menos de 1.
  function techo(x) {
    if (!(x > 0)) return Math.ceil(x);
    const n = Math.round(x);
    if (n >= 1 && Math.abs(x - n) <= n * 32 * Number.EPSILON) return n;
    return Math.ceil(x);
  }
  function fmt(n, d) {
    const p = Number(n).toFixed(d === undefined ? 1 : d).split('.');
    if (Math.abs(n) >= 1000) p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return p.join(',');
  }
  // Solo para MOSTRAR volúmenes en m³ (arena, grava, hormigón): redondeo convencional (mitad hacia arriba)
  // que ignora el ruido de punto flotante (0,3 × 0,75 da 0.22499999999999998 y fmt() lo mostraba como 0,22).
  // No altera el número original: devuelve uno nuevo que se pasa a fmt() para ponerle la coma y los miles.
  function fmtVol(n, d) {
    const k = Math.pow(10, d), a = Math.abs(n);
    return fmt((n < 0 ? -1 : 1) * Math.round(Number((a * k).toPrecision(12))) / k, d);
  }
  // Valida un número: > min (o >= min si incl), <= max, entero si ent
  function chk(v, n, min, max, incl, ent) {
    if (typeof v !== 'number' || !isFinite(v)) throw new Error('Escribe un número válido en «' + n + '» (solo cifras y una coma o un punto para los decimales).');
    if (ent && !Number.isInteger(v)) throw new Error('«' + n + '» debe ser un número entero.');
    if (v < min || (v === min && !incl)) throw new Error('«' + n + '» debe ser ' + (incl ? 'al menos ' : 'mayor que ') + min + '.');
    if (v > max) throw new Error('«' + n + '» no puede ser mayor que ' + max + '. Revisa las unidades.');
    return v;
  }
  const vacio = function (v) { return v === null || v === undefined; };

  function envasesPintura(g) {
    const total = techo(g);               // galones enteros: siempre >= lo necesario
    const canecas = Math.floor(total / 5);
    const e = { total: total, canecas: canecas, sueltos: total - canecas * 5, sobrante: Math.max(0, redondear(total - g, 2)), cuartos: 0 };
    if (g <= 1) { const c = techo(g * 4); if (c < 4) e.cuartos = c; }
    return e;
  }

  function pintura(d) {
    const ancho = chk(d.ancho, 'Ancho de la pared (m)', 0, 100);
    const alto = chk(d.alto, 'Alto de la pared (m)', 0, 30);
    const paredes = chk(d.paredes, 'Paredes iguales', 1, 100, true, true);
    const desc = chk(d.descuento, 'Puertas y ventanas (m²)', 0, 10000, true);
    const manos = chk(d.manos, 'Manos de pintura', 1, 5, true, true);
    const rend = chk(d.rendimiento, 'Rendimiento (m² por galón y mano)', 5, 100, true);
    const margen = chk(d.margen, 'Margen de seguridad (%)', 0, 50, true);
    const bruta = ancho * alto * paredes;
    if (desc >= bruta) throw new Error('Los m² que descuentas (' + fmt(desc, 2) + ') no pueden ser iguales ni mayores que el área de las paredes (' + fmt(bruta, 2) + ' m²).');
    const area = bruta - desc, base = area * manos / rend, galones = base * (1 + margen / 100);
    return { bruta: bruta, area: area, manos: manos, rend: rend, margen: margen, base: base, galones: galones, litros: galones * 3.785, envases: envasesPintura(galones) };
  }

  function bloques(d) {
    const largo = chk(d.largo, 'Largo de la pared (m)', 0, 200);
    const alto = chk(d.alto, 'Alto de la pared (m)', 0, 30);
    const paredes = chk(d.paredes, 'Paredes iguales', 1, 100, true, true);
    const desc = chk(d.descuento, 'Puertas y ventanas (m²)', 0, 10000, true);
    const ml = chk(d.mlargo, 'Largo del módulo (cm)', 5, 200, true);
    const ma = chk(d.malto, 'Alto del módulo (cm)', 3, 100, true);
    const merma = chk(d.merma, 'Merma (%)', 0, 50, true);
    const bruta = largo * alto * paredes;
    if (desc >= bruta) throw new Error('Los m² que descuentas (' + fmt(desc, 2) + ') no pueden ser iguales ni mayores que el área de las paredes (' + fmt(bruta, 2) + ' m²).');
    const area = bruta - desc, porM2 = 10000 / (ml * ma), netas = area * porM2;
    return { bruta: bruta, area: area, porM2: porM2, netas: netas, merma: merma, ml: ml, ma: ma, total: techo(netas * (1 + merma / 100)) };
  }

  // Dosificaciones de referencia por m³ de HORMIGÓN (cemento + arena + grava)
  const DOSIF = {
    d123: { nombre: 'de referencia «1:2:3»', cem: 350, arena: 0.50, grava: 0.75 },
    d124: { nombre: 'de referencia «1:2:4»', cem: 300, arena: 0.50, grava: 0.80 },
    d133: { nombre: 'pobre de referencia', cem: 250, arena: 0.55, grava: 0.55 }
  };
  function hormigon(d) {
    const largo = chk(d.largo, 'Largo (m)', 0, 200), ancho = chk(d.ancho, 'Ancho (m)', 0, 200);
    const esp = chk(d.espesor, 'Espesor (cm)', 1, 100, true);
    const desp = chk(d.desperdicio, 'Desperdicio (%)', 0, 50, true);
    const saco = chk(d.saco, 'Peso del saco (kg)', 10, 60, true);
    let dos = DOSIF[d.dosif];
    if (d.dosif === 'custom') {
      dos = { nombre: 'personalizada', cem: chk(d.cem, 'Cemento por m³ (kg)', 50, 700, true),
              arena: chk(d.arena, 'Arena por m³ (m³)', 0, 1.5, true), grava: chk(d.grava, 'Grava por m³ (m³)', 0, 1.5, true) };
    }
    if (!dos) throw new Error('Elige una dosificación.');
    const vol = largo * ancho * esp / 100, volT = vol * (1 + desp / 100), kg = volT * dos.cem;
    return { vol: vol, volT: volT, dos: dos, desp: desp, kg: kg, saco: saco, sacos: techo(kg / saco), arena: volT * dos.arena, grava: volT * dos.grava };
  }

  function ceramica(d) {
    const largo = chk(d.largo, 'Largo (m)', 0, 200), ancho = chk(d.ancho, 'Ancho (m)', 0, 200);
    const desc = chk(d.descuento, 'Área a descontar (m²)', 0, 40000, true);
    const desp = chk(d.desperdicio, 'Desperdicio (%)', 0, 50, true);
    const rend = chk(d.rend, 'Consumo de adhesivo (kg/m²)', 0.5, 20, true);
    const saco = chk(d.saco, 'Peso del saco (kg)', 5, 50, true);
    const bruta = largo * ancho;
    if (desc >= bruta) throw new Error('El área a descontar (' + fmt(desc, 2) + ' m²) no puede ser igual ni mayor que el área del piso (' + fmt(bruta, 2) + ' m²).');
    const area = bruta - desc, compra = area * (1 + desp / 100), kg = area * rend;
    const r = { bruta: bruta, area: area, desp: desp, compra: compra, kg: kg, saco: saco, sacos: techo(kg / saco), cajas: null, m2cajas: null, caja: null };
    if (!vacio(d.caja)) { const c = chk(d.caja, 'm² por caja', 0, 20); r.caja = c; r.cajas = techo(compra / c); r.m2cajas = r.cajas * c; }
    return r;
  }

  function agua(d) {
    const hab = chk(d.habitantes, 'Habitantes', 1, 100000, true, true);
    const cons = chk(d.consumo, 'Consumo por persona (L/día)', 1, 2000, true);
    const util = chk(d.util, 'Volumen útil (%)', 1, 100, true);
    let total;
    if (!vacio(d.capacidad)) total = chk(d.capacidad, 'Capacidad del tanque (litros)', 0, 10000000);
    else total = Math.PI * Math.pow(chk(d.diametro, 'Diámetro (m)', 0, 50) / 2, 2) * chk(d.altura, 'Altura del agua (m)', 0, 50) * 1000;
    const utilL = total * util / 100, diario = hab * cons;
    return { total: total, util: util, utilL: utilL, diario: diario, dias: utilL / diario, hab: hab, cons: cons };
  }

  // Lee un número escrito por una persona: acepta coma o punto decimal; «miles» permite 1.000 = mil.
  function parseNumero(t, miles) {
    t = String(t === null || t === undefined ? '' : t).trim().replace(/\s/g, '');
    if (t === '') return NaN;
    if (miles && /^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    if (/^-?(\d+([.,]\d+)?|[.,]\d+)$/.test(t)) return Number(t.replace(',', '.'));
    return NaN;
  }

  return { parseNumero: parseNumero, pintura: pintura, bloques: bloques, hormigon: hormigon, ceramica: ceramica, agua: agua, envasesPintura: envasesPintura, fmt: fmt, fmtVol: fmtVol, techo: techo, chk: chk, DOSIF: DOSIF };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Calc;

/* ==== INTERFAZ (solo navegador) ==== */
function val(id, miles) { const e = document.getElementById(id); return Calc.parseNumero(e ? e.value : '', miles); }
function valOpc(id, miles) { const e = document.getElementById(id); return (!e || String(e.value).trim() === '') ? null : val(id, miles); }
const TITULOS = { pintura: '📋 Resultado · Pintura', cemento: '📋 Resultado · Cemento, arena y grava', bloques: '📋 Resultado · Bloques o ladrillos', ceramica: '📋 Resultado · Cerámica y adhesivo', agua: '📋 Resultado · Tanque de agua' };
function mostrar(id, html, error) {
  const caja = document.getElementById('res-' + id);
  document.getElementById('det-' + id).innerHTML = '<div class="res-titulo">' + (error ? '⚠️ Revisa los datos' : TITULOS[id]) + '</div>' + html;
  caja.classList.toggle('error', !!error);
  caja.style.display = 'block';
  try { // lleva la pantalla al resultado (en el móvil queda debajo del botón)
    const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    caja.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  } catch (e) { /* sin desplazamiento */ }
}
function ejecutar(id, fn) {
  try { mostrar(id, fn(), false); } catch (e) { mostrar(id, e.message, true); }
}
function resumen(titulo, lineas, nota) {
  return '<div class="res-grande">' + titulo + '</div><ul class="res-lista"><li>' + lineas.join('</li><li>') + '</li></ul><p class="res-nota">' + nota + '</p>';
}
function cambiarDosif() {
  document.getElementById('c-personal').hidden = document.getElementById('c-dosif').value !== 'custom';
}

function calcularPintura() {
  ejecutar('pintura', function () {
    const r = Calc.pintura({ ancho: val('p-ancho'), alto: val('p-alto'), paredes: val('p-paredes'), descuento: val('p-descuento'),
      manos: val('p-manos'), rendimiento: val('p-rend'), margen: val('p-margen') });
    const e = r.envases, f = Calc.fmt, partes = [];
    if (e.canecas) partes.push(e.canecas + (e.canecas === 1 ? ' caneca' : ' canecas') + ' de 5 galones');
    if (e.sueltos) partes.push(e.sueltos + (e.sueltos === 1 ? ' galón' : ' galones'));
    let compra = partes.join(' + ');
    if (e.cuartos) compra += ' (o ' + e.cuartos + (e.cuartos === 1 ? ' cuarto' : ' cuartos') + ' de galón, si tu tienda los vende)';
    return resumen('🛒 Compra: <strong>' + compra + '</strong>', [
      '📐 Área a pintar: <strong>' + f(r.area, 1) + ' m²</strong> (paredes ' + f(r.bruta, 1) + ' m² − descuento ' + f(r.bruta - r.area, 1) + ' m²)',
      '💧 Pintura necesaria: <strong>' + f(r.galones, 2) + ' galones</strong> (≈ ' + f(r.litros, 1) + ' litros), con ' + f(r.margen, 0) + '% de margen',
      '📦 Sobrante aproximado: ' + f(e.sobrante, 2) + ' galones'],
      'Cálculo: ' + f(r.area, 1) + ' m² × ' + r.manos + ' manos ÷ ' + f(r.rend, 1) + ' m²/galón = ' + f(r.base, 2) + ' galones; más el margen = ' + f(r.galones, 2) + '. Siempre se redondea hacia arriba. El rendimiento real depende de tu pintura y de la pared.');
  });
}

function calcularBloques() {
  ejecutar('bloques', function () {
    const r = Calc.bloques({ largo: val('b-largo'), alto: val('b-alto'), paredes: val('b-paredes'), descuento: val('b-descuento'),
      mlargo: val('b-mlargo'), malto: val('b-malto'), merma: val('b-merma') }), f = Calc.fmt;
    return resumen('🧱 Compra: <strong>' + f(r.total, 0) + ' unidades</strong>', [
      '📐 Área neta: <strong>' + f(r.area, 1) + ' m²</strong> (paredes ' + f(r.bruta, 1) + ' m² − descuento ' + f(r.bruta - r.area, 1) + ' m²)',
      '🔢 Con módulo de ' + f(r.ml, 1) + ' × ' + f(r.ma, 1) + ' cm: <strong>' + f(r.porM2, 2) + ' unidades por m²</strong>',
      '➕ Sin merma: ' + f(r.netas, 1) + ' unidades; con ' + f(r.merma, 0) + '% de merma: ' + f(r.total, 0)],
      'Es una estimación de unidades. No incluye mortero de pega, refuerzos de acero, cimentación ni relleno de huecos.');
  });
}

function calcularCemento() {
  ejecutar('cemento', function () {
    const r = Calc.hormigon({ largo: val('c-largo'), ancho: val('c-ancho'), espesor: val('c-espesor'), dosif: document.getElementById('c-dosif').value,
      desperdicio: val('c-desp'), saco: val('c-saco'), cem: val('c-cem'), arena: val('c-arena'), grava: val('c-grava') }), f = Calc.fmt;
    return resumen('🛒 Cemento: <strong>' + f(r.sacos, 0) + (r.sacos === 1 ? ' saco' : ' sacos') + ' de ' + f(r.saco, r.saco % 1 ? 1 : 0) + ' kg</strong>', [
      '🏖️ Arena: <strong>' + Calc.fmtVol(r.arena, 2) + ' m³</strong>',
      '🪨 Grava: <strong>' + Calc.fmtVol(r.grava, 2) + ' m³</strong>',
      '📦 Hormigón a preparar: ' + Calc.fmtVol(r.volT, 2) + ' m³ (' + Calc.fmtVol(r.vol, 2) + ' m³ + ' + f(r.desp, 0) + '% de desperdicio)',
      '⚖️ Cemento exacto: ' + f(r.kg, 0) + ' kg (dosificación ' + r.dos.nombre + ': ' + r.dos.cem + ' kg por m³)'],
      'Estimación orientativa de materiales, no un diseño estructural ni una garantía de resistencia. El consumo real depende de los materiales, la humedad, la granulometría, la compactación y el diseño de mezcla. El mortero de pega o revoque lleva otras proporciones.');
  });
}

function calcularCeramica() {
  ejecutar('ceramica', function () {
    const r = Calc.ceramica({ largo: val('ce-largo'), ancho: val('ce-ancho'), descuento: val('ce-descuento'), desperdicio: val('ce-desp'),
      caja: valOpc('ce-caja'), rend: val('ce-rend'), saco: val('ce-saco') }), f = Calc.fmt, l = [];
    l.push('📐 Área neta del piso: <strong>' + f(r.area, 2) + ' m²</strong>');
    l.push('➕ Con ' + f(r.desp, 0) + '% de desperdicio: <strong>' + f(r.compra, 2) + ' m²</strong>');
    if (r.cajas !== null) l.push('📦 Cajas de ' + f(r.caja, 2) + ' m²: <strong>' + f(r.cajas, 0) + '</strong> (' + f(r.m2cajas, 2) + ' m² en total)');
    l.push('🧴 Adhesivo: ' + f(r.kg, 1) + ' kg → <strong>' + f(r.sacos, 0) + (r.sacos === 1 ? ' saco' : ' sacos') + ' de ' + f(r.saco, 0) + ' kg</strong>');
    return resumen('🛒 Compra: <strong>' + f(r.compra, 2) + ' m² de cerámica</strong>', l,
      'El desperdicio real depende del patrón (diagonal desperdicia más), los cortes y el tamaño de la pieza. El consumo de adhesivo depende de la llana y del producto: revisa su ficha técnica.');
  });
}

function calcularAgua() {
  ejecutar('agua', function () {
    const r = Calc.agua({ diametro: val('a-diametro'), altura: val('a-altura'), capacidad: valOpc('a-capacidad', true), habitantes: val('a-habitantes'),
      consumo: val('a-consumo'), util: val('a-util') }), f = Calc.fmt;
    const usoCapacidad = valOpc('a-capacidad', true) !== null && (valOpc('a-diametro') !== null || valOpc('a-altura') !== null);
    const aut = r.dias < 1 ? '≈ ' + f(r.dias * 24, 1) + ' horas' : f(r.dias, 1) + ' días';
    return resumen('⏱️ Autonomía estimada: <strong>' + aut + '</strong>', [
      '💧 Capacidad del tanque: <strong>' + f(r.total, 0) + ' litros</strong>',
      '✅ Volumen utilizable (' + f(r.util, 0) + '%): <strong>' + f(r.utilL, 0) + ' litros</strong>',
      '🚿 Consumo del hogar: ' + f(r.diario, 0) + ' litros al día (' + f(r.hab, 0) + ' personas × ' + f(r.cons, 0) + ' L)'].concat(usoCapacidad ? ['📝 Se usó la capacidad que escribiste; el diámetro y la altura se ignoraron.'] : []),
      'Es una estimación, no una garantía: el consumo real cambia con los hábitos, el clima, el riego y las fugas. Solo se cuenta el ' + f(r.util, 0) + '% del volumen porque el fondo del tanque y el agua bajo la salida no se aprovechan bien (puedes cambiarlo en Ajustes).');
  });
}

/* ==== NAVEGACIÓN ENTRE CALCULADORA Y GUÍAS ==== */
function aplicarHash() {
  const card = document.querySelector('.card[id^="card-"]');
  if (!card) return;
  const hash = window.location.hash.replace('#', '');
  const guia = hash ? document.getElementById(hash) : null;
  document.querySelectorAll('.guia-seccion').forEach(function (g) { g.style.display = 'none'; });
  if (guia && guia.classList.contains('guia-seccion')) { card.style.display = 'none'; guia.style.display = 'block'; }
  else { card.style.display = 'block'; }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('hashchange', aplicarHash);
  aplicarHash();
}
