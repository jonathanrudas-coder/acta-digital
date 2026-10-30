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

  /* Pruebas del medidor: con V, I y FP de cada fase calcula Smed = V·I/1000 (kVA), P = Smed·FP (kW) y Q = Smed·sen θ (kVAR).
     La fila Total toma el promedio de V, I y FP de las fases con dato y usa k = √3 cuando el
     totalizador es de 3 fases (k = 1 en los demás casos). */
  function recalcPruebas(acta) {
    const T = 'pruebasFase', FASES = ['R', 'S', 'T'];
    const put = (row, col, n, dec) => {
      const val = n === null ? '' : formatNum(n, dec == null ? 2 : dec);
      if ((getCell(acta, T, row, col) || '') !== val) setCell(acta, T, row, col, val);
    };
    ['voltaje', 'corriente', 'fp'].forEach(col => {
      const vals = FASES.map(r => parseNum(getCell(acta, T, r, col))).filter(n => n !== null);
      put('Total', col, vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null);
    });
    const tri = String(get(acta, 'tot.fases') || '').trim() === '3';
    FASES.concat('Total').forEach(row => {
      const v = parseNum(getCell(acta, T, row, 'voltaje'));
      const i = parseNum(getCell(acta, T, row, 'corriente'));
      const fp = parseNum(getCell(acta, T, row, 'fp'));
      const s = v === null || i === null ? null : (row === 'Total' && tri ? Math.sqrt(3) : 1) * v * i / 1000; // kVA
      const okFp = s !== null && fp !== null && fp >= 0 && fp <= 1;
      put(row, 'smed', s, 3);
      put(row, 'p', okFp ? s * fp : null, 3);
      put(row, 'q', okFp ? s * Math.sqrt(1 - fp * fp) : null, 3);
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
