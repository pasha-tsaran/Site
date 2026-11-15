import { site, pageHref } from '../data/site.js';

export function siteHeaderMarkup(active = 'architecture') {
  return `<header class="site-header">
    <a class="wordmark" href="${pageHref('/')}" aria-label="Дом на главную">${site.name}<span class="brand-caption">Архитектура жизни</span></a>
    <button class="mobile-menu-toggle" type="button" aria-controls="site-navigation" aria-expanded="false" data-no-motion hidden>Меню <span aria-hidden="true"></span></button>
    <nav id="site-navigation" aria-label="Главная навигация">${site.navigation.map(item => item.dialog
      ? `<button class="nav-link" data-dialog="${item.dialog}"><span class="nav-dialog-label">${item.label}</span><span aria-hidden="true"> ↗</span></button>`
      : `<a class="nav-link" href="${pageHref(item.href)}"${item.page === active ? ' aria-current="page"' : ''}>${item.label}</a>`).join('')}</nav>
  </header>`;
}

export function setupSiteHeader() {
  const header=document.querySelector('.site-header'),button=header?.querySelector('.mobile-menu-toggle'),nav=header?.querySelector('nav');
  if(!button || !nav)return {destroy(){}};
  const abort=new AbortController(),opts={signal:abort.signal},mobile=matchMedia('(max-width:840px)');
  let open=false;
  function sync(){
    button.hidden=!mobile.matches;
    nav.hidden=mobile.matches && !open;
    header.classList.toggle('menu-open',mobile.matches && open);
    header.dataset.menuReady='';
    button.setAttribute('aria-expanded',String(mobile.matches && open));
  }
  button.addEventListener('click',()=>{open=!open;sync();},opts);
  nav.addEventListener('click',event=>{if(event.target.closest('a,button')){open=false;sync();}},opts);
  document.addEventListener('click',event=>{if(open && !header.contains(event.target)){open=false;sync();}},opts);
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && open){open=false;sync();button.focus();}},opts);
  mobile.addEventListener('change',()=>{open=false;sync();},opts);
  sync();
  return {destroy(){abort.abort();}};
}
