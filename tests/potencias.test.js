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
test('error: % activa y reactiva en la fila Total con tiempo, impulsos y constante', () => {
  const a = Acta.Model.newActa();
  fill(a, 'R', '120', '10', '0,8');                       // P total 0,96 kW · Q total 0,72 kVAR
  Acta.Model.setCell(a, 'medidores', 'Activa', 'constante', '1000');
  Acta.Model.set(a, 'pr.tiempoActiva', '60'); Acta.Model.set(a, 'pr.girosActiva', '16');
  Acta.Model.set(a, 'pr.tiempoReactiva', '100'); Acta.Model.set(a, 'pr.girosReactiva', '19');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'errActiva'), '0');        // 16/1000 = 0,96·60/3600
  assert.equal(cell(a, 'Total', 'errReactiva'), '-5');     // usa la constante de activa si falta la de reactiva
  Acta.Model.set(a, 'pr.girosActiva', '17'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'errActiva'), '6,25');
  Acta.Model.setCell(a, 'medidores', 'Activa', 'constante', '1.000'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'errActiva'), '6,25');
  Acta.Model.setCell(a, 'medidores', 'Reactiva', 'constante', '2000 imp/kVARh'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'errReactiva'), '-52,5');
});
test('error: sin datos completos queda vacío', () => {
  const a = Acta.Model.newActa();
  fill(a, 'R', '120', '10', '0,8');
  Acta.Model.set(a, 'pr.tiempoActiva', '60'); Acta.Model.set(a, 'pr.girosActiva', '16');
  Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'errActiva'), '');         // falta la constante
  Acta.Model.setCell(a, 'medidores', 'Activa', 'constante', '1000');
  Acta.Model.set(a, 'pr.tiempoActiva', '0'); Acta.Model.recalcPruebas(a);
  assert.equal(cell(a, 'Total', 'errActiva'), '');         // energía de referencia 0
});
test('error: en el formulario el % error del Total es calculado', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const f = Acta.Form.mount(host, Acta.Model.newActa(), { onChange: () => {} });
  assert.ok(host.querySelector('#in-pruebasFase_Total_errActiva').readOnly);
  f.destroy(); host.remove();
});
test('error: las fases R, S y T no tienen % de error (solo el Total)', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const a = Acta.Model.newActa();
  Acta.Model.setCell(a, 'pruebasFase', 'R', 'errActiva', '3');   // dato viejo escrito a mano
  const f = Acta.Form.mount(host, a, { onChange: () => {} });
  ['R', 'S', 'T'].forEach(r => {
    assert.ok(!host.querySelector('#in-pruebasFase_' + r + '_errActiva'), r + ' sin % error activa');
    assert.ok(!host.querySelector('#in-pruebasFase_' + r + '_errReactiva'), r + ' sin % error reactiva');
  });
  assert.ok(host.querySelector('#in-pruebasFase_Total_errActiva'));
  assert.equal(cell(a, 'R', 'errActiva'), '');
  f.destroy(); host.remove();
});
})();
