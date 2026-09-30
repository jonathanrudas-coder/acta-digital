window.Acta = window.Acta || {};

/* Capturas del dispositivo: GPS, lienzo de firma/dibujo, fotos comprimidas y hora actual. */
Acta.Capture = (function () {
  const GPS_MSG = {
    1: 'Permiso de ubicación negado.',
    2: 'No se pudo obtener la ubicación. Escríbela a mano.',
    3: 'No se pudo obtener la ubicación. Escríbela a mano.'
  };

  function gps() {
    return new Promise((ok, ko) => {
      const geo = navigator.geolocation;
      if (!geo) { ko(new Error('Este dispositivo no tiene GPS disponible.')); return; }
      geo.getCurrentPosition(
        p => ok({ lat: p.coords.latitude, lon: p.coords.longitude, alt: p.coords.altitude == null ? null : p.coords.altitude }),
        e => ko(new Error(GPS_MSG[e && e.code] || GPS_MSG[2])),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  function loadImage(src) {
    return new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = ko; im.src = src; });
  }

  function pad(canvas, opts) {
    const o = opts || {};
    const ctx = canvas.getContext('2d');
    let strokes = [], current = null, base = null;
    canvas.style.touchAction = 'none';
    if (o.grid) canvas.classList.add('is-grid');

    function size() {
      const r = canvas.getBoundingClientRect();
      return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
    }
    function redraw() {
      const { w, h } = size(), dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (base) ctx.drawImage(base, 0, 0, w, h);
      ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#171717';
      strokes.forEach(s => {
        ctx.beginPath();
        s.forEach((p, i) => (i ? ctx.lineTo(p.x * w, p.y * h) : ctx.moveTo(p.x * w, p.y * h)));
        if (s.length === 1) ctx.lineTo(s[0].x * w + 0.1, s[0].y * h);
        ctx.stroke();
      });
    }
    function point(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }
    const changed = () => o.onChange && o.onChange();

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      current = [point(e)]; strokes.push(current);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      redraw();
    });
    canvas.addEventListener('pointermove', e => { if (current) { current.push(point(e)); redraw(); } });
    const end = () => { if (current) { current = null; changed(); } };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    function isEmpty() { return !base && strokes.length === 0; }

    function toDataURL() {
      if (isEmpty()) return null;
      const out = document.createElement('canvas');
      out.width = canvas.width; out.height = canvas.height;
      const c = out.getContext('2d');
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, out.width, out.height);
      c.drawImage(canvas, 0, 0);
      return out.toDataURL('image/png');
    }

    async function load(src) {
      strokes = []; base = src ? await loadImage(src) : null; redraw();
    }

    redraw();
    return {
      toDataURL, load, isEmpty, resize: redraw,
      clear() { strokes = []; base = null; redraw(); changed(); },
      undo() { if (strokes.length) strokes.pop(); else base = null; redraw(); changed(); }
    };
  }

  function photo(file, opts) {
    const o = Object.assign({ max: 1600, quality: 0.8 }, opts);
    return new Promise((ok, ko) => {
      const reader = new FileReader();
      reader.onerror = () => ko(new Error('No se pudo leer la foto.'));
      reader.onload = () => loadImage(reader.result).then(im => {
        const k = Math.min(1, o.max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(im, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', o.quality));
      }, () => ko(new Error('No se pudo leer la foto.')));
      reader.readAsDataURL(file);
    });
  }

  function now() {
    const d = new Date();
    return { fecha: Acta.Model.fecha(d), hora: Acta.Model.hora(d) };
  }

  return { gps, pad, photo, now };
})();
