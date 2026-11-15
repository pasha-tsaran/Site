export function createSegmentedVideo(video, manifest, options = {}) {
  const Media = window.MediaSource || window.ManagedMediaSource;
  if (!manifest || !Media?.isTypeSupported(manifest.mime)) return null;
  const abort = new AbortController();
  let media,url;
  try { media = new Media(); url = URL.createObjectURL(media); } catch { return null; }
  const states = manifest.segments.map(() => 'idle');
  const downloads = new Map(), chunks = new Map();
  let buffer, initBytes, initialized = false, appending = null, target = 0;
  let active = true, destroyed = false, failed = false, completed = 0, bytes = 0;

  function fail() {
    if (failed || destroyed) return;
    failed = true;
    for (const controller of downloads.values()) controller.abort();
    options.onError?.();
  }
  function order() {
    return states.map((_, index) => index).sort((a, b) => {
      if (states[0] !== 'appended' && (a === 0 || b === 0)) return a === 0 ? -1 : 1;
      return Math.abs(a - target) - Math.abs(b - target) || b - a;
    });
  }
  function append() {
    if (destroyed || failed || !buffer || buffer.updating || appending !== null || media.readyState !== 'open') return;
    try {
      if (!initialized) {
        if (!initBytes) return;
        appending = -1;
        buffer.appendBuffer(initBytes);
      } else {
        const index = order().find(index => states[index] === 'ready');
        if (index !== undefined) {
          appending = index;
          buffer.appendBuffer(chunks.get(index));
        } else if (completed === states.length) media.endOfStream();
      }
    } catch { fail(); }
  }
  function pump() {
    if (destroyed || failed || !active || document.hidden) return;
    while (downloads.size < 2) {
      const index = order().find(index => states[index] === 'idle');
      if (index === undefined) break;
      const controller = new AbortController();
      downloads.set(index, controller);
      states[index] = 'loading';
      const priority = index === target ? (options.priority || 'high') : 'low';
      fetch(manifest.segments[index].src, {signal:controller.signal,priority}).then(response => {
        if (!response.ok) throw Error('Video segment unavailable');
        return response.arrayBuffer();
      }).then(data => {
        if (destroyed || failed) return;
        bytes += data.byteLength;
        states[index] = 'ready';
        chunks.set(index,data);
        append();
      }).catch(error => {
        if (destroyed || failed) return;
        if (error.name === 'AbortError') states[index] = 'idle';
        else fail();
      }).finally(() => {
        downloads.delete(index);
        pump();
      });
    }
  }
  function requestTime(time) {
    const next = manifest.segments.findIndex(part => time >= part.start - .0001 && time < part.end - .0001);
    const index = next < 0 ? states.length - 1 : next;
    if (index !== target) {
      target = index;
      // Reserve a download slot for a new scrub target instead of waiting on old prefetches.
      if (states[target] === 'idle' && downloads.size >= 2) {
        const stale = [...downloads.keys()].filter(index=>index!==0).sort((a,b) => Math.abs(b-target)-Math.abs(a-target))[0];
        if (stale !== undefined && Math.abs(stale-target) > 1) downloads.get(stale).abort();
      }
    }
    pump();
  }
  function stopDownloads() { for (const controller of downloads.values()) controller.abort(); }
  function setActive(value) {
    if (active === value) return;
    active = value;
    if (active) pump(); else stopDownloads();
  }
  media.addEventListener('sourceopen', () => {
    if (destroyed || buffer) return;
    try {
      media.duration = manifest.duration;
      buffer = media.addSourceBuffer(manifest.mime);
      buffer.addEventListener('updateend', () => {
        if (destroyed || failed) return;
        if (appending === -1) { initialized = true; initBytes = null; }
        else if (appending !== null) { states[appending] = 'appended'; chunks.delete(appending); completed++; }
        appending = null;
        options.onProgress?.();
        append();
      }, {signal:abort.signal});
      buffer.addEventListener('error',fail,{signal:abort.signal});
      append();
    } catch { fail(); }
  }, {signal:abort.signal});
  video.addEventListener('timeupdate', () => { if (!video.paused) requestTime(video.currentTime); }, {signal:abort.signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopDownloads(); else pump(); }, {signal:abort.signal});
  fetch(manifest.init, {signal:abort.signal,priority:options.priority || 'high'}).then(response => {
    if (!response.ok) throw Error('Video initialization unavailable');
    return response.arrayBuffer();
  }).then(data => { if (!destroyed && !failed) { initBytes = data; bytes += data.byteLength; append(); } }).catch(error => { if (error.name !== 'AbortError') fail(); });
  video.disableRemotePlayback = true;
  video.src = url;
  video.load();
  pump();
  return {
    requestTime, setActive,
    hasTime(time) {
      for (let i = 0; i < video.buffered.length; i++) {
        if (time >= video.buffered.start(i) - .0001 && time < video.buffered.end(i) - .0001) return true;
      }
      return false;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abort.abort(); stopDownloads(); chunks.clear(); initBytes = null;
      // The caller replaces/removes src before starting its fallback or releasing the element.
      URL.revokeObjectURL(url);
    },
    diagnostics() { return {target,completed,total:states.length,downloads:downloads.size,bytes,active,failed}; },
  };
}
