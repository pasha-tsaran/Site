import { pageHref } from '../data/site.js';
import { constructionProjects, constructionPrice, constructionProjectHref } from '../data/construction.js';
import { siteHeaderMarkup } from '../components/site-header.js';
import { contactDialogsMarkup } from '../components/dialogs.js';

function constructionCard(project, index = 0) {
  const bath = project.id.endsWith('-bath');
  return `<article class="construction-card" style="--card-index:${index % 3}">
    <a class="construction-card-link" href="${constructionProjectHref(project.id)}" aria-labelledby="card-${project.id}">
      <div class="construction-card-photo"><img src="${project.image}" alt="${project.alt}" width="1122" height="1402" loading="${index < 3 ? 'eager' : 'lazy'}" decoding="async"><span class="construction-card-kind">${bath ? 'Баня' : 'Дом'}</span><span class="construction-card-arrow" aria-hidden="true">↗</span></div>
      <div class="construction-card-copy"><h2 id="card-${project.id}">${project.title}</h2><p class="construction-card-meta">${project.area} м² <span aria-hidden="true">·</span> ${project.rooms} ${project.rooms < 5 ? 'комнаты' : 'комнат'} <span aria-hidden="true">·</span> ${project.months} мес.</p><p class="construction-card-price">${constructionPrice(project.price)} <span>Смотреть проект ↗</span></p></div>
    </a>
  </article>`;
}

function constructionFooter() {
  return `<footer class="construction-footer"><div><a class="construction-footer-logo" href="${pageHref('/')}">ТВОЙ ДОМ</a><p>От первой идеи до своего дома.</p></div><a href="${pageHref('/construction/')}">Все дома и бани ↗</a><span class="construction-footer-demo">Тестовая версия · Параметры и цены демонстрационные</span></footer>`;
}

function constructionCatalogMarkup() {
  return `<main class="construction-main" id="construction-content">
    <section class="construction-intro" aria-labelledby="construction-heading"><h1 id="construction-heading">СТРОИТЕЛЬСТВО</h1><p class="construction-intro-copy">Дома и бани<br> Выберите ваш материал</p></section>
    <section class="construction-catalog" aria-label="Каталог домов и бань"><div class="construction-catalog-top"><p>Материал · Форма · Ваш характер</p><span>${constructionProjects.length} вариантов</span></div><div class="construction-grid">${constructionProjects.map(constructionCard).join('')}</div><p class="construction-demo-note">Тестовый каталог: площади, участки, количество комнат, сроки и цены приведены для примера.</p></section>
  </main>`;
}

function constructionProjectMarkup(project) {
  const isBath = project.id.endsWith('-bath');
  const facts = [['Площадь', project.area + ' м²'], ['Участок', project.plot + ' соток'], ['Комнаты', String(project.rooms)], ['Материал', project.material], ['Срок строительства', project.months + ' мес.'], ['Этажи', String(project.floors)]];
  const others = constructionProjects.filter(item => item.id !== project.id && item.id.endsWith('-bath') === isBath);
  const related = [...others, ...constructionProjects.filter(item => item.id !== project.id && !others.includes(item))].slice(0, 3);
  return `<main class="construction-main project-main" id="construction-content">
    <a class="construction-back" href="${pageHref('/construction/')}"><span aria-hidden="true">←</span> Все дома и бани</a>
    <article class="project-layout"><figure class="project-photo"><img src="${project.image}" alt="${project.alt}" width="1122" height="1402" fetchpriority="high" decoding="async"></figure>
      <div class="project-copy"><h1>${project.title}</h1><p class="project-description">${project.description}</p><dl class="project-facts">${facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><div class="project-price"><span>Примерная стоимость ${isBath ? 'бани' : 'дома'}</span><p>${constructionPrice(project.price)}</p></div><button class="project-cta" type="button" data-dialog="consultation" data-project-inquiry="${project.id}">Обсудить этот проект <span aria-hidden="true">↗</span></button><p class="project-demo-note">Параметры и цена тестовые. Участок не включён в стоимость.</p></div>
    </article>
    <section class="project-related" aria-labelledby="related-heading"><div class="project-related-heading"><h2 id="related-heading">Другие варианты</h2><a href="${pageHref('/construction/')}">Весь каталог ↗</a></div><div class="construction-grid">${related.map(constructionCard).join('')}</div></section>
  </main>`;
}

export function constructionPage(id = null) {
  const project = constructionProjects.find(item => item.id === id);
  const content = id && !project
    ? `<main class="construction-main project-not-found" id="construction-content"><h1>Проект пока не найден</h1><a class="construction-back" href="${pageHref('/construction/')}">Вернуться к домам и баням ↗</a></main>`
    : project ? constructionProjectMarkup(project) : constructionCatalogMarkup();
  const currentHref = id ? constructionProjectHref(id) : pageHref('/construction/');
  return `<a class="skip-link" href="${currentHref}#construction-content">Перейти к содержанию</a>${siteHeaderMarkup('construction')}${content}${constructionFooter()}${contactDialogsMarkup()}`;
}

export function setupConstructionPage(id) {
  const abort = new AbortController();
  const project = constructionProjects.find(item => item.id === id);
  if (project) {
    document.querySelector('[data-project-inquiry]')?.addEventListener('click', () => {
      const field = document.querySelector('#consultation [name="comment"]');
      if (field && !field.value.trim()) field.value = 'Интересует: ' + project.title.toLowerCase() + ', ' + project.area + ' м².';
    }, { signal: abort.signal });
  }
  document.title = (project ? project.title : id ? 'Проект не найден' : 'Строительство') + ' | Твой дом';
  return { destroy() { abort.abort(); } };
}
