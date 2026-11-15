import { site } from '../data/site.js';
import { dreamGalleryMarkup } from '../components/dream-gallery.js';
import { brandPortalMarkup, lifeSectionMarkup } from '../components/brand-portal.js';
import { dreamFooterMarkup } from '../components/dream-footer.js';
import { siteHeaderMarkup } from '../components/site-header.js';
import { contactDialogsMarkup } from '../components/dialogs.js';

export function homePage() {
  return `
    <a class="skip-link" href="#architecture">Перейти к содержанию</a>
    ${siteHeaderMarkup('architecture')}
    <main id="top">
      <section class="hero-journey" aria-label="Путешествие по дому" data-journey>
        <div class="hero-stage">
          <img class="hero-poster" src="${site.media.poster}" alt="Современный дом: каменный фасад, деревянные двери и сад у входа" fetchpriority="high">
          <video class="hero-video" muted playsinline preload="auto" poster="${site.media.poster}" aria-hidden="true" tabindex="-1"></video>
          <div class="hero-shade" aria-hidden="true"></div>
          <div class="hero-eyebrow"><span class="status-dot"></span>Частные дома Индивидуальный подход</div>
          <div class="hero-title" data-scene="opening">
            <h1><span class="title-first">ДОМ</span><span class="title-second">НАЧИНАЕТСЯ</span><span class="title-third">С ВАС</span></h1>
          </div>
          <div class="scene-note" data-scene="inside" hidden>
            <span class="eyebrow">Внутри ваша жизнь</span>
            <p>Больше света<br>Больше вашего</p>
          </div>
          <div class="scene-ending" data-scene="ending" hidden>
            <span class="eyebrow">От первого шага до своего дома</span>
            <p>ВЫ ДОМА</p>
            <button class="light-button" data-dialog="consultation">Давайте начнём <span aria-hidden="true">↗</span></button>
          </div>
          <div class="hero-bottom">
            <a class="scroll-hint" href="#architecture"><span class="scroll-arrow" aria-hidden="true">↓</span><span>Листайте, чтобы<br>почувствовать пространство</span></a>
          </div>
          <div class="media-status" role="status"><span data-loading>Готовим путешествие…</span><button data-retry hidden>Повторить загрузку</button></div>
          <button class="static-toggle" data-motion-toggle hidden>Включить движение</button>
        </div>
      </section>
      ${dreamGalleryMarkup()}
      ${brandPortalMarkup()}
      ${lifeSectionMarkup()}
    </main>
    ${dreamFooterMarkup()}
    ${contactDialogsMarkup()}
  `;
}
