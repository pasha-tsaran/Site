import { mediaStreams } from './media-streams.js';
export const site = {
  name: 'ДОМ.',
  contacts: {
    demo: true,
    phone: '+7 (000) 000 00 00',
    phoneHref: 'tel:+70000000000',
    email: 'hello@tvoydom.example',
    telegram: '@tvoydom_demo',
    location: 'Одинцово, Московская область',
    mapImage: './assets/odintsovo-map.webp',
    mapHref: 'https://yandex.ru/maps/?ll=37.2777%2C55.6780&z=16&pt=37.2777%2C55.6780%2Cpm2gnm',
  },
  navigation: [
    { label: 'Главная', href: '/', page: 'architecture' },
    { label: 'Строительство', href: '/construction/', page: 'construction' },
    { label: 'Калькулятор', href: '/calculator/', page: 'calculator' },
    { label: 'Обсудить дом', dialog: 'consultation' },
    { label: 'О нас', href: '/about/', page: 'about' },
  ],
  privacy: { version: '25.10.2026', operatorName: '', inn: '', address: '', email: '', demo: true },
  // Sections remain independent so they can become full pages later.
  pages: { home: '/', architecture: '/', construction: '/construction/', calculator: '/calculator/', about: '/about/' },
  media: { src: './assets/hero-scrub.mp4?v=20261025-hq', poster: './assets/hero-poster.jpg', fps: 24, frameCount: 361, stream: mediaStreams.hero },
};

if (typeof window !== 'undefined') Object.assign(site.contacts, window.__SITE_CONTENT?.contacts || {});
if (typeof window !== 'undefined' && window.__SITE_CONTENT?.videos?.hero) {
  const video = window.__SITE_CONTENT.videos.hero;
  Object.assign(site.media, { src:video.src, fps:video.fps, frameCount:Math.max(2, Math.round(video.duration * video.fps)), stream:null });
}

// The standalone HTML uses query parameters for the same pages and embedded images.
export function pageHref(path) {
  if (typeof window === 'undefined' || window.location?.protocol !== 'file:') return path;
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  const route = path.split('/').filter(Boolean);
  if (route[0] === 'construction') {
    url.searchParams.set('page', 'construction');
    if (route[1]) url.searchParams.set('model', route[1]);
  }
  if (route[0] === 'about') url.searchParams.set('page', 'about');
  if (route[0] === 'calculator') url.searchParams.set('page', 'calculator');
  if (['privacy', 'consent'].includes(route[0])) url.searchParams.set('page', route[0]);
  return url.href;
}
