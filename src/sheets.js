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
  const BOLT = '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#171717"/>' +
    '<polygon points="292,56 124,296 236,296 204,456 388,200 272,200" fill="#3fdec9"/></svg>';
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
    brand.innerHTML = BOLT;
    const titles = el('div', 'p-titles');
    titles.appendChild(el('div', 'p-eyebrow', 'OPS-FM-03 · Visita previa para conexión eléctrica'));
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
