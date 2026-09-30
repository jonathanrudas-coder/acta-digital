(function () {
const S = Acta.Sheets, set = Acta.Model.set;
test('dos hojas con encabezado', () => {
  const [h1, h2] = S.model(Fx.directa());
  assert.equal(h1.number, 1); assert.equal(h2.number, 2);
  assert.equal(h1.header.actaNo, Fx.directa().values['acta.numero']);
});
test('directa no incluye tcs ni tps aunque tengan datos', () => {
  const a = Fx.indirecta(); set(a, 'tec.tipoMedida', 'Directa');
  const ids = S.model(a).flatMap(h => h.sections.map(s => s.id));
  assert.equal(ids.includes('tcs'), false); assert.equal(ids.includes('celdasMT'), false);
});
test('indirecta incluye grid de TC con 3 filas', () => {
  const tcs = S.model(Fx.indirecta())[0].sections.find(s => s.id === 'tcs');
  const grid = tcs.blocks.find(b => b.kind === 'grid');
  assert.deepEqual(grid.rows.map(r => r.label), ['A','B','C']);
});
test('campos vacíos y secciones sin datos se omiten', () => {
  const a = Fx.directa(); delete a.values['obs.texto']; set(a, 'obs.aumentoCarga', '');
  const ids = S.model(a)[1].sections.map(s => s.id);
  assert.equal(ids.includes('observaciones'), false);
});
test('riesgo marcado', () => {
  const a = Fx.directa(); set(a, 'riesgo.q9', 'Sí'); set(a, 'riesgo.q14', 'Sí');
  const items = S.model(a)[1].sections.find(s => s.id === 'riesgos').blocks[0].items;
  assert.equal(items.find(i => i.label.startsWith('¿Hay riesgo de atrapamiento')).risk, true);
  assert.equal(items.find(i => i.label.startsWith('¿Existen extintores')).risk, false);
});
test('diferencia calculada y q1 espejo', () => {
  const [h1, h2] = S.model(Fx.directa());
  const pr = h1.sections.find(s => s.id === 'pruebas').blocks.find(b => b.kind === 'pairs');
  assert.equal(pr.items.find(i => i.label === 'Diferencia').value, '20,5');
  const q1 = h2.sections.find(s => s.id === 'riesgos').blocks[0].items[0];
  assert.equal(q1.value, 'Directa');
});
test('texto largo se conserva completo', () => {
  const a = Fx.directa(), largo = 'x'.repeat(2000); set(a, 'obs.texto', largo);
  const obs = S.model(a)[1].sections.find(s => s.id === 'observaciones').blocks[0].items[0];
  assert.equal(obs.value.length, 2000);
});
test('firmas en hoja 2', () => {
  const f = S.model(Fx.directa())[1].sections.find(s => s.id === 'firmas');
  const sig = f.blocks.find(b => b.kind === 'signatures');
  assert.deepEqual(sig.items.map(i => i.role), ['Usuario / Testigo', 'BIA']);
});
})();
test('lista de máquinas omite columnas vacías', () => {
  const a = Fx.directa(); a.tables.maquinasList = [{ tipo: 'Horno', cantidad: '2' }, {}];
  const b = Acta.Sheets.model(a)[1].sections.find(s => s.id === 'maquinas').blocks[0];
  assert.deepEqual(b.columns, ['Tipo de máquina', 'Cantidad']);
  assert.deepEqual(b.rows, [['Horno', '2']]);
});
