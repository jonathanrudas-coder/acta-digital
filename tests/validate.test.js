(function () {
const V = Acta.Validate, set = Acta.Model.set;
test('fixture directa sin faltantes ni avisos', () => {
  const r = V.run(Fx.directa());
  assert.deepEqual(r.missing, []); assert.deepEqual(r.warnings, []);
});
test('acta vacía lista los 7 obligatorios', () => {
  const r = V.run(Acta.Model.newActa());
  assert.deepEqual(r.missing.map(m => m.id).sort(),
    ['acta.numero','com.cuenta','com.direccion','tec.tipoMedida','medidores.Activa.serie','medidores.Activa.lectura','firma.bia'].sort());
});
test('hora de salida anterior', () => {
  const a = Fx.directa(); set(a, 'acta.horaIngreso', '10:00'); set(a, 'acta.horaSalida', '09:30');
  assert.deepEqual(V.run(a).warnings.map(w => w.code), ['horaSalidaAntes']);
});
test('lectura final menor, con coma decimal', () => {
  const a = Fx.directa(); set(a, 'pr.lecturaInicial', '120,5'); set(a, 'pr.lecturaFinal', '120,4');
  assert.deepEqual(V.run(a).warnings.map(w => w.code), ['lecturaFinalMenor']);
});
test('lecturas vacías o inválidas no generan aviso', () => {
  const a = Fx.directa(); set(a, 'pr.lecturaInicial', 'abc'); set(a, 'pr.lecturaFinal', '');
  assert.deepEqual(V.run(a).warnings, []);
});
test('semidirecta sin series de TC', () => {
  const a = Fx.directa(); set(a, 'tec.tipoMedida', 'Semidirecta');
  assert.ok(V.run(a).warnings.some(w => w.code === 'tcSinSerie'));
});
test('campos ocultos no se validan', () => {
  const a = Fx.indirecta(); set(a, 'tec.tipoMedida', 'Directa');
  Acta.Model.setCell(a, 'tc', 'A', 'serie', '');
  assert.equal(V.run(a).warnings.some(w => w.code === 'tcSinSerie'), false);
});
test('autorización en No y sin firma de usuario', () => {
  const a = Fx.directa(); set(a, 'legal.3', 'No'); delete a.images['firma.usuario'];
  assert.deepEqual(V.run(a).warnings.map(w => w.code).sort(), ['autorizacionNo','sinFirmaUsuario']);
});
})();
