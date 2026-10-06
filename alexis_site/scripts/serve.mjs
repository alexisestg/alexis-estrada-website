import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { root } from './build.mjs';
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain; charset=utf-8'};
const port = Number(process.env.PORT || 4173);
const server = http.createServer(async (request,response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    let file = path.resolve(root,'.'+pathname);
    if (!file.startsWith(root+path.sep) && file!==root) throw new Error('outside root');
    if ((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const content=await readFile(file);
    response.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    response.end(content);
  } catch {
    response.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    response.end((await readFile(path.join(root,'404.html'),'utf8')).replaceAll('href="','href="/').replaceAll('src="','src="/'));
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}`));
