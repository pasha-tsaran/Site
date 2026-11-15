import vm from 'node:vm';
export function scrollHarness(source, staticMode = true, options = {}) {
  class Node extends EventTarget { constructor(){super();this.style={};this.hidden=false;this.offsetHeight=900;this.dataset={};this.classList={toggle(){},add(){}};}getBoundingClientRect(){return {top:0,height:this.offsetHeight};}querySelector(key){return this.nodes[key];}querySelectorAll(){return [new Node(),new Node(),new Node()];}removeAttribute(){}load(){}pause(){} }
  const video=new Node();Object.assign(video,{readyState:2,seeking:false,currentTime:0});
  const section=new Node();section.offsetHeight=6500;
  section.nodes={video,'.hero-stage':new Node(),'.media-status':new Node(),'[data-loading]':new Node(),'[data-retry]':new Node(),'[data-motion-toggle]':new Node()};
  const header=new Node(),gallery=new Node();gallery.getBoundingClientRect=()=>({top:6500-window.scrollY});
  const document=new EventTarget();document.hidden=false;document.querySelector=key=>key==='.site-header'?header:gallery;
  const window=new EventTarget();Object.assign(window,{scrollY:0,innerHeight:900,scrollTo({top}){this.scrollY=top;this.dispatchEvent(new Event('scroll'));}});
  const reduced=new EventTarget();reduced.matches=staticMode;
  if (!staticMode) window.Lenis=class {
    constructor(settings){window.lenis=this;this.options=settings;this.isScrolling=false;this.remaining=0;this.limit=10000;}
    on(name,fn){this.wake=fn;}
    raf(){if(this.remaining){window.scrollY+=80;window.dispatchEvent(new Event('scroll'));if(!--this.remaining)this.isScrolling=false;}}
    scrollTo(y,options){if(options.immediate){this.remaining=0;this.isScrolling=false;window.scrollY=Math.round(y);window.dispatchEvent(new Event('scroll'));}else{this.isScrolling='smooth';this.remaining=3;this.wake();}}
    wheel(deltaY=80){
      const event={type:'wheel',cancelable:true,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
      if(this.options.virtualScroll?.({deltaY,deltaX:0,event})===false)return;
      this.isScrolling='smooth';this.remaining=3;this.wake();
    }
    stop(){this.isScrolling=false;this.remaining=0;}start(){}resize(){}destroy(){}
  };
  let id=0,clock=0;const queue=new Map();
  const context={window,document,AbortController,matchMedia:()=>reduced,requestAnimationFrame:fn=>{queue.set(++id,fn);return id;},cancelAnimationFrame:key=>queue.delete(key),ResizeObserver:class{observe(){}disconnect(){}},setTimeout,clearTimeout,URL,performance:{now:()=>clock},console,fetch:options.fetch || (async()=>({ok:true,blob:async()=>new Blob(['video'],{type:'video/mp4'})}))};
  context.createSegmentedVideo=options.createStream || (()=>null);
  vm.runInNewContext(source.replace(/^import .*;\r?\n/gm,'').replaceAll('export ','')+'\nglobalThis.init=createScrollVideo;',context);
  const controller=context.init(section,{fps:24,frameCount:361,src:'./hero.mp4'});
  function flush(limit=120){let count=0;while(queue.size&&count<limit){const [key,fn]=queue.entries().next().value;queue.delete(key);clock+=16.67;fn(clock);count++;}return count;}
  return {controller,flush,window,document,queue,video,section};
}
