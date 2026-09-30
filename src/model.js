window.Acta = window.Acta || {};

/* Modelo del acta: creación, lectura/escritura de valores y utilidades numéricas. */
Acta.Model = (function () {
  function pad(n) { return String(n).padStart(2, '0'); }

  function uid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* sin crypto */ }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function fecha(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hora(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function newActa(now) {
    const d = now || new Date(), t = d.getTime();
    return {
      id: uid(), createdAt: t, updatedAt: t, status: 'borrador',
      values: { 'acta.fecha': fecha(d), 'acta.horaIngreso': hora(d) },
      tables: {}, images: {}
    };
  }

  function touch(acta) { acta.updatedAt = Date.now(); }

  function get(acta, id) { return acta.values[id]; }
  function set(acta, id, v) { acta.values[id] = v; touch(acta); }

  function getCell(acta, table, row, col) {
    const t = acta.tables[table];
    return t && t[row] ? t[row][col] : undefined;
  }
  function setCell(acta, table, row, col, v) {
    const t = acta.tables[table] = acta.tables[table] || {};
    (t[row] = t[row] || {})[col] = v;
    touch(acta);
  }

  function parseNum(s) {
    if (typeof s === 'number') return isFinite(s) ? s : null;
    if (s == null) return null;
    const txt = String(s).trim().replace(',', '.');
    if (!txt || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(txt)) return null;
    const n = Number(txt);
    return isFinite(n) ? n : null;
  }

  function formatNum(n, maxDec) {
    const k = Math.pow(10, maxDec == null ? 3 : maxDec);
    return String(Math.round(n * k) / k).replace('.', ',');
  }

  function diferencia(inicial, final) {
    const a = parseNum(inicial), b = parseNum(final);
    return a === null || b === null ? '' : formatNum(b - a);
  }

  function isEmpty(v) {
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return String(v).trim() === '';
  }

  return { newActa, get, set, getCell, setCell, parseNum, formatNum, diferencia, isEmpty, fecha, hora };
})();
