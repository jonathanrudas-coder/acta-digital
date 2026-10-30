(function () {
const cell = (a, row, col) => Acta.Model.getCell(a, 'pruebasFase', row, col) || '';
const fill = (a, row, v, i, fp) => {
  Acta.Model.setCell(a, 'pruebasFase', row, 'voltaje', v);
  Acta.Model.setCell(a, 'pruebasFase', row, 'corriente', i);
  Acta.Model.setCell(a, 'pruebasFase', row, 'fp', fp);
};
test('potencias: por fase sin √3 en kVA, kW y kVAR (S = V·I/1000)', () => {
  const a = Acta.Model.newActa(); Acta.Model.set(a, 'tot.fases', '3');
  fill(a, 'R', '120', '10', '0,8');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'R', 'smed'), '1,2');
  assert.equal(cell(a, 'R', 'p'), '0,96');
  assert.equal(cell(a, 'R', 'q'), '0,72');
});
test('potencias: el Total promedia V, I y FP de las fases y usa √3 si es trifásico', () => {
  const a = Acta.Model.newActa(); Acta.Model.set(a, 'tot.fases', '3');
  fill(a, 'R', '120', '10', '0,9'); fill(a, 'S', '122', '12', '0,8'); fill(a, 'T', '118', '11', '1');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'voltaje'), '120');
  assert.equal(cell(a, 'Total', 'corriente'), '11');
  assert.equal(cell(a, 'Total', 'fp'), '0,9');
  assert.equal(cell(a, 'Total', 'smed'), '2,286');   // √3 · 120 · 11 / 1000
  assert.equal(cell(a, 'Total', 'p'), '2,058');
  assert.equal(cell(a, 'Total', 'q'), '0,997');
  Acta.Model.set(a, 'tot.fases', '2'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'smed'), '1,32');
});
test('potencias: el Total promedia solo las fases con datos', () => {
  const a = Acta.Model.newActa();
  fill(a, 'R', '120', '10', '0,8');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'voltaje'), '120');
  assert.equal(cell(a, 'Total', 'smed'), '1,2');
  assert.equal(cell(a, 'Total', 'p'), '0,96');
  fill(a, 'R', '', '', ''); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'voltaje'), '');
  assert.equal(cell(a, 'Total', 'smed'), '');
});
test('potencias: datos incompletos o FP inválido dejan vacío', () => {
  const a = Acta.Model.newActa();
  fill(a, 'S', '120', '10', '');
  fill(a, 'T', '120', '10', '1,5');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'S', 'smed'), '1,2');
  assert.equal(cell(a, 'S', 'p'), '');
  assert.equal(cell(a, 'T', 'q'), '');
  fill(a, 'S', '', '10', '0,9'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'S', 'smed'), '');
  assert.equal(cell(a, 'S', 'p'), '');
});
test('potencias: el formulario calcula al escribir y no deja editar P, Q, Smed', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const a = Acta.Model.newActa();
  const f = Acta.Form.mount(host, a, { onChange: () => {} });
  const type = (id, v) => { const el = host.querySelector('#' + id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  type('in-pruebasFase_R_voltaje', '120'); type('in-pruebasFase_R_corriente', '10'); type('in-pruebasFase_R_fp', '0,8');
  const p = host.querySelector('#in-pruebasFase_R_p');
  assert.ok(p.readOnly, 'P debe ser solo lectura');
  assert.equal(p.value, '0,96');
  assert.equal(host.querySelector('#in-pruebasFase_R_q').value, '0,72');
  assert.ok(host.querySelector('#in-pruebasFase_Total_voltaje').readOnly, 'V del Total es calculado');
  assert.ok(!host.querySelector('#in-pruebasFase_R_voltaje').readOnly);
  assert.equal(host.querySelector('#in-pruebasFase_Total_voltaje').value, '120');
  f.destroy(); host.remove();
});
test('potencias: un borrador viejo (en W) se recalcula al generar el resumen', () => {
  const a = Acta.Model.newActa();
  fill(a, 'R', '120', '10', '0,8');
  Acta.Model.setCell(a, 'pruebasFase', 'R', 'p', '960');
  Acta.Model.setCell(a, 'pruebasFase', 'R', 'smed', '1200');
  Acta.Sheets.model(a);
  assert.equal(cell(a, 'R', 'p'), '0,96');
  assert.equal(cell(a, 'R', 'smed'), '1,2');
});
})();
