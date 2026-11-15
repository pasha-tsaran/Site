import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/components/dream-gallery.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function galleryHarness(){
 class Node extends EventTarget{constructor(){super();this.dataset={};this.classList={add(){}};this.paused=true;this.playCalls=0;}load(){}pause(){this.paused=true;}play(){this.playCalls++;this.paused=false;return Promise.resolve();}removeAttribute(name){delete this[name];}}
 const video=new Node();video.dataset.src='./assets/dream-story.mp4';const status=new Node(),section=new Node();section.querySelector=selector=>selector==='[data-story-video]'?video:status;
 const observers=[],requests=[],revoked=[];let finish;
 const document=new EventTarget();document.hidden=false;
 const context={storyMedia:{stream:null},createSegmentedVideo:()=>null,window:new EventTarget(),document,AbortController,URL:{createObjectURL:()=> 'blob:story',revokeObjectURL:url=>revoked.push(url)},fetch:(url,options)=>{requests.push({url,options});return new Promise(resolve=>{finish=resolve;});},IntersectionObserver:class{constructor(callback,options){this.callback=callback;this.options=options;observers.push(this);}observe(){}disconnect(){}}};
 vm.runInNewContext(source+'\nglobalThis.init=setupDreamGallery;',context);const controller=context.init(section);
 return {controller,video,document,requests,revoked,near:value=>observers[0].callback([{isIntersecting:value}]),visible:value=>observers[1].callback([{isIntersecting:value}]),finish:()=>finish({ok:true,blob:async()=>new Blob(['story'])})};
}
test('story preloads once and plays from local bytes only while visible',async()=>{
 const h=galleryHarness();h.near(true);h.visible(true);h.near(true);
 assert.equal(h.requests.length,1);assert.equal(h.video.playCalls,0);assert.equal(h.video.src,undefined);
 h.finish();await settle();assert.equal(h.video.src,'blob:story');assert.equal(h.video.playCalls,0);
 h.video.dispatchEvent(new Event('loadeddata'));h.video.dispatchEvent(new Event('canplay'));await settle();assert.equal(h.video.playCalls,1);
 h.visible(false);assert.equal(h.video.paused,true);h.visible(true);await settle();assert.equal(h.video.playCalls,2);
 h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));assert.equal(h.video.paused,true);
 h.controller.destroy();assert.deepEqual(h.revoked,['blob:story']);assert.equal(h.requests[0].options.signal.aborted,true);
});
test('destroy during story download cannot create a late object URL',async()=>{
 const h=galleryHarness();h.near(true);h.controller.destroy();h.finish();await settle();assert.equal(h.video.src,undefined);assert.deepEqual(h.revoked,[]);
});
