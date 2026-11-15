import { houseModels } from '../data/models.js';
import { pageHref } from '../data/site.js';

const modelClamp = (value, min, max) => Math.max(min, Math.min(max, value));
const modelLabel = (model, index, interactive) => {
  const long = model.title.length > 23 ? ' model-label--long' : '';
  const content = '<span>' + model.title + '</span>';
  return interactive
    ? '<li class="model-row"><a class="model-pick' + long + '" href="' + pageHref('/construction/' + model.id + '/') + '" aria-current="' + (index === 0) + '" tabindex="' + (index === 0 ? 0 : -1) + '" data-model-index="' + index + '">' + content + '</a></li>'
    : '<div class="model-row' + (index === 0 ? ' is-active' : '') + '"><span class="model-echo' + long + '">' + content + '</span></div>';
};

function mobileModelsMarkup() {
  return '<div class="models-mobile" role="region" aria-label="Дома и бани" aria-roledescription="карусель" tabindex="0">' +
    '<div class="models-mobile-heading"><span>Дома и бани</span><output data-mobile-count aria-live="polite" aria-atomic="true">01 / ' + String(houseModels.length).padStart(2,'0') + '</output></div>' +
    '<div class="models-mobile-window">' + houseModels.map((model,index)=>
      '<article class="model-mobile-card" data-mobile-card'+(index?' hidden':'')+' aria-label="'+model.title+'">'+
        '<a class="model-mobile-photo" href="'+pageHref('/construction/'+model.id+'/')+'" tabindex="-1" aria-hidden="true"><img '+(index?'data-src':'src')+'="'+model.image+'" alt="'+model.alt+'" width="1122" height="1402" loading="lazy" decoding="async"></a>'+
        '<div class="model-mobile-copy"><h3><a href="'+pageHref('/construction/'+model.id+'/')+'">'+model.title+'</a></h3><p>'+model.note+'</p><div class="model-mobile-actions"><a href="'+pageHref('/construction/'+model.id+'/')+'">Смотреть проект ↗</a><button type="button" data-dialog="consultation" data-mobile-inquiry="'+index+'" data-no-motion>Обсудить дом ↗</button></div></div></article>'
    ).join('')+'</div><div class="models-mobile-controls"><button type="button" data-mobile-prev data-no-motion aria-label="Предыдущий дом" disabled>←</button><span>Один свайп, один дом</span><button type="button" data-mobile-next data-no-motion aria-label="Следующий дом">→</button></div></div>';
}

export function modelsGalleryMarkup() {
  return '<section class="life-section models-section" id="life" aria-labelledby="life-heading" data-olive-section data-models>' +
    '<h2 class="sr-only" id="life-heading">Дома и бани Выберите свой характер</h2>' +
    '<div class="models-stage">' +
      '<div class="models-top"><span>Дома и бани</span><span>Материал · Форма · Ваш характер</span></div>' +
      '<figure class="models-photo">' + houseModels.map((model, index) =>
        '<img class="model-image' + (index === 0 ? ' is-active' : '') + '" ' + (index === 0 ? 'src="' + model.image + '"' : 'data-src="' + model.image + '"') + ' width="1122" height="1402" loading="lazy" decoding="async" alt="' + model.alt + '" aria-hidden="' + (index !== 0) + '">'
      ).join('') + '</figure>' +
      '<ol class="models-list models-options" aria-label="Виды домов и бань" aria-describedby="models-help">' + houseModels.map((model, index) => modelLabel(model, index, true)).join('') + '</ol>' +
      '<div class="models-list models-front" aria-hidden="true">' + houseModels.map((model, index) => modelLabel(model, index, false)).join('') + '</div>' +
      '<div class="models-veil" aria-hidden="true"></div>' +
      '<div class="models-bottom"><p class="models-note" data-model-note>' + houseModels[0].note + '</p><button class="life-cta models-cta" type="button" data-dialog="consultation" data-model-cta>Обсудить проект <span aria-hidden="true">↗</span></button></div>' +
      mobileModelsMarkup() +
      '<p class="sr-only" id="models-help">Прокручивайте страницу или используйте стрелки вверх и вниз для выбора. Нажмите на название или Enter, чтобы открыть страницу проекта.</p>' +
    '</div></section>';
}

function setupDesktopModelsGallery(section) {
  const stage = section.querySelector('.models-stage');
  const track = section.querySelector('.models-options');
  const front = section.querySelector('.models-front');
  const rows = [...track.querySelectorAll('.model-row')];
  const echoes = [...front.querySelectorAll('.model-row')];
  const picks = [...track.querySelectorAll('[data-model-index]')];
  const images = [...section.querySelectorAll('.model-image')];
  const note = section.querySelector('[data-model-note]');
  const cta = section.querySelector('[data-model-cta]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController(), options = { signal: abort.signal };
  let current = -1, top = 0, step = 120, travel = 0, entryTravel = 0, frame = 0, suspended = false, destroyed = false;
  let autoComment = '';
  let previousOffset = NaN;

  function loadNear(index) {
    for (let i = Math.max(0, index - 1); i <= Math.min(images.length - 1, index + 1); i++) {
      const image = images[i];
      if (image.dataset.src) { image.src = image.dataset.src; delete image.dataset.src; }
    }
  }
  function select(index) {
    if (index === current) return;
    current = index;
    for (let i = 0; i < picks.length; i++) {
      const selected = i === index;
      picks[i].setAttribute('aria-current', String(selected));
      picks[i].tabIndex = selected ? 0 : -1;
      echoes[i].classList.toggle('is-active', selected);
      images[i].classList.toggle('is-active', selected);
      images[i].setAttribute('aria-hidden', String(!selected));
    }
    note.textContent = houseModels[index].note;
    cta.setAttribute('aria-label', 'Обсудить проект: ' + houseModels[index].title.toLowerCase());
    section.dataset.activeModel = houseModels[index].id;
  }
  function render(position = window.scrollY) {
    frame = 0;
    if (destroyed || suspended) return;
    // Keep the first model visible for a short scroll before the reverse portal.
    const offset = modelClamp(position - top - entryTravel, 0, travel);
    if (position + window.innerHeight * 1.5 >= top && position <= top + entryTravel + travel + window.innerHeight) loadNear(modelClamp(Math.round(offset / step), 0, houseModels.length - 1));
    if (offset === previousOffset) return;
    previousOffset = offset;
    const transform = 'translate3d(0,' + (-step / 2 - offset) + 'px,0)';
    track.style.transform = transform;
    front.style.transform = transform;
    const index = modelClamp(Math.round(offset / step), 0, houseModels.length - 1);
    select(index);
  }
  function requestRender() {
    if (!frame && !destroyed && !suspended) frame = requestAnimationFrame(() => render());
  }
  function geometry() {
    if (suspended || destroyed) return;
    top = section.getBoundingClientRect().top + window.scrollY;
    step = rows[0].getBoundingClientRect().height || 120;
    travel = step * (houseModels.length - 1);
    entryTravel = modelClamp(stage.getBoundingClientRect().height * .24, 160, 240);
    section.style.setProperty('--models-travel', entryTravel + travel + 'px');
    previousOffset = NaN;
    render();
  }
  function go(index, focus = false) {
    if (suspended || destroyed) return;
    const next = modelClamp(index, 0, houseModels.length - 1);
    window.scrollTo({ top: top + entryTravel + next * step, behavior: 'instant' });
    render();
    if (focus) picks[next].focus({ preventScroll: true });
  }
  track.addEventListener('keydown', event => {
    const deltas = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    let next;
    if (Object.hasOwn(deltas, event.key)) next = current + deltas[event.key];
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = houseModels.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    go(next, true);
  }, options);
  cta.addEventListener('click', () => {
    const field = document.querySelector('#consultation [name="comment"]');
    if (field && (!field.value.trim() || field.value === autoComment)) {
      field.value = autoComment = 'Интересует: ' + houseModels[current].title.toLowerCase() + '.';
    }
  }, options);
  window.addEventListener('scroll', requestRender, { ...options, passive: true });
  window.addEventListener('resize', geometry, options);
  window.visualViewport?.addEventListener('resize', geometry, options);
  const resize = new ResizeObserver(geometry);
  resize.observe(stage);
  const preload = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      // Warm the full collection during the preceding transition, before a fast scroll.
      for (const image of images) {
        if (image.dataset.src) { image.src = image.dataset.src; delete image.dataset.src; }
      }
      preload.disconnect();
    }
  }, { rootMargin: '150% 0px' });
  preload.observe(section);
  document.fonts?.ready.then(() => { if (!destroyed) geometry(); });
  reduced.addEventListener('change', requestRender, options);
  geometry();
  return {
    suspend() { suspended = true; cancelAnimationFrame(frame); frame = 0; },
    resume(position = window.scrollY) { suspended = false; geometry(); render(position); },
    destroy() { destroyed = true; abort.abort(); resize.disconnect(); preload.disconnect(); cancelAnimationFrame(frame); },
    diagnostics() { return { current, top, step, travel, entryTravel, suspended }; },
  };
}

export function mobileModelIndex(index,dx,dy,width,count) {
  if(Math.abs(dx)<Math.max(36,width*.12) || Math.abs(dx)<Math.abs(dy)*1.2)return index;
  return modelClamp(index+(dx<0?1:-1),0,count-1);
}

function setupMobileModelsGallery(section) {
  const root=section.querySelector('.models-mobile'),windowEl=root.querySelector('.models-mobile-window');
  const cards=[...root.querySelectorAll('[data-mobile-card]')],images=cards.map(card=>card.querySelector('img'));
  const prev=root.querySelector('[data-mobile-prev]'),next=root.querySelector('[data-mobile-next]'),count=root.querySelector('[data-mobile-count]');
  const abort=new AbortController(),opts={signal:abort.signal},reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let current=0,moving=false,suspended=false,destroyed=false,pointer=null,suppressClickUntil=0,animations=[],autoComment='';
  function loadNear(index){
    for(let i=Math.max(0,index-1);i<=Math.min(cards.length-1,index+1);i++)if(images[i].dataset.src){images[i].src=images[i].dataset.src;delete images[i].dataset.src;}
  }
  function sync(){
    cards.forEach((card,index)=>{card.hidden=index!==current;card.inert=index!==current;});
    prev.disabled=current===0;next.disabled=current===cards.length-1;
    count.textContent=String(current+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
    section.dataset.activeModel=houseModels[current].id;
    section.style.setProperty('--models-travel','0px');
  }
  async function go(index){
    const target=modelClamp(index,0,cards.length-1);
    if(destroyed || suspended || moving || target===current)return;
    moving=true;pointer=null;loadNear(target);
    const outgoing=cards[current],incoming=cards[target],direction=target>current?1:-1;
    outgoing.inert=true;incoming.hidden=false;incoming.inert=false;
    try{
      if(!reduced.matches && incoming.animate){
        const settings={duration:440,easing:'cubic-bezier(.22,.8,.24,1)'};
        animations=[outgoing.animate([{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*110}%)`,opacity:.45}],settings),incoming.animate([{transform:`translateX(${direction*110}%)`,opacity:.5},{transform:'translateX(0)',opacity:1}],settings)];
        await Promise.all(animations.map(animation=>animation.finished));
      }
    }catch{/* A resize or dialog can cancel presentation without queuing another slide. */}
    if(destroyed)return;
    current=target;animations=[];moving=false;sync();
  }
  prev.addEventListener('click',()=>go(current-1),opts);next.addEventListener('click',()=>go(current+1),opts);
  windowEl.addEventListener('dragstart',event=>event.preventDefault(),opts);
  root.addEventListener('keydown',event=>{
    if(event.key==='ArrowLeft' || event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();go(current+(event.key==='ArrowRight'?1:-1));}
  },opts);
  windowEl.addEventListener('pointerdown',event=>{
    if(event.button!==0 || moving || suspended || pointer)return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false};
  },opts);
  windowEl.addEventListener('pointermove',event=>{
    if(!pointer || event.pointerId!==pointer.id)return;
    const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
    if(Math.hypot(dx,dy)>10)suppressClickUntil=performance.now()+500;
    if(Math.abs(dx)>10 && Math.abs(dx)>Math.abs(dy)*1.2){
      pointer.horizontal=true;suppressClickUntil=performance.now()+500;
      windowEl.setPointerCapture?.(event.pointerId);
      if(event.cancelable)event.preventDefault();
    }
  },opts);
  windowEl.addEventListener('pointerup',event=>{
    if(!pointer || event.pointerId!==pointer.id)return;
    const gesture=pointer;pointer=null;
    if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)suppressClickUntil=performance.now()+500;
    if(gesture.horizontal){
      suppressClickUntil=performance.now()+500;
      go(mobileModelIndex(current,event.clientX-gesture.x,event.clientY-gesture.y,windowEl.clientWidth,cards.length));
    }
  },opts);
  windowEl.addEventListener('pointercancel',()=>{pointer=null;},opts);
  windowEl.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();}}, {...opts,capture:true});
  root.addEventListener('click',event=>{
    const inquiry=event.target.closest('[data-mobile-inquiry]');
    if(!inquiry)return;
    const field=document.querySelector('#consultation [name="comment"]');
    if(field && (!field.value.trim() || field.value===autoComment))field.value=autoComment='Интересует: '+houseModels[Number(inquiry.dataset.mobileInquiry)].title.toLowerCase()+'.';
  },opts);
  const preload=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){loadNear(current);preload.disconnect();}},{rootMargin:'100% 0px'});
  preload.observe(section);sync();
  return {
    suspend(){suspended=true;pointer=null;},resume(){suspended=false;sync();},
    destroy(){destroyed=true;abort.abort();preload.disconnect();animations.forEach(animation=>animation.cancel());cards.forEach((card,index)=>{card.hidden=index!==0;card.inert=index!==0;});},
    diagnostics(){return {current,mobile:true,moving,suspended};},
  };
}

export function setupModelsGallery(section) {
  const mobile=matchMedia('(max-width:700px)');
  let view=mobile.matches?setupMobileModelsGallery(section):setupDesktopModelsGallery(section),suspended=false;
  function change(){view.destroy();view=mobile.matches?setupMobileModelsGallery(section):setupDesktopModelsGallery(section);if(suspended)view.suspend();}
  mobile.addEventListener('change',change);
  return {
    suspend(){suspended=true;view.suspend();},resume(position){suspended=false;view.resume(position);},
    destroy(){mobile.removeEventListener('change',change);view.destroy();},diagnostics(){return view.diagnostics();},
  };
}
