import assert from 'node:assert/strict';
import { mediaStreams } from '../src/data/media-streams.js';
const base = process.argv[2];
if (!base || !/^https?:\/\//.test(base)) throw new Error('Usage: node deploy/check-http.mjs http://host:port');
const root = new URL(base), routes = ['/', '/construction/', '/construction/brick/', '/construction/aerated/', '/construction/ceramic/', '/construction/frame/', '/construction/timber/', '/construction/concrete/', '/construction/log-bath/', '/construction/timber-bath/', '/construction/brick-bath/', '/about/', '/calculator/', '/privacy/', '/consent/'];
const request = (path, options = {}) => fetch(new URL(path, root), { ...options, signal: AbortSignal.timeout(15000) });
const health = await request('/healthz'); assert.equal(health.status, 200); assert.equal((await health.text()).trim(), 'ok');
for (const route of routes) { const response = await request(route); assert.equal(response.status, 200, route); assert.match(response.headers.get('content-type'), /text\/html/); const html = await response.text(); assert(html.includes('id="app"') && html.includes('id="page-loading"'), route); }
const redirect = await request('/about', { redirect: 'manual' }); assert.equal(redirect.status, 301); assert(new URL(redirect.headers.get('location'), root).pathname === '/about/'); assert.equal(new URL(redirect.headers.get('location'), root).origin, root.origin);
const css = await request('/app/styles/site.css', { headers: { 'Accept-Encoding': 'gzip' } }); assert.equal(css.status, 200); assert.match(css.headers.get('content-type'), /text\/css/); assert.equal(css.headers.get('content-encoding'), 'gzip'); assert.equal(css.headers.get('x-content-type-options'), 'nosniff'); assert.match(css.headers.get('cache-control'), /must-revalidate/); await css.arrayBuffer();
const etag = css.headers.get('etag'); assert(etag); const cached = await request('/app/styles/site.css', { headers: { 'If-None-Match': etag, 'Accept-Encoding': 'gzip' } }); assert.equal(cached.status, 304);
for (const asset of ['/assets/hero-scrub.mp4', '/assets/dream-story.mp4', '/assets/brand-transition.mp4']) { const range = await request(asset, { headers: { Range: 'bytes=0-1023' } }); assert.equal(range.status, 206, asset); assert.match(range.headers.get('content-range'), /^bytes 0-1023\//); assert.equal((await range.arrayBuffer()).byteLength, 1024); }
const font = await request('/assets/pdf/NotoSans-Regular.ttf', { method: 'HEAD' }); assert.equal(font.status, 200);
for (const stream of Object.values(mediaStreams)) for (const asset of [stream.init,stream.segments[0].src,stream.segments.at(-1).src]) {
  const path=asset.replace(/^\.\//,'/');
  const response=await request(path,{headers:{Range:'bytes=0-1'}});
  assert.equal(response.status,206,path);assert.equal((await response.arrayBuffer()).byteLength,2);
  assert.match(response.headers.get('cache-control'),/immutable/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
}
const pdf = await request('/assets/vendor/pdf-lib.min.js', { method: 'HEAD' }); assert.equal(pdf.status, 200); assert.match(pdf.headers.get('content-type'), /javascript/);
const missing = await request('/not-a-real-page/'); assert.equal(missing.status, 404);
console.log(JSON.stringify({ base: root.href, routes: routes.length, health: 'ok', videoRanges: '206', gzip: true, etag: '304', pdfAssets: true, missing: '404' }, null, 2));
