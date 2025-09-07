// Basic SW for offline play
const CACHE_NAME="cmm-memory-cache-v2";
const CORE_ASSETS=[
  "/","/memory","/manifest.webmanifest",
  "/sounds/flip.wav","/sounds/match.wav","/sounds/win.wav","/sounds/timeup.wav","/sounds/tick.wav"
];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE_ASSETS)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null))));self.clients.claim();});
self.addEventListener("fetch",e=>{
  const req=e.request; const url=new URL(req.url);
  if(req.mode==="navigate"){
    e.respondWith(fetch(req).then(res=>{const cl=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,cl));return res;}).catch(()=>caches.match(req).then(r=>r||caches.match("/"))));
    return;
  }
  if(url.pathname.startsWith("/images/")||url.pathname.startsWith("/sounds/")){
    e.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{const cl=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(req,cl));return res;})));
    return;
  }
});