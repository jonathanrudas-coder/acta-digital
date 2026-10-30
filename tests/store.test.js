(function () {
test('guardar, listar ordenado y latestDraft', async () => {
  await Acta.Store.init({ dbName: 'acta-test-' + Date.now() });
  const a = Acta.Model.newActa(), b = Acta.Model.newActa(), c = Acta.Model.newActa();
  a.updatedAt = 1; b.updatedAt = 3; c.updatedAt = 5; c.status = 'generada';
  for (const x of [a, b, c]) await Acta.Store.save(x);
  assert.deepEqual((await Acta.Store.list()).map(x => x.id), [c.id, b.id, a.id]);
  assert.equal((await Acta.Store.latestDraft()).id, b.id);
});
test('duplicate limpia número, horas e imágenes', async () => {
  const a = Fx.directa(); await Acta.Store.save(a);
  const d = await Acta.Store.duplicate(a.id);
  assert.ok(d.id !== a.id);
  assert.equal(d.values['acta.numero'], '03652');            // recibe el siguiente consecutivo
  assert.equal(d.values['com.cuenta'], a.values['com.cuenta']);
  assert.deepEqual(d.images, {});
});
test('perfil y sugerencias', async () => {
  await Acta.Store.setProfile({ nombre: 'Técnico', cc: '1', tel: '3' });
  assert.equal((await Acta.Store.getProfile()).nombre, 'Técnico');
  await Acta.Store.addSuggestion('operadores', 'Nuevo OR');
  await Acta.Store.addSuggestion('operadores', 'Nuevo OR');
  await Acta.Store.addSuggestion('operadores', 'EPM');
  assert.deepEqual(await Acta.Store.getSuggestions('operadores'), ['Nuevo OR']);
});
})();
