/* Actas de ejemplo para las pruebas. */
window.Fx = (function () {
  const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  function directa() {
    const a = Acta.Model.newActa(new Date(2026, 8, 30, 8, 0));
    Object.assign(a.values, {
      'acta.numero': '03651', 'acta.horaSalida': '11:00',
      'com.cuenta': 'Panadería La Espiga', 'com.direccion': 'Calle 10 # 20-30', 'com.or': 'Air-e',
      'tec.tipoMedida': 'Directa', 'tec.factor': '1',
      'pr.lecturaInicial': '100', 'pr.lecturaFinal': '120,5',
      'obs.texto': 'Medida en buen estado.', 'obs.aumentoCarga': 'No',
      'riesgo.q3': 'Sí', 'riesgo.q9': 'No', 'riesgo.q14': 'Sí',
      'legal.1': 'Sí', 'legal.2': 'Sí', 'legal.3': 'Sí', 'legal.4': 'Sí', 'legal.5': 'Sí',
      'firma.usuario.nombre': 'Ana Cliente', 'firma.usuario.cc': '1010', 'firma.bia.nombre': 'Técnico BIA'
    });
    a.tables.medidores = { Activa: { marca: 'Microstar', serie: '12345678', lectura: '4521' } };
    a.images['firma.usuario'] = PX;
    a.images['firma.bia'] = PX;
    return a;
  }
  function indirecta() {
    const a = directa();
    a.values['tec.tipoMedida'] = 'Indirecta';
    ['A', 'B', 'C'].forEach((k, i) => {
      Acta.Model.setCell(a, 'tc', k, 'serie', 'TC-00' + (i + 1));
      Acta.Model.setCell(a, 'tc', k, 'relacion', '200/5');
      Acta.Model.setCell(a, 'tp', k, 'serie', 'TP-00' + (i + 1));
    });
    return a;
  }
  return { directa, indirecta, PX };
})();
