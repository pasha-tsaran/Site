import { setupButtonMotion } from './components/button-motion.js';
import { setupDialogs } from './components/dialogs.js';
import { finishPageLoading } from './components/page-loading.js';
import { site } from './data/site.js';
import { readConstructionRoute } from './data/construction.js';
import { setupSiteHeader } from './components/site-header.js';
import { setupContentEditor } from './components/content-editor.js';

async function bootSite() {
  const constructionRoute = readConstructionRoute();
  const segment = window.location.protocol === 'file:' ? new URLSearchParams(window.location.search).get('page') : window.location.pathname.split('/').filter(Boolean)[0];
  const kind = ['privacy', 'consent', 'about', 'calculator'].includes(segment) ? segment : constructionRoute ? 'construction' : 'home';
  const legal = kind === 'privacy' || kind === 'consent';
  const page = legal ? await import('./pages/legal.js') : kind === 'calculator' ? await import('./pages/calculator.js') : kind === 'about' ? await import('./pages/about.js') : kind === 'construction' ? await import('./pages/construction.js') : await import('./pages/home.js');
  const app = document.getElementById('app');
  document.body.classList.toggle('construction-page', kind !== 'home');
  document.body.classList.toggle('about-page', kind === 'about');
  document.body.classList.toggle('calculator-page', kind === 'calculator');
  // Keep the HTML rendered at build time: no second parse or duplicate image decode.
  if (app.dataset.page !== kind || window.__SITE_CONTENT?.revision) {
    app.innerHTML = legal ? page.legalPage(kind) : kind === 'calculator' ? page.calculatorPage() : kind === 'about' ? page.aboutPage() : kind === 'construction' ? page.constructionPage(constructionRoute.id) : page.homePage();
    app.dataset.page = kind;
  }
  const header=setupSiteHeader();
  window.addEventListener('pagehide',event=>{if(!event.persisted)header.destroy();});
  setupButtonMotion();
  if (kind !== 'home') {
    if (legal) document.title = (kind === 'privacy' ? 'Политика конфиденциальности' : 'Согласие на обработку данных') + ' | ДОМ';
    const content = legal ? { destroy() {} } : kind === 'calculator' ? page.setupCalculatorPage() : kind === 'about' ? page.setupAboutPage() : page.setupConstructionPage(constructionRoute.id);
    const dialogs = setupDialogs(() => {}, () => {});
    window.addEventListener('pagehide', event => { if (!event.persisted) { dialogs.destroy(); content.destroy(); } });
  } else {
    const [{ createScrollVideo }, { setupDreamGallery }, { setupModelsGallery }, { setupDreamFooter }, { setupBrandPortal }] = await Promise.all([
      import('./components/scroll-video.js'), import('./components/dream-gallery.js'), import('./components/models-gallery.js'), import('./components/dream-footer.js'), import('./components/brand-portal.js'),
    ]);
    const journey = createScrollVideo(document.querySelector('[data-journey]'), site.media);
    const gallery = setupDreamGallery(document.querySelector('[data-gallery]'));
    const models = setupModelsGallery(document.querySelector('[data-models]'));
    const footer = setupDreamFooter(document.querySelector('[data-dream-footer]'));
    const siteView = new URLSearchParams(window.location.search).get('site-view');
    const portalPreview = siteView === 'transition-forward' || siteView === 'transition-reverse';
    const portal = portalPreview
      ? (await import('./components/brand-portal.js')).setupPortalLocationPreview(document.querySelector('[data-brand-portal]'), siteView)
      : setupBrandPortal(document.querySelector('[data-brand-portal]'), { lock: () => journey.lock('portal'), unlock: position => journey.unlock('portal', position) });
    if (portalPreview) document.querySelector('#transition').scrollIntoView({ behavior:'instant', block:'start' });
    else if (['story','catalog','contacts'].includes(siteView)) {
      const target = document.querySelector(siteView === 'story' ? '#architecture' : siteView === 'catalog' ? '#life' : '#contacts');
      if (target) {
        let position = target.getBoundingClientRect().top + window.scrollY;
        if (siteView === 'contacts' && !matchMedia('(max-width:700px)').matches) position += Math.max(0, Math.min(window.innerHeight * 1.12, target.offsetHeight - window.innerHeight));
        portal.goTo(position);
      }
    }
    const suspend = () => { journey.suspend(); gallery.suspend(); models.suspend(); portal.suspend(); footer.suspend(); };
    const resume = position => { journey.resume(position); gallery.resume(); models.resume(position); portal.resume(); footer.resume(position); };
    const dialogs = setupDialogs(suspend, resume);
    window.addEventListener('pagehide', event => {
      if (event.persisted) suspend();
      else { dialogs.destroy(); journey.destroy(); gallery.destroy(); models.destroy(); portal.destroy(); footer.destroy(); }
    });
    window.addEventListener('pageshow', event => { if (event.persisted && !document.querySelector('dialog[open]')) resume(); });
  }
  setupContentEditor();
  await finishPageLoading();
}
bootSite().catch(error => { console.error('Не удалось включить интерактивные функции сайта', error); finishPageLoading(); });
