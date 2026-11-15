import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/components/page-loading.js',import.meta.url),'utf8');
function setup(image=null){
 const classes=new Set(),timers=new Map(),app={attrs:{'aria-busy':'true'},querySelector:()=>image,setAttribute(k,v){this.attrs[k]=v;}},overlay={removed:false,remove(){this.removed=true;}};let id=0;
 const listeners=new Map();app.dataset={page:'home'};
 const context={window:{},document:{addEventListener:(name,fn)=>listeners.set(name,fn),documentElement:{classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}},getElementById:k=>k==='app'?app:overlay},setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:key=>timers.delete(key)};
 vm.runInNewContext(source.replaceAll('export ', '')+'\nglobalThis.api={bootstrap:pageLoadingBootstrap,finish:finishPageLoading};',context);
 vm.runInNewContext(context.api.bootstrap,context);return {classes,timers,app,overlay,api:context.api,listeners};
}
test('loader releases the static page if application scripts never finish',()=>{const h=setup();assert(h.classes.has('page-pending'));[...h.timers.values()].find(t=>t.delay===8000).fn();assert(!h.classes.has('page-pending'));assert(h.overlay.removed);assert.equal(h.app.attrs['aria-busy'],'false');});
test('a stalled first image cannot keep the loading shell on screen',async()=>{const h=setup({complete:false,decode:()=>new Promise(()=>{})}),done=h.api.finish();[...h.timers.values()].find(t=>t.delay===1800).fn();await done;assert.equal(h.timers.size,0);assert(h.overlay.removed);assert(!h.classes.has('page-pending'));assert.equal(h.app.attrs['aria-busy'],'false');});
test('failed images release the page and cancel the fallback timer',async()=>{const h=setup({complete:false,decode:()=>Promise.reject(Error('offline'))});await h.api.finish();assert.equal(h.timers.size,0);assert(h.overlay.removed);});
test('the server-rendered page appears on poster load without waiting for application modules',()=>{const image={complete:false},h=setup(image);h.listeners.get('load')({target:image});assert(h.overlay.removed);assert.equal(h.timers.size,0);assert.equal(h.app.attrs['aria-busy'],'false');});
test('a cached poster releases the server-rendered page on DOM readiness',()=>{const h=setup({complete:true});h.listeners.get('DOMContentLoaded')();assert(h.overlay.removed);assert.equal(h.timers.size,0);});
