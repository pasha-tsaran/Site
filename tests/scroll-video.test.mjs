import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scrollHarness } from './helpers/scroll-harness.mjs';
const source=await readFile(new URL('../src/components/scroll-video.js',import.meta.url),'utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('scrubbing starts only after one complete download, never on remote range seeks',async()=>{
 let resolveDownload;const requests=[];
 const h=scrollHarness(source,false,{fetch:(url,options)=>{requests.push({url,options});return new Promise(resolve=>{resolveDownload=resolve;});}});
 h.flush();assert.equal(requests.length,1);assert.equal(h.video.src,undefined);assert.equal(h.controller.diagnostics().ready,false);
 resolveDownload({ok:true,blob:async()=>new Blob(['complete clip'])});await settle();
 assert.match(h.video.src,/^blob:/);assert.equal(requests[0].options.headers,undefined);
 h.video.dispatchEvent(new Event('loadeddata'));h.flush();
 h.window.scrollY=2800;h.window.dispatchEvent(new Event('scroll'));h.flush();assert.equal(h.video.currentTime,7.5);
 h.video.seeking=true;h.window.scrollY=4200;h.window.dispatchEvent(new Event('scroll'));h.flush();
 h.window.scrollY=1400;h.window.dispatchEvent(new Event('scroll'));h.flush();assert.equal(h.video.currentTime,7.5);
 h.video.seeking=false;h.video.dispatchEvent(new Event('seeked'));h.flush();assert.equal(h.video.currentTime,3.75);
 assert.equal(requests.length,1);h.controller.destroy();
});

test('leaving during download aborts it without attaching a late video source',async()=>{
 let finish,signal;
 const h=scrollHarness(source,false,{fetch:(_url,options)=>{signal=options.signal;return new Promise(resolve=>{finish=resolve;});}});
 h.controller.destroy();assert.equal(signal.aborted,true);
 finish({ok:true,blob:async()=>new Blob(['late clip'])});await settle();assert.equal(h.video.src,undefined);assert.equal(h.queue.size,0);
});
test('static hero settles after one frame and wakes only on changes',()=>{
 const h=scrollHarness(source);assert.equal(h.flush(),1);assert.equal(h.flush(),0);
 h.window.dispatchEvent(new Event('scroll'));assert.equal(h.flush(),1);assert.equal(h.flush(),0);h.controller.destroy();
});
test('modal locks and hidden pages do not schedule idle animation work',()=>{
 const h=scrollHarness(source);h.flush();h.controller.suspend();h.window.dispatchEvent(new Event('scroll'));assert.equal(h.flush(),0);
 h.controller.resume(100);assert.equal(h.flush(),1);h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));h.window.dispatchEvent(new Event('scroll'));assert.equal(h.flush(),0);
 h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));assert.equal(h.flush(),1);h.controller.destroy();assert.equal(h.queue.size,0);
});

test('smooth wheel wakes the scheduler, completes the movement and becomes idle again',()=>{
 const h=scrollHarness(source,false);h.flush();assert.equal(h.flush(),0);h.window.lenis.wheel(120);
 h.flush(1);assert(h.window.scrollY<=1,'wheel must start gently, without a direct frame jump');
 assert(h.flush()<60);assert.equal(h.window.scrollY,180,'one base step plus its half-step tail, including subpixel accumulation');assert.equal(h.flush(),0);
 h.window.lenis.wheel();h.controller.suspend();assert.equal(h.flush(),0);h.controller.resume(180);h.flush();assert.equal(h.window.scrollY,180);assert.equal(h.flush(),0);h.controller.destroy();
});

test('quick notches accumulate, reverse immediately and do not restart a stale forward tail',()=>{
 const h=scrollHarness(source,false);h.flush();h.window.scrollY=1000;
 h.window.lenis.wheel(120);h.flush(5);h.window.lenis.wheel(120);h.flush();
 assert.equal(h.window.scrollY,1360);assert.equal(h.flush(),0);
 h.window.lenis.wheel(120);h.flush(10);const turn=h.window.scrollY;
 h.window.lenis.wheel(-120);h.flush();assert(Math.abs(h.window.scrollY-(turn-180))<=1);assert.equal(h.flush(),0);h.controller.destroy();
});

test('hidden tabs cancel a pending wheel tail instead of replaying it on return',()=>{
 const h=scrollHarness(source,false);h.flush();h.window.lenis.wheel(120);h.flush(10);const before=h.window.scrollY;
 h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));h.flush();
 h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));h.flush();
 assert.equal(h.window.scrollY,before);assert.equal(h.flush(),0);h.controller.destroy();
});
