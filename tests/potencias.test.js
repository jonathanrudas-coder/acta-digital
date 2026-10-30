(function () {
const cell = (a, row, col) => Acta.Model.getCell(a, 'pruebasFase', row, col) || '';
const fill = (a, row, v, i, fp) => {
  Acta.Model.setCell(a, 'pruebasFase', row, 'voltaje', v);
  Acta.Model.setCell(a, 'pruebasFase', row, 'corriente', i);
  Acta.Model.setCell(a, 'pruebasFase', row, 'fp', fp);
};
test('potencias: por fase sin √3 (S = V·I, P = S·FP, Q = S·sen θ)', () => {
  const a = Acta.Model.newActa(); Acta.Model.set(a, 'tot.fases', '3');
  fill(a, 'R', '120', '10', '0,8');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'R', 'smed'), '1200');
  assert.equal(cell(a, 'R', 'p'), '960');
  assert.equal(cell(a, 'R', 'q'), '720');
});
test('potencias: el Total usa √3 solo si el totalizador es de 3 fases', () => {
  const a = Acta.Model.newActa(); Acta.Model.set(a, 'tot.fases', '3');
  fill(a, 'Total', '208', '10', '1');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'smed'), '3602,67');
  assert.equal(cell(a, 'Total', 'p'), '3602,67');
  assert.equal(cell(a, 'Total', 'q'), '0');
  Acta.Model.set(a, 'tot.fases', '2'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'smed'), '2080');
  Acta.Model.set(a, 'tot.fases', ''); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'smed'), '2080');
});
test('potencias: datos incompletos o FP inválido dejan vacío', () => {
  const a = Acta.Model.newActa();
  fill(a, 'S', '120', '10', '');
  fill(a, 'T', '120', '10', '1,5');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'S', 'smed'), '1200');
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
  assert.equal(p.value, '960');
  assert.equal(host.querySelector('#in-pruebasFase_R_q').value, '720');
  f.destroy(); host.remove();
});
})();
