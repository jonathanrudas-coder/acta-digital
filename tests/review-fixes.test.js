(function () {
const wait = ms => new Promise(r => setTimeout(r, ms));
test('quitar una máquina no rompe el guardado automático', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const a = Fx.directa(); let calls = 0;
  const f = Acta.Form.mount(host, a, { onChange: () => { calls++; } });
  const add = [...host.querySelectorAll('button')].find(b => b.textContent.includes('Agregar máquina'));
  add.click(); add.click();
  host.querySelector('[aria-label="Quitar máquina 2"]').click();
  const before = calls;
  const q3 = [...host.querySelector('[data-field="riesgo.q3"]').querySelectorAll('button')].find(b => b.textContent === 'No');
  q3.click();
  assert.equal(calls, before + 1);
  assert.equal(a.tables.maquinasList.length, 1);
  f.destroy(); host.remove();
});
test('editar un acta generada la devuelve a borrador', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const a = Fx.directa(); a.status = 'generada';
  const f = Acta.Form.mount(host, a, { onChange: () => {} });
  const el = host.querySelector('#in-com_cuenta'); el.value = 'Otra'; el.dispatchEvent(new Event('input', { bubbles: true }));
  assert.equal(a.status, 'borrador');
  f.destroy(); host.remove();
});
test('ratioFor limita el tamaño del canvas', () => {
  assert.equal(Acta.Export.ratioFor(1000), 2);
  const r = Acta.Export.ratioFor(10000);
  assert.ok(r < 2 && r > 1, 'ratio ' + r);
  assert.ok(1080 * r * 10000 * r <= 16e6 + 1);
  assert.ok(Acta.Export.ratioFor(100000) >= 0.5);
});
test('makeFiles arma los archivos con nombre y tipo', async () => {
  const nodes = Acta.Sheets.render(Acta.Sheets.model(Fx.directa()));
  const box = document.createElement('div'); nodes.forEach(n => box.appendChild(n)); document.body.appendChild(box);
  const orig = Acta.Export.toBlob;
  Acta.Export.toBlob = async (n, fmt) => new Blob(['x'], { type: fmt === 'jpg' ? 'image/jpeg' : 'image/png' });
  try {
    const files = await Acta.Export.makeFiles(nodes, 'jpg', '03651', '2026-09-30');
    assert.deepEqual(files.map(f => f.name), ['Acta-03651-Hoja1-2026-09-30.jpg', 'Acta-03651-Hoja2-2026-09-30.jpg']);
    assert.equal(files[0].type, 'image/jpeg');
  } finally { Acta.Export.toBlob = orig; box.remove(); }
});
})();
