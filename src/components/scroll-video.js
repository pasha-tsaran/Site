import { createSegmentedVideo } from './segmented-video.js';
const clamp = value => Math.max(0, Math.min(1, value));
const ramp = (a, b, value) => clamp((value - a) / (b - a));

export function heroScrollEase(t) {
  const progress = clamp(t);
  if (progress <= .5) {
    const core = progress * 2;
    // Start at rest and meet the tail with the same velocity.
    return (2 * core ** 2 - core ** 3) / 1.5;
  }
  const tail = (progress - .5) * 2;
  return (1 + .5 * (1 - (1 - tail) ** 2)) / 1.5;
}

export function createHeroInertia() {
  let impulses = [], direction = 0;
  return {
    push(amount, time) {
      if (!Number.isFinite(amount) || !amount) return;
      // A reversal starts at the current image, without an old forward tail.
      if (direction && Math.sign(amount) !== direction) impulses = [];
      direction = Math.sign(amount);
      impulses.push({ amount, start: time, applied: 0 });
    },
    advance(time) {
      let delta = 0;
      impulses = impulses.filter(impulse => {
        const elapsed = clamp((time - impulse.start) / 900);
        const position = heroScrollEase(elapsed) * 1.5;
        delta += impulse.amount * (position - impulse.applied);
        impulse.applied = position;
        return elapsed < 1;
      });
      if (!impulses.length) direction = 0;
      return delta;
    },
    clear() { impulses = []; direction = 0; },
    get active() { return impulses.length > 0; },
  };
}

export function createScrollVideo(section, media) {
  const video = section.querySelector('video');
  const stage = section.querySelector('.hero-stage');
  const status = section.querySelector('.media-status');
  const loading = section.querySelector('[data-loading]');
  const retry = section.querySelector('[data-retry]');
  const header = document.querySelector('.site-header');
  const gallery = document.querySelector('[data-gallery]');
  const scenes = [...section.querySelectorAll('[data-scene]')];
  const abort = new AbortController();
  const events = { signal: abort.signal };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let staticMode = reduced.matches, suspended = false, destroyed = false, lenis = null;
  const scrollLocks = new Set();
  let raf = 0, top = 0, distance = 1, desired = 0, lastRequested = -1, painted = -1, ready = false;
  let previousProgress = -1, seekStarted = 0, decodeSamples = [], blobUrl, loadAbort, slowTimer;
  let galleryTop = Infinity, galleryHeight = 0, headerThreshold = Infinity, lastPageY = window.scrollY, gallerySnapArmed = true, snapping = false;
  let stream = null, stageHeight = 1;
  const inertia = createHeroInertia();
  let inertiaPosition = window.scrollY;

  function geometry() {
    top = section.getBoundingClientRect().top + window.scrollY;
    distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
    galleryTop = gallery ? gallery.getBoundingClientRect().top + window.scrollY : Infinity;
    galleryHeight = gallery?.offsetHeight || window.innerHeight;
    headerThreshold = top + distance + stage.offsetHeight * .65;
    stageHeight = stage.offsetHeight;
    lenis?.resize();
    requestRender();
  }
  function setScene(element, opacity, y) {
    const visible = opacity > .015;
    element.hidden = !visible;
    element.inert = !visible;
    element.style.opacity = opacity;
    element.style.transform = `translate3d(0,${y}px,0)`;
  }
  function renderScene(progress) {
    if (progress === previousProgress) return;
    previousProgress = progress;
    section.dataset.progress = progress.toFixed(4);
    const opening = 1 - ramp(.025, .16, progress);
    const inside = ramp(.27, .33, progress) * (1 - ramp(.53, .59, progress));
    const ending = ramp(.79, .91, progress);
    setScene(scenes[0], opening, -ramp(.025, .16, progress) * 40);
    setScene(scenes[1], inside, (1 - inside) * 18);
    setScene(scenes[2], ending, (1 - ending) * 24);
  }
  function revealFrame() {
    painted = Math.max(0, lastRequested);
    section.dataset.frame = String(painted);
    if (!ready) return;
    video.classList.add('is-ready');
    status.hidden = true;
    // Keep captions attached to the decoded image, including quick reversals.
    renderScene(painted / (media.frameCount - 1));
  }
  function seek() {
    if (staticMode || suspended || !ready || video.readyState < 2 || video.seeking || desired === lastRequested) return;
    const time = Math.min(desired / media.fps, (media.frameCount - 1) / media.fps);
    if (stream && !stream.hasTime(time)) return;
    lastRequested = desired;
    if (Math.abs(video.currentTime - time) < .5 / media.fps) { revealFrame(); return; }
    seekStarted = performance.now();
    video.currentTime = time;
  }
  function render(time) {
    raf = 0;
    if (destroyed || suspended || document.hidden) return;
    lenis?.raf(time);
    if (inertia.active && lenis) {
      const delta = inertia.advance(time);
      inertiaPosition = Math.max(0, Math.min(lenis.limit ?? Infinity, inertiaPosition + delta));
      if (delta) lenis.scrollTo(inertiaPosition, { immediate: true });
    }
    snapToGallery();
    const progress = staticMode ? 0 : clamp((window.scrollY - top) / distance);
    // Header tone follows page position even in the static mode.
    header.classList.toggle('on-paper', window.scrollY > headerThreshold);
    if (staticMode || !ready) renderScene(0);
    desired = Math.round(progress * (media.frameCount - 1));
    stream?.setActive(window.scrollY <= top + distance + stageHeight);
    stream?.requestTime(desired / media.fps);
    seek();
    if (inertia.active || lenis?.isScrolling === 'smooth') requestRender();
  }
  function addImpulse(amount) {
    if (!inertia.active) {
      inertiaPosition = window.scrollY;
      lenis.scrollTo(inertiaPosition, { immediate: true });
    }
    inertia.push(amount, performance.now());
    requestRender();
  }
  function requestRender() { if (!raf && !destroyed && !suspended && !document.hidden) raf = requestAnimationFrame(render); }
  function snapToGallery() {
    const y = window.scrollY;
    const viewport = window.innerHeight;
    const threshold = galleryTop - viewport * .45;
    if (y < galleryTop - viewport || y > galleryTop + galleryHeight) gallerySnapArmed = true;
    const approaching = y > lastPageY && lastPageY < galleryTop && y >= threshold;
    lastPageY = y;
    if (!gallery || !gallerySnapArmed || snapping || suspended || !approaching || y > galleryTop + viewport * .25) return;
    gallerySnapArmed = false;
    snapping = true;
    inertia.clear();
    const complete = () => { snapping = false; lastPageY = window.scrollY; };
    if (lenis && !reduced.matches) {
      lenis.scrollTo(galleryTop, { duration: .8, lock: true, force: true, onComplete: complete });
    } else {
      window.scrollTo({ top: galleryTop, behavior: 'instant' });
      complete();
    }
  }
  function loaded() {
    ready = true;
    clearTimeout(slowTimer);
    revealFrame();
    requestRender();
  }
  function error() {
    clearTimeout(slowTimer);
    loading.textContent = 'Видео не загрузилось. Можно продолжить ниже.';
    retry.hidden = false;
    status.hidden = false;
  }
  async function loadBlob() {
    if (loadAbort || destroyed || staticMode) return;
    loadAbort = new AbortController();
    ready = false;
    loading.textContent = 'Готовим плавное путешествие…';
    status.hidden = false;
    retry.hidden = true;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => { if (!ready) loading.textContent = 'Готовим видео. Вы можете листать дальше.'; }, 8000);
    try {
      const response = await fetch(media.src, { signal: loadAbort.signal });
      if (!response.ok) throw new Error('Video unavailable');
      const blob = await response.blob();
      if (destroyed || staticMode) return;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
      lastRequested = -1;
      video.src = blobUrl;
      video.load();
    } catch (err) { if (err.name !== 'AbortError') { clearTimeout(slowTimer); error(); } }
    finally { loadAbort = null; }
  }
  function streamFallback() {
    if (destroyed) return;
    stream?.destroy();
    stream = null;
    loadBlob();
  }
  function load() {
    if (staticMode) { status.hidden = true; return; }
    if (media.src.startsWith('data:') || media.src.startsWith('blob:')) {
      video.src = media.src;
      video.load();
    } else {
      // Prioritize short, independently decodable fragments; keep the original MP4 as a fallback.
      stream?.destroy();
      stream = createSegmentedVideo(video, media.stream, { onProgress: requestRender, onError: streamFallback });
      if (!stream) loadBlob();
    }
  }
  function applyMotion() {
    inertia.clear();
    if (staticMode && lenis) { lenis.destroy(); lenis = null; }
    else if (!staticMode && !lenis && window.Lenis) {
      lenis = new window.Lenis({ autoRaf: false, lerp: 0, duration: .65, easing: heroScrollEase, smoothWheel: true, syncTouch: false, wheelMultiplier: 1, anchors: true, prevent: node => node.tagName === 'DIALOG', virtualScroll: data => {
        const event = data.event;
        if (event.type === 'wheel' && !event.ctrlKey && !event.defaultPrevented && !suspended && !snapping && !staticMode && window.scrollY >= top - 1 && window.scrollY <= top + distance && !event.target?.closest?.('dialog,[data-lenis-prevent]') && Math.abs(data.deltaY) >= Math.abs(data.deltaX || 0)) {
          if (event.cancelable) event.preventDefault();
          addImpulse(data.deltaY);
          return false;
        }
        return true;
      } });
      lenis.on('virtual-scroll', () => {
        // The scheduler sleeps at rest. Refresh Lenis' clock before it starts
        // a new animation, otherwise idle seconds finish it on its first tick.
        if (!raf) lenis.raf(performance.now());
        requestRender();
      });
      if (scrollLocks.size) lenis.stop();
    }
    section.classList.toggle('is-static', staticMode);
    const toggle = section.querySelector('[data-motion-toggle]');
    toggle.hidden = !staticMode;
    previousProgress = -1;
    geometry();
  }
  video.addEventListener('loadeddata', loaded, events);
  video.addEventListener('seeked', () => {
    decodeSamples.push(performance.now() - seekStarted);
    if (decodeSamples.length > 100) decodeSamples.shift();
    // Retain the completed frame before scheduling the newest target.
    revealFrame();
    requestRender();
  }, events);
  video.addEventListener('error', () => { if (stream) streamFallback(); else error(); }, events);
  // iOS may require a trusted interaction to prime the muted inline decoder.
  const prime = () => {
    inertia.clear();
    if (staticMode || !ready) return;
    const playback = video.play();
    playback?.then(() => { video.pause(); lastRequested = -1; requestRender(); }).catch(() => {});
  };
  window.addEventListener('pointerdown', prime, { ...events, once: true, passive: true });
  window.addEventListener('touchstart', prime, { ...events, once: true, passive: true });
  window.addEventListener('pointerdown', () => inertia.clear(), { ...events, passive: true });
  window.addEventListener('touchstart', () => inertia.clear(), { ...events, passive: true });
  window.addEventListener('scroll', requestRender, { ...events, passive: true });
  window.addEventListener('keydown', event => {
    if (['PageUp','PageDown','Home','End',' '].includes(event.key)) inertia.clear();
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || suspended || snapping || !lenis || staticMode || window.scrollY > top + distance || event.target?.closest?.('input,textarea,select,button,a,[contenteditable],dialog,[data-models]')) return;
    const delta=event.key==='ArrowDown'?80:event.key==='ArrowUp'?-80:0;
    if (!delta) return;
    event.preventDefault();
    addImpulse(delta);
  }, events);
  document.addEventListener('click', () => { inertia.clear(); requestRender(); }, events);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { inertia.clear(); cancelAnimationFrame(raf); raf = 0; }
    else requestRender();
  }, events);
  window.addEventListener('resize', geometry, events);
  window.visualViewport?.addEventListener('resize', geometry, events);
  retry.addEventListener('click', () => { lastRequested = -1; streamFallback(); }, events);
  section.querySelector('[data-motion-toggle]').addEventListener('click', () => { staticMode = false; applyMotion(); load(); }, events);
  reduced.addEventListener('change', () => { staticMode = reduced.matches; applyMotion(); if (!staticMode && !ready) load(); }, events);
  const observer = new ResizeObserver(geometry);
  observer.observe(section);
  observer.observe(stage);
  applyMotion();
  load();
  return {
    lock(reason) {
      scrollLocks.add(reason);
      inertia.clear();
      suspended = true;
      cancelAnimationFrame(raf); raf = 0;
      snapping = false;
      lenis?.stop();
    },
    unlock(reason, position = window.scrollY) {
      scrollLocks.delete(reason);
      if (destroyed || scrollLocks.size) return;
      lenis?.start();
      geometry();
      if (lenis) lenis.scrollTo(position, { immediate: true, force: true });
      else window.scrollTo({ top: position, behavior: 'instant' });
      snapping = false;
      lastPageY = window.scrollY;
      suspended = false;
      requestRender();
    },
    suspend() { this.lock('ui'); },
    resume(position = window.scrollY) { this.unlock('ui', position); },
    destroy() {
      destroyed = true;
      inertia.clear();
      abort.abort(); loadAbort?.abort(); observer.disconnect(); clearTimeout(slowTimer); cancelAnimationFrame(raf);
      lenis?.destroy();
      stream?.destroy();
      video.pause(); video.removeAttribute('src'); video.load();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
    diagnostics() { return { desired, painted, decodeSamples: [...decodeSamples], ready, inertia:inertia.active, stream:stream?.diagnostics() }; },
  };
}
