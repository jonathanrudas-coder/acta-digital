window.Acta = window.Acta || {};

/* Catálogo del formato OPS-FM-03 v02 "Visita previa para conexión eléctrica" (spec §5). */
Acta.Catalog = (function () {
  const SI = { eq: 'Sí' };
  const when = (field, cond) => Object.assign({ field }, cond || SI);

  const f = (id, label, type, extra) => Object.assign({ id, label, type: type || 'text' }, extra || {});
  const num = (id, label, extra) => f(id, label, 'number', Object.assign({ inputmode: 'decimal' }, extra));
  const yn = (id, label, extra) => f(id, label, 'yesno', extra);
  const gb = (id, label, extra) => f(id, label, 'goodbad', extra);
  const choice = (id, label, options, extra) => f(id, label, 'choice', Object.assign({ options }, extra));
  const suggest = (id, label, list, extra) => f(id, label, 'suggest', Object.assign({ list }, extra));
  const ifYes = (parent, fields) => fields.map(x => Object.assign(x, { when: when(parent) }));
  const otro = (parentId) => f(parentId + 'Cual', '¿Cuál?', 'text', { when: when(parentId, { eq: 'Otro' }) });

  const selloCols = () => [
    f('serial', 'Serial del sello'),
    suggest('tipo', 'Tipo de sello', 'tipoSello'),
    choice('propiedad', 'Propiedad', ['Representante Frontera', 'Operador de Red', 'Laboratorio']),
    suggest('color', 'Color', 'colorSello')
  ];
  const sellos2 = (id, label) => f(id, label, 'grid', { rows: ['Sello 1', 'Sello 2'], columns: selloCols() });
  const trafoCols = () => [
    suggest('marca', 'Marca', 'marcasTcTp'),
    f('serie', 'Número de serie'),
    f('clase', 'Clase'),
    suggest('relacion', 'Relación de transformación', 'relacionTc'),
    num('cargabilidad', 'Cargabilidad (VA)'),
    yn('protocolo', 'Usuario tiene protocolo de calibración')
  ];
  const AISLAMIENTO = ['0,72 kV', '17,5 kV', '36 kV'];

  const MEDIDA_TC = { field: 'tec.tipoMedida', in: ['Semidirecta', 'Indirecta'], orUnset: true };
  const MEDIDA_TP = { field: 'tec.tipoMedida', in: ['Indirecta'], orUnset: true };

  const sections = [
    // ───────────── Hoja 1 ─────────────
    { id: 'encabezado', title: 'Encabezado', sheet: 1, fields: [
      f('acta.numero', 'No. de acta', 'text', { required: true, inputmode: 'numeric' }),
      f('acta.fecha', 'Fecha', 'date'),
      f('acta.horaIngreso', 'Hora de ingreso', 'time'),
      f('acta.horaSalida', 'Hora de salida', 'time')
    ] },
    { id: 'comercial', title: 'Información comercial', sheet: 1, fields: [
      f('com.cuenta', 'Nombre de la cuenta', 'text', { required: true }),
      f('com.atiende', 'Persona que atiende'),
      f('com.ciudad', 'Ciudad / municipio'),
      suggest('com.depto', 'Departamento', 'departamentos'),
      suggest('com.comercializador', 'Comercializador', 'comercializadores'),
      suggest('com.or', 'Operador de red', 'operadores'),
      f('com.direccion', 'Dirección de suministro', 'text', { required: true }),
      f('com.codigoCuenta', 'Código cuenta'),
      f('com.telefono', 'Teléfono', 'text', { inputmode: 'tel' }),
      choice('com.tipologia', 'Tipología de usuario', ['Residencial', 'Comercial', 'Industrial', 'Otro']),
      otro('com.tipologia'),
      f('com.actividad', 'Actividad económica')
    ] },
    { id: 'asesoria', title: 'Autorización de asesoría técnica', sheet: 1,
      note: 'Se informa al usuario acerca de su derecho a solicitar la asesoría o participación de un técnico particular durante la visita.',
      fields: [yn('ases.usoDerecho', '¿El usuario hizo uso de este derecho?')] },
    { id: 'tecnica', title: 'Información técnica', sheet: 1, fields: [
      choice('tec.tipoMedida', 'Tipo de medida encontrado', ['Directa', 'Semidirecta', 'Indirecta'], { required: true }),
      num('tec.factor', 'Factor de medida'),
      f('tec.nivelTension', 'Nivel de tensión'),
      f('tec.redMedia', 'Red de media tensión'),
      num('tec.kvaContratados', 'kVA contratados', { unit: 'kVA' })
    ] },
    { id: 'trafo', title: 'Transformador de potencia', sheet: 1, fields: [
      f('trafo.numero', 'Número de transformador'),
      f('trafo.nodo', 'Número nodo transformador'),
      num('trafo.capacidad', 'Capacidad instalada', { unit: 'kVA' }),
      f('trafo.subestacion', 'Subestación'),
      f('trafo.marca', 'Marca'),
      f('trafo.circuito', 'Circuito'),
      f('trafo.aislamiento', 'Tipo de aislamiento'),
      choice('trafo.uso', 'Tipo de uso', ['Exclusivo', 'Compartido'])
    ] },
    { id: 'celdaMedidor', title: 'Información celda medidor de energía', sheet: 1, fields: [
      yn('celda.enCelda', '¿El medidor está en celda?'),
      ...ifYes('celda.enCelda', [
        gb('celda.estado', 'Estado celda medidor'),
        f('celda.referencia', 'Referencia celda'),
        choice('celda.tipo', 'Tipo de celda de medidor', ['Gabinete compartido', 'Gabinete metálico', 'Caja policarbonato', 'Otro']),
        f('celda.certificacion', 'Número de certificación de celda'),
        sellos2('sellosCelda', 'Sellos celda de medidor')
      ]),
      f('celda.tipoCual', '¿Cuál?', 'text', { when: when('celda.tipo', { eq: 'Otro' }) })
    ] },
    { id: 'medidor', title: 'Información medidor de energía', sheet: 1, fields: [
      f('medidores', 'Medidor encontrado', 'grid', { rows: ['Activa', 'Reactiva'], columns: [
        suggest('marca', 'Marca', 'marcasMedidor'),
        f('serie', 'Serie', 'text', { inputmode: 'numeric' }),
        choice('tipo', 'Tipo', ['Electrónico', 'Electromecánico']),
        f('clase', 'Clase'),
        f('voltaje', 'Voltaje'),
        f('corriente', 'Corriente'),
        f('elementos', 'Elementos', 'text', { inputmode: 'numeric' }),
        f('constante', 'Constante'),
        f('fechaCalib', 'Fecha calibración', 'date'),
        f('lectura', 'Lectura', 'text', { inputmode: 'decimal' }),
        f('modelo', 'Modelo')
      ] }),
      yn('med.respaldo', '¿Tiene medidor de respaldo?'),
      f('med.respaldoMarcaSerie', 'Marca y serie medidor de respaldo', 'text', { when: when('med.respaldo') }),
      yn('med.deberiaRespaldo', '¿Debería tener medidor de respaldo?'),
      yn('med.espejoOr', '¿Tiene medidor espejo del OR?')
    ] },
    { id: 'telemedida', title: 'Información sistema de telemedida', sheet: 1, fields: [
      choice('tele.ubicacion', 'Ubicación', ['Interior', 'Exterior']),
      f('tele.tipo', 'Tipo'),
      suggest('tele.marca', 'Marca', 'marcasModem'),
      f('tele.serie', 'Serie'),
      f('tele.ip', 'Dirección IP', 'text', { inputmode: 'decimal' }),
      f('tele.telefono', 'Teléfono', 'text', { inputmode: 'tel' }),
      f('tele.simcard', 'Serie SIMCARD', 'text', { inputmode: 'numeric' }),
      f('tele.modelo', 'Modelo'),
      f('tele.imei', 'IMEI', 'text', { inputmode: 'numeric' }),
      f('tele.estado', 'Estado operativo')
    ] },
    { id: 'sellosMedidor', title: 'Sellos medidor', sheet: 1, fields: [
      f('sellosMed', 'Sellos del medidor', 'grid', { columns: selloCols(), rows: [
        'Cubierta principal · 1', 'Cubierta principal · 2', 'Demanda máxima · 1', 'Demanda máxima · 2',
        'Caja de conexiones · 1', 'Caja de conexiones · 2'] })
    ] },
    { id: 'otrosSellos', title: 'Otros sellos', sheet: 1, fields: [
      f('otrosSellosList', 'Otros sellos', 'list', { addLabel: 'Agregar sello', itemLabel: 'Sello', columns: [
        suggest('ubicacion', 'Ubicación', 'ubicacionSello'),
        f('serial', 'Serial del sello'),
        suggest('tipo', 'Tipo de sello', 'tipoSello'),
        choice('propiedad', 'Propiedad', ['Representante Frontera', 'Operador de Red', 'Laboratorio']),
        suggest('color', 'Color', 'colorSello')
      ] })
    ] },
    { id: 'pruebas', title: 'Pruebas medidor de energía', sheet: 1,
      note: 'Escribe voltaje, corriente y factor de potencia de cada fase: las potencias se calculan solas. El Total promedia voltaje, corriente y factor de potencia de las fases, y usa √3 cuando el totalizador es de 3 fases. El % de error del Total se calcula con el tiempo (s), los impulsos y la constante del medidor (sección Medidor).',
      fields: [
      f('pruebasFase', 'Pruebas por fase', 'grid', { rows: ['R', 'S', 'T', 'Total'], calcTotal: ['voltaje', 'corriente', 'fp', 'errActiva', 'errReactiva'], columns: [
        num('voltaje', 'Voltaje', { unit: 'V' }), num('corriente', 'Corriente', { unit: 'A' }), num('fp', 'Factor de potencia'),
        num('p', 'Potencia activa P', { unit: 'kW', calc: true }), num('q', 'Potencia reactiva Q', { unit: 'kVAR', calc: true }),
        num('smed', 'Potencia aparente Smed', { unit: 'kVA', calc: true }),
        num('errActiva', '% error activa'),
        num('errReactiva', '% error reactiva')
      ] }),
      num('pr.tiempoActiva', 'Tiempo activa', { unit: 's' }),
      num('pr.girosActiva', 'Giros activa (impulsos)', { inputmode: 'numeric' }),
      num('pr.tiempoReactiva', 'Tiempo reactiva', { unit: 's' }),
      num('pr.girosReactiva', 'Giros reactiva (impulsos)', { inputmode: 'numeric' }),
      num('pr.lecturaInicial', 'Lectura inicial'),
      num('pr.lecturaFinal', 'Lectura final'),
      f('pr.diferencia', 'Diferencia', 'computed', { compute: 'diferencia' }),
      num('pr.error', '% error')
    ] },
    { id: 'totalizador', title: 'Información totalizador y cables de potencia', sheet: 1, fields: [
      yn('tot.tiene', '¿Tiene totalizador?'),
      ...ifYes('tot.tiene', [
        choice('tot.fases', 'Fases del totalizador', ['1', '2', '3']),
        f('tot.capacidad', 'Capacidad totalizador'),
        f('tot.marca', 'Marca totalizador')
      ]),
      suggest('tot.calibreParciales', 'Calibre cable de parciales', 'calibres'),
      suggest('tot.calibreAcometida', 'Calibre cable de acometida', 'calibres'),
      num('tot.cablesParcial', 'Número de cables por fase (parcial)', { inputmode: 'numeric' }),
      num('tot.cablesAcometida', 'Número de cables por fase (acometida)', { inputmode: 'numeric' })
    ] },
    { id: 'tcs', title: 'Transformadores de corriente y bloque de pruebas', sheet: 1, when: MEDIDA_TC, fields: [
      f('tc', 'Equipos TCs', 'grid', { rows: ['A', 'B', 'C'], columns: trafoCols() }),
      choice('tc.tipo', 'Tipo de TC', ['Barra pasante', 'Ventana interior', 'Ventana exterior embebido o con cable', 'Ventana exterior bornera']),
      choice('tc.aislamiento', 'Nivel de aislamiento', AISLAMIENTO),
      f('bloque.marca', 'Marca bloque de pruebas'),
      gb('bloque.condicion', 'Condición bloque de pruebas'),
      choice('bloque.tipo', 'Tipo de bloque de pruebas', ['Cuchilla', 'Laina o lámina', 'Otro']),
      otro('bloque.tipo'),
      sellos2('sellosBloque', 'Sellos bloque de pruebas'),
      f('cable.marca', 'Marca cable de control'),
      gb('cable.condicion', 'Condición cable de control'),
      suggest('cable.calibreTension', 'Calibre cable control tensión', 'calibres'),
      suggest('cable.calibreCorriente', 'Calibre cable control corriente', 'calibres'),
      num('cable.metrosTension', 'Metros cable control tensión', { unit: 'm' }),
      num('cable.metrosCorriente', 'Metros cable control corriente', { unit: 'm' })
    ] },
    { id: 'tps', title: 'Transformadores de tensión', sheet: 1, when: MEDIDA_TP, fields: [
      f('tp', 'Equipos TPs', 'grid', { rows: ['A', 'B', 'C'], columns: trafoCols() }),
      choice('tp.tipo', 'Tipo de TP', ['Exterior', 'Interior', 'Otro']),
      otro('tp.tipo'),
      choice('tp.aislamiento', 'Nivel de aislamiento', AISLAMIENTO)
    ] },

    // ───────────── Hoja 2 ─────────────
    { id: 'celdasMT', title: 'Celdas de TCs y TPs', sheet: 2, when: MEDIDA_TP, fields: [
      yn('celdaTc.tiene', 'Celda de TCs: ¿tienen celda?'),
      ...ifYes('celdaTc.tiene', [
        gb('celdaTc.estado', 'Celda de TCs: estado de celda'),
        f('celdaTc.certificado', 'Celda de TCs: número certificado de celda'),
        f('celdaTc.tipo', 'Celda de TCs: tipo de celda'),
        f('celdaTc.ubicacion', 'Celda de TCs: ubicación'),
        gb('celdaTc.poste', 'Celda de TCs: estado del poste')
      ]),
      yn('celdaTp.tiene', 'Celda de TPs: ¿tienen celda?'),
      ...ifYes('celdaTp.tiene', [
        gb('celdaTp.estado', 'Celda de TPs: estado de celda'),
        f('celdaTp.certificado', 'Celda de TPs: número certificado de celda'),
        f('celdaTp.tipo', 'Celda de TPs: tipo de celda'),
        f('celdaTp.ubicacion', 'Celda de TPs: ubicación'),
        gb('celdaTp.poste', 'Celda de TPs: estado del poste')
      ]),
      sellos2('sellosMT', 'Sellos celda media tensión')
    ] },
    { id: 'planta', title: 'Planta de respaldo', sheet: 2, fields: [
      yn('planta.tiene', '¿Tiene planta de respaldo?'),
      num('planta.capacidadKva', 'Capacidad planta de respaldo', { unit: 'kVA', when: when('planta.tiene') }),
      yn('planta.compartida', '¿La planta es de uso compartido?'),
      num('planta.horas', 'Capacidad de uso en horas', { unit: 'h', when: when('planta.compartida') })
    ] },
    { id: 'servicios', title: 'Servicios adicionales', sheet: 2, fields: [
      yn('serv.wifi24', '¿El WiFi es 2.4 GHz?'),
      f('serv.soluciones', 'Cuenta con soluciones actuales'),
      f('serv.condiciones', 'Condiciones atmosféricas', 'multi', { options: ['Humedad', 'Temperatura alta', 'Temperatura baja', 'Otro'] }),
      f('serv.condicionesCual', '¿Cuál condición?', 'text', { when: { field: 'serv.condiciones', eq: 'Otro' } }),
      f('serv.interes', '¿Qué servicios le interesan a futuro?', 'multi', { options: ['Paneles solares', 'Cambio de nivel de tensión',
        'Incremento de carga', 'Carga vehicular SVG', 'Banco condensadores', 'Otros'] }),
      f('serv.interesCual', '¿Cuáles otros servicios?', 'text', { when: { field: 'serv.interes', eq: 'Otros' } })
    ] },
    { id: 'maquinas', title: 'Información máquinas', sheet: 2, fields: [
      f('maquinasList', 'Máquinas', 'list', { addLabel: 'Agregar máquina', itemLabel: 'Máquina', columns: [
        f('tipo', 'Tipo de máquina'), num('potenciaKw', 'Potencia (kW)'), num('voltaje', 'Voltaje (V)'),
        num('corriente', 'Corriente (A)'), num('frecuencia', 'Frecuencia (Hz)'), num('fp', 'Factor de potencia'),
        num('cantidad', 'Cantidad', { inputmode: 'numeric' })
      ] })
    ] },
    { id: 'unifilar', title: 'Diagrama unifilar', sheet: 2, fields: [
      f('unifilar.dibujo', 'Dibujo del diagrama', 'drawing'),
      f('unifilar.foto', 'Foto del diagrama', 'photo')
    ] },
    { id: 'observaciones', title: 'Observaciones', sheet: 2, fields: [
      f('obs.texto', 'Observaciones', 'textarea'),
      yn('obs.aumentoCarga', '¿Existen procesos de aumento de carga?'),
      f('obs.aumentoCargaCuales', '¿Cuáles?', 'text', { when: when('obs.aumentoCarga') })
    ] },
    { id: 'riesgos', title: 'Control de riesgos', sheet: 2, fields: [
      f('riesgo.q1', '¿Cuál es el tipo de medida?', 'mirror', { source: 'tec.tipoMedida' }),
      f('riesgo.q2', '¿Dónde se encuentra el punto de desenergización?'),
      yn('riesgo.q3', '¿Es accesible el punto de desenergización?', { risk: 'No' }),
      f('riesgo.q4', '¿Cuál es el voltaje al que estaría expuesto el personal técnico electricista?'),
      yn('riesgo.q5', '¿La celda del medidor se encuentra obstaculizada?', { risk: 'Sí' }),
      f('riesgo.q5Cual', '¿Qué la está obstaculizando?', 'text', { when: when('riesgo.q5') }),
      yn('riesgo.q6', '¿La conexión eléctrica se encuentra a una altura mayor a 2 metros?', { risk: 'Sí' }),
      f('riesgo.q6Obs', 'Observación altura'),
      yn('riesgo.q7', '¿Se deben implementar medidas de seguridad contra caídas?', { risk: 'Sí' }),
      f('riesgo.q7Cual', '¿Cuáles medidas?', 'text', { when: when('riesgo.q7') }),
      yn('riesgo.q8', '¿Existe suficiente espacio para realizar la instalación de manera segura (80 cm de ancho por 2 m de alto)?', { risk: 'No' }),
      yn('riesgo.q9', '¿Hay riesgo de atrapamiento?', { risk: 'Sí' }),
      yn('riesgo.q10', '¿Existe una iluminación adecuada para trabajar de manera segura?', { risk: 'No' }),
      yn('riesgo.q11', '¿La zona está adecuadamente señalizada para advertir sobre riesgos eléctricos?', { risk: 'No' }),
      yn('riesgo.q12', '¿Hay señalizaciones de otros tipos de riesgos?'),
      f('riesgo.q12Cual', '¿Cuáles señalizaciones?', 'text', { when: when('riesgo.q12') }),
      yn('riesgo.q13', '¿Se han identificado otros riesgos como posturas forzadas, exposición a químicos o factores físicos (ruido, vibraciones, olores, etc.)?', { risk: 'Sí' }),
      f('riesgo.q13Cual', '¿Cuáles riesgos?', 'text', { when: when('riesgo.q13') }),
      yn('riesgo.q14', '¿Existen extintores cerca a la zona de conexión eléctrica?', { risk: 'No' }),
      yn('riesgo.q15', '¿La maniobra a realizar puede afectar a los alrededores o a terceros?', { risk: 'Sí' }),
      f('riesgo.q15Quien', '¿A quién?', 'text', { when: when('riesgo.q15') })
    ] },
    { id: 'maniobra', title: 'Requisitos para maniobra', sheet: 2, fields: [
      f('man.requisitos', 'Requisitos para maniobra', 'textarea'),
      yn('man.descargoOr', '¿Requiere descargo del OR?')
    ] },
    { id: 'seccionamientos', title: 'Seccionamientos externos', sheet: 2, fields: [
      yn('secc.existen', '¿Existen seccionamientos externos?'),
      ...ifYes('secc.existen', [
        f('secc.identificacion', 'Identificación de seccionamiento'),
        num('secc.usuarios', '¿A cuántos usuarios afecta?', { inputmode: 'numeric' }),
        f('secc.descripcion', 'Nombre y descripción de usuarios que afecta', 'textarea')
      ]),
      f('secc.gps', 'Ubicación', 'gps', { targets: ['secc.lat', 'secc.lon', 'secc.alt'] }),
      num('secc.lat', 'Latitud'),
      num('secc.lon', 'Longitud'),
      num('secc.alt', 'Altitud', { unit: 'm' })
    ] },
    { id: 'legales', title: 'Autorizaciones legales', sheet: 2, fields: [
      f('legal.todas', 'Marcar todas en Sí', 'allYes', { group: ['legal.1', 'legal.2', 'legal.3', 'legal.4', 'legal.5'] }),
      yn('legal.1', 'Declaro que el contenido del acta es verídico y ha sido informado al usuario de manera clara.'),
      yn('legal.2', 'Declaro que durante la visita no se alteró el sistema de medición actual ni se afectó la prestación normal del servicio de energía.'),
      yn('legal.3', 'Declaro que estuve presente durante la ejecución de la visita, me fue informada previamente las labores a realizar y los técnicos encargados se identificaron previamente.'),
      yn('legal.4', 'Declaro que al finalizar la actividad el personal encargado informó acerca de los resultados y hallazgos relevantes.'),
      yn('legal.5', 'Autorizo el uso de datos personales de acuerdo con la Política de privacidad y protección de datos personales.')
    ] },
    { id: 'firmas', title: 'Firmas', sheet: 2, fields: [
      f('firma.usuario', 'Firma usuario / testigo', 'signature'),
      f('firma.usuario.nombre', 'Nombre usuario / testigo'),
      f('firma.usuario.cc', 'C.C. usuario / testigo', 'text', { inputmode: 'numeric' }),
      f('firma.usuario.tel', 'Tel. usuario / testigo', 'text', { inputmode: 'tel' }),
      f('firma.bia', 'Firma BIA', 'signature'),
      f('firma.bia.nombre', 'Nombre técnico BIA'),
      f('firma.bia.cc', 'C.C. técnico BIA', 'text', { inputmode: 'numeric' }),
      f('firma.bia.tel', 'Tel. técnico BIA', 'text', { inputmode: 'tel' }),
      f('firma.or', 'Firma operador de red', 'signature'),
      f('firma.or.nombre', 'Nombre operador de red'),
      f('firma.or.cc', 'C.C. operador de red', 'text', { inputmode: 'numeric' }),
      f('firma.or.tel', 'Tel. operador de red', 'text', { inputmode: 'tel' })
    ] }
  ];

  const LEY = 'Bia Energy SAS ESP en cumplimiento de lo consagrado en la Ley 1581 de 2012 y el Decreto 1377 de 2013, se permite ' +
    'informarles que la actividad de recolección de datos personales registrados en la presente acta se realiza en desarrollo ' +
    'del objeto social, y tendrán como única finalidad evidenciar la ejecución de actividades técnicas relacionadas con el ' +
    'suministro del servicio público domiciliario energía eléctrica y para efectos probatorios.';

  const index = {};
  const flat = [];
  sections.forEach(s => {
    index[s.id] = s;
    s.fields.forEach(x => { x.sectionId = s.id; index[x.id] = x; flat.push(x); });
  });

  return {
    sections,
    LEY,
    byId: id => index[id],
    fields: () => flat.slice()
  };
})();
