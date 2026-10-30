window.Acta = window.Acta || {};

/* Hojas del resumen: modelo puro (qué se muestra) y render a DOM (cómo se ve). */
Acta.Sheets = (function () {
  const M = () => Acta.Model;
  const HIDDEN_TYPES = { gps: 1, allYes: 1 };
  const ROLES = [['usuario', 'Usuario / Testigo'], ['bia', 'BIA'], ['or', 'Operador de red']];

  function format(field, raw) {
    if (M().isEmpty(raw)) return '';
    if (Array.isArray(raw)) return raw.join(', ');
    const s = String(raw).trim();
    return field.type === 'number' && field.unit ? s + ' ' + field.unit : s;
  }

  function display(field, acta) {
    if (field.type === 'computed') {
      return M().diferencia(M().get(acta, 'pr.lecturaInicial'), M().get(acta, 'pr.lecturaFinal'));
    }
    if (field.type === 'mirror') return format(field, M().get(acta, field.source));
    return format(field, M().get(acta, field.id));
  }

  function gridBlock(field, acta) {
    const cols = field.columns;
    const rows = field.rows.map(r => ({ label: r, cells: cols.map(c => format(c, M().getCell(acta, field.id, r, c.id))) }))
      .filter(r => r.cells.some(Boolean));
    if (!rows.length) return null;
    const keep = cols.map((c, i) => rows.some(r => r.cells[i]));
    return {
      kind: 'grid', title: field.label,
      columns: cols.filter((c, i) => keep[i]).map(c => c.label),
      rows: rows.map(r => ({ label: r.label, cells: r.cells.filter((x, i) => keep[i]) }))
    };
  }

  function listBlock(field, acta) {
    const data = acta.tables[field.id] || [];
    const rows = data.map(row => field.columns.map(c => format(c, row && row[c.id]))).filter(r => r.some(Boolean));
    if (!rows.length) return null;
    const keep = field.columns.map((c, i) => rows.some(r => r[i]));
    return {
      kind: 'list',
      columns: field.columns.filter((c, i) => keep[i]).map(c => c.label),
      rows: rows.map(r => r.filter((x, i) => keep[i]))
    };
  }

  function signaturesBlock(acta) {
    const v = id => M().get(acta, id) || '';
    const items = ROLES.map(([k, role]) => ({
      role, src: acta.images['firma.' + k] || '',
      nombre: v('firma.' + k + '.nombre'), cc: v('firma.' + k + '.cc'), tel: v('firma.' + k + '.tel')
    })).filter(x => x.src || x.nombre || x.cc || x.tel);
    return items.length ? { kind: 'signatures', items } : null;
  }

  function sectionModel(section, acta) {
    if (!Acta.Rules.isVisible(section.id, acta)) return null;
    const blocks = [];
    if (section.id === 'firmas') {
      const b = signaturesBlock(acta);
      if (b) blocks.push(b);
    } else {
      let pairs = null, images = null;
      const push = b => { if (b) { blocks.push(b); pairs = images = null; } };
      section.fields.forEach(field => {
        if (HIDDEN_TYPES[field.type] || !Acta.Rules.isVisible(field.id, acta)) return;
        if (field.type === 'grid') return push(gridBlock(field, acta));
        if (field.type === 'list') return push(listBlock(field, acta));
        if (field.type === 'drawing' || field.type === 'photo' || field.type === 'signature') {
          const src = acta.images[field.id];
          if (!src) return;
          if (!images) { images = { kind: 'images', items: [] }; blocks.push(images); pairs = null; }
          images.items.push({ label: field.label, src });
          return;
        }
        const value = display(field, acta);
        if (!value) return;
        if (!pairs) { pairs = { kind: 'pairs', items: [] }; blocks.push(pairs); images = null; }
        pairs.items.push({ label: field.label, value, risk: !!field.risk && field.risk === value });
      });
    }
    return blocks.length ? { id: section.id, title: section.title, blocks } : null;
  }

  function model(acta) {
    M().recalcPruebas(acta);
    const v = id => M().get(acta, id) || '';
    const header = { actaNo: v('acta.numero'), fecha: v('acta.fecha'), horaIngreso: v('acta.horaIngreso'), horaSalida: v('acta.horaSalida') };
    return [1, 2].map(n => ({
      number: n, header,
      sections: Acta.Catalog.sections.filter(s => s.sheet === n).map(s => sectionModel(s, acta)).filter(Boolean)
    }));
  }

  // ───────── render en páginas (1080 px de ancho, tamaño carta, siempre en tema claro) ─────────
  /* La app de la empresa reduce cada imagen a ~540 px de ancho y acepta 4 imágenes, así que el
     resumen se reparte en máximo 4 páginas con letra grande. Si no cabe, primero se alargan las
     páginas (no cambia el tamaño final de la letra) y luego se reduce la letra. Nunca se omiten datos. */
  const PAGE_W = 1080;
  const HEIGHTS = [1528, 1900, 2300, 2800, 3200];
  const SCALES = [1, 0.9, 0.8, 0.7, 0.62, 0.55];
  const LOGO = 'data:image/png;base64,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';
  const WIDE_AT = 40;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function badgeClass(item) {
    if (item.risk) return 'o-badge is-warn';
    if (item.value === 'Sí' || item.value === 'Bueno') return 'o-badge is-ok';
    if (item.value === 'Malo') return 'o-badge is-error';
    if (item.value === 'No') return 'o-badge';
    return null;
  }

  /* Cada bloque se parte en "piezas" (una fila de pares, una fila de tabla, una imagen…) para poder
     seguir en la página siguiente sin cortar una pieza por la mitad. */
  function container(block) {
    if (block.kind === 'pairs') return el('dl', 's-pairs');
    if (block.kind === 'grid' || block.kind === 'list') {
      const wrap = el('div', 's-table');
      if (block.title) wrap.appendChild(el('div', 's-table-title', block.title));
      const table = el('table'), head = el('tr');
      if (block.kind === 'grid') head.appendChild(el('th', null, ''));
      block.columns.forEach(c => head.appendChild(el('th', null, c)));
      table.appendChild(el('thead')).appendChild(head);
      table.appendChild(el('tbody'));
      wrap.appendChild(table);
      wrap._body = table.tBodies[0];
      return wrap;
    }
    if (block.kind === 'images') return el('div', 's-images');
    return el('div', 's-signs');
  }

  function pieces(block, sizes) {
    if (block.kind === 'pairs') return block.items.map(item => () => {
      const wide = item.value.length > WIDE_AT || item.label.length > 60;
      const row = el('div', 's-pair' + (item.risk ? ' is-risk' : '') + (wide ? ' is-wide' : ''));
      row.appendChild(el('dt', null, item.label));
      const dd = el('dd'), cls = badgeClass(item);
      dd.appendChild(cls ? el('span', cls, item.value) : document.createTextNode(item.value));
      row.appendChild(dd);
      return row;
    });
    if (block.kind === 'grid' || block.kind === 'list') return block.rows.map(r => () => {
      const tr = el('tr');
      if (block.kind === 'grid') tr.appendChild(el('th', 's-rowhead', r.label));
      (block.kind === 'grid' ? r.cells : r).forEach(c => tr.appendChild(el('td', null, c)));
      return tr;
    });
    if (block.kind === 'images') return block.items.map(it => () => {
      const fig = el('figure'), img = el('img'), sz = sizes[it.src];
      img.src = it.src; img.alt = it.label;
      if (sz) { img.width = sz.w; img.height = sz.h; }
      fig.appendChild(img);
      fig.appendChild(el('figcaption', null, it.label));
      return fig;
    });
    return [() => {
      const frag = document.createDocumentFragment();
      block.items.forEach(it => {
        const c = el('div', 's-sign'), pad = el('div', 's-sign-img');
        if (it.src) { const img = el('img'); img.src = it.src; img.alt = 'Firma ' + it.role; pad.appendChild(img); }
        c.appendChild(pad);
        c.appendChild(el('div', 's-sign-role', it.role));
        [['Nombre', it.nombre], ['C.C.', it.cc], ['Tel.', it.tel]].forEach(([k, v]) => {
          if (!v) return;
          const p = el('div', 's-sign-line');
          p.appendChild(el('span', null, k + ' '));
          p.appendChild(document.createTextNode(v));
          c.appendChild(p);
        });
        frag.appendChild(c);
      });
      return frag;
    }];
  }

  function pageShell(header, scale, height) {
    const page = el('article', 'page');
    page.setAttribute('data-theme', 'light');
    page.style.setProperty('--s', scale);
    page.style.height = height + 'px';
    const head = el('header', 'p-head');
    const brand = el('div', 'p-brand');
    const logo = el('img', 'p-logo'); logo.src = LOGO; logo.alt = 'BIA';
    brand.appendChild(logo);
    const titles = el('div', 'p-titles');
    titles.appendChild(el('div', 'p-eyebrow', 'OPS-FM-03 · Visita de inspección y/o revisión'));
    titles.appendChild(el('div', 'p-acta', 'Acta N° ' + (header.actaNo || 'sin número')));
    brand.appendChild(titles);
    head.appendChild(brand);
    const meta = el('div', 'p-meta');
    if (header.fecha) meta.appendChild(el('div', null, header.fecha));
    const horas = [header.horaIngreso && 'Ingreso ' + header.horaIngreso, header.horaSalida && 'Salida ' + header.horaSalida]
      .filter(Boolean).join(' · ');
    if (horas) meta.appendChild(el('div', null, horas));
    head.appendChild(meta);
    page.appendChild(head);
    page.body = page.appendChild(el('div', 'p-body'));
    const foot = el('footer', 'p-foot');
    foot.appendChild(el('span', null, 'Resumen de recolección de información — no reemplaza el acta oficial.'));
    page.num = foot.appendChild(el('span', 'p-num'));
    page.appendChild(foot);
    return page;
  }

  const overflows = page => page.body.scrollHeight > page.body.clientHeight + 0.5;

  function layout(sections, header, sizes, scale, height, stage) {
    stage.innerHTML = '';
    const pages = [];
    let page;
    const newPage = () => { page = pageShell(header, scale, height); stage.appendChild(page); pages.push(page); };
    newPage();

    sections.forEach(sec => {
      if (sec.law) {
        const p = el('p', 's-law', sec.law);
        page.body.appendChild(p);
        if (overflows(page) && page.body.children.length > 1) { p.remove(); newPage(); page.body.appendChild(p); }
        return;
      }
      let card = null, boxes = {}, used = false;
      const openCard = cont => {
        card = el('section', 's-card');
        card.appendChild(el('h2', 's-title', sec.title + (cont ? ' (continuación)' : '')));
        page.body.appendChild(card);
        boxes = {}; used = false;
      };
      const boxFor = (i, block) => {
        if (!boxes[i]) { boxes[i] = container(block); card.appendChild(boxes[i]); }
        return boxes[i]._body || boxes[i];
      };
      sec.blocks.forEach((block, i) => {
        pieces(block, sizes).forEach(make => {
          if (!card) openCard(false);
          const slot = boxFor(i, block);
          const node = make();
          const added = node.nodeType === 11 ? [...node.childNodes] : [node];
          slot.appendChild(node);
          if (!overflows(page)) { used = true; return; }
          added.forEach(n => n.remove());
          if (page.body.firstChild === card && !used) {     // no cabe ni en una página vacía: se queda
            added.forEach(n => slot.appendChild(n));
            used = true;
            return;
          }
          if (!slot.childNodes.length) { boxes[i].remove(); delete boxes[i]; }
          const continued = used;
          if (!used) card.remove();
          newPage();
          openCard(continued);
          const slot2 = boxFor(i, block);
          added.forEach(n => slot2.appendChild(n));
          used = true;
        });
      });
    });
    return pages;
  }

  function preloadSizes(sections) {
    const srcs = [];
    sections.forEach(s => (s.blocks || []).forEach(b => { if (b.kind === 'images') b.items.forEach(it => srcs.push(it.src)); }));
    return Promise.all(srcs.map(src => new Promise(ok => {
      const im = new Image();
      im.onload = () => ok([src, { w: im.naturalWidth, h: im.naturalHeight }]);
      im.onerror = () => ok([src, null]);
      im.src = src;
    }))).then(list => Object.fromEntries(list));
  }

  async function renderPages(models, opts) {
    const max = (opts && opts.maxPages) || 4;
    const header = models[0].header;
    const sections = models[0].sections.filter(s => s.id !== 'encabezado')
      .concat(models[1].sections, [{ law: Acta.Catalog.LEY }]);
    const sizes = await preloadSizes(sections);
    const stage = el('div', 'p-stage');
    stage.style.cssText = 'position:absolute;left:-20000px;top:0;width:' + PAGE_W + 'px';
    document.body.appendChild(stage);
    try {
      let pages = null;
      search:
      for (const scale of SCALES) {
        for (const height of HEIGHTS) {
          pages = layout(sections, header, sizes, scale, height, stage);
          if (pages.length <= max) break search;
        }
      }
      if (pages.length > max) {           // último recurso: lo que sobra va a la última página, más alta
        const last = pages[max - 1];
        pages.slice(max).forEach(p => { [...p.body.childNodes].forEach(n => last.body.appendChild(n)); p.remove(); });
        pages = pages.slice(0, max);
        last.style.height = 'auto';
        last.body.style.overflow = 'visible';
      }
      pages.forEach((p, i) => { p.num.textContent = 'Página ' + (i + 1) + ' de ' + pages.length; });
      pages.forEach(p => p.remove());
      return pages;
    } finally { stage.remove(); }
  }

  return { model, display, format, renderPages };
})();
