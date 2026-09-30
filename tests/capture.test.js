(function () {
test('photo reduce al lado máximo', async () => {
  const c = document.createElement('canvas'); c.width = 3200; c.height = 1600;
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const url = await Acta.Capture.photo(new File([blob], 'x.png', { type: 'image/png' }));
  const img = new Image(); await new Promise(r => { img.onload = r; img.src = url; });
  assert.equal(img.width, 1600); assert.equal(img.height, 800);
  assert.ok(url.startsWith('data:image/jpeg'));
});
test('gps traduce permiso negado', async () => {
  const orig = navigator.geolocation;
  Object.defineProperty(navigator, 'geolocation', { configurable: true,
    value: { getCurrentPosition: (_ok, err) => err({ code: 1 }) } });
  try { await Acta.Capture.gps(); assert.ok(false, 'debía rechazar'); }
  catch (e) { assert.equal(e.message, 'Permiso de ubicación negado.'); }
  finally { Object.defineProperty(navigator, 'geolocation', { configurable: true, value: orig }); }
});
test('pad vacío devuelve null', () => {
  const c = document.createElement('canvas'); document.body.appendChild(c);
  const p = Acta.Capture.pad(c); assert.equal(p.isEmpty(), true); assert.equal(p.toDataURL(), null);
  c.remove();
});
})();
