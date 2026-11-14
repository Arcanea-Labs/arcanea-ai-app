import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const webRequire=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const out=new URL('../../docs/evidence/atlas-world/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const log=fs.openSync('/tmp/arcanea-atlas-browser-server.log','w');
const server=spawn(process.execPath,[webRequire.resolve('next/dist/bin/next'),'dev','-H','127.0.0.1','-p','3513'],{cwd:new URL('../../apps/web/',import.meta.url),env:{...process.env,NODE_OPTIONS:'--max-old-space-size=1024'},stdio:['ignore',log,log]});
server.on('exit',(code,signal)=>console.log('Atlas server exit',code,signal));
let browser;
try {
 let ready=false;
 for(let i=0;i<120;i++){try{const r=await fetch('http://127.0.0.1:3513/atlas/world',{signal:AbortSignal.timeout(15000)});if(r.ok){ready=true;break;}if(i%20===0)console.log('HTTP',r.status,(await r.text()).slice(0,200));}catch(e){if(i%20===0)console.log('Runtime error',e.message,e.cause?.code);}await new Promise(r=>setTimeout(r,1000));if(i%20===0)console.log('Waiting for Atlas runtime',i);}
 if(!ready)throw new Error('Atlas runtime did not start. See /tmp/arcanea-atlas-browser-server.log');
 browser=await chromium.launch({executablePath:'/home/agent/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell',headless:true,args:['--no-sandbox','--no-zygote','--single-process','--enable-unsafe-swiftshader']});
 const report={checks:[],consoleErrors:[],screenshots:[]};
 const check=(name,result)=>{report.checks.push({name,pass:!!result});if(!result)throw new Error(name);};
 const page=await browser.newPage({viewport:{width:1440,height:1050}});
 page.on('pageerror',e=>report.consoleErrors.push(e.message));
 for(const width of [375,768,1440]){
  await page.setViewportSize({width,height:1050});
  await page.goto('http://127.0.0.1:3513/atlas/world',{waitUntil:'networkidle',timeout:90000});
  await page.getByRole('heading',{name:'A journey through the unknown'}).waitFor();
  await page.screenshot({path:new URL(`after-${width}.png`,out).pathname,fullPage:true});
  check(`no horizontal overflow at ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  report.screenshots.push(`after-${width}.png`);console.log('Captured Atlas',width);
 }
 await page.setViewportSize({width:1440,height:1050});
 await page.getByRole('button',{name:/CHAPTER 1 Arrival/}).click();
 await page.waitForResponse(r=>r.url().includes('/api/atlas/snapshot')&&r.ok());
 check('chapter one conceals future place',!(await page.locator('.atlas-entity-list').innerText()).includes('Far station'));
 await page.getByRole('button',{name:/CHAPTER 3 Two accounts/}).click();
 await page.waitForResponse(r=>r.url().includes('/api/atlas/snapshot')&&r.ok());
 check('reader can inspect conflicting accounts',await page.getByText('Accounts diverge',{exact:true}).isVisible());
 await page.getByRole('combobox',{name:'Perspective',exact:true}).selectOption('character');
 await page.waitForResponse(r=>r.url().includes('/api/atlas/snapshot')&&r.ok());
 check('character has no knowledge of other report',await page.getByText('Accounts diverge',{exact:true}).count()===0);
 await page.getByRole('button',{name:'3D terrain',exact:true}).click();
 await page.waitForSelector('.atlas-scene canvas');
 await page.screenshot({path:new URL('three-dimensional.png',out).pathname});
 check('R3F scene has a canvas',await page.locator('.atlas-scene canvas').count()===1);
 await page.getByRole('button',{name:'Arcanea canon',exact:true}).click();
 await page.waitForResponse(r=>r.url().includes('/api/atlas/snapshot')&&r.ok());
 check('canon stays unplaced',await page.getByText('a coordinate.').isVisible());
 await page.getByRole('button',{name:'Starlight reality',exact:true}).click();
 await page.waitForResponse(r=>r.url().includes('/api/atlas/snapshot')&&r.ok());
 check('real basemap is gated',await page.getByRole('button',{name:'Load geographic basemap'}).isVisible());
 check('no personal position requested',await page.locator('.atlas-geographic').count()===0);
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:3513/atlas/world',{waitUntil:'networkidle'});
 await page.screenshot({path:new URL('reduced-motion.png',out).pathname});
 const r=await fetch('http://127.0.0.1:3513/api/atlas/snapshot?namespace=simulation&chapter=5&validAt=100');const data=await r.text();check('API removes secret canaries',!data.includes('CANARY')&&!data.includes('PRIVATE_AUTHOR_NOTE'));
 const invalid=await fetch('http://127.0.0.1:3513/api/atlas/snapshot?perspective=author');check('query cannot elevate to author',invalid.status===400);
 const denied=await fetch('http://127.0.0.1:3513/api/atlas/worlds/00000000-0000-0000-0000-000000000000');check('private world denies anonymous access',[401,403].includes(denied.status));
 fs.writeFileSync(new URL('browser-report.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} finally { if(browser)await browser.close();server.kill('SIGTERM');fs.closeSync(log);}
