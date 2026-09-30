window.Acta = window.Acta || {};

/* Reglas de visibilidad: evalúa las condiciones `when` del catálogo contra un acta. */
Acta.Rules = (function () {
  function evaluate(cond, acta) {
    if (!cond) return true;
    if (cond.all) return cond.all.every(c => evaluate(c, acta));
    if (cond.any) return cond.any.some(c => evaluate(c, acta));
    const v = Acta.Model.get(acta, cond.field);
    if (cond.orUnset && Acta.Model.isEmpty(v)) return true;
    if ('eq' in cond) return Array.isArray(v) ? v.indexOf(cond.eq) !== -1 : v === cond.eq;
    if (cond.in) return cond.in.indexOf(v) !== -1;
    return true;
  }

  function isVisible(id, acta) {
    const node = Acta.Catalog.byId(id);
    if (!node) return false;
    if (node.fields) return evaluate(node.when, acta);
    const section = Acta.Catalog.byId(node.sectionId);
    return evaluate(section && section.when, acta) && evaluate(node.when, acta);
  }

  return { evaluate, isVisible };
})();
