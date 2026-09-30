(function () {
test('fileName', () => {
  const F = Acta.Export.fileName;
  assert.equal(F('03651', 1, '2026-09-30', 'png'), 'Acta-03651-Hoja1-2026-09-30.png');
  assert.equal(F('', 2, '2026-09-30', 'jpg'), 'Acta-SN-Hoja2-2026-09-30.jpg');
  assert.equal(F('036/51', 1, '2026-09-30', 'png'), 'Acta-036-51-Hoja1-2026-09-30.png');
});
test('render produce dos hojas de 1080 px en claro', () => {
  const nodes = Acta.Sheets.render(Acta.Sheets.model(Fx.indirecta()));
  assert.equal(nodes.length, 2);
  nodes.forEach(n => { document.body.appendChild(n);
    assert.equal(n.getAttribute('data-theme'), 'light');
    assert.equal(Math.round(n.getBoundingClientRect().width), 1080); n.remove(); });
});
})();
