import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, build } from './build.mjs';
import { auditArtifact } from './pages-audit.mjs';
test('Pages rebuild removes stale private files and preserves local output, including base-path 404', async () => {
  const local = path.join(root,'style.css');
  const before = createHash('sha256').update(await readFile(local)).digest('hex');
  const stale = path.join(root,'_site/sources');
  await mkdir(stale,{recursive:true});
  await writeFile(path.join(stale,'private.pdf'),'PRIVATE TEST SENTINEL');
  for (const baseUrl of ['https://preview.invalid/repository-preview/','https://preview.invalid/']) {
    const pages = await build({outputDir:path.join(root,'_site'),siteUrl:baseUrl});
    const files = await auditArtifact({baseUrl});
    assert.equal(pages.size,23); assert.ok(!files.some(file=>file.includes('sources')));
    assert.equal(createHash('sha256').update(await readFile(local)).digest('hex'),before);
  }
});
