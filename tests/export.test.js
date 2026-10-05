(function () {
test('fileName', () => {
  const F = Acta.Export.fileName;
  assert.equal(F('03651', 1, '2026-09-30', 'png'), 'Acta-03651-Pag1-2026-09-30.png');
  assert.equal(F('', 2, '2026-09-30', 'jpg'), 'Acta-SN-Pag2-2026-09-30.jpg');
  assert.equal(F('036/51', 1, '2026-09-30', 'png'), 'Acta-036-51-Pag1-2026-09-30.png');
});
function grande() {
  const a = Fx.indirecta();
  Acta.Model.set(a, 'obs.texto', 'Observación larga. '.repeat(120));
  a.tables.maquinasList = Array.from({ length: 30 }, (_, i) => ({ tipo: 'Máquina ' + (i + 1), potenciaKw: '5', cantidad: '1' }));
  a.tables.otrosSellosList = Array.from({ length: 20 }, (_, i) => ({ ubicacion: 'Bornera medidor', serial: 'BIA ' + (40800 + i), color: 'Verde' }));
  return a;
}
test('renderPages: acta normal en páginas tamaño carta, máximo 4', async () => {
  const pages = await Acta.Sheets.renderPages(Acta.Sheets.model(Fx.indirecta()));
  assert.ok(pages.length >= 1 && pages.length <= 4, 'páginas ' + pages.length);
  const box = document.createElement('div'); document.body.appendChild(box);
  pages.forEach(p => box.appendChild(p));
  pages.forEach((p, i) => {
    assert.equal(p.getAttribute('data-theme'), 'light');
    assert.equal(Math.round(p.getBoundingClientRect().width), 1080);
    assert.equal(Math.round(p.getBoundingClientRect().height), 1528);
    assert.ok(p.textContent.includes('Página ' + (i + 1) + ' de ' + pages.length));
  });
  const all = pages.map(p => p.textContent).join(' ');
  ['Información comercial', 'Transformadores de corriente', 'Control de riesgos', 'Firmas'].forEach(t =>
    assert.ok(all.toLowerCase().includes(t.toLowerCase()), 'falta ' + t));
  box.remove();
});
test('renderPages: acta enorme cabe en 4 páginas sin perder datos', async () => {
  const pages = await Acta.Sheets.renderPages(Acta.Sheets.model(grande()));
  assert.ok(pages.length <= 4, 'páginas ' + pages.length);
  const box = document.createElement('div'); document.body.appendChild(box);
  pages.forEach(p => box.appendChild(p));
  const cells = pages.flatMap(p => [...p.querySelectorAll('td, th')].map(c => c.textContent.trim()));
  for (let i = 1; i <= 30; i++) assert.ok(cells.includes('Máquina ' + i), 'falta máquina ' + i);
  for (let i = 0; i < 20; i++) assert.ok(cells.includes('BIA ' + (40800 + i)), 'falta sello ' + i);
  assert.ok(pages.map(p => p.textContent).join(' ').includes('Observación larga.'), 'falta observación');
  pages.forEach(p => { const b = p.querySelector('.p-body'); assert.ok(b.scrollHeight <= b.clientHeight + 1, 'desborde'); });
  box.remove();
});
})();
