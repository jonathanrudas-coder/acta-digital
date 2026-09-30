# Acta digital · Visita previa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web móvil (PWA + Artifact) donde el técnico diligencia el formato OPS-FM-03 y descarga un resumen estilo Olibia en PNG/JPG, una imagen por hoja.

**Architecture:** Sitio estático sin build. `index.html` carga scripts clásicos en `src/` que cuelgan de un único namespace `window.Acta`. Un catálogo de datos describe secciones y campos; unidades puras (`Model`, `Rules`, `Validate`, `Sheets.model`) se prueban en `tests/tests.html`; las de UI (`Form`, `Capture`, `Export`, `App`) se verifican en el navegador. Los mismos archivos se publican en GitHub Pages (con service worker) y como Artifact multi-archivo.

**Tech Stack:** HTML/CSS/JS vanilla (ES2020, scripts clásicos), IndexedDB, Canvas, `html-to-image@1.11.11` (jsdelivr), Remix Icon 4.6.0 (jsdelivr), Inter (Google Fonts), Season Mix TRIAL (local), tokens Olibia (`tokens.css` copiado tal cual). Servidor de desarrollo: `python -m http.server 8080`.

**Spec:** `docs/superpowers/specs/2026-09-30-acta-digital-visita-previa-design.md`

**Desviación aprobada respecto a la spec §3:** en vez de un único `index.html` con todo embebido, `index.html` + archivos estáticos (`src/`, `styles/`), sin build. Las fuentes son archivos locales (no base64); el service worker las cachea para offline.

## Global Constraints

- Todo texto visible en **español**, tuteo, sentence case; títulos de sección de la imagen en Subheading MAYÚSCULAS. Sin emoji; íconos solo Remix `ri-*-line` (en la app; la imagen no usa íconos).
- Solo tokens semánticos Olibia (`--color-bg-white-0`, `--color-text-strong-950`, …). Nunca paletas crudas (`--color-teal-400`) en `styles/app.css` ni `styles/sheet.css`.
- Teal (`--color-brand-base`) solo en: Radio/Switch/Checkbox activos, ProgressBar, LinkButton. Botón protagonista = FancyButton negro (`--color-bg-strong-950`), uno por pantalla.
- Shell: marco `--color-bg-weak-25`, tarjetas `--color-bg-white-0` radius 16; controles radius 10; bordes como `box-shadow: inset 0 0 0 1px var(--color-stroke-soft-200)`.
- Fuentes: `--font-sans` (Inter) para UI/cuerpo, `--font-display` (Season Mix 500) para títulos.
- Tema: la app sigue `prefers-color-scheme` poniendo `data-theme` en `<html>`; **las imágenes generadas siempre en claro** (`data-theme="light"` en cada `.sheet`).
- Librerías externas solo desde `cdn.jsdelivr.net` o `cdnjs.cloudflare.com`; hojas de estilo externas solo de Google Fonts.
- Layout sin scroll horizontal a 375 px; margen lateral 16 px; controles ≥ 44 px de alto.
- Datos solo en el dispositivo. Ningún `fetch` a servidores propios.
- Imagen: ancho 1080 px, alto variable, `pixelRatio` 2 (reintento con 1), JPG calidad 0.9, fondo blanco.
- Nombre de archivo: `Acta-<No>-Hoja<N>-<AAAA-MM-DD>.<png|jpg>`.
- Fotos: lado máximo 1600 px, JPEG 0.8. GPS timeout 15 s. Guardado debounce 500 ms.
- Toda llamada a IndexedDB/localStorage dentro de `try/catch` con fallback a memoria.

## Review Focus

1. **Cambiar el tipo de medida después de llenar TCs/TPs** (Indirecta → Directa): los datos se conservan, pero no se validan ni salen en la imagen. → tests en Task 3 y Task 5.
2. **Números con coma decimal o vacíos** (`"112,5"`, `""`, `"abc"`): la diferencia de lecturas y los avisos de coherencia no deben dar `NaN` ni falsos avisos. → tests en Task 1 y Task 4.
3. **Textos muy largos** (observaciones de 2 000 caracteres, direcciones largas, series sin espacios): el modelo conserva el texto completo y la hoja no se desborda (`overflow-wrap:anywhere`). → test en Task 5 + revisión visual en Task 9.
4. **Varios borradores y recarga a mitad de un acta**: "Continuar acta N°…" debe ofrecer el borrador más reciente, no uno viejo ni una generada. → test en Task 6.
5. **Acta sin número o con caracteres raros** (`""`, `"036/51"`): el nombre de archivo sigue siendo válido (`Acta-SN-…`, `/` → `-`). → test en Task 9.

---

## File Structure

```
index.html                 shell: <head>, links a styles, scripts src/, contenedor #app
manifest.webmanifest       Task 11
sw.js                      Task 11
icons/icon-192.png, icon-512.png, icon.svg   Task 11 (tools/make-icons.ps1)
styles/olibia-tokens.css   copia literal de tokens.css de Olibia (con @font-face Season Mix)
styles/fonts/SeasonMix-TRIAL-Regular.ttf, SeasonMix-TRIAL-Medium.ttf
styles/app.css             componentes Olibia recreados + layout de pantallas
styles/sheet.css           estilos de las hojas generadas
src/model.js               Acta.Model: newActa, get/set, parseNum, formatNum, diferencia
src/lists.js               Acta.Lists: listas de autocompletar (spec §5.4)
src/catalog.js             Acta.Catalog: secciones y campos (spec §5)
src/rules.js               Acta.Rules
src/validate.js            Acta.Validate
src/sheets.js              Acta.Sheets: model() puro + render() DOM
src/store.js               Acta.Store (IndexedDB)
src/capture.js             Acta.Capture: gps, pad (canvas), photo
src/form.js                Acta.Form
src/export.js              Acta.Export
src/app.js                 Acta.App: pantallas y arranque
tests/tests.html           carga src/ puros + tests/*.test.js
tests/harness.js           mini framework de pruebas
tests/fixtures.js          actas de ejemplo (directa, indirecta)
tests/*.test.js            un archivo por unidad
tools/make-icons.ps1       genera PNG de íconos
.claude/launch.json        servidor de desarrollo
README.md                  uso y despliegue
```

Orden de carga de scripts (index.html y tests.html): `model, lists, catalog, rules, validate, sheets, store, capture, form, export, app` (tests.html omite `capture, form, export, app`). Cada archivo empieza con `window.Acta = window.Acta || {};`.

---

### Task 1: Base del proyecto, fundamentos Olibia, harness de pruebas y `Model`

**Files:**
- Create: `index.html`, `styles/olibia-tokens.css`, `styles/fonts/*.ttf`, `styles/app.css` (solo reset + tipografía base por ahora), `src/model.js`, `tests/tests.html`, `tests/harness.js`, `tests/model.test.js`, `.claude/launch.json`

**Interfaces:**
- Produces:
  - `Acta.Model.newActa(now?: Date) → Acta` con `{id, createdAt, updatedAt, status:'borrador', values:{'acta.fecha':'AAAA-MM-DD','acta.horaIngreso':'HH:MM'}, tables:{}, images:{}}`; `id` = `crypto.randomUUID()` o fallback `Date.now().toString(36)+random`.
  - `Acta.Model.get(acta, fieldId) → any` (lee `values`), `Acta.Model.set(acta, fieldId, v) → void` (actualiza `updatedAt`).
  - `Acta.Model.getCell(acta, tableId, rowKey, colId)`, `setCell(acta, tableId, rowKey, colId, v)`.
  - `Acta.Model.parseNum(s) → number|null` — acepta coma o punto decimal, sin separador de miles; `''`/inválido → `null`.
  - `Acta.Model.formatNum(n, maxDec=3) → string` — coma decimal, sin ceros sobrantes.
  - `Acta.Model.diferencia(inicial, final) → string` — `''` si alguno es `null`.
  - `Acta.Model.isEmpty(v) → bool` — `null`, `undefined`, `''`, solo espacios, `[]`.
  - Harness global: `test(name, fn)` (fn puede ser async), `assert.equal(actual, expected, msg?)`, `assert.deepEqual`, `assert.ok`. Al terminar, escribe en `#summary` el texto `"<N> passed, <M> failed"` y lista los fallos con nombre y mensaje.

- [ ] **Step 1: Copiar fundamentos Olibia**

Descargar con la herramienta Artifact (`action:"read"`, `url: https://claude.ai/artifact/2U5iFdRwneSHQaTR1zUtcg`, `paths: ["project/tokens.css","project/fonts/SeasonMix-TRIAL-Regular.ttf","project/fonts/SeasonMix-TRIAL-Medium.ttf"]`). Copiar `tokens.css` → `styles/olibia-tokens.css` **sin modificar** (su `@font-face` apunta a `fonts/…`, que queda resuelto en `styles/fonts/`). Copiar los dos `.ttf` a `styles/fonts/`.

- [ ] **Step 2: Crear `.claude/launch.json`**

```json
{ "version": "0.0.1", "configurations": [
  { "name": "acta", "runtimeExecutable": "python", "runtimeArgs": ["-m","http.server","8080"], "port": 8080 } ] }
```

- [ ] **Step 3: Crear `index.html`, `styles/app.css`, `tests/harness.js`, `tests/tests.html`**

`index.html`: `lang="es"`, meta viewport con `viewport-fit=cover`, `<title>Acta visita previa</title>`, links en orden: Google Fonts Inter (400;500;600), Remix Icon 4.6.0, `styles/olibia-tokens.css`, `styles/app.css`, `styles/sheet.css`; `<main id="app">`; scripts en el orden de File Structure; script inline mínimo que pone `data-theme` según `matchMedia('(prefers-color-scheme: dark)')` y escucha cambios. `app.css`: `body{margin:0;background:var(--color-bg-weak-25);color:var(--color-text-strong-950);font-family:var(--font-sans);font-size:14px}`, `h1,h2,h3{font-family:var(--font-display);font-weight:500}`. `tests.html`: `<div id="summary"></div><ol id="results"></ol>`, carga `harness.js`, los `src/` puros y los `*.test.js`, y llama `runTests()` en `load`.

- [ ] **Step 4: Escribir las pruebas de `Model`**

```js
test('parseNum acepta coma y punto', () => {
  assert.equal(Acta.Model.parseNum('112,5'), 112.5);
  assert.equal(Acta.Model.parseNum('112.5'), 112.5);
  assert.equal(Acta.Model.parseNum(' 7 '), 7);
  assert.equal(Acta.Model.parseNum(''), null);
  assert.equal(Acta.Model.parseNum('abc'), null);
});
test('formatNum usa coma y recorta decimales', () => {
  assert.equal(Acta.Model.formatNum(19.5), '19,5');
  assert.equal(Acta.Model.formatNum(20), '20');
  assert.equal(Acta.Model.formatNum(1.23456), '1,235');
});
test('diferencia de lecturas', () => {
  assert.equal(Acta.Model.diferencia('100,5', '120'), '19,5');
  assert.equal(Acta.Model.diferencia('', '120'), '');
  assert.equal(Acta.Model.diferencia('abc', '120'), '');
  assert.equal(Acta.Model.diferencia('120', '100'), '-20');
});
test('newActa llena fecha y hora de ingreso', () => {
  const a = Acta.Model.newActa(new Date(2026, 8, 30, 7, 5));
  assert.equal(a.values['acta.fecha'], '2026-09-30');
  assert.equal(a.values['acta.horaIngreso'], '07:05');
  assert.equal(a.status, 'borrador');
  assert.ok(a.id && a.id.length > 5);
});
test('setCell/getCell en tablas', () => {
  const a = Acta.Model.newActa();
  Acta.Model.setCell(a, 'tc', 'A', 'serie', 'X1');
  assert.equal(Acta.Model.getCell(a, 'tc', 'A', 'serie'), 'X1');
  assert.equal(Acta.Model.getCell(a, 'tc', 'B', 'serie'), undefined);
});
```

- [ ] **Step 5: Verificar que fallan**

Iniciar el servidor con `preview_start` (`name:"acta"`), navegar a `http://localhost:8080/tests/tests.html`, leer con `get_page_text`.
Expected: fallos con `Acta.Model is undefined` (o similar).

- [ ] **Step 6: Implementar `src/model.js`** según Interfaces.

- [ ] **Step 7: Verificar que pasan**

Recargar `tests/tests.html`. Expected: `#summary` = `5 passed, 0 failed`. Abrir `http://localhost:8080/` y verificar en consola que no hay errores 404 (ignorar los de `src/` aún no creados — crear archivos vacíos con `window.Acta = window.Acta || {};` para cada script listado).

- [ ] **Step 8: Commit**

```bash
git add index.html styles src tests .claude/launch.json
git commit -m "feat: base del proyecto, tokens Olibia y modelo del acta"
```

---

### Task 2: Catálogo del formato y listas de autocompletar

**Files:**
- Create: `src/lists.js`, `src/catalog.js`, `tests/catalog.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `Acta.Lists: { [listId]: string[] }` con ids `operadores, comercializadores, marcasMedidor, marcasModem, marcasTcTp, calibres, relacionTc, departamentos, tipoSello, propiedadSello, colorSello`. Valores exactos de spec §5.4 (`comercializadores` = `['BIA Energy', ...operadores, 'Vatia','Enertotal','Isagen','Gecelca']` sin duplicados).
  - `Acta.Catalog.sections: Section[]` en el orden de spec §5 (24 secciones).
  - `Acta.Catalog.byId(id) → Section|Field|undefined` (busca secciones y campos, incluidos grids/lists).
  - `Acta.Catalog.fields() → Field[]` (aplanado, con `field.sectionId`).

```ts
Section = { id, title, sheet: 1|2, when?: Cond, note?: string, fields: Field[] }
Field = {
  id, label,
  type: 'text'|'number'|'date'|'time'|'yesno'|'goodbad'|'choice'|'multi'|'suggest'|'textarea'
      | 'computed'|'mirror'|'gps'|'signature'|'drawing'|'photo'|'grid'|'list'|'allYes',
  required?: true, when?: Cond, options?: string[], list?: listId, unit?: string,
  inputmode?: 'decimal'|'numeric'|'tel', risk?: 'Sí'|'No',
  compute?: 'diferencia',            // computed: usa pr.lecturaInicial / pr.lecturaFinal
  source?: fieldId,                  // mirror: muestra el valor de otro campo (solo lectura)
  targets?: [latId, lonId, altId],   // gps
  rows?: string[], columns?: Field[],// grid (rows fijas) y list (filas dinámicas; sin rows)
  group?: fieldId[]                  // allYes: ids que marca en 'Sí'
}
Cond = { field, eq } | { field, in: string[], orUnset?: true } | { all: Cond[] } | { any: Cond[] }
```

Ids fijos (los usan tareas posteriores; el resto de ids sigue el patrón `<seccion>.<campo>` en camelCase):

| Sección (id, hoja) | Campos con id fijo |
|---|---|
| `encabezado`, 1 | `acta.numero` (text, required), `acta.fecha` (date), `acta.horaIngreso` (time), `acta.horaSalida` (time) |
| `comercial`, 1 | `com.cuenta` (required), `com.direccion` (required), `com.depto` (suggest `departamentos`), `com.comercializador` (suggest), `com.or` (suggest `operadores`), `com.tipologia` (choice Residencial/Comercial/Industrial/Otro) |
| `asesoria`, 1 | `ases.usoDerecho` (yesno) |
| `tecnica`, 1 | `tec.tipoMedida` (choice Directa/Semidirecta/Indirecta, required) |
| `trafo`, 1 | `trafo.uso` (choice Exclusivo/Compartido) |
| `celdaMedidor`, 1 | `celda.enCelda` (yesno); resto con `when {field:'celda.enCelda',eq:'Sí'}`; grid `sellosCelda` rows `['Sello 1','Sello 2']` columns `serial, tipo(suggest tipoSello), propiedad(choice propiedadSello), color(suggest colorSello)` |
| `medidor`, 1 | grid `medidores` rows `['Activa','Reactiva']` columns `marca(suggest marcasMedidor), serie, tipo(choice Electrónico/Electromecánico), clase, voltaje, corriente, elementos, constante, fechaCalib, lectura, modelo`; `med.respaldo` (yesno) → `med.respaldoMarcaSerie` when Sí; `med.deberiaRespaldo`, `med.espejoOr` (yesno) |
| `telemedida`, 1 | `tele.ubicacion` (choice Interior/Exterior), `tele.marca` (suggest marcasModem) … |
| `sellosMedidor`, 1 | grid `sellosMedidor` rows `['Cubierta principal · 1','Cubierta principal · 2','Demanda máxima · 1','Demanda máxima · 2','Caja de conexiones · 1','Caja de conexiones · 2']`, mismas columnas que `sellosCelda` |
| `pruebas`, 1 | grid `pruebasFase` rows `['R','S','T','Total']` columns `voltaje, corriente, p, q, smed, fp, errActiva, errReactiva`; `pr.tiempoActiva`, `pr.girosActiva`, `pr.tiempoReactiva`, `pr.girosReactiva`, `pr.lecturaInicial`, `pr.lecturaFinal` (number), `pr.diferencia` (computed `diferencia`), `pr.error` |
| `totalizador`, 1 | `tot.tiene` (yesno) → `tot.fases`, `tot.capacidad`, `tot.marca` when Sí; `tot.calibreParciales`, `tot.calibreAcometida` (suggest calibres) |
| `tcs`, 1, when `{field:'tec.tipoMedida', in:['Semidirecta','Indirecta'], orUnset:true}` | grid `tc` rows `['A','B','C']` columns `marca, serie, clase, relacion(suggest relacionTc), cargabilidad, protocolo(yesno)`; `tc.tipo`, `tc.aislamiento` (choice 0,72 kV/17,5 kV/36 kV); bloque de pruebas `bloque.*`; grid `sellosBloque` rows `['Sello 1','Sello 2']`; cable de control `cable.*` |
| `tps`, 1, when `in:['Indirecta'], orUnset:true` | grid `tp` rows `['A','B','C']` mismas columnas que `tc`; `tp.tipo` (Exterior/Interior/Otro), `tp.aislamiento` |
| `celdasMT`, 2, when igual que `tps` | `celdaTc.*`, `celdaTp.*`; grid `sellosMT` rows `['Sello 1','Sello 2']` |
| `planta`, 2 | `planta.tiene` (yesno) → `planta.capacidadKva`; `planta.compartida` (yesno) → `planta.horas` |
| `servicios`, 2 | `serv.wifi24` (yesno), `serv.condiciones` (multi), `serv.interes` (multi) |
| `maquinas`, 2 | list `maquinas` columns `tipo, potenciaKw, voltaje, corriente, frecuencia, fp, cantidad` |
| `unifilar`, 2 | `unifilar.dibujo` (drawing), `unifilar.foto` (photo) |
| `observaciones`, 2 | `obs.texto` (textarea), `obs.aumentoCarga` (yesno) → `obs.aumentoCargaCuales` |
| `riesgos`, 2 | `riesgo.q1` (mirror source `tec.tipoMedida`) … `riesgo.q15` en el orden y texto exacto de spec §5.2; subcampos `riesgo.q5Cual`, `riesgo.q6Obs` (sin when), `riesgo.q7Cual`, `riesgo.q12Cual`, `riesgo.q13Cual`, `riesgo.q15Quien` con `when eq 'Sí'`; `risk` según spec §5.2 (q3 No, q5 Sí, q6 Sí, q7 Sí, q8 No, q9 Sí, q10 No, q11 No, q13 Sí, q14 No, q15 Sí) |
| `maniobra`, 2 | `man.requisitos` (textarea), `man.descargoOr` (yesno) |
| `seccionamientos`, 2 | `secc.existen` (yesno) → `secc.identificacion`, `secc.usuarios`, `secc.descripcion`; `secc.gps` (gps targets `['secc.lat','secc.lon','secc.alt']`) y los 3 campos number |
| `legales`, 2 | `legal.todas` (allYes group `legal.1..legal.5`), `legal.1`…`legal.5` (yesno, texto exacto spec §5.3) |
| `firmas`, 2 | `firma.usuario`, `firma.bia`, `firma.or` (signature) y por cada rol `.nombre`, `.cc`, `.tel` (p. ej. `firma.bia.nombre`) |

Todos los campos restantes de cada sección salen de spec §5 con su etiqueta literal. Opción "Otro" en un `choice` añade un campo `<id>Cual` con `when eq 'Otro'`.

- [ ] **Step 1: Escribir pruebas de integridad del catálogo**

```js
const C = Acta.Catalog;
test('24 secciones en orden y hojas correctas', () => {
  assert.equal(C.sections.length, 24);
  assert.equal(C.sections[0].id, 'encabezado');
  assert.equal(C.sections[23].id, 'firmas');
  assert.deepEqual(C.sections.filter(s => s.sheet === 1).map(s => s.id),
    ['encabezado','comercial','asesoria','tecnica','trafo','celdaMedidor','medidor','telemedida','sellosMedidor','pruebas','totalizador','tcs','tps']);
});
test('ids únicos', () => {
  const ids = [...C.sections.map(s => s.id), ...C.fields().map(f => f.id)];
  assert.equal(new Set(ids).size, ids.length);
});
test('toda condición referencia un campo existente', () => {
  const conds = [];
  const walk = c => c && (c.all || c.any ? (c.all || c.any).forEach(walk) : conds.push(c.field));
  C.sections.forEach(s => walk(s.when)); C.fields().forEach(f => walk(f.when));
  conds.forEach(id => assert.ok(C.byId(id), 'falta ' + id));
});
test('toda lista referenciada existe', () => {
  C.fields().filter(f => f.list).forEach(f => assert.ok(Acta.Lists[f.list], f.id));
});
test('obligatorios exactos', () => {
  assert.deepEqual(C.fields().filter(f => f.required).map(f => f.id).sort(),
    ['acta.numero','com.cuenta','com.direccion','tec.tipoMedida'].sort());
});
test('15 riesgos y 5 legales', () => {
  assert.equal(C.byId('riesgos').fields.filter(f => /^riesgo\.q\d+$/.test(f.id)).length, 15);
  assert.equal(C.byId('riesgo.q9').risk, 'Sí');
  assert.equal(C.byId('riesgo.q3').risk, 'No');
  assert.equal(C.byId('legales').fields.filter(f => /^legal\.\d$/.test(f.id)).length, 5);
});
test('listas sin duplicados y comercializadores incluye BIA', () => {
  Object.entries(Acta.Lists).forEach(([k, v]) => assert.equal(new Set(v).size, v.length, k));
  assert.equal(Acta.Lists.comercializadores[0], 'BIA Energy');
  assert.equal(Acta.Lists.departamentos.length, 33);
});
```

(Serie del medidor, lectura activa y firma BIA son obligatorios pero viven en grid/imagen; los maneja `Validate` de forma explícita — Task 4.)

- [ ] **Step 2: Verificar que fallan** — recargar `tests/tests.html`. Expected: 7 fallos nuevos.
- [ ] **Step 3: Implementar `src/lists.js` y `src/catalog.js`** según las tablas anteriores y spec §5.
- [ ] **Step 4: Verificar que pasan** — Expected: `12 passed, 0 failed`.
- [ ] **Step 5: Commit** — `git add src/lists.js src/catalog.js tests/catalog.test.js && git commit -m "feat: catálogo OPS-FM-03 y listas de autocompletar"`

---

### Task 3: `Rules` — visibilidad

**Files:**
- Create: `src/rules.js`, `tests/fixtures.js`, `tests/rules.test.js`

**Interfaces:**
- Consumes: `Acta.Catalog.byId`, `Acta.Model.get`, `Acta.Model.isEmpty`.
- Produces:
  - `Acta.Rules.evaluate(cond, acta) → bool` (`undefined` cond → `true`; `in` con `orUnset` → `true` si el campo está vacío).
  - `Acta.Rules.isVisible(id, acta) → bool` — sección: su `when`; campo/grid/list: `when` de su sección **y** el propio.
  - `tests/fixtures.js`: `Fx.directa()` y `Fx.indirecta()` → `Acta` completas y válidas (todas las obligatorias llenas, `firma.bia` con un dataURL PNG de 1×1, TCs/TPs llenos en la indirecta, `pr.lecturaInicial '100'`, `pr.lecturaFinal '120,5'`).

- [ ] **Step 1: Pruebas**

```js
const R = Acta.Rules, set = Acta.Model.set;
test('directa oculta tcs, tps y celdasMT', () => {
  const a = Fx.directa();
  assert.equal(R.isVisible('tcs', a), false);
  assert.equal(R.isVisible('tps', a), false);
  assert.equal(R.isVisible('celdasMT', a), false);
  assert.equal(R.isVisible('tc', a), false);            // grid dentro de tcs
});
test('semidirecta muestra tcs, oculta tps', () => {
  const a = Fx.directa(); set(a, 'tec.tipoMedida', 'Semidirecta');
  assert.equal(R.isVisible('tcs', a), true);
  assert.equal(R.isVisible('tps', a), false);
});
test('indirecta muestra todo', () => {
  const a = Fx.indirecta();
  ['tcs','tps','celdasMT'].forEach(id => assert.equal(R.isVisible(id, a), true, id));
});
test('sin tipo de medida se muestra todo', () => {
  const a = Acta.Model.newActa();
  ['tcs','tps','celdasMT'].forEach(id => assert.equal(R.isVisible(id, a), true, id));
});
test('subcampo aparece solo con Sí', () => {
  const a = Fx.directa();
  set(a, 'riesgo.q7', 'No'); assert.equal(R.isVisible('riesgo.q7Cual', a), false);
  set(a, 'riesgo.q7', 'Sí'); assert.equal(R.isVisible('riesgo.q7Cual', a), true);
});
test('cambiar a directa conserva datos de TC', () => {
  const a = Fx.indirecta(); set(a, 'tec.tipoMedida', 'Directa');
  assert.equal(R.isVisible('tc', a), false);
  assert.ok(Acta.Model.getCell(a, 'tc', 'A', 'serie'));
});
test('all / any', () => {
  const a = Fx.directa(); set(a, 'planta.tiene', 'Sí');
  assert.equal(R.evaluate({ all: [{ field: 'planta.tiene', eq: 'Sí' }, { field: 'tec.tipoMedida', eq: 'Directa' }] }, a), true);
  assert.equal(R.evaluate({ any: [{ field: 'planta.tiene', eq: 'No' }, { field: 'tec.tipoMedida', eq: 'Indirecta' }] }, a), false);
});
```

- [ ] **Step 2: Verificar que fallan** (Expected: 7 fallos nuevos). **Step 3: Implementar** `src/rules.js` y `tests/fixtures.js`. **Step 4: Verificar** — Expected: `19 passed, 0 failed`.
- [ ] **Step 5: Commit** — `git commit -m "feat: reglas de visibilidad por tipo de medida"` (con `git add` de los 3 archivos y `tests.html` si se modificó).

---

### Task 4: `Validate` — obligatorios y avisos

**Files:**
- Create: `src/validate.js`, `tests/validate.test.js`

**Interfaces:**
- Consumes: `Catalog`, `Rules.isVisible`, `Model.get/getCell/parseNum/isEmpty`.
- Produces: `Acta.Validate.run(acta) → { missing: {id, label, sectionId}[], warnings: {code, message, sectionId}[] }`.
  - `missing`: campos `required` visibles y vacíos, más tres explícitos: `medidores.Activa.serie` (label "Serie del medidor", sección `medidor`), `medidores.Activa.lectura` ("Lectura activa", `medidor`), `firma.bia` ("Firma BIA", `firmas`, se mira en `acta.images`).
  - `warnings` (códigos y mensajes exactos):
    - `horaSalidaAntes` — "La hora de salida es anterior a la de ingreso." (`encabezado`) — solo si ambas tienen valor.
    - `lecturaFinalMenor` — "La lectura final es menor que la inicial." (`pruebas`) — solo si ambas parsean.
    - `tcSinSerie` — "La medida es semidirecta o indirecta y no hay series de TC." (`tcs`) — tipo ∈ {Semidirecta, Indirecta} y las 3 series de `tc` vacías.
    - `autorizacionNo` — "Hay autorizaciones legales en No." (`legales`).
    - `sinFirmaUsuario` — "Falta la firma del usuario o testigo." (`firmas`).

- [ ] **Step 1: Pruebas**

```js
const V = Acta.Validate, set = Acta.Model.set;
test('fixture directa sin faltantes ni avisos', () => {
  const r = V.run(Fx.directa());
  assert.deepEqual(r.missing, []); assert.deepEqual(r.warnings, []);
});
test('acta vacía lista los 7 obligatorios', () => {
  const r = V.run(Acta.Model.newActa());
  assert.deepEqual(r.missing.map(m => m.id).sort(),
    ['acta.numero','com.cuenta','com.direccion','tec.tipoMedida','medidores.Activa.serie','medidores.Activa.lectura','firma.bia'].sort());
});
test('hora de salida anterior', () => {
  const a = Fx.directa(); set(a, 'acta.horaIngreso', '10:00'); set(a, 'acta.horaSalida', '09:30');
  assert.deepEqual(V.run(a).warnings.map(w => w.code), ['horaSalidaAntes']);
});
test('lectura final menor, con coma decimal', () => {
  const a = Fx.directa(); set(a, 'pr.lecturaInicial', '120,5'); set(a, 'pr.lecturaFinal', '120,4');
  assert.deepEqual(V.run(a).warnings.map(w => w.code), ['lecturaFinalMenor']);
});
test('lecturas vacías o inválidas no generan aviso', () => {
  const a = Fx.directa(); set(a, 'pr.lecturaInicial', 'abc'); set(a, 'pr.lecturaFinal', '');
  assert.deepEqual(V.run(a).warnings, []);
});
test('semidirecta sin series de TC', () => {
  const a = Fx.directa(); set(a, 'tec.tipoMedida', 'Semidirecta');
  assert.ok(V.run(a).warnings.some(w => w.code === 'tcSinSerie'));
});
test('campos ocultos no se validan', () => {
  const a = Fx.indirecta(); set(a, 'tec.tipoMedida', 'Directa');
  Acta.Model.setCell(a, 'tc', 'A', 'serie', '');
  assert.equal(V.run(a).warnings.some(w => w.code === 'tcSinSerie'), false);
});
test('autorización en No y sin firma de usuario', () => {
  const a = Fx.directa(); set(a, 'legal.3', 'No'); delete a.images['firma.usuario'];
  assert.deepEqual(V.run(a).warnings.map(w => w.code).sort(), ['autorizacionNo','sinFirmaUsuario']);
});
```

(Fixture directa debe incluir `firma.usuario` y `legal.1..5 = 'Sí'`.)

- [ ] **Step 2: Verificar que fallan**. **Step 3: Implementar** `src/validate.js`. **Step 4: Verificar** — Expected: `27 passed, 0 failed`.
- [ ] **Step 5: Commit** — `git commit -m "feat: validación de obligatorios y avisos de coherencia"`

---

### Task 5: `Sheets.model` — contenido de cada hoja

**Files:**
- Create: `src/sheets.js` (solo `model` y `display` en esta tarea), `tests/sheets.test.js`

**Interfaces:**
- Consumes: `Catalog`, `Rules.isVisible`, `Model.*`.
- Produces:
  - `Acta.Sheets.display(field, acta) → string` — `yesno`/`goodbad`/`choice`/`text` tal cual; `number` + `' ' + unit` si hay unidad; `multi` unido con `', '`; `computed` → `Model.diferencia(...)`; `mirror` → valor de `source`; vacío → `''`.
  - `Acta.Sheets.model(acta) → [SheetModel, SheetModel]`

```ts
SheetModel = { number: 1|2, header: { actaNo, fecha, horaIngreso, horaSalida }, sections: SectionModel[] }
SectionModel = { id, title, blocks: Block[] }
Block =
  | { kind:'pairs', items: { label, value, risk: boolean }[] }
  | { kind:'grid', title?, columns: string[], rows: { label, cells: string[] }[] }  // omite filas totalmente vacías y columnas totalmente vacías
  | { kind:'list', columns: string[], rows: string[][] }
  | { kind:'images', items: { label, src }[] }
  | { kind:'signatures', items: { role, src, nombre, cc, tel }[] }   // roles 'Usuario / Testigo', 'BIA', 'Operador de red'; incluye un rol si tiene firma o algún dato
```

Reglas: sección no visible o sin ningún bloque → no aparece. Campo no visible o vacío → no aparece. `gps` y `allYes` no se muestran (sus targets sí, como pares). `risk: true` cuando `field.risk === valor`.

- [ ] **Step 1: Pruebas**

```js
const S = Acta.Sheets, set = Acta.Model.set;
test('dos hojas con encabezado', () => {
  const [h1, h2] = S.model(Fx.directa());
  assert.equal(h1.number, 1); assert.equal(h2.number, 2);
  assert.equal(h1.header.actaNo, Fx.directa().values['acta.numero']);
});
test('directa no incluye tcs ni tps aunque tengan datos', () => {
  const a = Fx.indirecta(); set(a, 'tec.tipoMedida', 'Directa');
  const ids = S.model(a).flatMap(h => h.sections.map(s => s.id));
  assert.equal(ids.includes('tcs'), false); assert.equal(ids.includes('celdasMT'), false);
});
test('indirecta incluye grid de TC con 3 filas', () => {
  const tcs = S.model(Fx.indirecta())[0].sections.find(s => s.id === 'tcs');
  const grid = tcs.blocks.find(b => b.kind === 'grid');
  assert.deepEqual(grid.rows.map(r => r.label), ['A','B','C']);
});
test('campos vacíos y secciones sin datos se omiten', () => {
  const a = Fx.directa(); delete a.values['obs.texto']; set(a, 'obs.aumentoCarga', '');
  const ids = S.model(a)[1].sections.map(s => s.id);
  assert.equal(ids.includes('observaciones'), false);
});
test('riesgo marcado', () => {
  const a = Fx.directa(); set(a, 'riesgo.q9', 'Sí'); set(a, 'riesgo.q14', 'Sí');
  const items = S.model(a)[1].sections.find(s => s.id === 'riesgos').blocks[0].items;
  assert.equal(items.find(i => i.label.startsWith('¿Hay riesgo de atrapamiento')).risk, true);
  assert.equal(items.find(i => i.label.startsWith('¿Existen extintores')).risk, false);
});
test('diferencia calculada y q1 espejo', () => {
  const [h1, h2] = S.model(Fx.directa());
  const pr = h1.sections.find(s => s.id === 'pruebas').blocks.find(b => b.kind === 'pairs');
  assert.equal(pr.items.find(i => i.label === 'Diferencia').value, '20,5');
  const q1 = h2.sections.find(s => s.id === 'riesgos').blocks[0].items[0];
  assert.equal(q1.value, 'Directa');
});
test('texto largo se conserva completo', () => {
  const a = Fx.directa(), largo = 'x'.repeat(2000); set(a, 'obs.texto', largo);
  const obs = S.model(a)[1].sections.find(s => s.id === 'observaciones').blocks[0].items[0];
  assert.equal(obs.value.length, 2000);
});
test('firmas en hoja 2', () => {
  const f = S.model(Fx.directa())[1].sections.find(s => s.id === 'firmas');
  const sig = f.blocks.find(b => b.kind === 'signatures');
  assert.deepEqual(sig.items.map(i => i.role), ['Usuario / Testigo', 'BIA']);
});
```

(La etiqueta del campo `pr.diferencia` es exactamente "Diferencia". El fixture directa no trae datos de firma del OR.)

- [ ] **Step 2: Verificar que fallan**. **Step 3: Implementar**. **Step 4: Verificar** — Expected: `35 passed, 0 failed`.
- [ ] **Step 5: Commit** — `git commit -m "feat: modelo de las hojas del resumen"`

---

### Task 6: `Store` — borradores, historial, perfil, sugerencias

**Files:**
- Create: `src/store.js`, `tests/store.test.js`

**Interfaces:**
- Produces (todo devuelve `Promise`):
  - `Acta.Store.init({ dbName = 'acta-digital' } = {}) → { persistent: boolean }` — IndexedDB v1, stores `actas` (keyPath `id`) y `kv`. Si falla, usa `Map` en memoria y `persistent:false`.
  - `list() → Acta[]` ordenadas por `updatedAt` desc.
  - `latestDraft() → Acta|null` — la `borrador` más reciente.
  - `get(id)`, `save(acta) → { ok: true, dropped?: imageKey }`, `remove(id)`.
  - `duplicate(id) → Acta` — copia `values` y `tables` con nuevo `id`, `status:'borrador'`; limpia `acta.numero`, `acta.horaSalida`; `acta.fecha`/`acta.horaIngreso` = ahora; `images` vacío.
  - `getProfile() → {nombre, cc, tel}|null`, `setProfile(p)`.
  - `getSuggestions(listId) → string[]`, `addSuggestion(listId, value)` (sin duplicados, ignora valores ya presentes en `Acta.Lists`, máximo 50 por lista).
  - `save` ante `QuotaExceededError`: quita de `acta.images` la entrada de mayor longitud, reintenta una vez y devuelve `dropped` con esa clave.
- `Acta.Store.saveDebounced(acta, onDone)` — debounce 500 ms sobre `save`.

- [ ] **Step 1: Pruebas** (usan `dbName:'acta-test-'+Date.now()`)

```js
test('guardar, listar ordenado y latestDraft', async () => {
  await Acta.Store.init({ dbName: 'acta-test-' + Date.now() });
  const a = Acta.Model.newActa(), b = Acta.Model.newActa(), c = Acta.Model.newActa();
  a.updatedAt = 1; b.updatedAt = 3; c.updatedAt = 5; c.status = 'generada';
  for (const x of [a, b, c]) await Acta.Store.save(x);
  assert.deepEqual((await Acta.Store.list()).map(x => x.id), [c.id, b.id, a.id]);
  assert.equal((await Acta.Store.latestDraft()).id, b.id);
});
test('duplicate limpia número, horas e imágenes', async () => {
  const a = Fx.directa(); await Acta.Store.save(a);
  const d = await Acta.Store.duplicate(a.id);
  assert.ok(d.id !== a.id);
  assert.equal(d.values['acta.numero'], undefined);
  assert.equal(d.values['com.cuenta'], a.values['com.cuenta']);
  assert.deepEqual(d.images, {});
});
test('perfil y sugerencias', async () => {
  await Acta.Store.setProfile({ nombre: 'Técnico', cc: '1', tel: '3' });
  assert.equal((await Acta.Store.getProfile()).nombre, 'Técnico');
  await Acta.Store.addSuggestion('operadores', 'Nuevo OR');
  await Acta.Store.addSuggestion('operadores', 'Nuevo OR');
  await Acta.Store.addSuggestion('operadores', 'EPM');
  assert.deepEqual(await Acta.Store.getSuggestions('operadores'), ['Nuevo OR']);
});
```

- [ ] **Step 2: Verificar que fallan**. **Step 3: Implementar**. **Step 4: Verificar** — Expected: `38 passed, 0 failed`.
- [ ] **Step 5: Commit** — `git commit -m "feat: almacenamiento local de actas en IndexedDB"`

---

### Task 7: Componentes Olibia en CSS y `Capture`

**Files:**
- Modify: `styles/app.css`
- Create: `src/capture.js`, `tests/capture.test.js`, `tests/components.html`

**Interfaces:**
- Produces clases CSS (usadas por Form/App): `.o-card`, `.o-label` (+ `.is-required` con asterisco `--color-error-base`), `.o-input`, `.o-textarea`, `.o-select`, `.o-seg` (grupo segmentado para `yesno`/`goodbad`/`choice` ≤ 5; botón activo con pill blanca y sombra `--shadow-regular-xs`, según SegmentedControl Olibia), `.o-check` (checkbox teal para `multi`), `.o-btn` (basic), `.o-btn-fancy` (primario negro), `.o-btn-compact` (solo ícono), `.o-link`, `.o-badge` + `.is-ok/.is-warn/.is-error`, `.o-alert` + `.is-warning`, `.o-progress`, `.o-hint.is-error`, `.o-sub` (Subheading). Controles radius 10, alto 44 px, foco `0 0 0 2px var(--color-bg-white-0), 0 0 0 4px var(--color-stroke-strong-950)`. Transiciones 200 ms `var(--ease-bia)`; `prefers-reduced-motion` las anula.
- Produces JS:
  - `Acta.Capture.gps() → Promise<{lat:number, lon:number, alt:number|null}>` — `getCurrentPosition` con `enableHighAccuracy:true, timeout:15000`; rechaza con `Error` de mensaje "Permiso de ubicación negado." / "No se pudo obtener la ubicación. Escríbela a mano." / "Este dispositivo no tiene GPS disponible.".
  - `Acta.Capture.pad(canvas, { grid=false, onChange }) → { toDataURL(): string|null, load(src): Promise, clear(), undo(), isEmpty(): bool }` — pointer events, `touch-action:none`, trazo 2.2 px `#171717`, ajuste por `devicePixelRatio`, fondo blanco (cuadrícula de 20 px en `#e5e5e5` si `grid`, que no se exporta: se dibuja en un canvas de fondo aparte).
  - `Acta.Capture.photo(file, { max=1600, quality=0.8 }) → Promise<string>` (dataURL JPEG).
  - `Acta.Capture.now() → { fecha:'AAAA-MM-DD', hora:'HH:MM' }`.

- [ ] **Step 1: Pruebas de `Capture`** (añadir `src/capture.js` a `tests.html`)

```js
test('photo reduce al lado máximo', async () => {
  const c = document.createElement('canvas'); c.width = 3200; c.height = 1600;
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const url = await Acta.Capture.photo(new File([blob], 'x.png', { type: 'image/png' }));
  const img = new Image(); await new Promise(r => { img.onload = r; img.src = url; });
  assert.equal(img.width, 1600); assert.equal(img.height, 800);
  assert.ok(url.startsWith('data:image/jpeg'));
});
test('gps traduce permiso negado', async () => {
  const orig = navigator.geolocation;
  Object.defineProperty(navigator, 'geolocation', { configurable: true,
    value: { getCurrentPosition: (_ok, err) => err({ code: 1 }) } });
  try { await Acta.Capture.gps(); assert.ok(false); }
  catch (e) { assert.equal(e.message, 'Permiso de ubicación negado.'); }
  finally { Object.defineProperty(navigator, 'geolocation', { configurable: true, value: orig }); }
});
test('pad vacío devuelve null', () => {
  const c = document.createElement('canvas'); document.body.appendChild(c);
  const p = Acta.Capture.pad(c); assert.equal(p.isEmpty(), true); assert.equal(p.toDataURL(), null);
  c.remove();
});
```

- [ ] **Step 2: Verificar que fallan**. **Step 3: Implementar** `capture.js` y los componentes en `app.css`. **Step 4: Verificar** — Expected: `41 passed, 0 failed`.
- [ ] **Step 5: Verificación visual de componentes** — crear `tests/components.html` con una muestra de cada clase `.o-*` (claro y oscuro con `data-theme`). Abrirla en el navegador a 375 px (`resize_window preset:"mobile"`), tomar captura, y comprobar: sin scroll horizontal, controles de 44 px, Sí/No como segmentado, el único color teal está en checkbox/progress. Restablecer con `preset:"desktop"`.
- [ ] **Step 6: Commit** — `git commit -m "feat: componentes Olibia y capturas (GPS, firma, fotos)"`

---

### Task 8: `Form` — formulario generado desde el catálogo

**Files:**
- Create: `src/form.js`
- Modify: `styles/app.css` (layout del formulario)

**Interfaces:**
- Consumes: `Catalog`, `Rules.isVisible`, `Model.*`, `Sheets.display` (para `computed`/`mirror`), `Capture.*`, `Store.getSuggestions/addSuggestion`, clases `.o-*`.
- Produces: `Acta.Form.mount(el, acta, { onChange(acta) }) → { refresh(), focusField(id), destroy() }`.
  - Cada sección = `.o-card` plegable (`<details>` con `<summary>`: número, título, contador "n de m" de campos visibles llenos). Índice de secciones visibles en la parte superior (chips que hacen scroll).
  - Mapeo tipo → control: `text/number/date/time` → `.o-input` (`inputmode` del catálogo; `date`/`time` nativos); `textarea` → `.o-textarea`; `yesno`/`goodbad`/`choice` ≤ 5 opciones → `.o-seg` (tocar la opción activa la desmarca); `choice` > 5 → `.o-select`; `multi` → `.o-check`; `suggest` → `.o-input` + `<datalist>` (`Acta.Lists[list]` + sugerencias guardadas; al salir del campo con un valor nuevo → `addSuggestion`); `computed`/`mirror` → texto solo lectura; `gps` → `.o-btn` "Capturar ubicación" (ícono `ri-map-pin-line`), rellena sus `targets`, error en `.o-hint.is-error`; `signature` → canvas 160 px + "Borrar"; `drawing` → canvas cuadrado con cuadrícula + "Deshacer" / "Borrar"; `photo` → botón "Tomar o subir foto" (`accept="image/*" capture="environment"`) + miniatura + quitar; `grid` → una sub-tarjeta por fila (en el celular) con sus columnas en 2 columnas; `list` → filas + "Agregar máquina" / quitar; `allYes` → `.o-btn` "Marcar todas en Sí".
  - Cada cambio: `Model.set`/`setCell`/`acta.images[id] = …`, luego `onChange(acta)` y re-evaluar visibilidad (`hidden` en campos/secciones), sin volver a pintar todo el formulario (no se pierde el foco).
  - Sección `tecnica` sin tipo de medida: mostrar `.o-alert` "Elige el tipo de medida para ver solo las secciones que aplican."
  - Al montar: si `firma.bia.nombre/cc/tel` están vacíos y hay perfil, precargarlos; al editarlos → `Store.setProfile`.

- [ ] **Step 1: Implementar `src/form.js`** y montarlo temporalmente desde `src/app.js` con `Acta.Form.mount(document.getElementById('app'), Acta.Model.newActa(), { onChange: a => console.log(a) })`.
- [ ] **Step 2: Verificación en el navegador a 375 px**
  1. Abrir `http://localhost:8080/` en `preset:"mobile"`. Expected: sin errores en consola, 24 secciones visibles (sin tipo de medida) y el aviso en `tecnica`.
  2. Elegir "Directa". Expected: desaparecen `tcs`, `tps`, `celdasMT` del índice y del formulario.
  3. En `riesgos`, marcar q7 = Sí. Expected: aparece "¿Cuáles?". Marcar No: desaparece.
  4. Escribir lecturas `100` y `120,5`. Expected: "Diferencia 20,5".
  5. Firmar en el canvas de BIA con el mouse (`left_click_drag`). Expected: `acta.images['firma.bia']` es un dataURL (verificar con `javascript_tool`).
  6. Tomar captura: sin scroll horizontal (`document.documentElement.scrollWidth <= 375`).
- [ ] **Step 3: Commit** — `git commit -m "feat: formulario generado desde el catálogo"`

---

### Task 9: Render de hojas y `Export`

**Files:**
- Modify: `src/sheets.js` (añadir `render`)
- Create: `styles/sheet.css`, `src/export.js`, `tests/export.test.js`

**Interfaces:**
- Consumes: `Sheets.model`.
- Produces:
  - `Acta.Sheets.render(model: SheetModel[]) → HTMLElement[]` — cada una `<article class="sheet" data-theme="light">` de 1080 px de ancho. Encabezado: logo (bolt `icons/icon.svg` inline), "Visita previa para conexión eléctrica · OPS-FM-03", "Acta N° …", fecha, "Ingreso HH:MM · Salida HH:MM", "Hoja N de 2", y la nota "Resumen de recolección de información — no reemplaza el acta oficial". Secciones como tarjetas `bg-white-0` sobre `bg-weak-25`; título `.text-subheading-xs`; `pairs` en 2 columnas (etiqueta `--color-text-sub-600` 13 px, valor `--color-text-strong-950` 15 px); valores `Sí/No/Bueno/Malo` como `.o-badge`; `risk:true` → badge `.is-warn` y fila con fondo `--color-warning-lighter`; `grid`/`list` como tabla compacta con cabecera `bg-weak-50`; imágenes a ancho completo con máximo de 900 px de alto; firmas en 3 columnas (imagen 120 px de alto + nombre, C.C., Tel.). Pie de la hoja 2: texto Ley 1581 de 2012 / Decreto 1377 de 2013 del formato. `overflow-wrap:anywhere` en valores. Sin íconos de fuente.
  - `Acta.Export.fileName(actaNo, n, fecha, fmt) → string` — `actaNo` vacío → `SN`; caracteres fuera de `[A-Za-z0-9_-]` → `-`.
  - `Acta.Export.toBlob(node, fmt: 'png'|'jpg') → Promise<Blob>` — `htmlToImage.toBlob` (png) / `toJpeg` + conversión a blob (jpg, `quality:0.9`), `pixelRatio:2`, `backgroundColor:'#ffffff'`, `width:1080`; si falla, reintenta con `pixelRatio:1`; si vuelve a fallar, rechaza con `Error('No se pudo generar la imagen. Intenta de nuevo.')`. Si `window.htmlToImage` no existe: `Error('Necesitas conexión para generar la imagen.')`.
  - `Acta.Export.deliver(files: File[]) → Promise<'shared'|'downloaded'>` — `navigator.canShare?.({files})` → `navigator.share({files, title:'Acta …'})`; si no, un `<a download>` por archivo. `AbortError` del share cuenta como `'shared'`.
- Añadir a `index.html`: `<script src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js"></script>` antes de `src/`. Confirmar que expone `window.htmlToImage` (si la ruta no existe, usar la que liste `https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/` para el build UMD).

- [ ] **Step 1: Pruebas**

```js
test('fileName', () => {
  const F = Acta.Export.fileName;
  assert.equal(F('03651', 1, '2026-09-30', 'png'), 'Acta-03651-Hoja1-2026-09-30.png');
  assert.equal(F('', 2, '2026-09-30', 'jpg'), 'Acta-SN-Hoja2-2026-09-30.jpg');
  assert.equal(F('036/51', 1, '2026-09-30', 'png'), 'Acta-036-51-Hoja1-2026-09-30.png');
});
test('render produce dos hojas de 1080 px en claro', () => {
  const nodes = Acta.Sheets.render(Acta.Sheets.model(Fx.indirecta()));
  assert.equal(nodes.length, 2);
  nodes.forEach(n => { document.body.appendChild(n);
    assert.equal(n.getAttribute('data-theme'), 'light');
    assert.equal(Math.round(n.getBoundingClientRect().width), 1080); n.remove(); });
});
```

(Añadir `src/export.js` y `styles/sheet.css` a `tests.html`.)

- [ ] **Step 2: Verificar que fallan**. **Step 3: Implementar** `render`, `sheet.css`, `export.js`. **Step 4: Verificar** — Expected: `43 passed, 0 failed`.
- [ ] **Step 5: Revisión visual** — en la consola de `http://localhost:8080/`, renderizar `Fx.indirecta()` con una observación de 2 000 caracteres sin espacios; generar PNG y JPG con `Export.toBlob`, mostrar el blob en un `<img>` y tomar capturas. Comprobar: texto largo sin desbordar, riesgos resaltados, firmas visibles, fuentes Inter/Season Mix aplicadas en la imagen (no la fuente del sistema), fondo blanco en el JPG.
- [ ] **Step 6: Commit** — `git commit -m "feat: render de hojas y exportación PNG/JPG"`

---

### Task 10: `App` — pantallas y flujo completo

**Files:**
- Modify: `src/app.js`, `styles/app.css`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `Acta.App.start()` (llamado en `DOMContentLoaded`). Pantallas (cambian con `location.hash`: `#/`, `#/acta/<id>`, `#/revision/<id>`, `#/vista/<id>`, para que funcione el botón atrás del celular):
  - **Inicio:** título "Actas de visita previa"; `.o-btn-fancy` "Nueva acta"; si `Store.latestDraft()` existe, `.o-alert` "Continuar acta N° <n o 'sin número'>" con botón; lista "Borradores" y "Generadas" (No., cuenta, fecha, badge de estado) con acciones Continuar/Ver, Duplicar y Eliminar (Eliminar pide confirmación con un segundo toque: "Toca otra vez para eliminar", 3 s). Si `Store.init` devolvió `persistent:false`, `.o-alert` "Este dispositivo no guarda borradores. No cierres la app hasta generar las imágenes."
  - **Formulario:** barra superior con volver y No. de acta; `Form.mount`; barra inferior fija con `.o-progress` (obligatorios completos / 7) y `.o-btn-fancy` "Revisar y generar". Guardado con `Store.saveDebounced`; si `save` devuelve `dropped`, aviso "No hay espacio suficiente: no se guardó <etiqueta>.".
  - **Revisión:** `Validate.run`; lista de faltantes y avisos, cada uno con "Completar" (vuelve al formulario y hace `focusField`); `.o-btn` "Completar datos" y `.o-btn-fancy` "Generar de todas formas" (o "Generar imágenes" si no hay nada).
  - **Vista previa:** al entrar, si `acta.horaSalida` está vacía → `Capture.now().hora`; `status = 'generada'`; guardar. `Sheets.render` dentro de un contenedor escalado (`transform: scale(ancho disponible / 1080)`, con altura compensada). `.o-seg` PNG/JPG (por defecto PNG, se recuerda en `localStorage` con `try/catch`); `.o-btn-fancy` "Compartir" (o "Descargar" si `navigator.canShare` no admite archivos); `.o-btn` "Editar". Estado de carga en el botón mientras se exporta; los errores de `Export` se muestran como `.o-alert.is-warning` con "Reintentar".

- [ ] **Step 1: Implementar `src/app.js`** (quitar el montaje temporal de Task 8).
- [ ] **Step 2: Recorrido completo en el navegador a 375 px**
  1. Inicio → "Nueva acta" → llenar las obligatorias con medida Directa, firmar BIA y usuario.
  2. Recargar la página. Expected: Inicio muestra "Continuar acta N° …" y los datos siguen ahí.
  3. "Revisar y generar". Expected: sin faltantes. Volver, borrar la cuenta, revisar de nuevo. Expected: aparece "Nombre de la cuenta" y "Completar" lleva al campo.
  4. "Generar" → Vista previa. Expected: 2 hojas, hora de salida llena, estado "generada" en Inicio.
  5. "Descargar" en PNG y en JPG. Expected: 4 archivos con el nombre `Acta-<No>-Hoja<N>-<fecha>.<ext>` (verificar con `read_network_requests`/consola que se crean los blobs; en el panel no hay share).
  6. Duplicar el acta. Expected: borrador nuevo con la cuenta copiada, sin número ni firmas.
  7. Repetir 1–4 con medida Indirecta y TCs/TPs. Expected: aparecen las secciones de TCs, TPs y celdas en las hojas.
  8. Tema oscuro (`resize_window colorScheme:"dark"`). Expected: la app se invierte y las hojas siguen en claro.
- [ ] **Step 3: Verificar pruebas automáticas** — `tests/tests.html`. Expected: `43 passed, 0 failed`.
- [ ] **Step 4: Commit** — `git commit -m "feat: flujo completo inicio, formulario, revisión y vista previa"`

---

### Task 11: PWA — manifiesto, íconos y funcionamiento sin conexión

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icons/icon.svg`, `tools/make-icons.ps1`, `icons/icon-192.png`, `icons/icon-512.png`
- Modify: `index.html`, `src/app.js`

**Interfaces:**
- `icons/icon.svg`: fondo `#171717` con esquinas de radio 22 %, rayo teal `#3fdec9` centrado (polígono en viewBox 512: `292,56 124,296 236,296 204,456 388,200 272,200`).
- `tools/make-icons.ps1`: con `System.Drawing` dibuja el mismo fondo y polígono en 192 y 512 px y guarda los PNG. Ejecutar: `powershell -ExecutionPolicy Bypass -File tools/make-icons.ps1`.
- `manifest.webmanifest`: `name` "Acta visita previa · BIA", `short_name` "Acta BIA", `start_url` "./", `scope` "./", `display` "standalone", `background_color` "#fafafa", `theme_color` "#171717", `lang` "es", íconos 192 y 512 (`purpose` "any maskable").
- `index.html`: `<link rel="manifest">`, `<link rel="apple-touch-icon" href="icons/icon-192.png">`, `<meta name="theme-color" content="#171717">`.
- `sw.js`: `CACHE = 'acta-v1'`; en `install` precachea todos los archivos locales (`./`, `index.html`, `manifest.webmanifest`, `styles/*`, `styles/fonts/*`, `src/*`, `icons/*`) y las 3 URLs CDN (html-to-image, remixicon.css, CSS de Inter); `activate` borra caches con otro nombre; `fetch` GET: cache-first y, si no está, red y guardado en cache para `cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com` y el propio origen. Navegación sin red → `index.html` de cache.
- Registro en `app.js`: solo si `'serviceWorker' in navigator && window.top === window.self && (location.protocol === 'https:' || location.hostname === 'localhost')`, dentro de `try/catch`.

- [ ] **Step 1: Crear íconos, manifiesto y service worker; registrar.**
- [ ] **Step 2: Verificar sin conexión en localhost**
  1. Cargar `http://localhost:8080/` dos veces. Con `javascript_tool`: `(await caches.keys())` incluye `acta-v1` y `navigator.serviceWorker.controller !== null`.
  2. Detener el servidor (`preview_stop`), recargar. Expected: la app carga, se puede abrir un borrador y generar la vista previa y el PNG (html-to-image desde cache).
  3. Volver a iniciar el servidor.
- [ ] **Step 3: Commit** — `git commit -m "feat: PWA instalable con funcionamiento sin conexión"`

---

### Task 12: Publicación — Artifact y GitHub Pages

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: todos los archivos del sitio.

- [ ] **Step 1: Publicar como Artifact.** Cargar los skills `artifact-design` (solo contrato: título, `<title>` de 2–4 palabras, fondo explícito) y `artifact-capabilities` antes de publicar. Si la descarga de archivos desde el artifact requiere la capacidad `downloads`, declararla y añadir en `Export.deliver` la rama que use esa API cuando la app corre dentro del artifact (detectado con `window.top !== window.self`), sin romper la rama normal. Publicar `index.html` con `files` para cada archivo de `styles/`, `styles/fonts/`, `src/`, `icons/` (no `tests/`, `docs/`, `tools/`), `icon: "form"`. Abrir el link y repetir el recorrido de Task 10 pasos 1, 3 y 4.
- [ ] **Step 2: Escribir `README.md`** — qué es (con la nota de que no reemplaza el acta oficial), cómo correrlo localmente (`python -m http.server 8080`), cómo correr las pruebas (`/tests/tests.html`), cómo publicar en GitHub Pages:
  1. Crear en github.com un repositorio vacío `acta-digital` (privado o público; Pages en repos privados requiere un plan pago).
  2. `git remote add origin https://github.com/<usuario>/acta-digital.git`
  3. `git push -u origin main` (lo ejecuta el usuario, con sus credenciales).
  4. Settings → Pages → Source: "Deploy from a branch", `main`, `/ (root)`.
  5. Abrir `https://<usuario>.github.io/acta-digital/` en el celular → "Agregar a pantalla de inicio".
  6. Para actualizar: cambiar `CACHE` en `sw.js` (`acta-v2`, …) en cada publicación, para que el celular reciba la versión nueva.
- [ ] **Step 3: Commit** — `git add README.md src/export.js && git commit -m "docs: guía de uso y despliegue"`
- [ ] **Step 4: Entregar al usuario** los pasos 1–5 del README para que haga el push y active Pages; después del despliegue, pedirle que pruebe en el celular en modo avión (spec §9).
