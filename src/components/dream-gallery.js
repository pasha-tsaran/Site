import { storyMedia } from '../data/gallery.js';
import { createSegmentedVideo } from './segmented-video.js';

export function dreamGalleryMarkup() {
  return `<section class="dream-gallery" id="architecture" aria-labelledby="architecture-heading" data-gallery>
    <div class="dream-section-label">Архитектура · Строительство · Ваш дом</div>
    <div class="dream-stage">
      <h2 id="architecture-heading"><span>ДОМА</span><br>ВАШЕЙ МЕЧТЫ</h2>
      <figure class="dream-figure">
        <div class="dream-media">
          <img class="dream-poster" src="${storyMedia.poster}" alt="Этапы строительства и архитектура загородных домов" width="1280" height="720" loading="lazy">
          <video class="dream-film" loop muted playsinline preload="none" disablepictureinpicture disableremoteplayback poster="${storyMedia.poster}" aria-label="От строительства до готового дома: визуальная история" aria-describedby="story-description" tabindex="-1" data-story-video data-src="${storyMedia.src}"></video>
          <div class="story-loading" role="status" data-story-status>Готовим историю…</div>
        </div>
      </figure>
      <div class="dream-copy">
        <p class="dream-statement">От первого камня<br>до места, которое вы называете домом</p>
        <p class="dream-description">Продумываем архитектуру, возводим дом и создаём пространство вокруг<br class="desktop-break"> для тихих утренних часов, встреч с близкими и вашей повседневной жизни.</p>
      </div>
      <p id="story-description" class="sr-only">Десять этапов строительства, работа строителей, пятнадцать готовых домов и плавный облёт участка. История автоматически повторяется, пока этот блок на экране.</p>
    </div>
    <div class="dream-section-bottom"><span>Дерево · Камень · Характер</span><button class="dream-cta" type="button" data-dialog="consultation">Обсудить свой дом <span aria-hidden="true">↗</span></button><span>Архитектурные визуализации</span></div>
  </section>`;
}

export function setupDreamGallery(section) {
  const video = section.querySelector('[data-story-video]');
  const status = section.querySelector('[data-story-status]');
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  let visible = false, suspended = false, destroyed = false, loaded = false, failed = false;
  let prepared = false, pending = false, blobUrl, stream = null, streamDisabled = false;
  video.muted = true;
  video.loop = true;
  video.controls = false;

  function showStatus(message = '') { status.textContent = message; status.hidden = !message; }
  async function load() {
    if (loaded || destroyed) return;
    loaded = true;
    if (!streamDisabled) {
      stream = createSegmentedVideo(video, storyMedia.stream, {priority:'low',onError:() => {
        stream?.destroy(); stream = null; streamDisabled = true; failed = false; loaded = false; prepared = false; load();
      }});
      if (stream) return;
    }
    try {
      const src = video.dataset.src;
      if (src.startsWith('data:') || src.startsWith('blob:')) video.src = src;
      else {
        // Buffer once before playback. The loop never waits for remote ranges.
        const response = await fetch(src, { signal: abort.signal, priority: 'low' });
        if (!response.ok) throw new Error('Story video unavailable');
        const blob = await response.blob();
        if (destroyed) return;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        blobUrl = URL.createObjectURL(blob);
        video.src = blobUrl;
      }
      video.preload = 'auto';
      failed = false;
      video.load();
    } catch (error) {
      if (error.name !== 'AbortError' && !destroyed) {
        failed = true;
        showStatus('Видео временно недоступно');
      }
    }
  }
  function syncPlayback() {
    if (destroyed) return;
    if (!visible || suspended || document.hidden || failed) {
      video.pause();
      section.dataset.playing = 'false';
      return;
    }
    load();
    if (!prepared || pending || !video.paused) return;
    pending = true;
    video.play().then(() => {
      pending = false;
      if (destroyed || !visible || suspended || document.hidden) video.pause();
      section.dataset.playing = String(!video.paused);
    }).catch(() => { pending = false; section.dataset.playing = 'false'; });
  }
  video.addEventListener('loadeddata', () => { prepared = true; section.classList.add('story-ready'); showStatus(); syncPlayback(); }, opts);
  video.addEventListener('playing', () => { showStatus(); section.dataset.playing = 'true'; }, opts);
  video.addEventListener('pause', () => { section.dataset.playing = 'false'; }, opts);
  video.addEventListener('waiting', () => { if (visible) showStatus('Загружаем видео…'); }, opts);
  video.addEventListener('canplay', () => { showStatus(); syncPlayback(); }, opts);
  video.addEventListener('error', () => {
    if (stream) { stream.destroy(); stream = null; streamDisabled = true; failed = false; loaded = false; prepared = false; load(); }
    else { failed = true; showStatus('Видео временно недоступно'); }
  }, opts);
  document.addEventListener('visibilitychange', syncPlayback, opts);
  const prime = () => { if (visible && video.paused) syncPlayback(); };
  window.addEventListener('pointerdown', prime, { ...opts, passive: true });
  window.addEventListener('touchstart', prime, { ...opts, passive: true });
  const preloadObserver = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { load(); preloadObserver.disconnect(); }
  }, { rootMargin: '300% 0px' });
  const playbackObserver = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible && failed) { failed = false; loaded = false; prepared = false; }
    syncPlayback();
  }, { threshold: 0 });
  preloadObserver.observe(section);
  playbackObserver.observe(section);
  return {
    suspend() { suspended = true; syncPlayback(); },
    resume() { suspended = false; syncPlayback(); },
    destroy() {
      destroyed = true;
      stream?.destroy();
      abort.abort();
      preloadObserver.disconnect();
      playbackObserver.disconnect();
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
  };
}
