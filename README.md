# Alexis Estrada — preview en desarrollo

El sitio vive en `alexis_site/`. La arquitectura, catálogo e imágenes se mantienen.
No se ha publicado ni conectado un remoto. Git se inicializó localmente en `main`.

## Uso local

```powershell
cd alexis_site
npm run build
npm start
```

Abrir http://127.0.0.1:4173. El HTML también funciona como archivo local. No hay
dependencias npm que instalar. Node 20+; Actions usa Node 24.

## Build de Pages

```powershell
npm test
npm run audit:repo
npm run build:pages
npm run audit:pages
```

`build:pages` genera únicamente `alexis_site/_site/`. Es una lista positiva:
23 páginas HTML actuales, CSS, JavaScript, favicon, variantes de las imágenes
referenciadas por obras visibles, `robots.txt` y `.nojekyll`. Son 74 archivos
en esta versión. No se copia el árbol del proyecto. El build limpia únicamente
su propia carpeta `_site` antes de regenerarla, evitando documentos residuales.

Los enlaces son relativos al documento y funcionan en una raíz o subdirectorio.
La URL de despliegue se obtiene de `actions/configure-pages` y se pasa como
`SITE_URL`, sin inventar usuario o repositorio. El 404 usa el base path configurado
para recuperar enlaces y assets incluso desde una ruta inexistente anidada.
El dominio propio podrá configurarse en Pages; el siguiente build recogerá
automáticamente la URL. No se agrega `CNAME` ni se cambia DNS en esta preparación.

## Preview y privacidad

Todas las páginas locales y de Pages llevan `noindex, nofollow, noarchive`.
`robots.txt` contiene `Disallow: /`; no hay sitemap en la preview. Poner un dominio
en `siteUrl` o `SITE_URL` NO activa indexación. La salida sigue siendo preview
por defecto. El lanzamiento e indexación requieren una decisión explícita posterior.
Estas directivas son solicitudes a buscadores y no son control de acceso.
La preview es pública para cualquiera que tenga su URL.

`sources/` y `verification/`, los originales `assets/raw/`, documentos PDF/Office,
variables `.env`, claves, credenciales habituales, cachés y salidas generadas
quedan excluidos de Git por `.gitignore`. Las notas editoriales se trasladaron
de `data/site.json` a `sources/editorial.json`, que también queda excluido.
No usar `git add -f` ni subir carpetas arrastrándolas en GitHub: eso puede evitar
las reglas de exclusión. `audit:repo` revisa también archivos ya rastreados.

El repositorio público sí incluirá código, datos de catálogo (con IDs internos),
contenido público aprobado y las copias web de imágenes. El artifact de Pages
NO incluye JSON, fuentes de build, README, fuentes editoriales ni capturas.
Los IDs internos no aparecen en la interfaz. Los archivos locales excluidos
siguen en la laptop; copiarlos aparte al trasladar el proyecto a otra computadora.

## Actions

El workflow `.github/workflows/pages.yml` se ejecuta con cada push a `main` o
manualmente. Audita Git, ejecuta pruebas, obtiene la URL, construye `_site`, valida
el artifact y despliega únicamente esa carpeta. Los jobs usan permisos mínimos
para leer código y Pages, y para desplegar con el token automático de GitHub.
No se requieren tokens personales almacenados en el proyecto.

Está limitado a repositorios públicos y runners estándar Ubuntu para respetar
cero gasto adicional. No se habilitan ejecuciones de repositorio privado,
runners de pago, paquetes de pago ni servicios externos. Retención del artifact:
un día. Si eliges repositorio privado, se debe revisar su elegibilidad y costos
antes de modificar esta restricción.

## Tu próximo paso — sin subir todavía

1. Inicia sesión en GitHub con tu cuenta.
2. Crea un repositorio **público vacío**, con el nombre que tú elijas. No añadas
   README, licencia ni `.gitignore` en el formulario, para evitar un historial
   remoto inicial que haya que conciliar.
3. Comparte la URL del repositorio en este chat. No compartas contraseñas ni tokens.
4. Cuando autorices la primera subida, se comprobará el remoto y se realizará
   mediante autenticación oficial, sin inventar identidad Git.
5. Tras subir el código, abre **Settings → Pages → Build and deployment → Source**
   y selecciona **GitHub Actions**. Si el primer workflow falló porque Pages aún
   no estaba habilitado, ve a **Actions → GitHub Pages development preview → Run
   workflow** y selecciona `main`.
6. La ejecución de Pages mostrará la URL pública real. Los pushes posteriores
   a `main` actualizarán esa misma preview.

No hay commit ni remoto configurado, no se han usado credenciales y no se ha
subido contenido. La raíz que debe abrirse en un cliente Git es la carpeta
exterior `alexis-estrada-web-prototype`, donde están `.git` y `.github`.

## Comprobaciones adicionales

Las pruebas del proyecto verifican enlaces, metadatos y preservación de archivos
de obra cuando existe la referencia histórica local. En GitHub esa referencia
privada se omite explícitamente, sin hacer fallar la compilación.

`pages.test.mjs` verifica la raíz y un base path de prueba; incluye un archivo
privado residual de prueba para comprobar que no sobrevive al rebuild.
`pages-audit.mjs` revisa todos los archivos publicados, enlaces, `srcset`, fragmentos,
noindex y robots. `repo-audit.mjs` comprueba exclusiones y patrones de secretos
sin imprimir posibles valores sensibles. Es una comprobación automática razonable,
no una garantía frente a cualquier secreto futuro: revisar los cambios antes de push.

`pages-browser-check.cjs` comprueba la salida en Chrome bajo un subdirectorio,
sin peticiones externas; abre y cierra su servidor temporal automáticamente.
Requiere Playwright ya disponible, no lo instala. `browser-check.cjs` conserva
las pruebas de la web local. Las pruebas de navegador se ejecutaron localmente;
el workflow no descarga navegadores.

Documentación oficial:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
