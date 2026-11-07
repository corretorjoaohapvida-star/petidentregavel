const CACHE='identidade-pet-simples-v2';
const FILES=['./','./index.html','./app.css','./welcome.css','./welcome.js','./app.js','./documents.js','./install.js','./vendor/jspdf.umd.min.js','./vendor/qrcode.min.js','./perfil/','./perfil/profile.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','assets/heroBanner.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('identidade-pet-simples-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}
    return response;
  }).catch(async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    return new Response('Abra o aplicativo com conexão uma vez para usar esta página offline.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
  }));
});
