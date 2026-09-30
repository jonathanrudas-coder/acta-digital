/* Mini framework de pruebas en el navegador. */
(function () {
  var cases = [];
  function fmt(v) { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  function fail(msg) { throw new Error(msg); }
  window.test = function (name, fn) { cases.push({ name: name, fn: fn }); };
  window.assert = {
    equal: function (a, b, msg) { if (a !== b) fail((msg ? msg + ': ' : '') + 'esperado ' + fmt(b) + ', obtenido ' + fmt(a)); },
    deepEqual: function (a, b, msg) { if (fmt(a) !== fmt(b)) fail((msg ? msg + ': ' : '') + 'esperado ' + fmt(b) + ', obtenido ' + fmt(a)); },
    ok: function (v, msg) { if (!v) fail(msg || ('valor falso: ' + fmt(v))); }
  };
  window.runTests = async function () {
    var passed = 0, failed = 0, list = document.getElementById('results');
    for (var i = 0; i < cases.length; i++) {
      var c = cases[i], li = document.createElement('li');
      try { await c.fn(); passed++; li.textContent = 'ok - ' + c.name; }
      catch (e) { failed++; li.textContent = 'FAIL - ' + c.name + ' :: ' + (e && e.message); li.className = 'fail'; }
      list.appendChild(li);
    }
    var s = document.getElementById('summary');
    s.textContent = passed + ' passed, ' + failed + ' failed';
    s.setAttribute('data-done', '1');
    document.title = (failed ? 'FAIL ' : 'PASS ') + passed + '/' + (passed + failed);
    if (/[?&]report=1/.test(location.search)) {
      var lines = Array.prototype.map.call(list.children, function (li) { return li.textContent; });
      lines.push(s.textContent);
      try { await fetch('/__results', { method: 'POST', body: lines.join('\n') }); } catch (e) { /* sin servidor de reporte */ }
    }
  };
})();
