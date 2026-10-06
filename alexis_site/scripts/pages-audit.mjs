import { readdir, readFile, lstat, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { root } from './build.mjs';

export async function inventory(dir, prefix = '') {
  const files = [];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const relative = prefix + entry.name;
    assert.ok(!entry.isSymbolicLink(),`Symlink forbidden: ${relative}`);
    if (entry.isDirectory()) files.push(...await inventory(path.join(dir,entry.name),relative+'/'));
    else { assert.ok(entry.isFile(),`Not a regular file: ${relative}`); files.push(relative); }
  }
  return files.sort();
}
export async function auditArtifact({ baseUrl = process.env.SITE_URL || 'https://preview.invalid/' } = {}) {
  const output = path.join(root,'_site');
  const base = new URL(baseUrl.replace(/\/$/,'')+'/');
  const files = await inventory(output);
  const valid = /^(?:index\.html|404\.html|(?:obra|proyectos|sobre-mi|cv|contacto|archivo)\/(?:[a-z0-9-]+\/)?index\.html|style\.css|app\.js|robots\.txt|\.nojekyll|assets\/favicon\.svg|assets\/web\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|avif))$/;
  for (const file of files) assert.match(file,valid,`Unexpected public artifact file: ${file}`);
  for (const required of ['index.html','404.html','style.css','app.js','robots.txt','.nojekyll']) assert.ok(files.includes(required),`Missing ${required}`);
  assert.match(await readFile(path.join(output,'robots.txt'),'utf8'),/User-agent: \*\s+Disallow: \/(?:\s|$)/);
  assert.ok(!files.includes('sitemap.xml'),'Preview must not submit sitemap for indexing');
  const usedAssets = new Set(['style.css','app.js','assets/favicon.svg']);
  for (const file of files.filter(f=>f.endsWith('.html'))) {
    const html = await readFile(path.join(output,file),'utf8');
    assert.match(html,/<meta name="robots" content="noindex, nofollow, noarchive">/,file);
    assert.doesNotMatch(html,/sources\/|assets\/raw|verification\/|Source_Pack|href="tel:|<!--[\s\S]*?-->/,file);
    const current = new URL(file,base);
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m=>m[1]);
    for (const [,srcset] of html.matchAll(/srcset="([^"]+)"/g)) references.push(...srcset.split(',').map(s=>s.trim().split(/\s+/)[0]));
    for (const ref of references) {
      if (ref.startsWith('mailto:')) continue;
      const url = new URL(ref.replaceAll('&amp;','&'),current);
      if (url.origin!==base.origin) continue;
      assert.ok(url.pathname.startsWith(base.pathname),`${file}: escaped base path: ${ref}`);
      const target = decodeURIComponent(url.pathname.slice(base.pathname.length)) || 'index.html';
      const normalized = target.endsWith('/') ? target+'index.html' : target;
      await access(path.join(output,normalized));
      if (url.hash) assert.ok((await readFile(path.join(output,normalized),'utf8')).includes(`id="${url.hash.slice(1)}"`),`${file}: missing fragment ${ref}`);
      if (/\.(css|js|jpg|jpeg|png|webp|avif|svg)$/.test(normalized)) usedAssets.add(normalized);
    }
  }
  for (const file of files.filter(f=>f.startsWith('assets/'))) assert.ok(usedAssets.has(file),`Unreferenced public asset: ${file}`);
  console.log(`Artifact audit PASS: ${files.filter(f=>f.endsWith('.html')).length} pages, ${files.length} public files. No private paths; noindex; base ${base.pathname}.`);
  return files;
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) await auditArtifact();
