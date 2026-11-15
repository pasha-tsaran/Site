import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../src/components/segmented-video.js',import.meta.url),'utf8')).replaceAll('export ','');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness({supported=true}={}){
 const requests=[],revoked=[],mediaObjects=[];let appended=[];
 const document=new EventTarget();document.hidden=false;
 const video=new EventTarget();Object.assign(video,{paused:true,load(){},buffered:{length:0,start:i=>appended[i][0],end:i=>appended[i][1]}});
 class BufferMock extends EventTarget{
  updating=false;queue=[];
  appendBuffer(data){assert.equal(this.updating,false);this.updating=true;this.queue.push(new Uint8Array(data)[0]);}
  finish(){const marker=this.queue.at(-1);this.updating=false;if(marker!==255){appended.push([marker-1,marker]);video.buffered.length=appended.length;}this.dispatchEvent(new Event('updateend'));}
 }
 class MediaMock extends EventTarget{
  static isTypeSupported(){return supported;}
  constructor(){super();mediaObjects.push(this);this.readyState='closed';this.buffer=new BufferMock();}
  open(){this.readyState='open';this.dispatchEvent(new Event('sourceopen'));}
  addSourceBuffer(){return this.buffer;}
  endOfStream(){this.readyState='ended';}
 }
 const context={window:{MediaSource:MediaMock},document,AbortController,URL:{createObjectURL:()=> 'blob:stream',revokeObjectURL:url=>revoked.push(url)},fetch:(url,options)=>new Promise((resolve,reject)=>{
  const request={url,options,resolve:()=>resolve({ok:true,arrayBuffer:async()=>Uint8Array.of(url==='init'?255:Number(url.slice(1))+1).buffer}),reject,aborted:false,done:false};
  options.signal.addEventListener('abort',()=>{request.aborted=true;const error=Error('aborted');error.name='AbortError';reject(error);},{once:true});requests.push(request);
 })};
 vm.runInNewContext(source+'\nglobalThis.init=createSegmentedVideo;',context);
 const manifest={mime:'video/mp4',duration:6,init:'init',segments:Array.from({length:6},(_,i)=>({src:'s'+i,start:i,end:i+1}))};
 let errors=0,progress=0;
 const controller=context.init(video,manifest,{onError:()=>errors++,onProgress:()=>progress++});
 return {controller,video,document,requests,revoked,media:mediaObjects[0],get errors(){return errors;},get progress(){return progress;},complete(url){const request=requests.find(r=>r.url===url&&!r.done&&!r.aborted);assert(request,'pending '+url);request.done=true;request.resolve();}};
}
test('unsupported browsers do not start segment requests and can use the MP4 fallback',()=>{
 const h=harness({supported:false});assert.equal(h.controller,null);assert.equal(h.requests.length,0);assert.equal(h.video.src,undefined);
});
test('first frame is available after the first fragment, before the remaining video',async()=>{
 const h=harness();h.media.open();h.complete('init');await settle();assert.equal(h.media.buffer.queue.at(-1),255);h.media.buffer.finish();
 h.complete('s0');await settle();h.media.buffer.finish();
 assert.equal(h.controller.hasTime(.5),true);assert.equal(h.controller.hasTime(4.5),false);assert.equal(h.controller.diagnostics().completed,1);assert(h.controller.diagnostics().downloads<=2);
 h.controller.destroy();assert.deepEqual(h.revoked,['blob:stream']);
});
test('a fast jump prioritizes its fragment without cancelling the first-frame download',async()=>{
 const h=harness();h.controller.requestTime(5.2);await settle();
 assert.equal(h.requests.find(r=>r.url==='s0').aborted,false);assert.equal(h.requests.find(r=>r.url==='s1').aborted,true);
 assert(h.requests.some(r=>r.url==='s5'));assert(h.controller.diagnostics().downloads<=2);
 h.controller.destroy();
});
test('background downloads stop when the section or document is hidden and resume on return',async()=>{
 const h=harness();h.controller.setActive(false);await settle();assert.equal(h.controller.diagnostics().downloads,0);
 h.controller.setActive(true);assert.equal(h.controller.diagnostics().downloads,2);
 h.document.hidden=true;h.document.dispatchEvent(new Event('visibilitychange'));await settle();assert.equal(h.controller.diagnostics().downloads,0);
 h.document.hidden=false;h.document.dispatchEvent(new Event('visibilitychange'));assert.equal(h.controller.diagnostics().downloads,2);h.controller.destroy();
});
test('network failure signals one fallback and destroy releases resources once',async()=>{
 const h=harness();h.requests.find(r=>r.url==='s0').reject(Error('offline'));await settle();assert.equal(h.errors,1);h.controller.destroy();h.controller.destroy();assert.deepEqual(h.revoked,['blob:stream']);
});
