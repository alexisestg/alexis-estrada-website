import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, build, validate, workDetails, renderImage } from './build.mjs';
const read = async name => JSON.parse(await readFile(path.join(root,'data',name),'utf8'));
const works = await read('works.json'), site = await read('site.json'), images = await read('images.json');
const pages = await build();
test('Every visible work has a static route; hidden works have no output', () => {
  assert.equal(works.length,15);
  for (const work of works) assert.equal(pages.has(`obra/${work.slug}/index.html`),work.visible);
});
test('All local page links and assets exist, including fragment targets', async () => {
  for (const [file,html] of pages) {
    for (const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(url)) continue;
      if (url.startsWith('#')) { assert.ok(html.includes(`id="${url.slice(1)}"`),`${file}: ${url}`); continue; }
      await access(path.resolve(root,path.dirname(file),url));
    }
  }
});
test('Public HTML has no internal IDs, placeholder metadata or raw images', () => {
  for (const [file,html] of pages) {
    assert.doesNotMatch(html,/\bA(?:0[1-9]|1[0-5])\b|assets\/raw|\[(Año|Título|Técnica|Dimensiones)/,file);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file);
    assert.match(html,/<html lang="es">/);
  }
});
test('Artwork has intrinsic dimensions, alternative text, and no color effects', async () => {
  for (const html of pages.values()) for (const [tag] of html.matchAll(/<img[^>]+>/g)) {
    assert.match(tag,/width="\d+"/); assert.match(tag,/height="\d+"/); assert.match(tag,/alt="[^"]+"/);
  }
  const css = await readFile(path.join(root,'style.css'),'utf8');
  assert.doesNotMatch(css,/(?:filter|mix-blend-mode|opacity)\s*:|object-fit\s*:\s*cover/);
});
test('Unknown metadata stays absent; supplied values render safely from one source', () => {
  assert.doesNotMatch(workDetails(works[0],site,'../../'),/<dl>/);
  const sample = {...works[0],title:'Prueba <script>',year:2024,technique:'Tinta & papel',dimensions:'70 × 50 cm'};
  const output = workDetails(sample,site,'../../');
  assert.match(output,/Prueba &lt;script&gt;/); assert.match(output,/2024/); assert.match(output,/Tinta &amp; papel/);
  assert.match(output,/70 × 50 cm/);
  assert.match(renderImage(null,images,''),/Imagen pendiente/);
});
test('Catalog rejects conflicting URLs and unknown project references', () => {
  assert.throws(()=>validate([...works,works[0]],site,images));
  assert.throws(()=>validate([{...works[0],projectIds:['missing']}],site,images));
});
test('Informational update preserves catalog, image manifest and all artwork files', async context => {
  try { await access(path.join(root,'verification/content-baseline.json')); }
  catch { context.skip('Local historical baseline is private and excluded from Git'); return; }
  const baseline = JSON.parse(await readFile(path.join(root,'verification/content-baseline.json'),'utf8'));
  for (const [file,hash] of Object.entries(baseline)) {
    const relative = file.replace(/^alexis_site[\\/]/,'');
    assert.equal(createHash('sha256').update(await readFile(path.join(root,relative))).digest('hex'),hash,relative);
  }
});
test('Confirmed contact and education render, with no telephone or social invention', () => {
  assert.match(pages.get('contacto/index.html'),/mailto:alexis062435@gmail.com/);
  assert.match(pages.get('cv/index.html'),/2020–2025/);
  assert.match(pages.get('cv/index.html'),/Universidad Autónoma del Estado de Morelos/);
  for (const html of pages.values()) assert.doesNotMatch(html,/href="tel:|instagram\.com|facebook\.com/);
});
test('About focuses on current practice; chronology remains internal', () => {
  const about = pages.get('sobre-mi/index.html');
  assert.match(about,/Práctica actual · 2026/);
  assert.doesNotMatch(about,/Evolución de la práctica|#evolucion|2021–2022|2023–2024|Hacia 2026/);
  assert.deepEqual(site.evolution.map(entry=>entry.period),['2021–2022','2023–2024','Hacia 2026']);
  assert.match(about,/quiero apreciarlos porque sucedieron/);
  assert.doesNotMatch(site.biography.join(' '),/diario visual|nostalgia/);
  for (const p of site.projects) {
    const html = pages.get(`proyectos/${p.slug}/index.html`);
    assert.match(html,/Serie · 2026/);
    assert.doesNotMatch(html,/<img|class="work-link"/);
    for (const paragraph of site.practice.paragraphs) assert.ok(!p.description.includes(paragraph));
  }
  assert.ok(works.every(w=>w.projectIds.length===0));
});
test('Source pack and editorial TODOs stay outside public pages; SEO is page-specific', () => {
  for (const html of pages.values()) assert.doesNotMatch(html,/href="[^\"]*sources\/|Source_Pack|new A-numbers/);
  const descriptions = ['index.html','sobre-mi/index.html','cv/index.html','contacto/index.html','proyectos/index.html'].map(file=>pages.get(file).match(/<meta name="description" content="([^"]+)"/)[1]);
  assert.equal(new Set(descriptions).size,descriptions.length);
  assert.equal(site.editorial,undefined,'Editorial working notes must stay outside the public repository');
});
