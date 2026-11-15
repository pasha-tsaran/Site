import { pageHref } from '../data/site.js';

export function siteFooterMarkup() {
  return `<footer class="construction-footer"><div><a class="construction-footer-logo" href="${pageHref('/')}">ТВОЙ ДОМ</a><p>От первой идеи до своего дома.</p></div><a href="${pageHref('/construction/')}">Все дома и бани ↗</a><a href="${pageHref('/privacy/')}">Политика конфиденциальности</a><span class="construction-footer-demo">Тестовая версия · Контент и параметры приведены для примера</span></footer>`;
}
