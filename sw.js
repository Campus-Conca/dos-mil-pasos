/* Sendero Narrado v2 — service worker con precacheo de audios e imágenes */
const CACHE = "sendero-v26";
const BASE = [
  "./", "./index.html", "./recorrido.json", "./manifest.webmanifest",
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Instrument+Sans:wght@400;500;600&display=swap"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(()=> self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(()=> self.clients.claim()));
});
self.addEventListener("message", e => {
  if(e.data && e.data.accion === "precache"){
    const todo = BASE.concat(e.data.extras || []);
    const avisar = (msg) => { try{ if(e.source) e.source.postMessage(msg); }catch(err){} };
    e.waitUntil((async () => {
      const c = await caches.open(CACHE);
      let hecho = 0, fallos = 0;
      /* De uno en uno (iPhone se atraganta con 50 descargas en paralelo) y con avance. */
      for(const u of todo){
        try{ if(!(await c.match(u))) await c.add(u); }catch(err){ fallos++; }
        hecho++; avisar({accion:"progreso", hecho, total: todo.length});
      }
      avisar({accion:"listo", fallos});
    })());
  }
});
self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request).then(r => {
      const copia = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(()=>{});
      return r;
    }).catch(()=> caches.match("./index.html")))
  );
});
