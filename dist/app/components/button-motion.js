export function setupButtonMotion() {
  document.querySelectorAll('button:not([data-model-index]), a.nav-link, a[role="button"]').forEach(button => {
    if (button.dataset.motionButton !== undefined || button.hasAttribute('data-no-motion')) return;
    const content = button.innerHTML;
    const accessible = button.cloneNode(true);
    accessible.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
    if (!button.hasAttribute('aria-label')) button.setAttribute('aria-label', accessible.textContent.trim());
    const gap = getComputedStyle(button).columnGap;
    button.style.setProperty('--motion-gap', gap === 'normal' ? '0px' : gap);
    const label = document.createElement('span');
    label.className = 'motion-label';
    label.setAttribute('aria-hidden', 'true');
    for (const name of ['size', 'top', 'bottom', 'reveal']) {
      const layer = document.createElement('span');
      layer.className = `motion-label-${name}`;
      layer.innerHTML = content;
      label.append(layer);
    }
    button.replaceChildren(label);
    button.classList.add('has-motion');
    button.dataset.motionButton = '';
  });
}
