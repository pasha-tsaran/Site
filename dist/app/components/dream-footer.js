import { site } from '../data/site.js';

const footerClamp = value => Math.max(0, Math.min(1, value));
const footerEase = value => value * value * (3 - 2 * value);

export function dreamFooterMarkup() {
  const contact = site.contacts;
  return `<footer class="site-footer dream-footer" id="contacts" aria-labelledby="footer-heading" data-dream-footer>
    <div class="footer-stage">
      <div class="footer-top">
        <div class="footer-invitation"><span class="footer-caption">От мечты к своему дому</span><p>Давайте<br>строить вместе</p></div>
        <address class="footer-contacts">
          <a class="footer-phone" href="${contact.phoneHref}">${contact.phone}</a>
          <a href="mailto:${contact.email}">${contact.email}</a>
          <button class="footer-telegram" type="button" data-dialog="manager">Telegram <span aria-hidden="true">↗</span></button>
          <span class="footer-handle">${contact.telegram}</span>
        </address>
        <div class="footer-location">
          <a class="footer-map" href="${contact.mapHref}" target="_blank" rel="noopener noreferrer" aria-label="Открыть демонстрационную точку в Одинцово на Яндекс Картах">
            <img src="${contact.mapImage}" alt="Карта центра Одинцово с демонстрационной точкой" width="720" height="400" loading="lazy" decoding="async">
            <span class="footer-map-pin" aria-hidden="true"><svg viewBox="0 0 32 40" fill="none"><path d="M16 39S1 23 1 16a15 15 0 1 1 30 0c0 7-15 23-15 23Z" fill="currentColor"/><path d="m9 20 7-6 7 6v8h-5v-6h-4v6H9Z" fill="var(--paper)"/></svg></span>
            <span class="footer-map-open" aria-hidden="true">Открыть карту ↗</span>
          </a>
          <div class="footer-map-caption"><span>${contact.location}</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a></div>
        </div>
      </div>
      <h2 class="sr-only" id="footer-heading">Твой дом Твоя мечта</h2>
      <div class="footer-split" aria-hidden="true"><span class="footer-word footer-word--home">ТВОЙ ДОМ</span><span class="footer-word footer-word--dream">ТВОЯ МЕЧТА</span></div>
      <div class="footer-message">
        <p class="footer-slogan">Строим дом<br>Создаём место для жизни</p>
        <button class="footer-cta" type="button" data-dialog="consultation">Начнём с вашей мечты <span aria-hidden="true">↗</span></button>
      </div>
      <div class="footer-bottom"><a class="footer-signature" href="#top">Наверх<span aria-hidden="true">↑</span></a><span class="footer-demo">Тестовая версия · Контакты и точка на карте демонстрационные</span><span>© ${new Date().getFullYear()}</span></div>
    </div>
  </footer>`;
}

export function setupDreamFooter(section) {
  const stage = section.querySelector('.footer-stage');
  const home = section.querySelector('.footer-word--home');
  const dream = section.querySelector('.footer-word--dream');
  const information = section.querySelector('.footer-top');
  const split = section.querySelector('.footer-split');
  const message = section.querySelector('.footer-message');
  const header = document.querySelector('.site-header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:700px)');
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let top = 0, reveal = 0, distance = 1, homeTravel = 0, dreamTravel = 0, initialScale = 1;
  let frame = 0, suspended = false, destroyed = false, progress = 0;
  let previousProgress = NaN, headerThreshold = Infinity;

  function render(position = window.scrollY) {
    frame = 0;
    if (suspended || destroyed) return;
    const staticLayout=reduced.matches || mobile.matches;
    progress = staticLayout ? 1 : footerClamp((position - top - reveal) / distance);
    header.classList.toggle('on-footer', position >= headerThreshold);
    if (progress === previousProgress) return;
    previousProgress = progress;
    // The cover, words and content share one continuous scroll-driven movement.
    const spread = footerEase(progress);
    const details = footerEase(footerClamp(progress / .9));
    const visible = footerEase(footerClamp(progress / .9));
    const scale = 1 + (initialScale - 1) * (1 - spread);
    home.style.transform = `translate3d(${homeTravel * (1 - spread)}px,0,0) scale(${scale})`;
    dream.style.transform = `translate3d(${-dreamTravel * (1 - spread)}px,0,0) scale(${scale})`;
    information.style.opacity = details;
    information.style.transform = `translate3d(0,${(1 - details) * 56}px,0)`;
    information.inert = !staticLayout && progress < .8;
    message.style.opacity = visible;
    message.style.transform = `translate3d(0,${(1 - visible) * 24}px,0)`;
    message.inert = !staticLayout && progress < .8;
    section.dataset.progress = progress.toFixed(4);
  }
  function requestRender() {
    if (!frame && !suspended && !destroyed) frame = requestAnimationFrame(() => render());
  }
  function geometry() {
    if (suspended || destroyed) return;
    top = section.getBoundingClientRect().top + window.scrollY;
    // Begin as soon as block four lifts; finish shortly after it clears the screen.
    reveal = 0;
    distance = Math.max(1, Math.min(section.offsetHeight - stage.offsetHeight, stage.offsetHeight * 1.12));
    headerThreshold = top + stage.offsetHeight - header.offsetHeight;
    previousProgress = NaN;
    const gap = parseFloat(getComputedStyle(split).columnGap) || 24;
    const wordsWidth = home.offsetWidth + dream.offsetWidth;
    initialScale = reduced.matches || mobile.matches ? 1 : Math.max(1, Math.min(1.9, (split.clientWidth * .9 - gap) / Math.max(1, wordsWidth)));
    const inset = Math.max(0, (split.clientWidth - wordsWidth * initialScale - gap) / 2);
    homeTravel = inset;
    dreamTravel = inset;
    render();
  }
  stage.addEventListener('focusin', () => {
    // Keyboard navigation must never focus the footer behind the previous block.
    if (!suspended && !reduced.matches && !mobile.matches && window.scrollY < top + reveal + distance * .8) {
      window.scrollTo({ top: top + reveal + distance * .9, behavior: 'instant' });
    }
  }, options);
  window.addEventListener('scroll', requestRender, { ...options, passive: true });
  window.addEventListener('resize', geometry, options);
  window.visualViewport?.addEventListener('resize', geometry, options);
  reduced.addEventListener('change', geometry, options);
  mobile.addEventListener('change', geometry, options);
  const resize = new ResizeObserver(geometry);
  resize.observe(stage);
  document.fonts?.ready.then(() => { if (!destroyed) geometry(); });
  geometry();
  return {
    suspend() { suspended = true; cancelAnimationFrame(frame); frame = 0; },
    resume(position = window.scrollY) { suspended = false; geometry(); render(position); },
    destroy() { destroyed = true; abort.abort(); resize.disconnect(); cancelAnimationFrame(frame); header.classList.remove('on-footer'); },
    diagnostics() { return { top, reveal, distance, progress, suspended }; },
  };
}
