import { mediaStreams } from './media-streams.js';
export const storyMedia = {src:'./assets/dream-story.mp4',poster:'./assets/houses/house-01.webp',duration:19,stream:mediaStreams.story};
if (typeof window !== 'undefined' && window.__SITE_CONTENT?.videos?.story) Object.assign(storyMedia, { src:window.__SITE_CONTENT.videos.story.src, stream:null });
export const storyChapters = [
  {label:'Строим',caption:'От первого шага. 10 этапов строительства.',start:0},
  {label:'Создаём',caption:'Работа, из которой складывается дом.',start:2},
  {label:'Воплощаем',caption:'15 домов. 15 разных характеров.',start:8},
  {label:'Живём',caption:'Ваш дом. И пространство вокруг.',start:11},
];

export const gallery = [
  { src: './assets/houses/house-01.webp', title: 'Дом и баня Один ансамбль', material: 'Камень и дерево', alt: 'Вид сверху на каменный дом, деревянную баню и мощёный двор', group: 'house' },
  { src: './assets/houses/house-02.webp', title: 'Тишина среди сосен', material: 'Дерево', alt: 'Деревянный скандинавский дом среди сосен, камней и мха', group: 'house' },
  { src: './assets/houses/house-03.webp', title: 'Характер в каждой детали', material: 'Кирпич', alt: 'Кирпичный дом с каменной площадкой перед входом', group: 'house' },
  { src: './assets/houses/house-04.webp', title: 'Чистая геометрия', material: 'Блоки', alt: 'Одноэтажный светлый дом с плоской крышей и террасой', group: 'house' },
  { src: './assets/houses/house-05.webp', title: 'Своя точка притяжения', material: 'Дерево и камень', alt: 'Вид сверху на тёмный барнхаус с баней на каменистом участке', group: 'house' },
  { src: './assets/houses/house-06.webp', title: 'Основательно Естественно', material: 'Натуральный камень', alt: 'Современный двухэтажный дом с фасадом из светлого камня', group: 'house' },
  { src: './assets/houses/house-07.webp', title: 'Открыт природе', material: 'Каркас и дерево', alt: 'Каркасный дом в форме буквы Г с крытой террасой', group: 'house' },
  { src: './assets/houses/house-08.webp', title: 'Тёплый оттенок жизни', material: 'Кирпич', alt: 'Компактный терракотовый кирпичный дом с асимметричной крышей', group: 'house' },
  { src: './assets/houses/house-09.webp', title: 'За городом В своём ритме', material: 'Камень и дерево', alt: 'Шале с каменным нижним этажом и деревянным верхним', group: 'house' },
  { src: './assets/houses/house-10.webp', title: 'Жизнь со стороны сада', material: 'Кирпич и дерево', alt: 'Вид с каменной задней террасы на дом, перголу и осеннее дерево', group: 'house' },
  { src: './assets/houses/build-01.webp', title: 'Всё начинается с участка', material: '01 / Подготовка', alt: 'Геодезисты размечают грунтовый участок под строительство дома', group: 'construction' },
  { src: './assets/houses/build-02.webp', title: 'Надёжность в основании', material: '02 / Фундамент', alt: 'Рабочие в касках собирают арматуру и опалубку фундамента', group: 'construction' },
  { src: './assets/houses/build-03.webp', title: 'Идея обретает форму', material: '03 / Стены', alt: 'Каменщики возводят стены частного дома из блоков', group: 'construction' },
  { src: './assets/houses/build-04.webp', title: 'Шаг за шагом к дому', material: '04 / Каркас и крыша', alt: 'Плотники на строительных лесах монтируют деревянную крышу дома', group: 'construction' },
];
