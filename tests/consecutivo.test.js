(function () {
const N = refs => Acta.Model.siguienteNumero(refs);
test('siguienteNumero: conserva ceros y toma el mayor', () => {
  assert.equal(N(['00350890']), '00350891');
  assert.equal(N(['0099']), '0100');
  assert.equal(N(['99']), '100');
  assert.equal(N(['00350890', '00350895', '12']), '00350896');
  assert.equal(N([]), '');
  assert.equal(N(['', null, 'abc', '036/51']), '');
  assert.equal(N([' 0007 ']), '0008');
});
test('consecutivo: usa la última generada y los borradores, sin repetir', async () => {
  await Acta.Store.init({ dbName: 'acta-consec-' + Date.now() });
  assert.equal(await Acta.Store.nextNumero(), '');
  await Acta.Store.registrarNumero('00350890');
  assert.equal(await Acta.Store.nextNumero(), '00350891');
  const a = Acta.Model.newActa(); a.values['acta.numero'] = '00350891'; await Acta.Store.save(a);
  assert.equal(await Acta.Store.nextNumero(), '00350892');
  await Acta.Store.remove(a.id);
  assert.equal(await Acta.Store.nextNumero(), '00350891');
  await Acta.Store.registrarNumero('00350880');           // un número menor no retrocede el consecutivo
  assert.equal(await Acta.Store.nextNumero(), '00350891');
});
test('consecutivo: arranca desde actas generadas existentes', async () => {
  await Acta.Store.init({ dbName: 'acta-consec2-' + Date.now() });
  const g = Acta.Model.newActa(); g.status = 'generada'; g.values['acta.numero'] = '00350900'; await Acta.Store.save(g);
  assert.equal(await Acta.Store.nextNumero(), '00350901');
});
test('duplicar asigna el siguiente número', async () => {
  await Acta.Store.init({ dbName: 'acta-consec3-' + Date.now() });
  const g = Acta.Model.newActa(); g.status = 'generada'; g.values['acta.numero'] = '00000010'; await Acta.Store.save(g);
  await Acta.Store.registrarNumero('00000010');
  const d = await Acta.Store.duplicate(g.id);
  assert.equal(d.values['acta.numero'], '00000011');
});
})();
