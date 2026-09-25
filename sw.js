const CACHE='tripkhata-v091';
const ASSETS=[
  './','./index.html','./manifest.webmanifest',
  './version.js?v=091','./member-v022.js','./settlement-v023.js','./ux-v024.js',
  './ledger-v026.js','./statement-v027.js','./finish-v030.js','./fund-v040.js',
  './khata-v050.js?v=076','./supplier-v070.js?v=082','./services-v051.js',
  './firebase-config.js','./owner-config.js?v=081','./cloud-v060.js','./sync-v060.js','./auth-v060.js?v=080',
  './final-ui-v061.js?v=080','./customer-report-v071.js?v=077','./backup-v074.js?v=080',
  './support-owner-v080.js?v=080','./nav-persist-v080.js?v=080','./shared-trip-v090.js?v=091','./connected-khata-v082.js?v=082','./privacy.html','./delete-account.html'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const c=await caches.open(CACHE);
    await c.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req,{cache:'no-store'});
      if(fresh&&fresh.ok){
        const c=await caches.open(CACHE);
        c.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch(e){
      const exact=await caches.match(req);
      if(exact)return exact;
      if(req.mode==='navigate')return (await caches.match('./index.html'))||(await caches.match('./'));
      return Response.error();
    }
  })());
});
