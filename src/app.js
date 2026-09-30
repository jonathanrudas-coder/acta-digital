window.Acta = window.Acta || {};

/* Aplicación: pantallas Inicio → Formulario → Revisión → Vista previa, con navegación por hash
   (#/, #/acta/<id>[/<campo>], #/revision/<id>, #/vista/<id>) para que funcione el botón atrás. */
Acta.App = (function () {
  const M = () => Acta.Model;
  const FMT_KEY = 'acta.formato';
  let root, persistent = true, cur = null, form = null, lastDropped = null, onResize = null;

  // ── utilidades de UI ──
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(c => c && el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  }
  const icon = n => h('i', { class: 'ri-' + n, 'aria-hidden': 'true' });
  const go = hash => { if (location.hash === hash) route(); else location.hash = hash; };
  const actaTitle = a => 'Acta N° ' + (M().get(a, 'acta.numero') || 'sin número');
  function alertBox(text, warn, extra) {
    return h('div', { class: 'o-alert' + (warn ? ' is-warning' : '') }, [icon(warn ? 'alert-line' : 'information-line'),
      h('div', { class: 'o-alert-body' }, [text].concat(extra || []))]);
  }
  function topbar(title, backHash, right) {
    return h('header', { class: 'a-top' }, [
      backHash ? h('button', { type: 'button', class: 'o-btn-compact', 'aria-label': 'Volver', onclick: () => go(backHash) }, [icon('arrow-left-line')]) : null,
      h('h1', { class: 'a-top-title', text: title }), right || null
    ]);
  }
  function screen(children) {
    if (form) { form.destroy(); form = null; }
    if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
    root.innerHTML = '';
    children.forEach(c => c && root.appendChild(c));
    window.scrollTo(0, 0);
  }
  const fmtDate = t => new Date(t).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  function readFmt() { try { return localStorage.getItem(FMT_KEY) === 'jpg' ? 'jpg' : 'png'; } catch (e) { return 'png'; } }
  function writeFmt(v) { try { localStorage.setItem(FMT_KEY, v); } catch (e) { /* sin almacenamiento */ } }

  async function flush() {
    if (!cur) return;
    try { const r = await Acta.Store.save(cur); lastDropped = r.dropped || null; } catch (e) { /* se reintenta en el próximo cambio */ }
  }
  async function load(id) {
    if (cur && cur.id === id) return cur;
    cur = (await Acta.Store.get(id)) || null;
    return cur;
  }

  // ── Inicio ──
  async function home() {
    cur = null;
    const all = await Acta.Store.list();
    const draft = all.find(a => a.status === 'borrador');
    const newBtn = h('button', { type: 'button', class: 'o-btn-fancy a-wide', onclick: async () => {
      const a = M().newActa(); await Acta.Store.save(a); cur = a; go('#/acta/' + a.id);
    } }, [icon('add-line'), 'Nueva acta']);

    function row(a) {
      let armed = null;
      const del = h('button', { type: 'button', class: 'o-btn is-error', onclick: async () => {
        if (!armed) {
          del.lastChild.textContent = 'Toca otra vez para eliminar';
          armed = setTimeout(() => { armed = null; del.lastChild.textContent = 'Eliminar'; }, 3000);
          return;
        }
        clearTimeout(armed); await Acta.Store.remove(a.id); home();
      } }, [icon('delete-bin-line'), h('span', { text: 'Eliminar' })]);
      const gen = a.status === 'generada';
      return h('li', { class: 'o-card a-item' }, [
        h('div', { class: 'a-item-head' }, [
          h('div', { class: 'a-item-title' }, [h('strong', { text: actaTitle(a) }),
            h('span', { class: 'a-muted', text: (M().get(a, 'com.cuenta') || 'Sin cuenta') + ' · ' + fmtDate(a.updatedAt) })]),
          h('span', { class: 'o-badge' + (gen ? ' is-ok' : ''), text: gen ? 'Generada' : 'Borrador' })
        ]),
        h('div', { class: 'a-item-actions' }, [
          h('button', { type: 'button', class: 'o-btn', onclick: () => go((gen ? '#/vista/' : '#/acta/') + a.id) },
            [icon(gen ? 'eye-line' : 'edit-line'), gen ? 'Ver' : 'Continuar']),
          h('button', { type: 'button', class: 'o-btn', onclick: async () => { const d = await Acta.Store.duplicate(a.id); cur = d; go('#/acta/' + d.id); } },
            [icon('file-copy-line'), 'Duplicar']),
          del
        ])
      ]);
    }
    const drafts = all.filter(a => a.status !== 'generada'), done = all.filter(a => a.status === 'generada');
    const list = (title, items) => items.length ? [h('h2', { class: 'o-sub a-list-title', text: title }), h('ul', { class: 'a-list' }, items.map(row))] : [];

    screen([
      topbar('Actas de visita previa'),
      h('div', { class: 'a-page' }, [
        !persistent ? alertBox('Este dispositivo no guarda borradores. No cierres la app hasta generar las imágenes.', true) : null,
        draft ? alertBox('Tienes un acta sin terminar.', false, [' ', h('button', { type: 'button', class: 'o-link', text: 'Continuar ' + actaTitle(draft).replace('Acta ', 'acta '), onclick: () => go('#/acta/' + draft.id) })]) : null,
        newBtn,
        ...list('Borradores', drafts),
        ...list('Generadas', done),
        !all.length ? h('p', { class: 'a-muted a-empty', text: 'Aún no tienes actas. Crea la primera con "Nueva acta".' }) : null
      ])
    ]);
  }

  // ── Formulario ──
  async function editor(id, focusKey) {
    const a = await load(id);
    if (!a) return go('#/');
    const title = h('h1', { class: 'a-top-title', text: actaTitle(a) });
    const bar = h('span');
    const meterTxt = h('span', { class: 'a-muted' });
    const notice = h('div', { class: 'a-notice', hidden: true });
    const host = h('div');
    function meter() {
      const miss = Acta.Validate.run(a).missing.length, done = 7 - miss;
      meterTxt.textContent = done + ' de 7 obligatorios';
      bar.style.width = Math.round(done / 7 * 100) + '%';
      title.textContent = actaTitle(a);
    }
    screen([
      h('header', { class: 'a-top' }, [
        h('button', { type: 'button', class: 'o-btn-compact', 'aria-label': 'Volver', onclick: async () => { await flush(); go('#/'); } }, [icon('arrow-left-line')]),
        title
      ]),
      host,
      h('footer', { class: 'a-bar' }, [
        h('div', { class: 'a-bar-in' }, [
          h('div', { class: 'a-meter' }, [meterTxt, h('div', { class: 'o-progress' }, [bar])]),
          h('button', { type: 'button', class: 'o-btn-fancy', onclick: async () => { await flush(); go('#/revision/' + a.id); } }, ['Revisar y generar'])
        ]),
        notice
      ])
    ]);
    form = Acta.Form.mount(host, a, { onChange: () => {
      meter();
      Acta.Store.saveDebounced(a, (err, r) => {
        const dropped = r && r.dropped;
        notice.hidden = !dropped;
        if (dropped) notice.textContent = 'No hay espacio suficiente: no se guardó ' + ((Acta.Catalog.byId(dropped) || {}).label || dropped).toLowerCase() + '.';
      });
    } });
    meter();
    if (focusKey) form.focusField(decodeURIComponent(focusKey));
  }

  // ── Revisión ──
  async function review(id) {
    const a = await load(id);
    if (!a) return go('#/');
    const r = Acta.Validate.run(a);
    const item = (text, key, warn) => h('li', { class: 'a-check' }, [
      icon(warn ? 'alert-line' : 'error-warning-line'), h('span', { text }),
      h('button', { type: 'button', class: 'o-link', text: 'Completar', onclick: () => go('#/acta/' + a.id + '/' + encodeURIComponent(key)) })
    ]);
    const clean = !r.missing.length && !r.warnings.length;
    screen([
      topbar('Revisión · ' + actaTitle(a), '#/acta/' + a.id),
      h('div', { class: 'a-page' }, [
        clean ? alertBox('Todo listo. No faltan datos obligatorios ni hay avisos.', false) : null,
        r.missing.length ? h('section', { class: 'o-card a-block' }, [h('h2', { class: 'o-sub', text: 'Faltan datos obligatorios' }),
          h('ul', { class: 'a-checks' }, r.missing.map(m => item(m.label, m.id, false)))]) : null,
        r.warnings.length ? h('section', { class: 'o-card a-block' }, [h('h2', { class: 'o-sub', text: 'Avisos' }),
          h('ul', { class: 'a-checks' }, r.warnings.map(w => item(w.message, w.sectionId, true)))]) : null,
        h('div', { class: 'a-actions' }, [
          clean ? null : h('button', { type: 'button', class: 'o-btn', onclick: () => go('#/acta/' + a.id) }, ['Completar datos']),
          h('button', { type: 'button', class: 'o-btn-fancy', onclick: () => go('#/vista/' + a.id) }, [clean ? 'Generar imágenes' : 'Generar de todas formas'])
        ])
      ])
    ]);
  }

  // ── Vista previa ──
  async function preview(id) {
    const a = await load(id);
    if (!a) return go('#/');
    // La hora de salida se propone al ver la vista previa; el acta pasa a "generada" solo al exportar.
    if (M().isEmpty(M().get(a, 'acta.horaSalida'))) { M().set(a, 'acta.horaSalida', Acta.Capture.now().hora); await flush(); }

    let fmt = readFmt();
    const nodes = Acta.Sheets.render(Acta.Sheets.model(a));
    const frames = nodes.map(n => h('div', { class: 'v-frame' }, [n]));
    const stage = h('div', { class: 'v-stage' }, frames);
    function layout() {
      const k = Math.min(1, stage.clientWidth / 1080);
      nodes.forEach((n, i) => { n.style.transform = 'scale(' + k + ')'; frames[i].style.height = Math.ceil(n.offsetHeight * k) + 'px'; });
    }
    const status = h('div', { class: 'a-status', 'aria-live': 'polite' });
    const segBox = h('div', { class: 'o-seg a-fmt', role: 'group', 'aria-label': 'Formato' });
    ['PNG', 'JPG'].forEach(label => segBox.appendChild(h('button', { type: 'button', text: label, 'aria-pressed': String(fmt === label.toLowerCase()), onclick: e => {
      fmt = label.toLowerCase(); writeFmt(fmt);
      segBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      prepare();
    } })));
    const probe = [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })];
    const share = Acta.Export.canShareFiles(probe);
    const main = h('button', { type: 'button', class: 'o-btn-fancy', onclick: run }, [icon(share ? 'share-line' : 'download-line'), share ? 'Compartir' : 'Descargar']);

    /* Las imágenes se generan antes del toque, para que "Compartir" llame a navigator.share
       dentro del gesto del usuario (si tarda, el navegador lo rechaza y solo queda descargar). */
    const ready = {};
    function prepare() {
      if (!ready[fmt]) {
        const f = fmt;
        ready[f] = Acta.Export.makeFiles(nodes, f, M().get(a, 'acta.numero'), M().get(a, 'acta.fecha') || Acta.Capture.now().fecha);
        ready[f].catch(() => { delete ready[f]; });
      }
      return ready[fmt];
    }

    async function run() {
      main.classList.add('is-loading'); status.innerHTML = '';
      try {
        const files = await prepare();
        const how = await Acta.Export.deliver(files);
        if (how === 'retry') {
          status.appendChild(alertBox('Las imágenes ya están listas. Toca "Compartir" otra vez.', false));
          return;
        }
        a.status = 'generada'; a.updatedAt = Date.now(); await flush();
        status.appendChild(alertBox(how === 'shared' ? 'Imágenes listas para compartir.' : 'Se descargaron ' + files.length + ' imágenes: ' + files.map(f => f.name).join(', ') + '.', false));
      } catch (e) {
        status.appendChild(alertBox(e.message, true, [' ', h('button', { type: 'button', class: 'o-link', text: 'Reintentar', onclick: run })]));
      } finally { main.classList.remove('is-loading'); }
    }

    screen([
      topbar('Vista previa · ' + actaTitle(a), '#/acta/' + a.id),
      h('div', { class: 'a-page' }, [
        h('div', { class: 'a-actions a-sticky' }, [segBox, h('button', { type: 'button', class: 'o-btn', onclick: () => go('#/acta/' + a.id) }, [icon('edit-line'), 'Editar']), main]),
        status, stage
      ])
    ]);
    layout();
    nodes.forEach(n => n.querySelectorAll('img').forEach(img => img.addEventListener('load', layout)));
    onResize = layout;
    window.addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); prepare(); }); else prepare();
  }

  async function route() {
    const parts = (location.hash || '#/').slice(2).split('/');
    try {
      if (parts[0] === 'acta' && parts[1]) return await editor(parts[1], parts[2]);
      if (parts[0] === 'revision' && parts[1]) return await review(parts[1]);
      if (parts[0] === 'vista' && parts[1]) return await preview(parts[1]);
      return await home();
    } catch (e) {
      screen([topbar('Algo salió mal', '#/'), h('div', { class: 'a-page' }, [alertBox(e.message || String(e), true)])]);
    }
  }

  async function start() {
    root = document.getElementById('app');
    persistent = (await Acta.Store.init()).persistent;
    window.addEventListener('hashchange', route);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    route();
    registerSW();
  }

  function registerSW() {
    try {
      const secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if ('serviceWorker' in navigator && window.top === window.self && secure) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    } catch (e) { /* sin service worker: la app funciona igual con conexión */ }
  }

  return { start };
})();

document.addEventListener('DOMContentLoaded', () => Acta.App.start());
