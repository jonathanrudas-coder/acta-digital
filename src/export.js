window.Acta = window.Acta || {};

/* Exportación de hojas a PNG/JPG y entrega (compartir o descargar). */
Acta.Export = (function () {
  function fileName(actaNo, n, fecha, fmt) {
    const no = String(actaNo || '').trim().replace(/[^A-Za-z0-9_-]/g, '-') || 'SN';
    return 'Acta-' + no + '-Hoja' + n + '-' + fecha + '.' + fmt;
  }

  async function render(node, fmt, pixelRatio) {
    const opts = { pixelRatio, backgroundColor: '#ffffff', width: 1080, style: { margin: '0', transform: 'none' } };
    if (fmt === 'jpg') {
      const url = await htmlToImage.toJpeg(node, Object.assign({ quality: 0.9 }, opts));
      return (await fetch(url)).blob();
    }
    return htmlToImage.toBlob(node, opts);
  }

  /* pixelRatio que mantiene el canvas bajo ~16 MP (límite de Safari en iOS). */
  const MAX_PIXELS = 16e6;
  function ratioFor(height) {
    const h = Math.max(1, height || 1);
    return Math.max(0.5, Math.min(2, Math.sqrt(MAX_PIXELS / (1080 * h))));
  }
  const isWebKit = () => /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);

  async function toBlob(node, fmt) {
    if (!window.htmlToImage) throw new Error('Necesitas conexión para generar la imagen.');
    const ratio = ratioFor(node.offsetHeight || node.scrollHeight);
    // Safari a veces omite imágenes data: en la primera captura; un render previo lo evita.
    if (isWebKit()) { try { await render(node, fmt, 0.2); } catch (e) { /* solo calentamiento */ } }
    try {
      const b = await render(node, fmt, ratio);
      if (b) return b;
    } catch (e) { /* reintento con menor resolución */ }
    try {
      const b = await render(node, fmt, Math.min(1, ratio));
      if (b) return b;
    } catch (e) { /* cae al error de abajo */ }
    throw new Error('No se pudo generar la imagen. Intenta de nuevo.');
  }

  async function makeFiles(nodes, fmt, actaNo, fecha) {
    const files = [];
    for (let i = 0; i < nodes.length; i++) {
      const blob = await Acta.Export.toBlob(nodes[i], fmt);
      files.push(new File([blob], fileName(actaNo, i + 1, fecha, fmt), { type: fmt === 'jpg' ? 'image/jpeg' : 'image/png' }));
    }
    return files;
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function canShareFiles(files) {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files })); } catch (e) { return false; }
  }

  async function deliver(files) {
    if (canShareFiles(files)) {
      try {
        await navigator.share({ files, title: files[0].name.replace(/-Hoja\d.*$/, '') });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'shared';
        if (e && e.name === 'NotAllowedError') return 'retry';   // se perdió el gesto: el usuario vuelve a tocar
      }
    }
    files.forEach(download);
    return 'downloaded';
  }

  return { fileName, ratioFor, toBlob, makeFiles, deliver, canShareFiles };
})();
