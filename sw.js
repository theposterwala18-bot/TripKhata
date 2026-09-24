const CACHE='tripkhata-v061';
const ASSETS=['./','./index.html','./manifest.webmanifest','./version.js','./member-v022.js','./settlement-v023.js','./ux-v024.js','./ledger-v026.js','./statement-v027.js','./finish-v030.js','./fund-v040.js','./khata-v050.js','./services-v051.js','./firebase-config.js','./cloud-v060.js','./sync-v060.js','./auth-v060.js','./final-ui-v061.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))));
