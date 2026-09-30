window.Acta = window.Acta || {};

/* Formulario generado desde el catálogo. Cada control se registra con una función `update`
   para poder refrescarse sin volver a pintar todo (así no se pierde el foco). */
Acta.Form = (function () {
  const M = () => Acta.Model;
  const OPTIONS = { yesno: ['Sí', 'No'], goodbad: ['Bueno', 'Malo'] };
  const NO_COUNT = { computed: 1, mirror: 1, gps: 1, allYes: 1 };
  const PROFILE_KEYS = { 'firma.bia.nombre': 'nombre', 'firma.bia.cc': 'cc', 'firma.bia.tel': 'tel' };

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
  const icon = name => h('i', { class: 'ri-' + name, 'aria-hidden': 'true' });

  function mount(root, acta, opts) {
    const onChange = (opts && opts.onChange) || function () {};
    const updaters = [];
    let sink = updaters; // los controles registran su update aquí; las filas de listas usan su propio arreglo
    const pads = [];
    const datalists = {};
    root.innerHTML = '';
    const wrap = h('div', { class: 'f-wrap' });
    root.appendChild(wrap);

    function changed() {
      if (acta.status === 'generada') acta.status = 'borrador';
      refreshVisibility(); updaters.forEach(u => u()); onChange(acta);
    }

    // ── accesores ──
    const topAcc = id => ({ get: () => M().get(acta, id), set: v => M().set(acta, id, v) });
    const cellAcc = (table, row, col) => ({
      get: () => M().getCell(acta, table, row, col), set: v => M().setCell(acta, table, row, col, v)
    });

    function datalistFor(listId) {
      if (datalists[listId]) return datalists[listId].id;
      const dl = h('datalist', { id: 'dl-' + listId });
      const fill = extra => {
        dl.innerHTML = '';
        (Acta.Lists[listId] || []).concat(extra || []).forEach(v => dl.appendChild(h('option', { value: v })));
      };
      fill();
      Acta.Store.getSuggestions(listId).then(fill, () => {});
      datalists[listId] = { id: dl.id, fill };
      wrap.appendChild(dl);
      return dl.id;
    }

    function seg(options, acc) {
      const box = h('div', { class: 'o-seg', role: 'group' });
      const btns = options.map(o => h('button', { type: 'button', text: o, onclick: () => {
        acc.set(acc.get() === o ? '' : o); changed();
      } }));
      btns.forEach(b => box.appendChild(b));
      sink.push(() => btns.forEach(b => b.setAttribute('aria-pressed', String(acc.get() === b.textContent))));
      return box;
    }

    function control(field, acc, inputId) {
      const t = field.type;
      if (OPTIONS[t] || (t === 'choice' && field.options.length <= 5)) return seg(OPTIONS[t] || field.options, acc);
      if (t === 'choice') {
        const sel = h('select', { class: 'o-select', id: inputId, onchange: e => { acc.set(e.target.value); changed(); } },
          [h('option', { value: '', text: 'Selecciona…' })].concat(field.options.map(o => h('option', { value: o, text: o }))));
        sink.push(() => { sel.value = acc.get() || ''; });
        return sel;
      }
      if (t === 'multi') {
        const box = h('div', { class: 'f-multi' });
        field.options.forEach(o => {
          const cb = h('input', { type: 'checkbox', onchange: () => {
            const cur = (acc.get() || []).filter(x => x !== o);
            if (cb.checked) cur.push(o);
            acc.set(cur); changed();
          } });
          sink.push(() => { cb.checked = (acc.get() || []).indexOf(o) !== -1; });
          box.appendChild(h('label', { class: 'o-check' }, [cb, o]));
        });
        return box;
      }
      if (t === 'textarea') {
        const ta = h('textarea', { class: 'o-textarea', id: inputId, oninput: e => { acc.set(e.target.value); changed(); } });
        sink.push(() => { if (document.activeElement !== ta) ta.value = acc.get() || ''; });
        return ta;
      }
      if (t === 'computed' || t === 'mirror') {
        const ro = h('input', { class: 'o-input', id: inputId, readonly: true, tabindex: '-1' });
        sink.push(() => { ro.value = Acta.Sheets.display(field, acta) || '—'; });
        return ro;
      }
      // text, number, date, time, suggest
      const type = t === 'date' || t === 'time' ? t : 'text';
      const inp = h('input', {
        class: 'o-input', id: inputId, type, inputmode: field.inputmode, autocomplete: 'off',
        list: t === 'suggest' ? datalistFor(field.list) : null,
        oninput: e => { acc.set(e.target.value); changed(); },
        onchange: e => {
          if (t === 'suggest' && e.target.value.trim()) {
            Acta.Store.addSuggestion(field.list, e.target.value).then(() =>
              Acta.Store.getSuggestions(field.list).then(s => datalists[field.list].fill(s)), () => {});
          }
        }
      });
      sink.push(() => { if (document.activeElement !== inp) inp.value = acc.get() || ''; });
      return inp;
    }

    function labelled(field, ctl, inputId, key) {
      const unit = field.unit ? ' (' + field.unit + ')' : '';
      return h('div', { class: 'f-field', 'data-field': key || field.id }, [
        h('label', { class: 'o-label' + (field.required ? ' is-required' : ''), for: inputId, text: field.label + unit }), ctl
      ]);
    }

    function padField(field) {
      const canvas = h('canvas', { class: 'o-pad', 'aria-label': field.label });
      const grid = field.type === 'drawing';
      const p = Acta.Capture.pad(canvas, { grid, onChange: () => {
        const url = p.toDataURL();
        if (url) acta.images[field.id] = url; else delete acta.images[field.id];
        acta.updatedAt = Date.now(); changed();
      } });
      pads.push({ pad: p, id: field.id });
      if (acta.images[field.id]) p.load(acta.images[field.id]);
      const tools = h('div', { class: 'f-tools' }, [
        grid ? h('button', { type: 'button', class: 'o-btn', onclick: () => p.undo() }, [icon('arrow-go-back-line'), 'Deshacer']) : null,
        h('button', { type: 'button', class: 'o-btn', onclick: () => p.clear() }, [icon('eraser-line'), 'Borrar'])
      ]);
      return h('div', { class: 'f-field', 'data-field': field.id }, [h('label', { class: 'o-label', text: field.label }), canvas, tools]);
    }

    function photoField(field) {
      const input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
      const img = h('img', { class: 'f-photo', alt: field.label });
      const hint = h('div', { class: 'o-hint is-error', hidden: true });
      const remove = h('button', { type: 'button', class: 'o-btn is-error', onclick: () => {
        delete acta.images[field.id]; acta.updatedAt = Date.now(); changed();
      } }, [icon('delete-bin-line'), 'Quitar']);
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        hint.hidden = true;
        try { acta.images[field.id] = await Acta.Capture.photo(file); acta.updatedAt = Date.now(); changed(); }
        catch (e) { hint.hidden = false; hint.textContent = e.message; }
      });
      updaters.push(() => {
        const src = acta.images[field.id];
        img.hidden = remove.hidden = !src;
        if (src && img.src !== src) img.src = src;
      });
      return h('div', { class: 'f-field', 'data-field': field.id }, [
        h('label', { class: 'o-label', text: field.label }), img,
        h('div', { class: 'f-tools' }, [h('button', { type: 'button', class: 'o-btn', onclick: () => input.click() }, [icon('camera-line'), 'Tomar o subir foto']), remove]),
        input, hint
      ]);
    }

    function gpsField(field) {
      const hint = h('div', { class: 'o-hint', hidden: true });
      const btn = h('button', { type: 'button', class: 'o-btn', onclick: async () => {
        btn.disabled = true; hint.hidden = false; hint.className = 'o-hint'; hint.textContent = 'Obteniendo ubicación…';
        try {
          const p = await Acta.Capture.gps();
          const [lat, lon, alt] = field.targets;
          M().set(acta, lat, p.lat.toFixed(6)); M().set(acta, lon, p.lon.toFixed(6));
          M().set(acta, alt, p.alt == null ? '' : String(Math.round(p.alt)));
          hint.hidden = true; changed();
        } catch (e) { hint.className = 'o-hint is-error'; hint.textContent = e.message; }
        btn.disabled = false;
      } }, [icon('map-pin-line'), 'Capturar ubicación']);
      return h('div', { class: 'f-field', 'data-field': field.id }, [h('label', { class: 'o-label', text: field.label }), btn, hint]);
    }

    function gridField(field) {
      const box = h('div', { class: 'f-field f-grid', 'data-field': field.id }, [h('div', { class: 'o-sub', text: field.label })]);
      field.rows.forEach(row => {
        const cells = field.columns.map(col => {
          const key = field.id + '.' + row + '.' + col.id, id = 'in-' + key.replace(/[^\w-]/g, '_');
          return labelled(col, control(col, cellAcc(field.id, row, col.id), id), id, key);
        });
        box.appendChild(h('div', { class: 'f-row' }, [h('div', { class: 'f-row-title', text: row }), h('div', { class: 'f-cols' }, cells)]));
      });
      return box;
    }

    function listField(field) {
      const rowsBox = h('div', { class: 'f-list' });
      const data = () => (acta.tables[field.id] = acta.tables[field.id] || []);
      let rowUpdaters = [];
      updaters.push(() => rowUpdaters.forEach(u => u()));
      function paint() {
        rowsBox.innerHTML = '';
        rowUpdaters = [];
        sink = rowUpdaters;
        data().forEach((row, i) => {
          const cells = field.columns.map(col => {
            const id = 'in-' + field.id + '-' + i + '-' + col.id;
            const acc = { get: () => data()[i][col.id], set: v => { data()[i][col.id] = v; acta.updatedAt = Date.now(); } };
            return labelled(col, control(col, acc, id), id, field.id + '.' + i + '.' + col.id);
          });
          rowsBox.appendChild(h('div', { class: 'f-row' }, [
            h('div', { class: 'f-row-title' }, ['Máquina ' + (i + 1),
              h('button', { type: 'button', class: 'o-btn-compact', 'aria-label': 'Quitar máquina ' + (i + 1), onclick: () => {
                data().splice(i, 1); acta.updatedAt = Date.now(); paint(); changed();
              } }, [icon('close-line')])]),
            h('div', { class: 'f-cols' }, cells)
          ]));
        });
        sink = updaters;
        rowUpdaters.forEach(u => u());
      }
      paint();
      return h('div', { class: 'f-field', 'data-field': field.id }, [
        h('div', { class: 'o-sub', text: field.label }), rowsBox,
        h('button', { type: 'button', class: 'o-btn', onclick: () => { data().push({}); acta.updatedAt = Date.now(); paint(); changed(); } },
          [icon('add-line'), 'Agregar máquina'])
      ]);
    }

    function fieldEl(field) {
      switch (field.type) {
        case 'signature': case 'drawing': return padField(field);
        case 'photo': return photoField(field);
        case 'gps': return gpsField(field);
        case 'grid': return gridField(field);
        case 'list': return listField(field);
        case 'allYes':
          return h('div', { class: 'f-field', 'data-field': field.id }, [h('button', { type: 'button', class: 'o-btn', onclick: () => {
            field.group.forEach(id => M().set(acta, id, 'Sí')); changed();
          } }, [icon('check-double-line'), field.label])]);
        default: {
          const id = 'in-' + field.id.replace(/[^\w-]/g, '_');
          const el = labelled(field, control(field, topAcc(field.id), id), id);
          if (PROFILE_KEYS[field.id]) {
            el.addEventListener('change', () => Acta.Store.setProfile({
              nombre: M().get(acta, 'firma.bia.nombre') || '', cc: M().get(acta, 'firma.bia.cc') || '', tel: M().get(acta, 'firma.bia.tel') || ''
            }).catch(() => {}));
          }
          return el;
        }
      }
    }

    // ── índice y secciones ──
    const index = h('nav', { class: 'f-index', 'aria-label': 'Secciones' });
    wrap.appendChild(index);
    const secEls = {};
    Acta.Catalog.sections.forEach((s, i) => {
      const count = h('span', { class: 'f-count' });
      const body = h('div', { class: 'f-body' });
      if (s.note) body.appendChild(h('p', { class: 'f-note', text: s.note }));
      if (s.id === 'tecnica') {
        const alert = h('div', { class: 'o-alert' }, [icon('information-line'),
          h('div', { class: 'o-alert-body', text: 'Elige el tipo de medida para ver solo las secciones que aplican.' })]);
        updaters.push(() => { alert.hidden = !M().isEmpty(M().get(acta, 'tec.tipoMedida')); });
        body.appendChild(alert);
      }
      s.fields.forEach(f => body.appendChild(fieldEl(f)));
      const det = h('details', { class: 'o-card f-sec', id: 'sec-' + s.id, 'data-sec': s.id, open: i === 0 }, [
        h('summary', {}, [h('span', { class: 'f-num', text: String(i + 1) }), h('h2', { text: s.title }), count, icon('arrow-down-s-line')]),
        body
      ]);
      det.addEventListener('toggle', () => { if (det.open) pads.forEach(p => { if (det.contains(document.querySelector('[data-field="' + p.id + '"]'))) p.pad.resize(); }); });
      secEls[s.id] = { det, count, chip: h('button', { type: 'button', class: 'f-chip', text: s.title, onclick: () => open(s.id) }) };
      index.appendChild(secEls[s.id].chip);
      wrap.appendChild(det);
      updaters.push(() => { count.textContent = sectionCount(s); });
    });

    function filled(f) {
      if (f.type === 'grid') return Object.values(acta.tables[f.id] || {}).some(r => Object.values(r).some(v => !M().isEmpty(v)));
      if (f.type === 'list') return (acta.tables[f.id] || []).length > 0;
      if (f.type === 'signature' || f.type === 'drawing' || f.type === 'photo') return !!acta.images[f.id];
      return !M().isEmpty(M().get(acta, f.id));
    }
    function sectionCount(s) {
      const vis = s.fields.filter(f => !NO_COUNT[f.type] && Acta.Rules.isVisible(f.id, acta));
      return vis.filter(filled).length + ' de ' + vis.length;
    }

    function refreshVisibility() {
      wrap.querySelectorAll('.f-body > [data-field]').forEach(el => { el.hidden = !Acta.Rules.isVisible(el.getAttribute('data-field'), acta); });
      Object.entries(secEls).forEach(([id, x]) => { const v = Acta.Rules.isVisible(id, acta); x.det.hidden = !v; x.chip.hidden = !v; });
    }

    function open(sectionId) {
      const x = secEls[sectionId];
      if (!x) return null;
      x.det.open = true;
      x.det.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return x.det;
    }

    function focusField(key) {
      const node = Acta.Catalog.byId(key.split('.').length > 2 && !Acta.Catalog.byId(key) ? key.split('.')[0] : key);
      const secId = node ? (node.sectionId || node.id) : key;
      const det = open(secId);
      const el = wrap.querySelector('[data-field="' + key + '"]');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const inp = el.querySelector('input, select, textarea, button, canvas');
          if (inp && inp.focus) inp.focus({ preventScroll: true });
        }, det ? 50 : 0);
      }
    }

    // precarga del perfil del técnico
    Acta.Store.getProfile().then(p => {
      if (!p) return;
      let any = false;
      Object.entries(PROFILE_KEYS).forEach(([id, k]) => { if (M().isEmpty(M().get(acta, id)) && p[k]) { M().set(acta, id, p[k]); any = true; } });
      if (any) changed();
    }, () => {});

    refreshVisibility();
    updaters.forEach(u => u());

    return {
      refresh() { refreshVisibility(); updaters.forEach(u => u()); },
      focusField,
      destroy() { root.innerHTML = ''; }
    };
  }

  return { mount };
})();
