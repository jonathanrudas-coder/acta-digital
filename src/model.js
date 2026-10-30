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

  /* Pruebas del medidor: con V, I y FP de cada fila calcula Smed = k·V·I, P = Smed·FP y Q = Smed·sen θ.
     k = √3 solo en la fila Total cuando el totalizador es de 3 fases; en lo demás k = 1. */
  function recalcPruebas(acta) {
    const tri = String(get(acta, 'tot.fases') || '').trim() === '3';
    ['R', 'S', 'T', 'Total'].forEach(row => {
      const v = parseNum(getCell(acta, 'pruebasFase', row, 'voltaje'));
      const i = parseNum(getCell(acta, 'pruebasFase', row, 'corriente'));
      const fp = parseNum(getCell(acta, 'pruebasFase', row, 'fp'));
      const s = v === null || i === null ? null : (row === 'Total' && tri ? Math.sqrt(3) : 1) * v * i;
      const okFp = s !== null && fp !== null && fp >= 0 && fp <= 1;
      const out = { smed: s, p: okFp ? s * fp : null, q: okFp ? s * Math.sqrt(1 - fp * fp) : null };
      Object.keys(out).forEach(col => {
        const val = out[col] === null ? '' : formatNum(out[col], 2);
        if ((getCell(acta, 'pruebasFase', row, col) || '') !== val) setCell(acta, 'pruebasFase', row, col, val);
      });
    });
  }

  function isEmpty(v) {
    if (v == null) return true;
    if (Array.isArray(v)) return v.length === 0;
    return String(v).trim() === '';
  }

  /* Siguiente número de acta: toma el mayor número (solo dígitos) entre las referencias, le suma 1
     y conserva el largo con ceros a la izquierda. Sin referencias numéricas devuelve ''. */
  function siguienteNumero(refs) {
    let best = null;
    (refs || []).forEach(r => {
      const t = String(r == null ? '' : r).trim();
      if (!/^\d+$/.test(t)) return;
      const v = BigInt(t);
      if (!best || v > best.v || (v === best.v && t.length > best.t.length)) best = { v, t };
    });
    return best ? (best.v + 1n).toString().padStart(best.t.length, '0') : '';
  }

  return { newActa, siguienteNumero, get, set, getCell, setCell, parseNum, formatNum, diferencia, recalcPruebas, isEmpty, fecha, hora };
})();
