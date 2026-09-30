window.Acta = window.Acta || {};

/* Validación antes de generar: faltantes obligatorios y avisos de coherencia. Nunca bloquea. */
Acta.Validate = (function () {
  const M = () => Acta.Model;

  const EXTRA = [
    { id: 'medidores.Activa.serie', label: 'Serie del medidor', sectionId: 'medidor',
      value: a => M().getCell(a, 'medidores', 'Activa', 'serie') },
    { id: 'medidores.Activa.lectura', label: 'Lectura activa', sectionId: 'medidor',
      value: a => M().getCell(a, 'medidores', 'Activa', 'lectura') },
    { id: 'firma.bia', label: 'Firma BIA', sectionId: 'firmas', value: a => a.images['firma.bia'] }
  ];

  function missing(acta) {
    const out = [];
    Acta.Catalog.fields().forEach(f => {
      if (f.required && Acta.Rules.isVisible(f.id, acta) && M().isEmpty(M().get(acta, f.id))) {
        out.push({ id: f.id, label: f.label, sectionId: f.sectionId });
      }
    });
    EXTRA.forEach(x => {
      if (M().isEmpty(x.value(acta))) out.push({ id: x.id, label: x.label, sectionId: x.sectionId });
    });
    return out;
  }

  function warnings(acta) {
    const out = [], v = id => M().get(acta, id);
    const w = (code, message, sectionId) => out.push({ code, message, sectionId });

    const hi = v('acta.horaIngreso'), hs = v('acta.horaSalida');
    if (!M().isEmpty(hi) && !M().isEmpty(hs) && hs < hi) {
      w('horaSalidaAntes', 'La hora de salida es anterior a la de ingreso.', 'encabezado');
    }
    const li = M().parseNum(v('pr.lecturaInicial')), lf = M().parseNum(v('pr.lecturaFinal'));
    if (li !== null && lf !== null && lf < li) {
      w('lecturaFinalMenor', 'La lectura final es menor que la inicial.', 'pruebas');
    }
    const tipo = v('tec.tipoMedida');
    if ((tipo === 'Semidirecta' || tipo === 'Indirecta') &&
        ['A', 'B', 'C'].every(k => M().isEmpty(M().getCell(acta, 'tc', k, 'serie')))) {
      w('tcSinSerie', 'La medida es semidirecta o indirecta y no hay series de TC.', 'tcs');
    }
    if ([1, 2, 3, 4, 5].some(n => v('legal.' + n) === 'No')) {
      w('autorizacionNo', 'Hay autorizaciones legales en No.', 'legales');
    }
    if (M().isEmpty(acta.images['firma.usuario'])) {
      w('sinFirmaUsuario', 'Falta la firma del usuario o testigo.', 'firmas');
    }
    return out;
  }

  return { run: acta => ({ missing: missing(acta), warnings: warnings(acta) }) };
})();
