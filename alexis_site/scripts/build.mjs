import { readFile, writeFile, mkdir, access, unlink, rm, copyFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async file => JSON.parse(await readFile(path.join(root, 'data', file), 'utf8'));
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
const paragraphs = value => (Array.isArray(value) ? value : value ? [value] : []).map(text=>`<p>${e(text)}</p>`).join('');
const timeline = entries => `<dl class="cv-list">${entries.map(entry=>`<div><dt>${e(entry.year || entry.period || '')}</dt><dd>${e(entry.text)}</dd></div>`).join('')}</dl>`;
const safeURL = value => /^https?:\/\//.test(value ?? '') ? value : null;
const validSlug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
export function validate(works, site, images) {
  const ids = new Set(), slugs = new Set(), projects = new Set(), projectSlugs = new Set();
  for (const p of site.projects) {
    if (!p.id || !p.title || !validSlug(p.slug) || projects.has(p.id) || projectSlugs.has(p.slug)) throw new Error('Invalid project');
    projects.add(p.id); projectSlugs.add(p.slug);
  }
  for (const w of works) {
    if (!/^A\d{2}$/.test(w.id) || ids.has(w.id) || !validSlug(w.slug) || slugs.has(w.slug)) throw new Error(`Invalid/duplicate identity: ${w.id}`);
    ids.add(w.id); slugs.add(w.slug);
    if (typeof w.visible !== 'boolean' || !Number.isFinite(w.order) || !['main','project','archive'].includes(w.placement)) throw new Error(`Invalid display settings: ${w.id}`);
    if (w.projectIds.some(id => !projects.has(id))) throw new Error(`Unknown project: ${w.id}`);
    for (const img of [w.image, ...w.additionalImages].filter(Boolean)) if (!img.alt || !images[img.file]?.width || !images[img.file]?.height) throw new Error(`Invalid image: ${w.id}`);
  }
  if (site.siteUrl && !safeURL(site.siteUrl)) throw new Error('siteUrl must be an absolute http(s) URL');
}
export function renderImage(img, images, prefix, { eager = false, sizes = '100vw' } = {}) {
  if (!img) return '<div class="image-placeholder" role="img" aria-label="Fotografía pendiente"><span>Imagen pendiente</span></div>';
  const data = images[img.file];
  const sources = data.sources?.map(s => `${prefix}${s.src} ${s.width}w`).join(', ');
  return `<img src="${e(prefix + data.src)}" ${sources ? `srcset="${e(sources)}" sizes="${e(sizes)}"` : ''} width="${data.width}" height="${data.height}" alt="${e(img.alt)}" loading="${eager ? 'eager' : 'lazy'}" ${eager ? 'fetchpriority="high"' : ''} decoding="async">`;
}
export function workDetails(w, site, prefix) {
  const pairs = [['Año',w.year],['Técnica',w.technique],['Dimensiones',w.dimensions]].filter(([,v])=>v !== null && v !== undefined && v !== '');
  const projects = site.projects.filter(p => w.projectIds.includes(p.id));
  return `<div class="work-info"><p class="eyebrow">${e(site.name)}</p><h1${w.title ? '' : ' class="untitled"'}>${e(w.title || 'Obra')}</h1>${pairs.length ? `<dl>${pairs.map(([key,value])=>`<div><dt>${key}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>` : ''}${projects.length ? `<div class="work-projects"><span class="eyebrow">Proyectos</span>${projects.map(p=>`<a href="${prefix}proyectos/${e(p.slug)}/index.html">${e(p.title)}</a>`).join('')}</div>` : ''}${w.description ? `<p class="description">${e(w.description)}</p>` : ''}</div>`;
}
export async function build({ outputDir = root, siteUrl = process.env.SITE_URL, preview = true } = {}) {
  const [works, site, images] = await Promise.all([readJSON('works.json'), readJSON('site.json'), readJSON('images.json')]);
  if (siteUrl) site.siteUrl = siteUrl;
  const output = path.resolve(outputDir);
  if (![root,path.join(root,'_site')].includes(output)) throw new Error('Unsafe output directory');
  const artifact = output !== root;
  validate(works, site, images);
  for (const w of works.filter(w=>w.visible)) for (const img of [w.image,...w.additionalImages].filter(Boolean)) {
    const data = images[img.file];
    for (const source of [data,...data.sources ?? []]) await access(path.join(root, source.src));
  }
  const visible = works.filter(w=>w.visible).sort((a,b)=>a.order-b.order);
  const main = visible.filter(w=>w.placement === 'main');
  const archive = visible.filter(w=>w.placement === 'archive');
  const pages = new Map();
  const nav = [['Obra','index.html'],['Proyectos','proyectos/index.html'],['Sobre mí','sobre-mi/index.html'],['CV','cv/index.html'],['Contacto','contacto/index.html']];
  const canonical = file => site.siteUrl ? new URL(file.replace(/index\.html$/, ''), site.siteUrl.replace(/\/$/,'') + '/').href : null;
  function page(file, title, active, body, {description = `${title} de ${site.name}, artista visual.`, image = null, noindex = false} = {}) {
    const prefix = file === '404.html' && site.siteUrl ? new URL(site.siteUrl.replace(/\/$/,'')+'/').pathname : '../'.repeat(file.split('/').length-1), url = canonical(file), fullTitle = `${title} — ${site.name}`;
    pages.set(file, `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${e(fullTitle)}</title><meta name="description" content="${e(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="es_MX"><meta property="og:site_name" content="${e(site.name)}"><meta property="og:title" content="${e(fullTitle)}"><meta property="og:description" content="${e(description)}">${url ? `<link rel="canonical" href="${e(url)}"><meta property="og:url" content="${e(url)}">` : ''}${image && site.siteUrl ? `<meta property="og:image" content="${e(new URL(images[image.file].src,site.siteUrl.replace(/\/$/,'')+'/').href)}"><meta property="og:image:alt" content="${e(image.alt)}">` : ''}${noindex || preview ? '<meta name="robots" content="noindex, nofollow, noarchive">' : ''}<link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg"><link rel="stylesheet" href="${prefix}style.css"><script defer src="${prefix}app.js"></script></head>
<body><a class="skip-link" href="#main">Saltar al contenido</a><header class="site-header"><a class="brand" href="${prefix}index.html">${e(site.name)}<span>Artista visual</span></a><nav aria-label="Navegación principal">${nav.map(([label,target])=>`<a href="${prefix}${target}"${active===label ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></header>
<main id="main" tabindex="-1">${body(prefix)}</main><footer class="site-footer"><a href="${prefix}index.html">${e(site.name)}</a><span>${e(site.location || 'Artista visual')}</span>${site.email ? `<a class="footer-contact" href="${prefix}contacto/index.html">Contacto</a>` : ''}<a href="#main">Volver arriba <span aria-hidden="true">↑</span></a></footer></body></html>\n`);
  }
  const gallery = (items,prefix) => `<div class="collection-grid">${items.map((w,i)=>`<a class="work-link" href="${prefix}obra/${w.slug}/index.html" aria-label="${e(w.title ? `Ver ${w.title}` : `Ver obra: ${w.image?.alt || 'fotografía pendiente'}`)}"><figure>${renderImage(w.image,images,prefix,{eager:i<3,sizes:'(max-width: 599px) calc(100vw - 40px), (max-width: 999px) calc((100vw - 88px) / 2), (min-width: 1600px) calc((100vw - 216px) / 4), calc((100vw - 160px) / 3)'})}${w.title ? `<figcaption>${e(w.title)}${w.year ? `<span>${e(w.year)}</span>` : ''}</figcaption>` : ''}</figure></a>`).join('')}</div>`;
  page('index.html','Obra','Obra',prefix=>`<section class="collection"><div class="collection-heading"><h1>Obra</h1><p>${main.length} obras<span aria-hidden="true"> / </span>Colección${archive.length ? ` · <a href="archivo/index.html">Archivo</a>` : ''}</p></div>${gallery(main,prefix)}</section>`,{description:site.seo?.home || `Colección de obra de ${site.name}, artista visual.`});
  if (archive.length) page('archivo/index.html','Archivo','Obra',prefix=>`<section class="collection"><div class="collection-heading"><h1>Archivo</h1><a href="${prefix}index.html">Volver a la colección</a></div>${gallery(archive,prefix)}</section>`);
  for (const w of visible) {
    const siblings = visible.filter(item=>item.placement===w.placement), index = siblings.indexOf(w), previous = siblings[index-1], next = siblings[index+1];
    const returnPath = w.placement==='archive' ? 'archivo/index.html' : w.placement==='project' ? 'proyectos/index.html' : 'index.html';
    const returnLabel = w.placement==='archive' ? 'Archivo' : w.placement==='project' ? 'Proyectos' : 'Colección';
    page(`obra/${w.slug}/index.html`,w.title || 'Obra','Obra',prefix=>`<article class="work-page"><div class="work-toolbar"><a href="${prefix}${returnPath}"><span aria-hidden="true">←</span> ${returnLabel}</a><span>${String(index+1).padStart(2,'0')} / ${String(siblings.length).padStart(2,'0')}</span></div><div class="work-layout"><figure class="main-image">${renderImage(w.image,images,prefix,{eager:true,sizes:'(max-width: 799px) calc(100vw - 40px), 70vw'})}</figure>${workDetails(w,site,prefix)}</div>${w.additionalImages.length ? `<section class="additional-images" aria-labelledby="details-heading"><h2 id="details-heading">Otras vistas y detalles</h2>${w.additionalImages.map(img=>`<figure>${renderImage(img,images,prefix,{sizes:'(max-width: 799px) calc(100vw - 40px), 70vw'})}</figure>`).join('')}</section>` : ''}<nav class="work-pagination" aria-label="Navegación entre obras">${previous ? `<a rel="prev" href="../${previous.slug}/index.html"><span aria-hidden="true">←</span> Obra anterior</a>` : '<span></span>'}<a href="${prefix}${returnPath}">Ver ${returnLabel.toLowerCase()}</a>${next ? `<a rel="next" href="../${next.slug}/index.html">Obra siguiente <span aria-hidden="true">→</span></a>` : '<span></span>'}</nav></article>`,{image:w.image,description:w.title ? `${w.title}${w.year ? `, ${w.year}` : ''}. Obra de ${site.name}.` : `Obra de ${site.name}. ${w.image?.alt || ''}`});
  }
  const section = (title, content) => `<section class="text-page"><p class="eyebrow">${e(site.name)}</p><h1>${title}</h1><div class="text-content">${content}</div></section>`;
  page('proyectos/index.html','Proyectos','Proyectos',prefix=>section('Proyectos',site.projects.length ? `<ul class="project-list">${site.projects.map(p=>`<li><a href="${p.slug}/index.html"><span>${e(p.title)}${p.year ? `<small>${e(p.year)}</small>` : ''}</span><span aria-hidden="true">↗</span></a>${p.summary ? `<p>${e(p.summary)}</p>` : ''}</li>`).join('')}</ul>` : `<p>Este espacio reunirá series y proyectos.</p><a class="text-link" href="${prefix}index.html">Explorar la obra <span aria-hidden="true">↗</span></a>`),{description:site.seo?.projects});
  for (const p of site.projects) {
    const items = visible.filter(w=>w.projectIds.includes(p.id));
    page(`proyectos/${p.slug}/index.html`,`${p.title}${p.year ? ` · ${p.year}` : ''}`,'Proyectos',prefix=>section(e(p.title),`${p.year ? `<p class="eyebrow">Serie · ${e(p.year)}</p>` : ''}${paragraphs(p.description)}<a class="text-link" href="../index.html">Todos los proyectos <span aria-hidden="true">↗</span></a>${items.length ? `<div class="series-works">${gallery(items,prefix)}</div>` : '<!-- TODO editorial: incorporar imágenes solo tras confirmar su relación con el catálogo. -->'}`),{description:p.metaDescription});
  }
  page('sobre-mi/index.html','Sobre mí · Biografía y práctica','Sobre mí',prefix=>section('Sobre mí',`<nav class="section-index" aria-label="Contenido de Sobre mí"><a href="#biografia">Biografía</a><a href="#practica">Práctica</a></nav><section class="editorial-section" id="biografia" aria-labelledby="bio-heading"><h2 id="bio-heading">Biografía</h2>${paragraphs(site.biography)}<a class="text-link" href="${prefix}cv/index.html">Formación y exposiciones <span aria-hidden="true">↗</span></a></section><section class="editorial-section" id="practica" aria-labelledby="practice-heading"><p class="eyebrow">Práctica actual · 2026</p><h2 id="practice-heading">${e(site.practice.title)}</h2>${paragraphs(site.practice.paragraphs)}<h3>De la fotografía a la pintura</h3>${paragraphs(site.practice.process)}<a class="text-link" href="${prefix}proyectos/index.html">Series actuales <span aria-hidden="true">↗</span></a></section><a class="text-link" href="${prefix}index.html">Explorar la obra <span aria-hidden="true">↗</span></a>`),{description:site.seo?.about});
  page('cv/index.html','CV · Formación y exposiciones','CV',()=>section('CV',`<section class="editorial-section" aria-labelledby="education-heading"><h2 id="education-heading">Educación</h2>${timeline(site.cv.education)}</section><section class="editorial-section" aria-labelledby="residency-heading"><h2 id="residency-heading">Residencia</h2>${timeline(site.cv.residencies)}</section><section class="editorial-section" aria-labelledby="exhibitions-heading"><h2 id="exhibitions-heading">Exposiciones</h2>${paragraphs(site.cv.exhibitionSummary)}<h3>Registros documentados</h3>${timeline(site.cv.exhibitions)}<!-- TODO: confirmar sedes, fechas precisas y categoría de cada exposición. --></section>`),{description:site.seo?.cv});
  page('contacto/index.html','Contacto','Contacto',()=>section('Contacto',`<address class="contact-details">${site.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.email) ? `<p class="eyebrow">Correo</p><a class="contact-email" href="mailto:${e(site.email)}">${e(site.email)}</a>` : '<!-- TODO: confirmar correo de contacto. -->'}${site.location ? `<p class="contact-location">${e(site.location)}</p>` : ''}</address>${site.links.filter(link=>safeURL(link.url)).map(link=>`<p><a class="text-link" href="${e(link.url)}">${e(link.label)} <span aria-hidden="true">↗</span></a></p>`).join('')}`),{description:site.seo?.contact});
  page('404.html','Página no encontrada',null,prefix=>section('Página no encontrada',`<p>Esta dirección no está disponible.</p><a class="text-link" href="${prefix}index.html">Volver a la colección <span aria-hidden="true">↗</span></a>`),{noindex:true,description:'Página no encontrada.'});
  let previousPages = [];
  if (artifact) await rm(output,{recursive:true,force:true});
  else try { previousPages = JSON.parse(await readFile(path.join(root,'.generated-pages.json'),'utf8')); } catch {}
  // Delete only old generated pages when visibility or routes change.
  for (const file of previousPages) if (!pages.has(file) && /^(obra|proyectos|archivo)\/[a-z0-9/-]+\.html$/.test(file) && !file.includes('..')) await unlink(path.join(root,file)).catch(()=>{});
  for (const [file,html] of pages) { await mkdir(path.dirname(path.join(output,file)),{recursive:true}); await writeFile(path.join(output,file),artifact ? html.replace(/<!--[\s\S]*?-->/g,'') : html); }
  if (!artifact) await writeFile(path.join(root,'.generated-pages.json'),JSON.stringify([...pages.keys()],null,2)+'\n');
  if (site.siteUrl && !preview) {
    await writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...pages.keys()].filter(f=>f!=='404.html').map(f=>`<url><loc>${e(canonical(f))}</loc></url>`).join('')}</urlset>`);
    await writeFile(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /data/\nDisallow: /scripts/\nDisallow: /sources/\nDisallow: /verification/\nDisallow: /assets/raw/\nSitemap: ${new URL('sitemap.xml',site.siteUrl.replace(/\/$/,'')+'/').href}\n`);
  } else {
    await unlink(path.join(output,'sitemap.xml')).catch(()=>{});
    await writeFile(path.join(output,'robots.txt'),'# Development preview. Not an access-control mechanism.\nUser-agent: *\nDisallow: /\n');
  }
  if (artifact) {
    // Positive allowlist: never copy the project tree, data, raw files or sources.
    const assets = new Set(['style.css','app.js','assets/favicon.svg']);
    for (const w of visible) for (const img of [w.image,...w.additionalImages].filter(Boolean)) {
      const image = images[img.file];
      for (const source of [image,...image.sources ?? []]) {
        if (!/^assets\/web\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|avif)$/.test(source.src)) throw new Error(`Asset outside public allowlist: ${source.src}`);
        assets.add(source.src);
      }
    }
    for (const asset of assets) {
      const source = path.join(root,asset);
      if (!(await lstat(source)).isFile()) throw new Error(`Not a regular asset: ${asset}`);
      await mkdir(path.dirname(path.join(output,asset)),{recursive:true});
      await copyFile(source,path.join(output,asset));
    }
    await writeFile(path.join(output,'.nojekyll'),'');
  }
  console.log(`Built ${pages.size} pages, ${visible.length} visible works. No runtime dependencies.`);
  return pages;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await build(process.argv.includes('--pages') ? {outputDir:path.join(root,'_site')} : {});
