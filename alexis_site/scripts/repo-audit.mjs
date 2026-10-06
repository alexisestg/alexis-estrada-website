import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root } from './build.mjs';
const repo = path.dirname(root);
const git = args=>execFileSync('git',args,{cwd:repo,encoding:'utf8'});
const candidates = [...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean))];
const blocked = /(?:^|\/)(?:sources|verification|raw|node_modules|_site|\.aws|\.codex|\.agents)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:pdf|docx?|xlsx?|pptx?|pem|key|p12|pfx|sqlite|db)$/i;
const secret = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16}|sk-[A-Za-z0-9_-]{24,})\b|(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][^"'\s]{8,}["']/i;
for (const file of candidates) {
  assert.ok(!blocked.test(file),`Private or generated file eligible for Git: ${file}`);
  if (/\.(?:jpg|png|webp|avif)$/i.test(file)) continue;
  const text = await readFile(path.join(repo,file),'utf8');
  assert.ok(!secret.test(text),`Possible credential in ${file}; review without exposing its value`);
  assert.ok(!/href=["']tel:\+?\d|(?:phone|telefono|teléfono)\s*["']?\s*[:=]\s*["']?\+?[\d][\d ()-]{8,}/i.test(text),`Public phone in ${file}`);
}
for (const file of ['sources/private.pdf','alexis_site/sources/private.json','alexis_site/verification/internal.txt','alexis_site/assets/raw/source.jpg','.env','alexis_site/_site/index.html']) {
  assert.ok(git(['check-ignore','--no-index',file]).trim(),`Not ignored: ${file}`);
}
console.log(`Repository audit PASS: ${candidates.length} candidate files. Private paths excluded; no detected credential or phone patterns. No push performed.`);
