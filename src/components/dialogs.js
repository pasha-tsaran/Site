import { calculatorStorageKey, calculateHouseEstimate, calculatorSummaryRows } from '../data/calculator.js';
import { site, pageHref } from '../data/site.js';

export function contactDialogsMarkup() {
  return `<dialog id="consultation" class="contact-dialog" aria-labelledby="consultation-title">
      <button class="dialog-close" data-close aria-label="Закрыть">×</button>
      <div data-contact-entry>
      <span class="eyebrow">Первый шаг</span><h2 id="consultation-title">ОБСУДИМ<br>ВАШ ДОМ?</h2>
      <p class="dialog-description">Оставьте удобный способ связи.</p>
      <section class="contact-calculation" data-contact-calculation hidden><div class="contact-calculation-heading"><h3>Ваш расчёт дома</h3><button type="button" class="contact-calculation-reset" data-contact-calculation-reset>Сброс</button></div><dl data-contact-calculation-rows></dl><p data-contact-calculation-warning></p></section>
      <p class="contact-calculation-status" data-contact-calculation-status role="status" hidden></p>
      <form data-contact-form>
        <input type="hidden" name="calculation" data-contact-calculation-data>
        <label>Как к вам обращаться<input name="name" autocomplete="given-name" placeholder="Ваше имя" required maxlength="80"></label>
        <label>Телефон или Telegram<input name="contact" autocomplete="tel" placeholder="+7 … или @username" required minlength="4" maxlength="100"></label>
        <label>Пару слов о доме <span>(необязательно)</span><textarea name="comment" rows="2" maxlength="1000" placeholder="Что вы представляете?"></textarea></label>
        <label class="contact-consent"><input type="checkbox" name="personal_data_consent" required value="${site.privacy.version}"><span>Даю <a href="${pageHref('/consent/')}" target="_blank" rel="noopener noreferrer">согласие на обработку персональных данных</a> для ответа на мой запрос.</span></label>
        <p class="contact-privacy-note">Информация об обработке: <a href="${pageHref('/privacy/')}" target="_blank" rel="noopener noreferrer">политика конфиденциальности</a>. В тестовой версии документы и отметка согласия демонстрационные; реальные реквизиты оператора ещё не заданы.</p>
        <p class="demo-note">Это демонстрационная форма. Контакты пока никуда не отправляются.</p>
        <button class="solid-button" type="submit">Записаться <span aria-hidden="true">↗</span></button>
      </form>
      </div>
      <section class="contact-success" data-contact-success hidden tabindex="-1" aria-labelledby="contact-success-title">
        <svg class="contact-success-icon" aria-hidden="true" viewBox="0 0 64 64" fill="none"><path d="M9 31 32 12l23 19v24H9V31Z" stroke="currentColor" stroke-width="2"/><path d="m22 35 7 7 15-16" stroke="currentColor" stroke-width="3"/></svg>
        <h2 id="contact-success-title">Спасибо<br>за обращение</h2>
        <p class="contact-success-message">В ближайшее время менеджер с вами свяжется</p>
        <p class="demo-note">Тестовый режим: это пример подтверждения. Данные пока не отправляются.</p>
        <button class="solid-button" type="button" data-success-close>Вернуться на сайт <span aria-hidden="true">↗</span></button>
      </section>
    </dialog>
    <dialog id="manager" class="contact-dialog manager-dialog" aria-labelledby="manager-title">
      <button class="dialog-close" data-close aria-label="Закрыть">×</button>
      <span class="eyebrow">На связи</span><h2 id="manager-title">ДАВАЙТЕ<br>ПОГОВОРИМ</h2>
      <p class="dialog-description">Тестовая версия: ниже демонстрационные контакты. Перед запуском заменим их на контакты компании.</p>
      <ul class="contact-options"><li><span>Telegram</span><span>${site.contacts.telegram}</span></li><li><span>Телефон</span><span>${site.contacts.phone}</span></li><li><span>Почта</span><span>${site.contacts.email}</span></li></ul>
    </dialog>`;
}

export function setupDialogs(onOpen, onClose) {
  const abort = new AbortController();
  const options = { signal: abort.signal };
  let active = null;

  function restorePage() {
    if (!active) return;
    const { origin, position, horizontal, bodyStyles } = active;
    active = null;
    Object.assign(document.body.style, bodyStyles);
    // Resume the scroll controller with the saved coordinate, before restoring
    // native scroll. A fixed body temporarily makes window.scrollY read as zero.
    onClose(position);
    window.scrollTo({ top: position, left: horizontal, behavior: 'instant' });
    origin.focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.dialog);
      if (!dialog || dialog.open || active) return;
      const { position, top, width } = document.body.style;
      active = {
        origin: button,
        position: window.scrollY,
        horizontal: window.scrollX,
        bodyStyles: { position, top, width },
      };
      onOpen();
      document.body.style.position = 'fixed';
      document.body.style.top = `-${active.position}px`;
      document.body.style.width = '100%';
      if (dialog.id === 'consultation') {
        dialog.querySelector('[name="personal_data_consent"]').checked = false;
        dialog.querySelector('[data-contact-entry]').hidden = false;
        dialog.querySelector('[data-contact-success]').hidden = true;
        dialog.setAttribute('aria-labelledby', 'consultation-title');
        dialog.querySelector('[data-contact-calculation-status]').hidden = true;
        const panel = dialog.querySelector('[data-contact-calculation]'), rows = dialog.querySelector('[data-contact-calculation-rows]');
        panel.hidden = true; rows.replaceChildren(); dialog.querySelector('[data-contact-calculation-data]').value = '';
        try {
          const saved = sessionStorage.getItem(calculatorStorageKey) || sessionStorage.getItem('tvoydom.calculator.v1');
          if (saved) {
            const estimate = calculateHouseEstimate(JSON.parse(saved));
            for (const [label, value] of calculatorSummaryRows(estimate)) { const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; row.append(dt, dd); rows.append(row); }
            dialog.querySelector('[data-contact-calculation-warning]').textContent = estimate.warnings.join(' ');
            dialog.querySelector('[data-contact-calculation-data]').value = JSON.stringify({ state: estimate.state, total: estimate.total, warnings: estimate.warnings });
            panel.hidden = false;
          }
        } catch { /* A damaged or unavailable session does not prevent opening the form. */ }
      }
      dialog.showModal();
    }, options);
  });
  document.querySelector('[data-success-close]').addEventListener('click', () => document.getElementById('consultation').close(), options);
  document.querySelector('[data-contact-calculation-reset]').addEventListener('click', () => {
    const dialog = document.getElementById('consultation');
    dialog.querySelector('[data-contact-calculation-data]').value = '';
    dialog.querySelector('[data-contact-calculation-rows]').replaceChildren();
    dialog.querySelector('[data-contact-calculation-warning]').textContent = '';
    dialog.querySelector('[data-contact-calculation]').hidden = true;
    const status = dialog.querySelector('[data-contact-calculation-status]');
    status.textContent = 'Параметры дома сброшены. Можно оставить заявку на обратный звонок.';
    status.hidden = false;
    try {
      sessionStorage.removeItem(calculatorStorageKey);
      sessionStorage.removeItem('tvoydom.calculator.v1');
    } catch { /* Clearing the current form still works when storage is unavailable. */ }
    dialog.querySelector('[name="name"]').focus({ preventScroll: true });
  }, options);
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close(), options);
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }, options);
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.querySelectorAll('button,input,textarea,a[href]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }, options);
    dialog.addEventListener('close', restorePage, options);
  });
  const contactForm = document.querySelector('[data-contact-form]');
  contactForm.addEventListener('input', event => event.target.setCustomValidity?.(''), options);
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    form.elements.name.setCustomValidity(form.elements.name.value.trim() ? '' : 'Укажите ваше имя');
    form.elements.contact.setCustomValidity(form.elements.contact.value.trim().length >= 4 ? '' : 'Укажите телефон или имя пользователя Telegram');
    if (!form.reportValidity()) return;
    form.reset();
    const dialog = form.closest('dialog'), success = dialog.querySelector('[data-contact-success]');
    dialog.querySelector('[data-contact-entry]').hidden = true;
    success.hidden = false;
    dialog.setAttribute('aria-labelledby', 'contact-success-title');
    dialog.scrollTop = 0;
    success.focus({ preventScroll: true });
  }, options);
  return { destroy() { abort.abort(); restorePage(); } };
}
