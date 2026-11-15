// Content is applied as text or image attributes, never as HTML.
export function setupContentEditor() {
  const root = document.getElementById('app');
  const route = location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  const edits = window.__SITE_CONTENT?.pages?.[route] || {};
  const preview = new URLSearchParams(location.search).has('admin-preview') && window.parent !== window;
  function apply() {
    for (const [key, value] of Object.entries(edits)) {
      const [selector, type, index] = key.split('|');
      let element;
      try { element = root.querySelector(selector); } catch { continue; }
      if (!element) continue;
      if (type === 'text') {
        const node = element.childNodes[Number(index)];
        if (node?.nodeType === Node.TEXT_NODE && node.nodeValue !== value) node.nodeValue = value;
      } else if (type === 'image' && element.tagName === 'IMG') {
        if (element.hasAttribute('data-src')) { if (element.getAttribute('data-src') !== value) element.setAttribute('data-src', value); }
        else if (element.getAttribute('src') !== value) element.setAttribute('src', value);
      }
    }
  }
  apply();
  if (Object.keys(edits).length) {
    let scheduled = false;
    new MutationObserver(() => { if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; apply(); }); } }).observe(root, { childList:true, characterData:true, subtree:true });
  }
  if (!preview) return;
  let interact = false;
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === parent && event.data?.type === 'site-editor-mode') interact = Boolean(event.data.interact);
  });
  function selector(element) {
    const parts = [];
    while (element && element !== root) {
      const siblings = [...element.parentElement.children].filter(sibling => sibling.tagName === element.tagName);
      parts.unshift(element.tagName.toLowerCase() + ':nth-of-type(' + (siblings.indexOf(element) + 1) + ')');
      element = element.parentElement;
    }
    return parts.join(' > ');
  }
  document.addEventListener('click', event => {
    if (interact) return;
    let element = event.target.closest('img, button, a, h1, h2, h3, h4, p, span, label, small, dt, dd, th, td, legend, figcaption, summary, caption, output, li, div, address, blockquote');
    if (!element || !root.contains(element)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (element.closest('[data-calculator-total], [data-calculator-breakdown], [data-calculator-comparison], [data-calculator-formulas], [data-calculator-mobile-total]')) {
      parent.postMessage({ type:'site-editor-error', message:'Это значение рассчитывается автоматически. Измените параметры или ставки калькулятора.' }, location.origin); return;
    }
    const image = element.tagName === 'IMG';
    const caret = document.caretPositionFromPoint?.(event.clientX,event.clientY)?.offsetNode || document.caretRangeFromPoint?.(event.clientX,event.clientY)?.startContainer;
    let index = caret?.parentElement === element && caret.nodeType === Node.TEXT_NODE ? [...element.childNodes].indexOf(caret) : [...element.childNodes].findIndex(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    if (!image && index < 0) {
      element = [...element.querySelectorAll('*')].find(item => [...item.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()));
      if (!element) return;
      index = [...element.childNodes].findIndex(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
    }
    const key = selector(element) + '|' + (image ? 'image' : 'text') + '|' + (image ? 0 : index);
    const block = element.closest('dialog') ? null : element.closest('fieldset[id], form[id], section[id], main[id], footer[id], article[id]')?.id || null;
    parent.postMessage({ type:'site-editor-select', route, key, block, image, value:image ? (element.getAttribute('src') || element.getAttribute('data-src')) : element.childNodes[index].nodeValue }, location.origin);
  }, true);
}
