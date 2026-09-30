# Acta digital · Visita previa para conexión eléctrica

App web para diligenciar desde el celular la información del formato **OPS-FM-03 v02
"Visita previa para conexión eléctrica"** de BIA y descargar un resumen en imagen (PNG o JPG),
una imagen por hoja, con el estilo del design system Olibia.

> El resumen **no reemplaza el acta oficial**. El acta oficial se sigue llenando a mano y se carga
> en la app de la empresa; esta herramienta sirve para recolectar la información de forma ordenada.

Los datos se guardan solo en el navegador del dispositivo (IndexedDB). No hay servidor ni cuentas.

## Requisitos

- Python 3 (solo para servir los archivos).
- Chrome, para correr las pruebas automáticas.

No hay dependencias que instalar ni paso de compilación.

## Correr la app en el computador

```bash
python -m http.server 8080
```

Abre `http://localhost:8080/`. En `localhost` la app funciona también sin conexión: después de la
primera carga, el service worker guarda todo en caché.

## Usarla desde el celular en la misma red WiFi

1. En el computador, desde la carpeta del proyecto:
   ```bash
   python -m http.server 8080 --bind 0.0.0.0
   ```
2. Busca la IP del computador (`ipconfig`, línea "Dirección IPv4", por ejemplo `192.168.1.20`).
3. En el celular abre `http://192.168.1.20:8080/`.

Limitación: por `http://` a una IP, los navegadores **no activan el service worker ni la instalación
como app**, así que el celular necesita alcanzar el computador mientras la usas. Los borradores sí
quedan guardados en el celular. Para instalarla y usarla sin señal hay que publicarla en un sitio con
`https://` (por ejemplo GitHub Pages).

## Pruebas

```bash
bash tools/run-tests.sh
```

Corre `tests/tests.html` en Chrome headless (44 pruebas de lógica: modelo, catálogo, reglas de
visibilidad, validación, hojas, almacenamiento, capturas y exportación). También se puede abrir
`http://localhost:8080/tests/tests.html` en el navegador.

```bash
bash tools/check-offline.sh
```

Comprueba el modo sin conexión: instala el service worker y luego, con el servidor respondiendo 503,
verifica que la app carga desde la caché y genera una imagen.

Páginas de apoyo: `tests/components.html` (componentes Olibia en claro/oscuro) y
`tests/sheet-preview.html` (hojas de ejemplo; `?sheet=1|2`, `?largo=1`).

## Estructura

| Ruta | Qué contiene |
|---|---|
| `index.html` | Página de la app |
| `src/catalog.js` | Secciones y campos del formato. Para cambiar un campo o una regla de visibilidad, se edita aquí |
| `src/lists.js` | Listas de autocompletar (operadores, marcas, calibres…) |
| `src/rules.js`, `src/validate.js` | Qué se muestra y qué se revisa antes de generar |
| `src/sheets.js`, `styles/sheet.css` | Contenido y diseño de las imágenes |
| `src/form.js`, `src/app.js`, `styles/app.css` | Formulario y pantallas |
| `src/store.js`, `src/capture.js`, `src/export.js` | Guardado local, GPS/firmas/fotos, exportación |
| `styles/olibia-tokens.css`, `styles/fonts/` | Tokens y fuente Season Mix del design system Olibia (copia literal) |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalable y sin conexión |

Al publicar una versión nueva, cambia `CACHE` en `sw.js` (`acta-v2`, `acta-v3`, …) para que los
dispositivos reciban los archivos actualizados.

## Pendientes conocidos

- **Season Mix es una fuente TRIAL.** Sirve para uso interno; antes de distribuir la app más
  ampliamente, reemplázala por los archivos con licencia o usa Inter en los títulos.
- Las listas de autocompletar son sugerencias armadas con información pública; no son oficiales.
