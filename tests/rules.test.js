(function () {
const R = Acta.Rules, set = Acta.Model.set;
test('directa oculta tcs, tps y celdasMT', () => {
  const a = Fx.directa();
  assert.equal(R.isVisible('tcs', a), false);
  assert.equal(R.isVisible('tps', a), false);
  assert.equal(R.isVisible('celdasMT', a), false);
  assert.equal(R.isVisible('tc', a), false);
});
test('semidirecta muestra tcs, oculta tps', () => {
  const a = Fx.directa(); set(a, 'tec.tipoMedida', 'Semidirecta');
  assert.equal(R.isVisible('tcs', a), true);
  assert.equal(R.isVisible('tps', a), false);
});
test('indirecta muestra todo', () => {
  const a = Fx.indirecta();
  ['tcs','tps','celdasMT'].forEach(id => assert.equal(R.isVisible(id, a), true, id));
});
test('sin tipo de medida se muestra todo', () => {
  const a = Acta.Model.newActa();
  ['tcs','tps','celdasMT'].forEach(id => assert.equal(R.isVisible(id, a), true, id));
});
test('subcampo aparece solo con Sí', () => {
  const a = Fx.directa();
  set(a, 'riesgo.q7', 'No'); assert.equal(R.isVisible('riesgo.q7Cual', a), false);
  set(a, 'riesgo.q7', 'Sí'); assert.equal(R.isVisible('riesgo.q7Cual', a), true);
});
test('cambiar a directa conserva datos de TC', () => {
  const a = Fx.indirecta(); set(a, 'tec.tipoMedida', 'Directa');
  assert.equal(R.isVisible('tc', a), false);
  assert.ok(Acta.Model.getCell(a, 'tc', 'A', 'serie'));
});
test('all / any', () => {
  const a = Fx.directa(); set(a, 'planta.tiene', 'Sí');
  assert.equal(R.evaluate({ all: [{ field: 'planta.tiene', eq: 'Sí' }, { field: 'tec.tipoMedida', eq: 'Directa' }] }, a), true);
  assert.equal(R.evaluate({ any: [{ field: 'planta.tiene', eq: 'No' }, { field: 'tec.tipoMedida', eq: 'Indirecta' }] }, a), false);
});
})();
