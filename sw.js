// Port to Port service worker: keeps the app and viewed chart tiles available offline.
const APP='p2p-app-v1',TILES='p2p-tiles-v1',MAX_TILES=6000;
const TILE_HOSTS=['tile.openstreetmap.org','tiles.openseamap.org','wms.gebco.net','gis.charttools.noaa.gov'];
const LIB_HOSTS=['cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(APP).then(c=>c.addAll(['./','./index.html']).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==APP&&k!==TILES).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
let puts=0;
async function trim(){const c=await caches.open(TILES),ks=await c.keys();if(ks.length>MAX_TILES)for(const k of ks.slice(0,ks.length-MAX_TILES))await c.delete(k)}
async function cacheFirst(req,name){const c=await caches.open(name),hit=await c.match(req);if(hit)return hit;
 try{const res=await fetch(req);if(res&&(res.ok||res.type==='opaque')){c.put(req,res.clone());if(name===TILES&&++puts%200===0)trim()}return res}catch(err){return hit||Response.error()}}
async function appShell(req){const c=await caches.open(APP);try{const res=await fetch(req);if(res.ok)c.put(req,res.clone());return res}catch(err){return (await c.match(req))||(await c.match('./index.html'))||Response.error()}}
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);
 if(TILE_HOSTS.some(h=>u.hostname.endsWith(h)))e.respondWith(cacheFirst(e.request,TILES));
 else if(LIB_HOSTS.some(h=>u.hostname.endsWith(h)))e.respondWith(cacheFirst(e.request,APP));
 else if(u.origin===location.origin)e.respondWith(appShell(e.request))});
self.addEventListener('message',e=>{if(e.data==='count')caches.open(TILES).then(c=>c.keys()).then(k=>e.source.postMessage({tiles:k.length}))});
