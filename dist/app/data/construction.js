import { houseModels } from './models.js';
import { pageHref } from './site.js';

// Demonstration specifications; photographs and names come from the home catalogue.
const constructionSpecs = {
  brick: { area: 210, plot: 12, rooms: 5, floors: 2, material: 'Кирпич', months: 8, price: 14800000, description: 'Двухэтажный дом с выразительной кирпичной кладкой и просторной общей зоной. На участке предусмотрено место для сада, террасы и семейного отдыха.' },
  aerated: { area: 158, plot: 10, rooms: 4, floors: 1, material: 'Газобетон', months: 6, price: 9800000, description: 'Светлый одноэтажный дом с выходом на террасу. Жилые комнаты и общая зона собраны на одном уровне, а большие окна связывают интерьер с садом.' },
  ceramic: { area: 192, plot: 11, rooms: 5, floors: 2, material: 'Керамические блоки', months: 7, price: 12600000, description: 'Семейный дом из керамических блоков с двумя этажами и спокойным светлым фасадом. Общие и личные пространства разделены, рядом с домом остаётся место для зелёного двора.' },
  frame: { area: 112, plot: 8, rooms: 3, floors: 1, material: 'Деревянный каркас', months: 4, price: 6900000, description: 'Каркасный дом в лаконичной форме барнхауса. Высокая общая зона, терраса и тёмная деревянная отделка задают характер небольшого загородного дома.' },
  timber: { area: 146, plot: 10, rooms: 4, floors: 1, material: 'Клеёный брус', months: 5, price: 10900000, description: 'Деревянный дом с открытой фактурой клеёного бруса и крытой верандой. Планировка объединяет повседневную жизнь внутри и отдых на свежем воздухе.' },
  concrete: { area: 264, plot: 14, rooms: 6, floors: 2, material: 'Монолитный бетон', months: 10, price: 19500000, description: 'Современный дом с плоской кровлей и крупными проёмами. Монолитная конструкция позволяет собрать просторную общую зону, отдельные жилые комнаты и гараж в одном объёме.' },
  'log-bath': { area: 64, plot: 6, rooms: 3, floors: 1, material: 'Оцилиндрованное бревно', months: 3, price: 3800000, description: 'Бревенчатая баня с крыльцом и местом для отдыха после парной. В тестовой планировке предусмотрены парная, моечная и комната отдыха.' },
  'timber-bath': { area: 56, plot: 6, rooms: 3, floors: 1, material: 'Профилированный брус', months: 3, price: 3200000, description: 'Компактная баня из бруса с террасой для загородных выходных. Парная, моечная и комната отдыха дополняются открытой зоной рядом с садом.' },
  'brick-bath': { area: 86, plot: 8, rooms: 4, floors: 1, material: 'Кирпич', months: 5, price: 5600000, description: 'Кирпичная баня с отдельной комнатой отдыха и выходом в закрытый двор. Внутри предусмотрены парная, моечная, комната отдыха и дополнительная комната.' },
};

if (typeof window !== 'undefined') for (const [id, spec] of Object.entries(constructionSpecs)) {
  Object.assign(spec, window.__SITE_CONTENT?.projects?.[id] || {});
}
if (typeof window !== 'undefined') for (const model of window.__SITE_CONTENT?.addedModels || []) {
  constructionSpecs[model.id] = { ...window.__SITE_CONTENT?.projects?.[model.id] };
}

export const constructionProjects = houseModels.map(model => ({ ...model, ...constructionSpecs[model.id] }));
export const constructionPrice = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
export const constructionProjectHref = id => pageHref('/construction/' + id + '/');

export function readConstructionRoute() {
  if (window.location.protocol === 'file:') {
    const query = new URLSearchParams(window.location.search);
    return query.get('page') === 'construction' ? { id: query.get('model') || null } : null;
  }
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  const route = /^\/construction(?:\/([^/]+))?\/?$/.exec(path);
  return route ? { id: route[1] || null } : null;
}
