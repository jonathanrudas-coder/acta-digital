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
    return rows.length ? { kind: 'list', columns: field.columns.map(c => c.label), rows } : null;
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

  return { model, display, format };
})();
