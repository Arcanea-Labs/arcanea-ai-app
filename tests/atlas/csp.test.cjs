const test=require('node:test');const assert=require('node:assert/strict');
test('MapLibre tile and worker capabilities are scoped to the consent-gated Atlas page',async()=>{
 const config=require('../../apps/web/next.config.js');const headers=await config.headers();
 const policy=rule=>rule.headers.find(h=>h.key==='Content-Security-Policy').value;
 const global=policy(headers.find(h=>h.source==='/(.*)'));
 const atlas=policy(headers.find(h=>h.source==='/atlas/world'));
 assert.ok(!global.includes('tile.openstreetmap.org'));assert.ok(!global.includes("worker-src 'self' blob:"));
 assert.ok(atlas.includes("connect-src 'self' https://tile.openstreetmap.org"));assert.ok(atlas.includes("img-src 'self' https://tile.openstreetmap.org"));assert.ok(atlas.includes("worker-src 'self' blob:"));
 assert.ok(atlas.includes("frame-ancestors 'none'"));assert.ok(atlas.includes("form-action 'self'"));
});

// A route-specific response policy requires an actual document navigation in both directions.
test('Atlas policy boundary uses document links',()=>{
 const fs=require('node:fs');
 for(const file of ['apps/web/app/atlas/page.tsx','apps/web/app/atlas/world/review/page.tsx','apps/web/app/atlas/world/chapters/[chapter]/page.tsx','apps/web/components/atlas/atlas-review.tsx','apps/web/components/atlas/atlas-experience.tsx']){
  const source=fs.readFileSync(file,'utf8');
  assert.ok(!/<Link[^>]*href=.*atlas\/world/.test(source),file);
  assert.ok(source.includes('<a '),file);
 }
});
