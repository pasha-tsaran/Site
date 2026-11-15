export const pageLoadingBootstrap = `(${function () {
  document.documentElement.classList.add('page-pending');
  function release() {
    clearTimeout(window.__pageLoadingTimeout);
    document.documentElement.classList.remove('page-pending');
    document.getElementById('page-loading')?.remove();
    document.getElementById('app')?.setAttribute('aria-busy','false');
  }
  function firstImage() { return document.getElementById('app')?.querySelector('img[fetchpriority="high"], main img:not([loading="lazy"])'); }
  window.__pageLoadingTimeout=setTimeout(release,8000);
  // Server-rendered content can be shown before the interactive module graph is downloaded.
  document.addEventListener?.('load',event=>{ if(event.target === firstImage()) release(); },true);
  document.addEventListener?.('DOMContentLoaded',()=>{
    if(document.getElementById('app')?.dataset?.page && (!firstImage() || firstImage().complete)) release();
  },{once:true});
}.toString()})();`;

export function pageLoadingMarkup(kind = 'home') {
  return `<div class="page-loading page-loading--${kind}" id="page-loading" role="status" aria-label="Загружаем сайт"><div class="loading-header"><span class="loading-brand" aria-hidden="true">ДОМ.</span><div class="loading-nav" aria-hidden="true"><i></i><i></i><i></i></div></div><div class="loading-content" aria-hidden="true"><div class="loading-heading"><i></i><i></i></div><div class="loading-media"></div></div><span class="loading-caption">Готовим пространство для вас</span></div>`;
}

export async function finishPageLoading() {
  const app = document.getElementById('app');
  const image = app.querySelector('img[fetchpriority="high"], main img:not([loading="lazy"])');
  // Do not wait for videos or hold visitors behind a failed image request.
  if (image && !image.complete) {
    let timer;
    await Promise.race([image.decode().catch(() => {}), new Promise(resolve => { timer = setTimeout(resolve, 1800); })]);
    clearTimeout(timer);
  }
  clearTimeout(window.__pageLoadingTimeout);
  document.documentElement.classList.remove('page-pending');
  app.setAttribute('aria-busy', 'false');
  document.getElementById('page-loading')?.remove();
}
