export const portalMedia = {
  src: './assets/brand-transition.mp4',
  reverseSrc: './assets/brand-transition-reverse.mp4',
  poster: './assets/brand-transition-poster.jpg',
  duration: 4,
  zoomStart: 2.65,
  zoomEnd: 3.78,
  zoomScale: 14,
};
if (typeof window !== 'undefined') {
  if (window.__SITE_CONTENT?.videos?.portalForward) portalMedia.src = window.__SITE_CONTENT.videos.portalForward.src;
  if (window.__SITE_CONTENT?.videos?.portalReverse) portalMedia.reverseSrc = window.__SITE_CONTENT.videos.portalReverse.src;
}
