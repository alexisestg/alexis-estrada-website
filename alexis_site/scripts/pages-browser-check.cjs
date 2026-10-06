// Existing Playwright only: no installation, network resources or persistent server.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
let server, browser;
(async()=>{
  const output = path.join(root,'_site');
  const basePath = '/pages-preview-check/';
  server = http.createServer(async(req,res)=>{
    try {
      const url = new URL(req.url,'http://localhost');
      if (!url.pathname.startsWith(basePath)) throw Error('outside base');
      let file = path.resolve(output,decodeURIComponent(url.pathname.slice(basePath.length)) || 'index.html');
      if (!file.startsWith(output+path.sep)) throw Error('outside artifact');
      if ((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'text/plain'});res.end(await fs.readFile(file));
    }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await fs.readFile(path.join(output,'404.html')));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const baseUrl=`http://127.0.0.1:${server.address().port}${basePath}`;
  const { build } = await import(pathToFileURL(path.join(root,'scripts/build.mjs')).href);
  const { auditArtifact } = await import(pathToFileURL(path.join(root,'scripts/pages-audit.mjs')).href);
  const pages = await build({outputDir:output,siteUrl:baseUrl});
  await auditArtifact({baseUrl});
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});
  const context=await browser.newContext();
  const errors=[];
  await context.route('**/*',route=>route.request().url().startsWith(baseUrl) ? route.continue() : route.abort());
  const page=await context.newPage();
  page.on('pageerror',err=>errors.push(err.message));
  for(const width of [390,1440]) {
    await page.setViewportSize({width,height:900});
    for(const file of pages.keys()) {
      const response=await page.goto(baseUrl+file);
      assert.equal(response.status(),200,file);
      await page.locator('img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForFunction(()=>[...document.images].every(img=>img.complete));
      assert.ok(await page.locator('img').evaluateAll(imgs=>imgs.every(img=>img.naturalWidth>0)),file);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow, noarchive');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),file);
      assert.ok((await page.locator('link[rel="stylesheet"]').evaluate(link=>link.sheet!==null)),file);
      assert.ok(await page.evaluate(()=>performance.getEntriesByType('resource').some(entry=>entry.name.endsWith('/app.js'))),file);
    }
  }
  for(const privatePath of ['sources/Alexis_Estrada_Website_Source_Pack_for_Codex_v3.pdf','sources/editorial.json','data/site.json','scripts/build.mjs','verification/content-baseline.json','assets/raw/img-000.jpg','.env']) {
    assert.equal((await page.goto(baseUrl+privatePath)).status(),404,privatePath);
  }
  await page.getByRole('link',{name:'Volver a la colección'}).click();
  assert.equal(page.url(),baseUrl+'index.html');
  await page.locator('.work-link').first().click();
  assert.equal(await page.locator('.work-page').count(),1);
  await page.getByRole('link',{name:'Contacto',exact:true}).first().click();
  assert.equal(await page.locator('a[href="mailto:alexis062435@gmail.com"]').count(),1);
  assert.deepEqual(errors,[]);
  console.log('Chrome artifact PASS: 23 pages at mobile/desktop under /pages-preview-check/; CSS, JS, images, navigation, noindex; 7 private URLs return 404.');
})().catch(err=>{console.error(err);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
