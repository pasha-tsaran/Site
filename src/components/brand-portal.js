import { modelsGalleryMarkup } from './models-gallery.js';
import { portalMedia } from '../data/portal.js';

const portalClamp = value => Math.max(0, Math.min(1, value));

export function brandPortalMarkup() {
  return '<section class="brand-portal" id="transition" aria-label="Твой дом переход" data-brand-portal>' +
    '<div class="portal-stage">' +
      '<div class="portal-destination" aria-hidden="true" inert></div>' +
      '<video data-portal-forward class="portal-film is-active" muted playsinline preload="none" disablepictureinpicture disableremoteplayback poster="' + portalMedia.poster + '" aria-label="Сборка логотипа Твой ДОМ и приближение к букве О" tabindex="-1" data-src="' + portalMedia.src + '"></video>' +
      '<video data-portal-reverse class="portal-film" muted playsinline preload="none" disablepictureinpicture disableremoteplayback aria-hidden="true" tabindex="-1" data-src="' + portalMedia.reverseSrc + '"></video>' +
      '<div class="portal-paper" aria-hidden="true"></div>' +
      '<button class="portal-start" type="button" hidden>Начать переход <span aria-hidden="true">↗</span></button>' +
      '<button class="portal-recovery" type="button" hidden>Продолжить без анимации</button>' +
      '<span class="sr-only" role="status" data-portal-status></span>' +
    '</div></section>';
}

export function lifeSectionMarkup() {
  return modelsGalleryMarkup();
}

// A direct link from the editor holds the actual transition video in its site block.
export function setupPortalLocationPreview(section, direction) {
  const reverse = direction === 'transition-reverse';
  const video = section.querySelector(reverse ? '[data-portal-reverse]' : '[data-portal-forward]');
  section.dataset.locationPreview = reverse ? 'reverse' : 'forward';
  section.querySelectorAll('.portal-film').forEach(item => item.classList.toggle('is-active', item === video));
  section.querySelector('.portal-paper').style.opacity = '0';
  video.src = video.dataset.src;
  video.controls = true;
  video.muted = true;
  video.preload = 'metadata';
  video.setAttribute('aria-hidden','false');
  video.removeAttribute('tabindex');
  const caption=document.createElement('div'); caption.className='portal-location-caption';
  const text=document.createElement('span'); text.textContent='Главная · блок 3 · ' + (reverse ? 'Обратный переход' : 'Переход к каталогу');
  const back=document.createElement('a'); back.href='/#architecture'; back.textContent='Открыть обычную страницу ↗';
  caption.append(text,back); section.querySelector('.portal-stage').append(caption);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(()=>{});
  return { suspend(){video.pause();}, resume(){}, destroy(){video.pause();video.removeAttribute('src');video.load();caption.remove();} };
}

export function setupBrandPortal(section, controls = {}) {
  const stage = section.querySelector('.portal-stage');
  const videos = {
    forward: section.querySelector('[data-portal-forward]'),
    reverse: section.querySelector('[data-portal-reverse]'),
  };
  const destinationView = section.querySelector('.portal-destination');
  const paper = section.querySelector('.portal-paper');
  const startButton = section.querySelector('.portal-start');
  const recovery = section.querySelector('.portal-recovery');
  const status = section.querySelector('[data-portal-status]');
  const header = document.querySelector('.site-header');
  const life = document.querySelector('[data-olive-section]');
  const gallery = document.querySelector('[data-gallery]');
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  const blocking = { ...opts, capture: true, passive: false };
  let side = 'above', direction = 'forward', running = false, suspended = false, destroyed = false;
  let frame = 0, positionFrame = 0, timeout = 0, runId = 0, pending = false, deferredEnd = false;
  let activeVideo = videos.forward, progress = 0, paperOpacity = 1, touchY = null;
  let anchor = 0, entry = 0, lockY = 0, below = 0, above = 0, originX = 0, originY = 0, shiftX = 0, shiftY = 0, destination = null;
  let loaded = false;
  let touchStartX=0,touchStartY=0,touchModels=false;
  let headerBottom = 0, sectionHeight = 0;

  // Preview the real destination, so the final frame and the live section align.
  // The preview has no duplicate IDs or interactive controls.
  const preview = life.cloneNode(true);
  for (const node of [preview, ...preview.querySelectorAll('[id],[aria-labelledby],[aria-describedby],[data-dialog]')]) {
    node.removeAttribute('id');
    node.removeAttribute('aria-labelledby');
    node.removeAttribute('aria-describedby');
    node.removeAttribute('data-dialog');
  }
  preview.removeAttribute('data-olive-section');
  preview.inert = true;
  destinationView.replaceChildren(preview);

  function headerTheme() {
    positionFrame = 0;
    if (destroyed || suspended) return;
    const position = window.scrollY;
    const inPortal = running || (anchor - position <= headerBottom && anchor + sectionHeight - position > headerBottom);
    const inOlive = below - position <= headerBottom;
    header.classList.toggle('on-portal', inPortal && progress < .5 && paperOpacity < .5);
    header.classList.toggle('on-olive', (!running && inOlive) || (inPortal && progress >= .5));
  }
  function queueHeader() {
    if (!positionFrame && !destroyed) positionFrame = requestAnimationFrame(headerTheme);
  }
  function paint(time) {
    const zoom = portalClamp((time - portalMedia.zoomStart) / (portalMedia.zoomEnd - portalMedia.zoomStart));
    const eased = zoom * zoom * (3 - 2 * zoom);
    // Zoom the actual film around the inside of O; no expanding colour overlay.
    const scale = Math.exp(Math.log(portalMedia.zoomScale) * eased);
    const transform = 'translate3d(' + shiftX * eased + 'px,' + shiftY * eased + 'px,0) scale(' + scale + ')';
    for (const video of Object.values(videos)) {
      video.style.transformOrigin = originX + 'px ' + originY + 'px';
      video.style.transform = transform;
    }
    // Reveal block four only once the camera has passed completely inside O.
    const reveal = portalClamp((time - portalMedia.zoomEnd) / (portalMedia.duration - portalMedia.zoomEnd));
    progress = reveal * reveal * (3 - 2 * reveal);
    section.style.setProperty('--portal-film-opacity', 1 - progress);
    paperOpacity = 1 - portalClamp(time / .3);
    paper.style.opacity = paperOpacity;
    section.dataset.transition = progress >= 1 ? 'complete' : progress > 0 ? 'destination' : zoom > 0 ? 'zoom' : 'video';
    queueHeader();
  }
  function clock() {
    // Both files contain the same frames, in opposite orders. Normalize the
    // container duration so the two camera paths meet at exactly the same ends.
    const duration = Number.isFinite(activeVideo.duration) && activeVideo.duration > 0 ? activeVideo.duration : portalMedia.duration;
    const time = activeVideo.currentTime / duration * portalMedia.duration;
    return direction === 'forward' ? time : portalMedia.duration - time;
  }
  function setPosition(y) {
    window.scrollTo({ top: y, behavior: 'instant' });
  }
  function geometry() {
    if (suspended) return;
    const box = stage.getBoundingClientRect();
    anchor = section.getBoundingClientRect().top + window.scrollY;
    headerBottom = header.getBoundingClientRect().bottom;
    sectionHeight = section.offsetHeight;
    entry = Math.max(0, anchor - window.innerHeight * .55);
    below = life.getBoundingClientRect().top + window.scrollY;
    above = gallery ? gallery.getBoundingClientRect().top + window.scrollY : Math.max(0, anchor - window.innerHeight);
    const width = Math.min(box.width, box.height * 16 / 9);
    const height = width * 9 / 16;
    originX = (box.width - width) / 2 + width * .475;
    originY = (box.height - height) / 2 + height * .72;
    shiftX = box.width / 2 - originX;
    shiftY = box.height / 2 - originY;
    if (running) setPosition(lockY);
    paint(running ? clock() : side === 'below' ? portalMedia.duration : 0);
  }
  function load() {
    if (loaded || destroyed || reduced.matches) return;
    loaded = true;
    for (const video of Object.values(videos)) {
      video.src = video.dataset.src;
      video.preload = 'auto';
      video.load();
    }
  }
  function showRecovery() {
    if (!running || suspended || destroyed) return;
    startButton.hidden = false;
    recovery.hidden = false;
    status.textContent = 'Не удалось воспроизвести переход. Повторите запуск или продолжите без анимации.';
  }
  function tick() {
    frame = 0;
    if (!running || suspended || document.hidden || destroyed) return;
    paint(clock());
    if (!activeVideo.paused) frame = requestAnimationFrame(tick);
  }
  function play() {
    if (!running || suspended || document.hidden || destroyed || pending) return;
    const id = runId, video = activeVideo;
    pending = true;
    video.play().then(() => {
      if (id !== runId) return;
      pending = false;
      if (!running || suspended || document.hidden || destroyed || video !== activeVideo) { video.pause(); return; }
      startButton.hidden = true;
      status.textContent = '';
      if (!frame) frame = requestAnimationFrame(tick);
    }).catch(() => {
      if (id !== runId) return;
      pending = false;
      if (running && !suspended && !destroyed) {
        startButton.hidden = false;
        status.textContent = 'Нажмите «Начать переход», чтобы продолжить.';
      }
    });
  }
  function complete() {
    if (!running || destroyed) return;
    if (suspended || document.hidden) { deferredEnd = true; return; }
    const nextSide = direction === 'forward' ? 'below' : 'above';
    paint(nextSide === 'below' ? portalMedia.duration : 0);
    running = false;
    side = nextSide;
    runId++;
    pending = false;
    deferredEnd = false;
    activeVideo.pause();
    cancelAnimationFrame(frame); frame = 0;
    clearTimeout(timeout);
    startButton.hidden = true;
    recovery.hidden = true;
    status.textContent = '';
    section.dataset.gate = 'idle';
    root.classList.remove('portal-locked');
    const target = destination?.element;
    let exit = side === 'below' ? below : above;
    if (target?.isConnected) {
      const targetY = target.getBoundingClientRect().top + window.scrollY;
      exit = side === 'below' ? Math.max(below, targetY) : Math.min(above, targetY);
    }
    controls.unlock?.(exit);
    setPosition(exit);
    if (destination?.hash) window.history.replaceState(null, '', destination.hash);
    destination = null;
    queueHeader();
  }
  function begin(nextDirection, requested = null) {
    if (running || suspended || destroyed) return;
    geometry();
    direction = nextDirection;
    destination = requested;
    activeVideo = videos[direction];
    lockY = direction === 'forward' ? Math.min(window.scrollY, entry) : Math.max(window.scrollY, below);
    running = true;
    deferredEnd = false;
    runId++;
    pending = false;
    section.dataset.gate = direction;
    for (const [name, video] of Object.entries(videos)) {
      video.pause();
      video.classList.toggle('is-active', name === direction);
    }
    root.classList.add('portal-locked');
    controls.lock?.();
    setPosition(lockY);
    geometry();
    paint(direction === 'forward' ? 0 : portalMedia.duration);
    startButton.hidden = true;
    recovery.hidden = true;
    if (reduced.matches) { complete(); return; }
    load();
    try { activeVideo.currentTime = 0; } catch { /* play starts at the default first frame */ }
    clearTimeout(timeout);
    timeout = setTimeout(showRecovery, 15000);
    play();
  }
  function guard() {
    if (destroyed || suspended) return;
    if (running) {
      if (Math.abs(window.scrollY - lockY) > 1) setPosition(lockY);
    } else if (side === 'above' && window.scrollY >= entry - .5) {
      begin('forward');
    } else if (side === 'below' && window.scrollY < below - .5) {
      begin('reverse');
    }
    queueHeader();
  }
  function inDialog(target) { return !!target?.closest?.('dialog[open]'); }
  function intercept(event, delta, requested = null) {
    if (suspended || inDialog(event.target) || !delta) return;
    if (running) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const next = window.scrollY + delta;
    // A large upward gesture must reach the first model before it can leave.
    if (!requested && side === 'below' && delta < 0 && window.scrollY > below + .5 && next < below) {
      event.preventDefault();
      event.stopImmediatePropagation();
      controls.lock?.();
      controls.unlock?.(below);
      setPosition(below);
      return;
    }
    if ((side === 'above' && delta > 0 && next >= entry) || (side === 'below' && delta < 0 && next < below)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      begin(side === 'above' ? 'forward' : 'reverse', requested);
    }
  }
  window.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    intercept(event, event.deltaY * scale);
  }, blocking);
  window.addEventListener('touchstart', event => {
    touchY=event.touches[0]?.clientY ?? null;
    touchStartX=event.touches[0]?.clientX ?? 0;touchStartY=touchY ?? 0;
    touchModels=matchMedia('(max-width:700px)').matches && !!event.target?.closest?.('[data-models]');
  }, { ...opts, capture: true, passive: true });
  window.addEventListener('touchmove', event => {
    const y = event.touches[0]?.clientY;
    if (y == null || touchY == null) return;
    if(touchModels){
      const dx=(event.touches[0]?.clientX ?? touchStartX)-touchStartX,dy=y-touchStartY;
      if(Math.max(Math.abs(dx),Math.abs(dy))<10 || Math.abs(dx)>Math.abs(dy))return;
    }
    const delta = touchY - y;
    touchY = y;
    intercept(event, delta);
  }, blocking);
  window.addEventListener('touchend', () => { touchY = null; }, opts);
  window.addEventListener('keydown', event => {
    if (inDialog(event.target) || event.target?.closest?.('input,textarea,select,[contenteditable],[role="listbox"]')) return;
    if ((event.key === ' ' || event.key === 'Enter') && event.target?.closest?.('button,a')) return;
    const max = document.documentElement.scrollHeight;
    const deltas = { ArrowDown: 80, ArrowUp: -80, PageDown: window.innerHeight, PageUp: -window.innerHeight, ' ': event.shiftKey ? -window.innerHeight : window.innerHeight, End: max, Home: -max };
    if (Object.hasOwn(deltas, event.key)) intercept(event, deltas[event.key]);
  }, blocking);
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || inDialog(event.target)) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    if (running) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const y = target.getBoundingClientRect().top + window.scrollY;
    intercept(event, y - window.scrollY, { element: target, hash: url.hash });
  }, { ...opts, capture: true });
  window.addEventListener('scroll', guard, { ...opts, capture: true, passive: true });
  window.addEventListener('resize', geometry, opts);
  window.visualViewport?.addEventListener('resize', geometry, opts);
  startButton.addEventListener('click', () => {
    if (activeVideo.error) { loaded = false; load(); }
    play();
  }, opts);
  recovery.addEventListener('click', complete, opts);
  for (const video of Object.values(videos)) {
    video.controls = false; video.loop = false; video.muted = true;
    video.addEventListener('timeupdate', () => { if (running && video === activeVideo) paint(clock()); }, opts);
    video.addEventListener('playing', () => {
      if (running && video === activeVideo && !suspended && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    }, opts);
    video.addEventListener('ended', () => { if (video === activeVideo) complete(); }, opts);
    video.addEventListener('error', () => { if (running && video === activeVideo) showRecovery(); }, opts);
  }
  function pause() {
    activeVideo.pause();
    cancelAnimationFrame(frame); frame = 0;
    clearTimeout(timeout);
    runId++; pending = false;
  }
  function resume() {
    suspended = false;
    geometry();
    if (deferredEnd) complete();
    else if (running && !document.hidden) { timeout = setTimeout(showRecovery, 15000); play(); }
    else guard();
    queueHeader();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else if (!suspended) resume(); }, opts);
  reduced.addEventListener('change', () => { if (reduced.matches && running) complete(); }, opts);
  const preload = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { load(); preload.disconnect(); }
  }, { rootMargin: '100% 0px' });
  const resize = new ResizeObserver(geometry);
  preload.observe(section);
  resize.observe(stage);
  geometry();
  queueHeader();
  const initialFrame = requestAnimationFrame(guard);
  return {
    suspend() { suspended = true; pause(); },
    resume,
    goTo(position) {
      if (running || destroyed) return;
      side = position >= below - .5 ? 'below' : 'above';
      setPosition(position);
      geometry();
      paint(side === 'below' ? portalMedia.duration : 0);
      queueHeader();
    },
    destroy() {
      destroyed = true;
      abort.abort(); preload.disconnect(); resize.disconnect();
      clearTimeout(timeout);
      cancelAnimationFrame(frame); cancelAnimationFrame(positionFrame); cancelAnimationFrame(initialFrame);
      for (const video of Object.values(videos)) { video.pause(); video.removeAttribute('src'); video.load(); }
      root.classList.remove('portal-locked');
      if (running) controls.unlock?.(lockY);
      section.dataset.gate = 'idle';
      destinationView.replaceChildren();
      running = false;
      header.classList.remove('on-portal', 'on-olive');
    },
    diagnostics() { return { side, direction, running, suspended, progress, anchor, entry, lockY, below }; },
  };
}
