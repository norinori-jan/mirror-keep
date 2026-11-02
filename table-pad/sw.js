const CACHE = 'tp-cache-v24';
const INJECT = `
<script src="./hub-activity.js"></script>
<script src="./hub-handoff.js"></script>
<script src="./hub-ui.js"></script>
<script src="./transport-adapter.js"></script>
<script src="./geo-observation.js"></script>
<script src="./real-world-entry.js"></script>
<script src="./train-record-store.js"></script>
<script src="./train-entry.js"></script>
<script src="./official-sources.js"></script>
<script src="./official-info.js"></script>
<script src="./official-data-store.js"></script>
<script src="./official-data-adapter.js"></script>
<script src="./official-data-status.js"></script>
<script src="./gsi-official-adapter.js"></script>
<script src="./gsi-observation-ui.js"></script>
<script src="./jma-official-adapter.js"></script>
<script src="./jma-observation-ui.js"></script>
<script src="./estat-official-adapter.js"></script>
<script src="./estat-observation-ui.js"></script>
<script src="./boj-official-adapter.js"></script>
<script src="./boj-observation-ui.js"></script>
<script src="./mof-official-adapter.js"></script>
<script src="./mof-observation-ui.js"></script>
<script src="./fsa-official-adapter.js"></script>
<script src="./fsa-observation-ui.js"></script>
`;
const PRECACHE = [
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './news-lite.js',
  './input-guide.js',
  './transport-adapter.js',
  './geo-observation.js',
  './real-world-entry.js',
  './train-record-store.js',
  './train-entry.js',
  './official-sources.js',
  './official-info.js',
  './official-data-store.js',
  './official-data-adapter.js',
  './official-data-status.js',
  './gsi-official-adapter.js',
  './gsi-observation-ui.js',
  './jma-official-adapter.js',
  './jma-observation-ui.js',
  './estat-official-adapter.js',
  './estat-observation-ui.js',
  './boj-official-adapter.js',
  './boj-observation-ui.js',
  './mof-official-adapter.js',
  './mof-observation-ui.js',
  './fsa-official-adapter.js',
  './fsa-observation-ui.js',
  './hub-activity.js',
  './hub-handoff.js',
  './hub-ui.js'
];

async function instrument(response) {
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(
    html.replace(/<\/body>/i, INJECT + '\n</body>'),
    { status: response.status, statusText: response.statusText, headers }
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('tp-cache-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // External APIs/data sources remain network-only. Do not cache stale live data.
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) {
        const isDocument = request.mode === 'navigate' ||
          url.pathname.endsWith('/index.html') || url.pathname.endsWith('/');
        const stored = isDocument
          ? await instrument(response.clone())
          : response.clone();
        await cache.put(request, stored.clone()).catch(() => {});
        return isDocument ? stored : response;
      }
      return response;
    } catch (_) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const home = await cache.match('./index.html');
        if (home) return home;
      }
      return new Response('オフラインです。保存済みの画面を表示できません。ネット接続後に再読み込みしてください。', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
