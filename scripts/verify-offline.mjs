import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=await readFile('../OPEN-HOUSE.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const source of scripts)new vm.Script(source);
const appSource=scripts.at(-1).replace(/bootSite\(\)\.catch\(error => \{[^\n]+\}\);\s*$/, '');
assert(!/import\(['"]\.\//.test(appSource));
for(const page of ['home','calculator','privacy']){
 const app={dataset:{},innerHTML:''},noop=()=>{},window={location:new URL('file:///C:/test/OPEN-HOUSE.html'+(page==='home'?'':'?page='+page)),addEventListener:noop};
 const context={window,URL,URLSearchParams,console,document:{body:{classList:{toggle:noop}},getElementById:()=>app,querySelector:()=>({})}};
 vm.createContext(context);new vm.Script(appSource).runInContext(context);
 vm.runInContext(`setupButtonMotion=()=>{};setupSiteHeader=()=>({destroy(){}});setupContentEditor=()=>{};setupDialogs=()=>({destroy(){}});setupCalculatorPage=()=>({destroy(){}});finishPageLoading=async()=>{globalThis.ready=true;};const controls=()=>({lock(){},unlock(){},suspend(){},resume(){},destroy(){}});createScrollVideo=controls;setupDreamGallery=controls;setupModelsGallery=controls;setupDreamFooter=controls;setupBrandPortal=controls;`,context);
 await context.bootSite();assert.equal(app.dataset.page,page);assert(context.ready);assert(app.innerHTML.includes('<h1>')||app.innerHTML.includes('<h1 '));
}
console.log('PASS: offline inline script syntax, resolved modules, home/calculator/privacy routing and loading completion.');
