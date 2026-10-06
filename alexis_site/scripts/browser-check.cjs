// Uses an existing Playwright installation, never downloads a browser or package.
// PLAYWRIGHT_PATH may point to the bundled dependency on this computer.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname,'..');
const pages = JSON.parse(fs.readFileSync(path.join(root,'.generated-pages.json'),'utf8'));
(async()=>{
  const browser = await chromium.launch({channel:'msedge',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});
  const errors = [], remote = [];
  const context = await browser.newContext();
  await context.route('**/*',route=> {
    const url = route.request().url();
    if (!url.startsWith('http://127.0.0.1:4173/') && !url.startsWith('file:')) {remote.push(url); return route.abort();}
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  fs.mkdirSync(path.join(root,'verification'),{recursive:true});
  for (const width of [320,390,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:900});
    for (const file of pages) {
      const response = await page.goto(`http://127.0.0.1:4173/${file}`);
      assert.equal(response.status(),200);
      // Load lazy images to inspect the entire page, including secondary views.
      await page.locator('img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForFunction(()=>[...document.images].every(img=>img.complete));
      await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
      const audit = await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth,
        ids:/\bA(?:0[1-9]|1[0-5])\b/.test(document.body.innerText),
        images:[...document.images].map(img=>{
          const style=getComputedStyle(img),rect=img.getBoundingClientRect();
          return {loaded:img.naturalWidth>0,filter:style.filter,blend:style.mixBlendMode,opacity:style.opacity,ratio:rect.width/rect.height,naturalRatio:img.naturalWidth/img.naturalHeight,fit:style.objectFit};
        })
      }));
      assert.equal(audit.overflow,false,`${width} ${file}: overflow`);
      assert.equal(audit.ids,false,`${file}: IDs`);
      for (const img of audit.images) {
        assert.ok(img.loaded,`${file}: missing image`);
        assert.equal(img.filter,'none'); assert.equal(img.blend,'normal'); assert.equal(img.opacity,'1');
        assert.ok(Math.abs(img.ratio-img.naturalRatio)<0.02 || img.fit==='contain',`${width} ${file}: stretched image`);
      }
      if ([390,1440].includes(width) && ['index.html','obra/esqueletos-abrazados/index.html'].includes(file)) await page.screenshot({path:path.join(root,'verification',`${width}-${file==='index.html'?'collection':'detail'}.png`),fullPage:true});
      if ([390,1440].includes(width) && ['sobre-mi/index.html','cv/index.html','contacto/index.html','proyectos/mountains/index.html','proyectos/cervezas/index.html'].includes(file)) await page.screenshot({path:path.join(root,'verification',`${width}-${file.split('/').slice(0,-1).join('-')}.png`),fullPage:true});
    }
  }
  await page.goto('http://127.0.0.1:4173/');
  const links=await page.locator('.work-link').evaluateAll(items=>items.map(a=>a.href));
  assert.equal(links.length,15);
  for (const url of links) {await page.goto(url); assert.equal(await page.locator('.work-page').count(),1);}
  await page.goto('http://127.0.0.1:4173/');
  await page.keyboard.press('Tab'); assert.equal(await page.locator(':focus').innerText(),'Saltar al contenido');
  await page.keyboard.press('Enter'); assert.equal(await page.locator(':focus').getAttribute('id'),'main');
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const offline=await nojs.newPage();
  await offline.goto('file:///'+path.join(root,'index.html').replaceAll('\\','/'));
  await offline.locator('.work-link').first().click();
  assert.equal(await offline.locator('.main-image img').count(),1);
  const notFound=await page.goto('http://127.0.0.1:4173/not/a/route');
  assert.equal(notFound.status(),404);
  await page.getByRole('link',{name:'Volver a la colección'}).click();
  assert.equal(await page.locator('.work-link').count(),15);
  assert.deepEqual(errors,[]); assert.deepEqual(remote,[]);
  await browser.close();
  console.log(`PASS: ${pages.length} pages × 6 viewport sizes; 15 work routes; keyboard; file:// without JavaScript; 404; no remote requests.`);
})().catch(error=>{console.error(error);process.exit(1)});
