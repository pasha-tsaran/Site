export const allHouseModels = [
  { id: 'brick', title: 'Дом из кирпича', note: 'Кирпичная кладка · характер в каждой детали', image: './assets/models/model-01.webp', alt: 'Двухэтажный кирпичный дом с садом, дорожками и деревянным забором на собственном участке' },
  { id: 'aerated', title: 'Дом из газобетона', note: 'Газобетон · свет и простор', image: './assets/models/model-02.webp', alt: 'Одноэтажный светлый дом из газобетона с террасой и огороженным двором' },
  { id: 'ceramic', title: 'Дом из керамических блоков', note: 'Тёплая керамика · основа семейного дома', image: './assets/models/model-03.webp', alt: 'Дом из керамических блоков с бежевым фасадом, садом и металлическим забором' },
  { id: 'frame', title: 'Каркасный дом', note: 'Деревянный каркас · современный силуэт', image: './assets/models/model-04.webp', alt: 'Тёмный каркасный барнхаус с террасой на огороженном участке у леса' },
  { id: 'timber', title: 'Дом из клеёного бруса', note: 'Клеёный брус · естественная фактура дерева', image: './assets/models/model-05.webp', alt: 'Одноэтажный дом из клеёного бруса с верандой, вид через открытую калитку частного сада' },
  { id: 'concrete', title: 'Дом из монолитного бетона', note: 'Монолитный бетон · свобода архитектуры', image: './assets/models/model-06.webp', alt: 'Современный монолитный дом с плоской крышей, гаражом и огороженным двором' },
  { id: 'log-bath', title: 'Баня из бревна', note: 'Бревно · традиция загородного отдыха', image: './assets/models/model-07.webp', alt: 'Бревенчатая баня с крыльцом и небольшим прудом за деревянной калиткой' },
  { id: 'timber-bath', title: 'Баня из бруса', note: 'Брус · своя территория отдыха', image: './assets/models/model-08.webp', alt: 'Баня из бруса с террасой и бассейном внутри огороженного участка' },
  { id: 'brick-bath', title: 'Баня из кирпича', note: 'Кирпич · уютный двор для отдыха', image: './assets/models/model-09.webp', alt: 'Кирпичная баня с хозяйственным двориком, цветниками и забором по границе участка' },
];
// Overrides are supplied by the same-origin content service before modules load.
if (typeof window !== 'undefined') for (const model of allHouseModels) {
  Object.assign(model, window.__SITE_CONTENT?.models?.[model.id] || {});
}
export const houseModels = allHouseModels.filter(model => !globalThis.window?.__SITE_CONTENT?.deletedModels?.includes(model.id));
if (typeof window !== 'undefined') for (const model of window.__SITE_CONTENT?.addedModels || []) {
  if (!window.__SITE_CONTENT?.deletedModels?.includes(model.id)) houseModels.push({ ...model, ...window.__SITE_CONTENT?.models?.[model.id] });
}
