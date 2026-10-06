# Alexis Estrada — portfolio

Sitio estático, sin framework ni dependencias de producción. Las páginas de obra
son HTML completos: funcionan sin JavaScript, al abrirlas como archivos y en un
hosting estático. No se configuró hosting ni se publicó el sitio.

## Ver la web

Abrir `index.html` con un navegador, o desde esta carpeta:

```powershell
npm start
```

Visitar http://127.0.0.1:4173. Detener el servidor con Ctrl+C.
Node 20 o posterior; no hace falta ejecutar `npm install`.

## Una sola fuente para los datos

- `data/works.json`: catálogo de A01–A15. Buscar por `id` para editar una obra.
- `data/site.json`: biografía, statement, CV, correo, enlaces y proyectos.
- `data/images.json`: rutas, dimensiones y variantes responsive de las imágenes.
- `scripts/build.mjs`: plantillas y generación de las páginas.
- `style.css`: diseño y adaptación de pantalla.
- `app.js`: únicamente un fallback neutral para imágenes que no cargan.
- `assets/raw/`: 25 JPEG originales, conservados sin cambios.
- `assets/web/`: copias RGB para la web, con versiones según tamaño.
- `obra/<slug>/index.html`: fichas generadas; no editarlas a mano.
- `proyectos/`, `sobre-mi/`, `cv/`, `contacto/`: secciones generadas.
- `verification/`: capturas y hojas de contacto de control, no para publicar.

Después de modificar datos o plantillas:

```powershell
npm run build
npm test
```

Cambiar `title`, `year`, `technique`, `dimensions` y `description` solo en el
registro correspondiente de `works.json`. Los valores desconocidos son `null`;
no se publican corchetes ni identificadores. «Obra» es una etiqueta de interfaz,
no un título atribuido. Las descripciones `alt` son visuales, no títulos reales.
Los slugs son direcciones descriptivas provisionales: mantenerlos al introducir
títulos evita romper enlaces compartidos.

`visible: false` retira una obra y su HTML generado en la siguiente compilación.
No es un mecanismo de privacidad: los archivos fuente y las imágenes deben
excluirse de cualquier publicación cuando corresponda. `order` determina la
secuencia. En escritorio, las columnas se recorren de arriba abajo y luego hacia
la derecha, en el mismo orden del teclado; en móvil hay una sola columna.

`placement` admite `main`, `project` o `archive`. Las obras de archivo generan
su propia colección cuando existen. `projectIds` admite varias relaciones,
independientemente de la técnica. Definir proyectos en `site.json` con esta forma:

```json
{"id":"identificador-interno","slug":"direccion-del-proyecto","title":"Título confirmado","description":null}
```

CV agrupa `education`, `residencies` y `exhibitions`, con entradas
`{"year":"2024","text":"Información confirmada"}`, y un `exhibitionSummary`.
Los enlaces de contacto usan `{"label":"Nombre","url":"https://..."}`.
Estos son ejemplos de estructura, no información del artista.

## Imágenes y corrección del negativo

Los 25 JPEG suministrados están en CMYK, sin perfil ICC ni marcador Adobe.
Se observaron en negativo. `scripts/prepare_images.py` normaliza la polaridad
de esos canales CMYK y convierte las copias a RGB, etiquetadas sRGB. No aplica
retoque creativo, recorte, contraste, saturación ni filtros CSS. Conserva todas
las dimensiones y archivos fuente. Las variantes pequeñas mantienen proporción.
`sourceSha256` registra la huella de cada original.

La apariencia normal se comprobó visualmente, pero la reproducción exacta de
color necesita cotejo con las fotografías originales: no se recibió el PDF
fuente ni su información de gestión de color. La corrección técnica no puede
recuperar un perfil ICC ausente.

Se usa la vista completa `img-006.jpg` para A02; `img-005.jpg` pasa a detalle.
Las vistas relacionadas se agrupan en `additionalImages`. `img-010.jpg` es un
duplicado de `img-009.jpg`: se conserva, pero no se repite públicamente.

Para reemplazar una fotografía:

1. Conservar el nuevo original aparte y preparar una copia RGB/sRGB sin retoque.
2. Guardar sus versiones web en `assets/web/`.
3. Actualizar la entrada correspondiente en `data/images.json`: `src`, `width`,
   `height` y `sources` (lista opcional de objetos `src` y `width`). Se puede usar
   una clave nueva en lugar del antiguo nombre de JPEG.
4. Si cambia la clave, actualizar `image.file` en la obra; para nuevos detalles,
   añadir objetos `{"file":"clave","alt":"Descripción visual"}` a
   `additionalImages`. `image: null` produce un placeholder neutral.
5. Ejecutar `npm run build` y `npm test`.

NO aplicar `prepare_images.py` a fotografías originales nuevas: está limitado
a la codificación provisional de este lote. Requiere Pillow; en esta laptop se
usó el Python incluido en Codex, sin instalar paquetes ni contratar servicios.

## Publicación futura

La preparación de GitHub Pages y sus pasos se describen en `../README.md`.
`npm run build:pages` genera exclusivamente `_site/`. Actions obtiene la URL
real de Pages y la pasa como `SITE_URL`, incluyendo el base path. `siteUrl`
permite una configuración manual posterior. Canonical y OG pueden usar esa URL,
pero todas las páginas conservan noindex y robots bloquea la indexación. No se
genera sitemap durante la preview, aun cuando exista dominio.

Publicar solo HTML generado, `style.css`, `app.js`, `assets/favicon.svg`,
`assets/web/`, `robots.txt` y `sitemap.xml` cuando exista. Excluir `data/`,
`scripts/`, `sources/`, `assets/raw/`, `verification/` y archivos internos. `robots.txt` no
protege archivos privados. No hacen falta rewrites para las fichas. Configurar
el hosting para servir `404.html` con estado HTTP 404.

## Verificación

`npm test` valida rutas, referencias locales, IDs ocultos, dimensiones, ausencia
de filtros, metadatos vacíos, escapado y coherencia de catálogo/proyectos.
`scripts/browser-check.cjs` prueba todas las páginas en Edge a 320, 390, 768,
1024, 1440 y 1920 px, comprueba imágenes, teclado, enlaces, 404 y apertura local
sin JavaScript. Usa Playwright ya instalado; no descarga paquetes. En esta laptop:

```powershell
$env:PLAYWRIGHT_PATH='C:\Users\alexi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node scripts/browser-check.cjs
```

El servidor debe estar ejecutándose. La prueba bloquea solicitudes externas.

## Información pendiente

Títulos, años, técnicas, dimensiones, relaciones de serie/proyecto y selección
definitiva; fotografías originales de alta resolución; sedes, fechas exactas y
categorías de exposición; enlaces profesionales confirmados. Confirmar además la
asociación provisional de fotografías secundarias y el color con los originales.

## Contenido informativo de 2026

La fuente editorial principal es
`sources/Alexis_Estrada_Website_Source_Pack_for_Codex_v3.pdf`. El sitio sigue en
español. Los textos son una adaptación fiel en español, no citas literales del
original inglés. `data/site.json` centraliza biografía, práctica, evolución,
CV, contacto, proyectos y metadatos específicos. `sources/editorial.json` guarda
la fuente, criterios y TODOs internos y se excluye de Git y del artifact público.

En Sobre mí, la biografía informa identidad y trayectoria; «Un diario visual»
presenta la voz del artista traducida de la página 3; el proceso desarrolla
la página 6. La evolución se conserva como contexto interno en los datos y las
fuentes de referencia, pero no se presenta como cronología en la página pública.
Las páginas de MOUNTAINS y CERVEZAS tienen textos propios de las páginas 7–8,
sin repetir el statement ni atribuirles imágenes de A01–A15.

El CV publica años y denominaciones tal como los confirma el pack. No clasifica
los seis registros por exposición individual/colectiva ni asigna sedes: esas
relaciones no se explicitan en la fuente. La residencia y su presentación en
Open Space sí están respaldadas. Los títulos y datos de las tres obras de
CERVEZAS permanecen en la fuente hasta confirmar su relación con el catálogo.

No hay teléfono público, redes inferidas ni afirmaciones nuevas sobre premios,
representación o colecciones. No publicar la carpeta `sources`, que es material
de trabajo editorial. No se ha configurado un dominio ni publicado el sitio.
