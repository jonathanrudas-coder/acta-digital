window.Acta = window.Acta || {};
// Montaje temporal (Task 8) — lo reemplaza Acta.App en Task 10.
document.addEventListener('DOMContentLoaded', async () => {
  await Acta.Store.init();
  window.__acta = Acta.Model.newActa();
  window.__form = Acta.Form.mount(document.getElementById('app'), window.__acta, { onChange: a => { window.__changes = (window.__changes || 0) + 1; } });
});
