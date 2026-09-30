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

  async function toBlob(node, fmt) {
    if (!window.htmlToImage) throw new Error('Necesitas conexión para generar la imagen.');
    try {
      const b = await render(node, fmt, 2);
      if (b) return b;
    } catch (e) { /* reintento con menor resolución */ }
    try {
      const b = await render(node, fmt, 1);
      if (b) return b;
    } catch (e) { /* cae al error de abajo */ }
    throw new Error('No se pudo generar la imagen. Intenta de nuevo.');
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
      }
    }
    files.forEach(download);
    return 'downloaded';
  }

  return { fileName, toBlob, deliver, canShareFiles };
})();
