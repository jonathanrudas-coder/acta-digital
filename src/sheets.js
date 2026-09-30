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

  // ───────── render a DOM (1080 px, siempre en tema claro) ─────────
  const BOLT = '<svg viewBox="0 0 512 512" width="44" height="44" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#171717"/>' +
    '<polygon points="292,56 124,296 236,296 204,456 388,200 272,200" fill="#3fdec9"/></svg>';
  const WIDE_AT = 48;

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

  function renderPairs(block) {
    const box = el('dl', 's-pairs');
    block.items.forEach(item => {
      const row = el('div', 's-pair' + (item.risk ? ' is-risk' : '') + (item.value.length > WIDE_AT || item.label.length > 70 ? ' is-wide' : ''));
      row.appendChild(el('dt', null, item.label));
      const dd = el('dd');
      const cls = badgeClass(item);
      dd.appendChild(cls ? el('span', cls, item.value) : document.createTextNode(item.value));
      row.appendChild(dd);
      box.appendChild(row);
    });
    return box;
  }

  function renderTable(title, columns, rows, rowLabel) {
    const wrap = el('div', 's-table');
    if (title) wrap.appendChild(el('div', 's-table-title', title));
    const table = el('table');
    const head = el('tr');
    if (rowLabel) head.appendChild(el('th', null, ''));
    columns.forEach(c => head.appendChild(el('th', null, c)));
    table.appendChild(el('thead')).appendChild(head);
    const body = el('tbody');
    rows.forEach(r => {
      const tr = el('tr');
      if (rowLabel) tr.appendChild(el('th', 's-rowhead', r.label));
      (rowLabel ? r.cells : r).forEach(c => tr.appendChild(el('td', null, c)));
      body.appendChild(tr);
    });
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function renderImages(block) {
    const box = el('div', 's-images');
    block.items.forEach(it => {
      const fig = el('figure');
      const img = el('img'); img.src = it.src; img.alt = it.label;
      fig.appendChild(img);
      fig.appendChild(el('figcaption', null, it.label));
      box.appendChild(fig);
    });
    return box;
  }

  function renderSignatures(block) {
    const box = el('div', 's-signs');
    block.items.forEach(it => {
      const c = el('div', 's-sign');
      const pad = el('div', 's-sign-img');
      if (it.src) { const img = el('img'); img.src = it.src; img.alt = 'Firma ' + it.role; pad.appendChild(img); }
      c.appendChild(pad);
      c.appendChild(el('div', 's-sign-role', it.role));
      [['Nombre', it.nombre], ['C.C.', it.cc], ['Tel.', it.tel]].forEach(([k, v]) => {
        if (v) { const p = el('div', 's-sign-line'); p.appendChild(el('span', null, k + ' ')); p.appendChild(document.createTextNode(v)); c.appendChild(p); }
      });
      box.appendChild(c);
    });
    return box;
  }

  function renderBlock(b) {
    if (b.kind === 'pairs') return renderPairs(b);
    if (b.kind === 'grid') return renderTable(b.title, b.columns, b.rows, true);
    if (b.kind === 'list') return renderTable(null, b.columns, b.rows, false);
    if (b.kind === 'images') return renderImages(b);
    return renderSignatures(b);
  }

  function render(models) {
    return models.map(m => {
      const sheet = el('article', 'sheet');
      sheet.setAttribute('data-theme', 'light');
      const hd = m.header;
      const head = el('header', 's-head');
      const brand = el('div', 's-brand');
      brand.innerHTML = BOLT;
      const titles = el('div', 's-titles');
      titles.appendChild(el('div', 's-eyebrow', 'OPS-FM-03 · Sistema integrado de gestión'));
      titles.appendChild(el('h1', null, 'Visita previa para conexión eléctrica'));
      brand.appendChild(titles);
      head.appendChild(brand);
      const meta = el('div', 's-meta');
      meta.appendChild(el('div', 's-acta', 'Acta N° ' + (hd.actaNo || 'sin número')));
      meta.appendChild(el('div', null, [hd.fecha, hd.horaIngreso && 'Ingreso ' + hd.horaIngreso, hd.horaSalida && 'Salida ' + hd.horaSalida].filter(Boolean).join(' · ')));
      meta.appendChild(el('div', 's-page', 'Hoja ' + m.number + ' de 2'));
      head.appendChild(meta);
      sheet.appendChild(head);
      sheet.appendChild(el('p', 's-disclaimer', 'Resumen de recolección de información — no reemplaza el acta oficial.'));

      m.sections.forEach(s => {
        const card = el('section', 's-card');
        card.appendChild(el('h2', 's-title', s.title));
        s.blocks.forEach(b => card.appendChild(renderBlock(b)));
        sheet.appendChild(card);
      });
      if (!m.sections.length) sheet.appendChild(el('p', 's-empty', 'Esta hoja no tiene datos diligenciados.'));
      if (m.number === 2) sheet.appendChild(el('p', 's-law', Acta.Catalog.LEY));
      return sheet;
    });
  }

  return { model, display, format, render };
})();
