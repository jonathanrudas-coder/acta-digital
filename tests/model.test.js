test('parseNum acepta coma y punto', () => {
  assert.equal(Acta.Model.parseNum('112,5'), 112.5);
  assert.equal(Acta.Model.parseNum('112.5'), 112.5);
  assert.equal(Acta.Model.parseNum(' 7 '), 7);
  assert.equal(Acta.Model.parseNum(''), null);
  assert.equal(Acta.Model.parseNum('abc'), null);
});
test('formatNum usa coma y recorta decimales', () => {
  assert.equal(Acta.Model.formatNum(19.5), '19,5');
  assert.equal(Acta.Model.formatNum(20), '20');
  assert.equal(Acta.Model.formatNum(1.23456), '1,235');
});
test('diferencia de lecturas', () => {
  assert.equal(Acta.Model.diferencia('100,5', '120'), '19,5');
  assert.equal(Acta.Model.diferencia('', '120'), '');
  assert.equal(Acta.Model.diferencia('abc', '120'), '');
  assert.equal(Acta.Model.diferencia('120', '100'), '-20');
});
test('newActa llena fecha y hora de ingreso', () => {
  const a = Acta.Model.newActa(new Date(2026, 8, 30, 7, 5));
  assert.equal(a.values['acta.fecha'], '2026-09-30');
  assert.equal(a.values['acta.horaIngreso'], '07:05');
  assert.equal(a.status, 'borrador');
  assert.ok(a.id && a.id.length > 5);
});
test('setCell/getCell en tablas', () => {
  const a = Acta.Model.newActa();
  Acta.Model.setCell(a, 'tc', 'A', 'serie', 'X1');
  assert.equal(Acta.Model.getCell(a, 'tc', 'A', 'serie'), 'X1');
  assert.equal(Acta.Model.getCell(a, 'tc', 'B', 'serie'), undefined);
});
