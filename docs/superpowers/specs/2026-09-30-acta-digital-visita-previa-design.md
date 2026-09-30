# Acta digital · Visita previa para conexión eléctrica — Diseño

Fecha: 2026-09-30 · Autor: Jonathan Rudas (con Claude)

## 1. Propósito

App móvil para que el técnico diligencie en campo la información del formato
**OPS-FM-03 v02 "Visita previa para conexión eléctrica"** de BIA y descargue un
**resumen en imagen (PNG o JPG), una imagen por hoja**.

- **No es el documento oficial.** El acta oficial se llena a mano, se fotografía
  y se carga en la app de la empresa. Esta app sirve para **recolectar la
  información** de forma ordenada y legible.
- Referencia del formato: `Insumos/Acta BIA.pdf` (2 hojas).
- Proyecto nuevo e independiente. Toma lógicas del artifact "Acta Rápida Bia"
  (firmas en canvas, compresión de fotos, guardado automático, lista de
  faltantes), sin reutilizar su código tal cual.

### Criterios de éxito

1. Un acta de medida directa se diligencia completa desde el celular sin
   scroll horizontal ni zoom.
2. Se generan 2 imágenes (Hoja 1 y Hoja 2) legibles en el celular, con estilo
   Olibia, sin secciones vacías ni no aplicables.
3. La PWA instalada abre y genera imágenes en modo avión.
4. Cerrar la app a mitad de un acta no pierde datos.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Salida | Resumen limpio estilo Olibia (no réplica de la cuadrícula del papel). Una imagen por hoja. PNG o JPG a elección. |
| Plataforma | Mismo `index.html` publicado como **Artifact** (pruebas) y como **PWA en GitHub Pages** (campo, offline). |
| Enfoque técnico | Un solo HTML, sin build, formulario definido por un **catálogo de datos**. Imagen con `html-to-image` (CDN). |
| Design system | Olibia (marca BIA): tokens, tipografía Inter + Season Mix, íconos Remix, reglas R1–R18 recreadas en CSS. |
| Visibilidad | Se muestra solo lo que aplica según tipo de medida y respuestas Sí/No. |
| Captura automática | Fecha, hora ingreso (al crear), hora salida (al generar), GPS lat/long/alt. Todas editables. |
| Esquema unifilar | Dibujo con el dedo **o** foto (ambas opciones). |
| Privacidad | Datos solo en el dispositivo. Sin servidor, sin cuentas. Validez digital ya confirmada por el usuario. |

## 3. Arquitectura

### Archivos

```
index.html              ← app completa (también es el artifact)
manifest.webmanifest    ← instalación PWA
sw.js                   ← service worker (cache offline)
icons/icon-192.png, icon-512.png
docs/superpowers/specs/ ← esta spec
Insumos/                ← referencia, excluida del repo (.gitignore)
```

### Unidades dentro de `index.html`

Cada unidad es un bloque `<script>` con un objeto/namespace propio y una
interfaz pequeña. Las unidades lógicas (1, 2, 5, 7) no tocan el DOM y se pueden
probar aisladas.

| # | Unidad | Responsabilidad | Interfaz |
|---|---|---|---|
| 1 | `Catalog` | Secciones y campos del OPS-FM-03: id, etiqueta, tipo, hoja, sección, regla `when`, opciones/lista, obligatorio. | `Catalog.sections`, `Catalog.field(id)` |
| 2 | `Rules` | Evalúa `when` contra el estado del acta. | `Rules.visible(fieldOrSection, acta) → bool` |
| 3 | `Store` | IndexedDB: borradores, historial, perfil técnico. Guardado con debounce 500 ms. | `list()`, `get(id)`, `save(acta)`, `remove(id)`, `duplicate(id)`, `profile()` |
| 4 | `Form` | Render del formulario desde el catálogo con componentes Olibia; secciones plegables, índice, barra de avance. | `Form.mount(el, acta, onChange)` |
| 5 | `Validate` | Obligatorios + avisos de coherencia. Nunca bloquea. | `Validate.run(acta) → {missing[], warnings[]}` |
| 6 | `Capture` | Horas, GPS, firmas (canvas), unifilar (canvas o foto), compresión de fotos. | `Capture.gps()`, `Capture.signature(el)`, `Capture.photo(file)` |
| 7 | `Sheets` | Construye el modelo de cada hoja (secciones visibles con datos) y lo renderiza a DOM 1080 px. | `Sheets.model(acta) → [hoja1, hoja2]`, `Sheets.render(model) → HTMLElement[]` |
| 8 | `Export` | DOM → PNG/JPG con `html-to-image`; compartir (Web Share API con archivos) o descargar. | `Export.run(nodes, format, actaNo)` |
| 9 | `App` | Navegación entre pantallas: Inicio → Formulario → Revisión → Vista previa. | — |

### Entorno

- **PWA:** `sw.js` hace cache-first de `index.html`, manifest, íconos y las
  librerías CDN (`html-to-image`, Remix Icon). Versionado por nombre de cache.
- **Artifact:** `App` detecta que no hay `navigator.serviceWorker` utilizable o
  que corre dentro de claude.ai y omite el registro; lo demás funciona igual.
  Todo acceso a IndexedDB/localStorage va en `try/catch`, con fallback a memoria.
- **Fuentes:** Inter y Season Mix incrustadas como base64 (`@font-face`) para
  que la imagen y el modo offline no dependan de red. Season Mix es TRIAL (ver
  §10).
- **Librerías externas:** solo desde cdnjs / jsdelivr.

## 4. Modelo de datos

```js
Acta = {
  id, createdAt, updatedAt, status: 'borrador' | 'generada',
  values: { [fieldId]: string | number | boolean | null },
  tables: {                     // datos repetibles
    pruebasFase: { R:{...}, S:{...}, T:{...}, Total:{...} },
    tc: { A:{...}, B:{...}, C:{...} },
    tp: { A:{...}, B:{...}, C:{...} },
    maquinas: [ {tipo, potenciaKw, voltaje, corriente, frecuencia, fp, cantidad} ]
  },
  images: {                     // dataURL comprimidos
    unifilarDibujo, unifilarFoto,
    firmaUsuario, firmaBia, firmaOr
  }
}
Perfil = { nombre, cc, tel }    // técnico BIA, se precarga en la firma BIA
```

Tipos de campo del catálogo: `text`, `number`, `date`, `time`, `yesno`,
`goodbad`, `choice` (opciones fijas → Radio/SegmentedControl si 2–5, Select si
más), `suggest` (lista con autocompletar + texto libre), `textarea`, `gps`,
`signature`, `drawing`, `photo`.

## 5. Formulario

### Flujo

1. **Inicio:** "Nueva acta", borradores (continuar/eliminar), historial
   (ver/duplicar). Al reabrir con borrador reciente: "Continuar acta N°…".
2. **Formulario:** secciones plegables, índice de salto, barra inferior fija con
   avance y "Revisar y generar". Guardado automático en cada cambio.
3. **Revisión:** faltantes y avisos; "Completar" (salta al campo) o "Generar de
   todas formas".
4. **Vista previa:** Hoja 1 y Hoja 2, selector PNG/JPG, "Compartir" y
   "Descargar".

### Secciones

**Hoja 1**

1. **Encabezado** — No. acta*, fecha (auto), hora ingreso (auto), hora salida (auto al generar).
2. **Información comercial** — nombre de la cuenta*, persona que atiende, ciudad/municipio, departamento (lista), comercializador (lista), operador de red (lista), dirección de suministro*, código cuenta, teléfono, tipología de usuario (Residencial/Comercial/Industrial/Otro), actividad económica.
3. **Autorización de asesoría técnica** — ¿El usuario hizo uso de su derecho? Sí/No.
4. **Información técnica** — tipo de medida encontrado* (Directa/Semidirecta/Indirecta), factor de medida, nivel de tensión, red de media tensión, kVA contratados.
5. **Transformador de potencia** — número, número nodo, capacidad instalada (kVA), subestación, marca, circuito, tipo de aislamiento, tipo de uso (Exclusivo/Compartido).
6. **Celda del medidor** — ¿Medidor en celda? Sí/No. *Si Sí:* estado (Bueno/Malo), referencia de celda, tipo de celda (Gabinete compartido / Gabinete metálico / Caja policarbonato / Otro + cuál), número de certificación. **Sellos celda (1 y 2):** serial, tipo, propiedad, color.
7. **Medidor de energía** — activa y reactiva: marca, serie*, tipo (Electrónico/Electromecánico), clase, voltaje, corriente, elementos, constante, fecha calibración, lectura (activa*), modelo. ¿Tiene medidor de respaldo? Sí/No → marca y serie. ¿Debería tener medidor de respaldo? Sí/No. ¿Tiene medidor espejo del OR? Sí/No.
8. **Telemedida** — ubicación (Interior/Exterior), tipo, marca, serie, dirección IP, teléfono, serie SIMCARD, modelo, IMEI, estado operativo.
9. **Sellos del medidor** — cubierta principal, demanda máxima, caja de conexiones; 2 sellos cada una: serial, tipo, propiedad, color.
10. **Pruebas del medidor** — tarjeta por fase R, S, T y Total: voltaje, corriente, P, Q, Smed, factor de potencia, % error activa, % error reactiva. **Pruebas de registro:** tiempo activa/reactiva, giros, lectura inicial, lectura final, diferencia (calculada = final − inicial), % error.
11. **Totalizador y cables de potencia** — ¿Tiene totalizador? Sí/No → fases (1/2/3), capacidad, marca. Calibre cable parciales, calibre acometida (lista AWG), número de cables por fase (parcial y acometida).
12. **Transformadores de corriente (TCs)** — por fase A/B/C: marca, número de serie, clase, relación, cargabilidad (VA), usuario tiene protocolo de calibración Sí/No. Tipo de TC (Barra pasante / Ventana interior / Ventana exterior embebido o con cable / Ventana exterior bornera), nivel de aislamiento (0,72 / 17,5 / 36 kV). **Bloque de pruebas:** marca, condición (Bueno/Malo), tipo (Cuchilla / Laina o lámina / Otro). **Sellos bloque de pruebas (1 y 2):** serial, color, propiedad, tipo. **Cable de control:** marca, condición (Bueno/Malo), calibre tensión, calibre corriente, metros tensión, metros corriente.
13. **Transformadores de tensión (TPs)** — por fase A/B/C: marca, número de serie, clase, relación, cargabilidad (VA), protocolo de calibración Sí/No. Tipo de TP (Exterior/Interior/Otro), nivel de aislamiento.

**Hoja 2**

14. **Celda de TCs y celda de TPs** — cada una: ¿Tienen celda? Sí/No, estado de celda (Bueno/Malo), número certificado, tipo de celda, ubicación, estado del poste (Bueno/Malo). **Sellos celda media tensión (1 y 2):** serial, propiedad, color, tipo.
15. **Planta de respaldo** — ¿Tiene? Sí/No → capacidad (kVA); ¿uso compartido? Sí/No → capacidad de uso en horas.
16. **Servicios adicionales** — ¿WiFi 2.4 GHz? Sí/No; cuenta con soluciones actuales (texto); condiciones atmosféricas (Humedad / Temperatura alta / Temperatura baja / Otro, multi); servicios de interés a futuro (Paneles solares / Cambio de nivel de tensión / Incremento de carga / Carga vehicular / Banco de condensadores / Otros, multi).
17. **Información de máquinas** — lista dinámica sin límite: tipo, potencia (kW), voltaje (V), corriente (A), frecuencia (Hz), factor de potencia, cantidad.
18. **Esquema unifilar** — dibujo con el dedo (lienzo cuadriculado, deshacer, borrar) y/o foto.
19. **Observaciones** — texto libre. ¿Existen procesos de aumento de carga? Sí/No → ¿Cuáles?
20. **Control de riesgos** — 15 preguntas (ver §5.2).
21. **Requisitos para maniobra** — texto libre. ¿Requiere descargo del OR? Sí/No.
22. **Seccionamientos externos** — ¿Existen? Sí/No → identificación, ¿a cuántos usuarios afecta?, nombre y descripción de usuarios afectados. Ubicación: botón GPS → latitud, longitud, altitud (editables).
23. **Autorizaciones legales** — 5 declaraciones Sí/No (ver §5.3) + botón "Todas Sí".
24. **Firmas** — Usuario/Testigo, BIA (precargado con perfil), Operador de red: firma en pantalla, C.C., teléfono, nombre.

(\* = obligatorio para el validador)

### 5.1 Reglas de visibilidad

| Tipo de medida | Visible adicional | Oculto |
|---|---|---|
| Directa | — | TCs, bloque de pruebas, cable de control, TPs, celdas TCs/TPs y sus sellos |
| Semidirecta | TCs, bloque de pruebas y sellos, cable de control | TPs, celdas TCs/TPs y sellos MT |
| Indirecta | Todo | — |
| (sin elegir) | Se muestra todo, con una nota de que se elija el tipo de medida | — |

Reglas menores: los campos "¿Cuáles?", "¿A quién?", "¿Qué la está
obstaculizando?", capacidades de planta, datos de medidor de respaldo, datos de
celda del medidor, datos de totalizador y datos de seccionamiento aparecen solo
cuando su pregunta madre es **Sí**. "Otro" en listas de opciones abre un campo
"¿Cuál?". Un dato oculto se conserva en el estado, pero no se valida ni se
incluye en la imagen.

### 5.2 Control de riesgos

1. ¿Cuál es el tipo de medida? — **se llena desde la sección 4** (solo lectura).
2. ¿Dónde se encuentra el punto de desenergización? — texto.
3. ¿Es accesible el punto de desenergización? — Sí/No.
4. ¿Cuál es el voltaje al que estaría expuesto el personal técnico electricista? — texto.
5. ¿La celda del medidor se encuentra obstaculizada? — Sí/No → ¿Qué la está obstaculizando?
6. ¿La conexión eléctrica se encuentra a una altura mayor a 2 metros? — Sí/No + observación.
7. ¿Se deben implementar medidas de seguridad contra caídas? — Sí/No → ¿Cuáles?
8. ¿Existe suficiente espacio para realizar la instalación de manera segura (80 cm de ancho por 2 m de alto)? — Sí/No.
9. ¿Hay riesgo de atrapamiento? — Sí/No.
10. ¿Existe una iluminación adecuada para trabajar de manera segura? — Sí/No.
11. ¿La zona está adecuadamente señalizada para advertir sobre riesgos eléctricos? — Sí/No.
12. ¿Hay señalizaciones de otros tipos de riesgos? — Sí/No → ¿Cuáles?
13. ¿Se han identificado otros riesgos como posturas forzadas, exposición a químicos o factores físicos (ruido, vibraciones, olores, etc.)? — Sí/No → ¿Cuáles?
14. ¿Existen extintores cerca a la zona de conexión eléctrica? — Sí/No.
15. ¿La maniobra a realizar puede afectar a los alrededores o a terceros? — Sí/No → ¿A quién?

**Respuesta de riesgo** (se resalta en la imagen): 3 = No, 5 = Sí, 6 = Sí,
7 = Sí, 8 = No, 9 = Sí, 10 = No, 11 = No, 13 = Sí, 14 = No, 15 = Sí.

### 5.3 Autorizaciones legales

1. Declaro que el contenido del acta es verídico y ha sido informado al usuario de manera clara.
2. Declaro que durante la visita no se alteró el sistema de medición actual ni se afectó la prestación normal del servicio de energía.
3. Declaro que estuve presente durante la ejecución de la visita, me fue informada previamente las labores a realizar y los técnicos encargados se identificaron previamente.
4. Declaro que al finalizar la actividad el personal encargado informó acerca de los resultados y hallazgos relevantes.
5. Autorizo el uso de datos personales de acuerdo con la Política de privacidad y protección de datos personales.

Al pie de la sección y de la Hoja 2 se incluye el texto de la Ley 1581 de 2012 /
Decreto 1377 de 2013 tal como aparece en el formato.

### 5.4 Listas de autocompletar (todas aceptan texto libre)

Armadas con información pública y conocimiento del sector; no hay una lista
oficial única publicada. Editables en el catálogo.

- **Operador de red:** Air-e, Afinia, Enel Colombia, EPM, Celsia Colombia (Valle / Tolima), ESSA, CENS, CHEC, EDEQ, Energía de Pereira, EBSA, Electrohuila, Emcali, Cedenar, Enerca, Enelar, Electrocaquetá, EMSA (Meta), Dispac, Cetsa, Ruitoque, Empresa de Energía del Bajo Putumayo.
- **Comercializador:** BIA Energy, más los operadores de red anteriores (que también comercializan), Vatia, Enertotal, Isagen, Gecelca.
- **Marca de medidor:** Microstar, Elster (Honeywell), Landis+Gyr, Itron, Schneider Electric, Kamstrup, Hexing, ZIV, Circutor, Wasion, Holley, ABB.
- **Marca de módem:** Emsitech, Wlink, Teltonika, Four-Faith, Robustel, Sierra Wireless.
- **Marca de TC/TP:** Arteche, Rymel, ABB, Siemens, Schneider Electric, Magnetron, Ritz, Circutor.
- **Calibre (AWG/kcmil):** 14, 12, 10, 8, 6, 4, 2, 1/0, 2/0, 3/0, 4/0, 250, 300, 350, 500 kcmil.
- **Relación TC:** 50/5, 75/5, 100/5, 150/5, 200/5, 300/5, 400/5, 500/5, 600/5, 800/5, 1000/5.
- **Departamento:** los 32 departamentos de Colombia + Bogotá D.C.
- **Tipo de sello:** AN, TA, LA, PL, FO, CA, EST, OT (códigos del formato).
- **Propiedad de sello:** Representante Frontera, Operador de Red, Laboratorio.
- **Color de sello:** Verde, Amarillo, Azul, Rojo, Blanco, Naranja, Negro.

El técnico puede agregar valores propios: lo que escribe queda como sugerencia
local para las siguientes actas.

## 6. Imagen generada

- Ancho fijo 1080 px; alto variable según contenido. Una imagen por hoja.
- **Encabezado:** logo BIA, "Visita previa para conexión eléctrica · OPS-FM-03",
  No. acta, fecha, hora ingreso/salida, "Hoja N de 2", y la nota "Resumen de
  recolección de información — no reemplaza el acta oficial".
- **Cuerpo:** frame `bg-weak-25` con tarjetas `bg-white-0` (radius 16); título de
  sección en Subheading (mayúsculas, tracking amplio); pares etiqueta → valor en
  2 columnas.
- **Tablas** solo para pruebas por fase, TCs/TPs por fase, sellos y máquinas.
- **Sí/No** como StatusBadge; las respuestas de riesgo (§5.2) se resaltan con el
  token semántico de advertencia.
- Se omiten los campos vacíos, las secciones no visibles y las secciones sin datos.
- Imágenes: esquema unifilar (dibujo y/o foto) en la Hoja 2; las 3 firmas al pie
  de la Hoja 2 con nombre, C.C. y teléfono.
- Nombre de archivo: `Acta-<No>-Hoja<N>-<AAAA-MM-DD>.<png|jpg>`. JPG con calidad 0,9.
- Render con `pixelRatio` 2 (máximo); si falla, se reintenta con 1.

## 7. Validación

- **Obligatorios:** No. acta, nombre de la cuenta, dirección de suministro, tipo
  de medida, serie del medidor, lectura activa, firma BIA.
- **Avisos de coherencia:** hora salida < hora ingreso; lectura final < lectura
  inicial; medida semidirecta o indirecta sin ninguna serie de TC; alguna
  autorización legal en No; firma del usuario ausente.
- Nunca bloquean: "Generar de todas formas" siempre está disponible.

## 8. Manejo de errores

| Situación | Comportamiento |
|---|---|
| GPS negado o sin fix (timeout 15 s) | Mensaje claro; campos lat/long/alt editables a mano. |
| IndexedDB no disponible (artifact, modo privado) | Estado en memoria + aviso "Este dispositivo no guarda borradores". |
| Cuota de almacenamiento llena | Aviso; se guarda sin la foto más pesada y se indica cuál. |
| Fotos | Se comprimen a un lado máximo de 1600 px, JPEG 0,8. |
| Falla html-to-image | Reintento con pixelRatio 1; si falla, mensaje con opción de reintentar. |
| Web Share con archivos no soportado | Descarga directa de cada imagen. |
| CDN no disponible en el artifact | Mensaje "Necesitas conexión para generar la imagen". |

## 9. Pruebas

- **Automáticas** (página `tests.html` que carga las unidades lógicas y corre
  asserts en el navegador; sin dependencias):
  - `Rules`: visibilidad por tipo de medida y por preguntas madre.
  - `Validate`: obligatorios, cada aviso de coherencia, campos ocultos ignorados.
  - Cálculo de diferencia de lecturas.
  - `Sheets.model`: omite vacíos y no aplicables; ubica cada sección en su hoja;
    marca las respuestas de riesgo.
- **Manual en el navegador (vista móvil 375 px):** acta directa completa y acta
  indirecta completa → generar PNG y JPG → revisar legibilidad de ambas hojas.
- **Después del despliegue:** instalar la PWA en el celular, activar modo avión,
  crear un acta y generar las imágenes.

## 10. Riesgos y pendientes conocidos

- **Season Mix es una fuente TRIAL.** Se usa porque el uso es interno. Si la app
  se distribuye más ampliamente, hay que cambiarla por los archivos con licencia
  o usar Inter en los títulos.
- Los componentes Olibia son recreaciones en CSS de `@biaenergy/ui`, siguiendo
  sus tokens y reglas; no es el paquete oficial.
- Las listas de §5.4 son sugerencias no oficiales; se ajustan con el uso.
- Tamaño del `index.html` con fuentes incrustadas: ~1 MB (dentro de los límites
  de artifact y de GitHub Pages).

## 11. Fuera de alcance

- Réplica fiel de la cuadrícula del formato en papel.
- Sincronización con la app de la empresa o con cualquier servidor.
- Exportación a PDF.
- Varios tipos de acta (instalación, telemedida, etc.).
- Cuentas de usuario.
