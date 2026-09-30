window.Acta = window.Acta || {};

/* Listas de autocompletar (spec §5.4). Son sugerencias: todo campo acepta texto libre. */
Acta.Lists = (function () {
  const operadores = [
    'Air-e', 'Afinia', 'Enel Colombia', 'EPM', 'Celsia Colombia (Valle)', 'Celsia Colombia (Tolima)',
    'ESSA', 'CENS', 'CHEC', 'EDEQ', 'Energía de Pereira', 'EBSA', 'Electrohuila', 'Emcali', 'Cedenar',
    'Enerca', 'Enelar', 'Electrocaquetá', 'EMSA (Meta)', 'Dispac', 'Cetsa', 'Ruitoque',
    'Empresa de Energía del Bajo Putumayo'
  ];
  const uniq = arr => arr.filter((x, i) => arr.indexOf(x) === i);
  return {
    operadores,
    comercializadores: uniq(['BIA Energy'].concat(operadores, ['Vatia', 'Enertotal', 'Isagen', 'Gecelca'])),
    marcasMedidor: ['Microstar', 'Elster (Honeywell)', 'Landis+Gyr', 'Itron', 'Schneider Electric', 'Kamstrup',
      'Hexing', 'ZIV', 'Circutor', 'Wasion', 'Holley', 'ABB'],
    marcasModem: ['Emsitech', 'Wlink', 'Teltonika', 'Four-Faith', 'Robustel', 'Sierra Wireless'],
    marcasTcTp: ['Arteche', 'Rymel', 'ABB', 'Siemens', 'Schneider Electric', 'Magnetron', 'Ritz', 'Circutor'],
    calibres: ['14 AWG', '12 AWG', '10 AWG', '8 AWG', '6 AWG', '4 AWG', '2 AWG', '1/0 AWG', '2/0 AWG', '3/0 AWG',
      '4/0 AWG', '250 kcmil', '300 kcmil', '350 kcmil', '500 kcmil'],
    relacionTc: ['50/5', '75/5', '100/5', '150/5', '200/5', '300/5', '400/5', '500/5', '600/5', '800/5', '1000/5'],
    departamentos: ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas',
      'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila',
      'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
      'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'],
    tipoSello: ['AN', 'TA', 'LA', 'PL', 'FO', 'CA', 'EST', 'OT'],
    propiedadSello: ['Representante Frontera', 'Operador de Red', 'Laboratorio'],
    colorSello: ['Verde', 'Amarillo', 'Azul', 'Rojo', 'Blanco', 'Naranja', 'Negro']
  };
})();
