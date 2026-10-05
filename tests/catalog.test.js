(function () {
const C = Acta.Catalog;
test('25 secciones en orden y hojas correctas', () => {
  assert.equal(C.sections.length, 25);
  assert.equal(C.sections[0].id, 'encabezado');
  assert.equal(C.sections[24].id, 'firmas');
  assert.deepEqual(C.sections.filter(s => s.sheet === 1).map(s => s.id),
    ['encabezado','comercial','asesoria','tecnica','trafo','celdaMedidor','medidor','telemedida','sellosMedidor','otrosSellos','pruebas','totalizador','tcs','tps']);
});
test('ids únicos', () => {
  const ids = [...C.sections.map(s => s.id), ...C.fields().map(f => f.id)];
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  assert.deepEqual(dup, []);
});
test('toda condición referencia un campo existente', () => {
  const conds = [];
  const walk = c => c && (c.all || c.any ? (c.all || c.any).forEach(walk) : conds.push(c.field));
  C.sections.forEach(s => walk(s.when)); C.fields().forEach(f => walk(f.when));
  conds.forEach(id => assert.ok(C.byId(id), 'falta ' + id));
});
test('toda lista referenciada existe', () => {
  C.fields().filter(f => f.list).forEach(f => assert.ok(Acta.Lists[f.list], f.id));
});
test('obligatorios exactos', () => {
  assert.deepEqual(C.fields().filter(f => f.required).map(f => f.id).sort(),
    ['acta.numero','com.cuenta','com.direccion','tec.tipoMedida'].sort());
});
test('15 riesgos y 5 legales', () => {
  assert.equal(C.byId('riesgos').fields.filter(f => /^riesgo\.q\d+$/.test(f.id)).length, 15);
  assert.equal(C.byId('riesgo.q9').risk, 'Sí');
  assert.equal(C.byId('riesgo.q3').risk, 'No');
  assert.equal(C.byId('legales').fields.filter(f => /^legal\.\d$/.test(f.id)).length, 5);
});
test('listas sin duplicados y comercializadores incluye BIA', () => {
  Object.entries(Acta.Lists).forEach(([k, v]) => assert.equal(new Set(v).size, v.length, k));
  assert.equal(Acta.Lists.comercializadores[0], 'BIA Energy');
  assert.equal(Acta.Lists.departamentos.length, 33);
});
})();
