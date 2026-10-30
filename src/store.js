window.Acta = window.Acta || {};

/* Almacenamiento local: actas (borradores e historial), perfil del técnico y sugerencias propias.
   Usa IndexedDB; si no está disponible, guarda en memoria mientras la página esté abierta. */
Acta.Store = (function () {
  let db = null;
  const mem = { actas: new Map(), kv: new Map() };
  const clone = x => JSON.parse(JSON.stringify(x));

  function req(r) {
    return new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  }
  function tx(store, mode, fn) {
    return new Promise((ok, ko) => {
      const t = db.transaction(store, mode);
      let out;
      t.oncomplete = () => ok(out);
      t.onerror = t.onabort = () => ko(t.error);
      Promise.resolve(fn(t.objectStore(store))).then(v => { out = v; }, ko);
    });
  }

  async function init(opts) {
    const dbName = (opts && opts.dbName) || 'acta-digital';
    try {
      if (!window.indexedDB) throw new Error('sin IndexedDB');
      const open = indexedDB.open(dbName, 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('actas', { keyPath: 'id' });
        open.result.createObjectStore('kv');
      };
      db = await req(open);
      return { persistent: true };
    } catch (e) {
      db = null;
      return { persistent: false };
    }
  }

  async function put(acta) {
    if (!db) { mem.actas.set(acta.id, clone(acta)); return; }
    await tx('actas', 'readwrite', s => req(s.put(clone(acta))));
  }

  function isQuota(e) {
    return e && (e.name === 'QuotaExceededError' || e.code === 22 || /quota/i.test(e.message || ''));
  }

  async function save(acta) {
    try {
      await put(acta);
      return { ok: true };
    } catch (e) {
      if (!isQuota(e)) throw e;
      const keys = Object.keys(acta.images || {});
      if (!keys.length) throw e;
      const biggest = keys.reduce((a, b) => (String(acta.images[b]).length > String(acta.images[a]).length ? b : a));
      const copy = clone(acta);
      delete copy.images[biggest];
      await put(copy);
      return { ok: true, dropped: biggest };
    }
  }

  async function list() {
    const all = db ? await tx('actas', 'readonly', s => req(s.getAll())) : [...mem.actas.values()].map(clone);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async function get(id) {
    if (!db) { const x = mem.actas.get(id); return x ? clone(x) : undefined; }
    return tx('actas', 'readonly', s => req(s.get(id)));
  }

  async function remove(id) {
    if (!db) { mem.actas.delete(id); return; }
    await tx('actas', 'readwrite', s => req(s.delete(id)));
  }

  async function latestDraft() {
    return (await list()).find(a => a.status === 'borrador') || null;
  }

  async function duplicate(id) {
    const src = await get(id);
    if (!src) throw new Error('No se encontró el acta.');
    const fresh = Acta.Model.newActa();
    const values = Object.assign(clone(src.values), {
      'acta.fecha': fresh.values['acta.fecha'], 'acta.horaIngreso': fresh.values['acta.horaIngreso']
    });
    delete values['acta.numero'];
    delete values['acta.horaSalida'];
    const next = await nextNumero();
    if (next) values['acta.numero'] = next;
    const copy = Object.assign(fresh, { values, tables: clone(src.tables || {}), images: {} });
    await save(copy);
    return copy;
  }

  async function kvGet(key) {
    if (!db) return mem.kv.has(key) ? clone(mem.kv.get(key)) : undefined;
    return tx('kv', 'readonly', s => req(s.get(key)));
  }
  async function kvSet(key, value) {
    if (!db) { mem.kv.set(key, clone(value)); return; }
    await tx('kv', 'readwrite', s => req(s.put(value, key)));
  }

  const getProfile = async () => (await kvGet('profile')) || null;
  const setProfile = p => kvSet('profile', p);
  const getSuggestions = async listId => (await kvGet('sug:' + listId)) || [];

  async function addSuggestion(listId, value) {
    const v = String(value || '').trim();
    if (!v || ((Acta.Lists && Acta.Lists[listId]) || []).indexOf(v) !== -1) return;
    const cur = await getSuggestions(listId);
    if (cur.indexOf(v) !== -1) return;
    cur.push(v);
    await kvSet('sug:' + listId, cur.slice(-50));
  }

  /* Consecutivo de actas: el último número generado se guarda aparte (por si se borra el historial);
     los borradores y actas existentes también cuentan, para no repetir números. */
  async function nextNumero() {
    const refs = [await kvGet('ultimoNumero')];
    (await list()).forEach(a => refs.push(a.values && a.values['acta.numero']));
    return Acta.Model.siguienteNumero(refs);
  }

  async function registrarNumero(numero) {
    const t = String(numero == null ? '' : numero).trim();
    if (!/^\d+$/.test(t)) return;
    const cur = await kvGet('ultimoNumero');
    if (cur && /^\d+$/.test(cur) && BigInt(cur) >= BigInt(t)) return;
    await kvSet('ultimoNumero', t);
  }

  let timer = null;
  function saveDebounced(acta, onDone) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      save(acta).then(r => onDone && onDone(null, r), e => onDone && onDone(e));
    }, 500);
  }

  return { init, list, latestDraft, get, save, remove, duplicate, getProfile, setProfile,
    getSuggestions, addSuggestion, saveDebounced, nextNumero, registrarNumero };
})();
