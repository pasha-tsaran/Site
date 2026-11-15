import { createCalculatorPdf } from '../components/calculator-pdf.js';
import { pageHref } from '../data/site.js';
import { siteHeaderMarkup } from '../components/site-header.js';
import { siteFooterMarkup } from '../components/site-footer.js';
import { contactDialogsMarkup } from '../components/dialogs.js';
import { calculatorDefaults, calculatorFields, calculatorFloorFields, calculatorStorageKey, calculatorMaterials, calculatorPackages, calculatorFoundations, calculatorRatesDate, calculatorUnitRates, calculatorMoney, calculatorArea, calculatorSources, calculatorFoundationAllowed, calculateHouseEstimate, calculatorEstimateText } from '../data/calculator.js';

function calculatorNumberMarkup(field, estimate) {
  const limit = estimate.limits[field.id];
  const value = field.id.startsWith('floor-') ? estimate.state.floorAreas[Number(field.id.split('-')[1])] : estimate.state[field.id];
  return `<div class="calc-number-field" data-number-field="${field.id}"><label for="calc-${field.id}">${field.label}</label><div class="calc-number-box"><input type="number" id="calc-${field.id}" name="${field.id}" min="${limit.min}" max="${limit.max}" step="1" inputmode="numeric" value="${value}" aria-describedby="calc-${field.id}-hint calc-${field.id}-error"><span>${field.unit}</span></div><input class="calc-range" type="range" data-range="${field.id}" min="${limit.min}" max="${limit.max}" step="1" value="${value}" aria-label="${field.label}, ползунок"><div class="calc-range-ends"><span data-min="${field.id}">${limit.min}</span><span data-max="${field.id}">${limit.max}</span></div><p class="calc-field-hint" id="calc-${field.id}-hint">${field.hint}</p><span class="calc-field-error" id="calc-${field.id}-error" hidden></span></div>`;
}

function calculatorChoiceMarkup(name, choices, current, estimate) {
  return `<div class="calc-choices calc-choices--${name}">${choices.map(choice => {
    const allowed = name !== 'foundation' || calculatorFoundationAllowed(choice.id, estimate.state);
    return `<label class="calc-choice"><input type="radio" name="${name}" value="${choice.id}"${current === choice.id ? ' checked' : ''}${allowed ? '' : ' disabled'}><span><strong>${choice.label || choice.title.replace(/^Дом из /, '').replace('Каркасный дом', 'Каркас')}</strong>${choice.description ? `<small>${choice.description}</small>` : ''}</span></label>`;
  }).join('')}</div>`;
}

function calculatorBreakdownMarkup(estimate) {
  return estimate.lines.map(line => `<div><dt>${line.label}</dt><dd>${line.amount ? calculatorMoney(line.amount) : line.id === 'urgency' ? 'Не требуется' : 'Не входит'}</dd></div>`).join('');
}

function calculatorComparisonMarkup(estimate) {
  return [1, 2, 3, 4, 5].map(floors => {
    const value = calculateHouseEstimate({ ...estimate.state, floors });
    if (value.state.floors !== floors || value.state.rooms !== estimate.state.rooms) return '<tr><th scope="row">' + floors + '</th><td colspan="3">Недостаточно площади для выбранного числа этажей и комнат</td></tr>';
    return '<tr' + (floors === estimate.state.floors ? ' class="is-current"' : '') + '><th scope="row">' + floors + '</th><td>' + calculatorArea(value.totalArea) + ' м²</td><td>≈ ' + calculatorArea(value.footprint) + ' м²</td><td>' + calculatorMoney(value.total) + (value.state.foundation !== estimate.state.foundation ? '<small>С плитным фундаментом</small>' : '') + '</td></tr>';
  }).join('');
}

function calculatorDetailsMarkup(estimate) {
  return estimate.lines.filter(line => line.amount).map(line => '<div><dt>' + line.label + '</dt><dd>' + line.detail + '</dd></div>').join('');
}

function calculatorPricingMarkup(estimate) {
  const r = calculatorUnitRates;
  const row = (label, value, unit) => '<div><dt>' + label + '<small>' + unit + '</small></dt><dd>' + value + '</dd></div>';
  return '<section class="calculator-prices" id="calculator-prices" aria-labelledby="calculator-prices-heading"><div class="calc-prices-heading"><h2 id="calculator-prices-heading">ЦЕНЫ</h2><p>Что считаем.<br>На какие данные опираемся.</p></div>' +
    '<p class="calc-price-intro">Ставки модели для простого дома в Московской области. Материалы и работы вместе. Открытые предложения строителей приведены ниже с составом работ: это цены «от», а не подтверждённая средняя по рынку.</p>' +
    '<div class="calc-price-table-wrap"><table class="calc-price-table"><caption>Расчётные ставки по материалам</caption><thead><tr><th scope="col">Материал</th><th scope="col">Несущая часть<small>за м² стены</small></th><th scope="col">Тёплый контур<small>добавка за м² дома</small></th></tr></thead><tbody>' +
    calculatorMaterials.map(material => '<tr data-price-material="' + material.id + '"' + (material.id === estimate.state.material ? ' class="is-current"' : '') + '><th scope="row">' + material.label + '</th><td>' + calculatorMoney(material.shell) + '</td><td>+ ' + calculatorMoney(material.contour) + '</td></tr>').join('') +
    '</tbody></table><p class="calc-table-note">В обеих колонках указаны допущения модели, подобранные по общему бюджету опубликованных комплектаций. Это не прямые расценки подрядчиков на кладку. Приведённая площадь стен = сумма периметров этажей × 3 м, без вычета проёмов; ставка включает запас на внутренние несущие элементы и узлы. Перегородки, фундамент, перекрытия и кровля считаются отдельно.</p></div>' +
    '<div class="calc-price-groups"><section class="calc-price-group calc-price-group--foundation"><h3>Фундамент</h3><dl>' +
    row('Винтовые сваи с ростверком', calculatorMoney(r.screw), 'за м² пятна; допущение модели') +
    row('Монолитная плита', calculatorMoney(r.slab), 'за м² пятна; в источнике от 8 000 ₽/м²') +
    row('Ленточный', calculatorMoney(r.strip), 'за пог. м; в источнике от 7 000 ₽/пог. м') +
    row('Поправка на этажность', r.foundationFactors.map(value => '×' + new Intl.NumberFormat('ru-RU', { maximumFractionDigits:3 }).format(value)).join(' / '), 'плита и лента: от 1 до 5 этажей; допущение') +
    '</dl><p>Пятно условно равно площади самого большого этажа. Лента = наружный периметр + две пересекающиеся внутренние ленты. Поправка: бюджетное допущение, не расчёт нагрузок. Состав и пригодность основания определяет проект по геологии.</p></section>' +
    '<section class="calc-price-group"><h3>Конструкции</h3><dl>' +
    row('Железобетонное перекрытие', calculatorMoney(r.concreteFloor), 'за м²; середина опубликованного диапазона от 4 500 до 6 500 ₽') +
    row('Деревянное перекрытие', calculatorMoney(r.timberFloor), 'за м², каркас и брус; допущение') +
    row('Межэтажная лестница', calculatorMoney(r.stair), 'за переход на следующий этаж; допущение, без декоративной отделки') +
    row('Подъём материалов и леса', calculatorMoney(r.lifting), 'за м² стен выше первого этажа; допущение') +
    row('Внутренние перегородки', calculatorMoney(r.partition), 'за м²; по 20 м² на комнату после первой; допущение планировки') +
    '</dl><p>Межэтажные перекрытия = сумма площадей этажей выше первого. Для свай и ленты добавляется перекрытие первого этажа. У плиты оно уже учтено в основании. Лестниц требуется на одну меньше, чем этажей.</p></section>' +
    '<section class="calc-price-group"><h3>Кровля и отделка</h3><dl>' +
    row('Холодная кровля целиком', calculatorMoney(r.roof), 'за м² скатов; ориентир «Рифей Б»') +
    row('Внутренняя инженерия', calculatorMoney(r.engineering), 'за м² дома; ориентир B&P STROY') +
    row('Черновая отделка', calculatorMoney(r.roughFinish), 'за м² дома; стартовый прайс КСУ Нордвест') +
    row('Чистовая отделка', calculatorMoney(r.finish), 'за м² дома; стартовый прайс КСУ Нордвест') +
    '</dl><p>Инженерия и оба вида внутренней отделки добавляются только в «Под ключ». Окна, наружные двери, утепление крыши и пола, фасад учтены в строке тёплого контура. Черновая отделка не дублирует инженерию.</p></section>' +
    '<section class="calc-price-group"><h3>Проект и доставка</h3><dl>' +
    row('Проектирование', calculatorMoney(r.project), 'за м² дома; допущение') +
    row('Организация работ', calculatorMoney(r.setup), 'за объект; допущение') +
    row('Базовая логистика', calculatorMoney(r.logisticsBase), 'за объект, до 20 км от МКАД; допущение') +
    row('Удалённость сверх 20 км', calculatorMoney(r.extraKm), 'за км на весь проект, не за одну машину; допущение') +
    row('Объём сверх 100 м²', calculatorMoney(r.extraAreaLogistics), 'за дополнительный м² дома; допущение') +
    '</dl><p>Рейсы и техника без спецификации неизвестны. Логистика: укрупнённый бюджет, не тариф перевозчика. При ускорении не начисляем выдуманный процент: доплата оценивается по согласованному графику и пока не входит в сумму.</p></section></div>' +
    '<section class="calc-evidence" aria-labelledby="calc-evidence-heading"><h3 id="calc-evidence-heading">Открытые ориентиры</h3><p>Проверено ' + calculatorRatesDate + '. Не усредняем коробку без перегородок, контур без фундамента и дом с отделкой: состав разный. Ниже приведены исходные предложения для сравнения, а не оферта нашей компании.</p><div class="calc-source-list">' +
    calculatorSources.map(source => '<article><h4><a href="' + source.url + '" target="_blank" rel="noopener noreferrer">' + source.name + ' ↗</a></h4><p>' + source.text + '</p></article>').join('') +
    '</div></section></section>';
}

export function calculatorPage() {
  const estimate = calculateHouseEstimate(calculatorDefaults);
  return `<a class="skip-link" href="${pageHref('/calculator/')}#calculator-content">Перейти к содержанию</a>${siteHeaderMarkup('calculator')}
  <main class="calculator-main" id="calculator-content"><section class="calculator-intro"><h1>КАЛЬКУЛЯТОР<br>ВАШЕГО ДОМА</h1><div><p>Выберите параметры.<br>Посмотрите, как складывается бюджет.</p><a class="calc-price-link" href="${pageHref('/calculator/')}#calculator-prices">Цены за единицу <span aria-hidden="true">↓</span></a></div></section>
    <div class="calculator-layout"><form class="calculator-form" id="calculator-parameters" data-calculator-form novalidate><div class="calc-form-heading"><h2>Ваш будущий дом</h2><button type="button" class="calc-reset" data-calculator-reset>Сбросить ↺</button></div>
      <div class="calc-numbers">${calculatorFields.filter(field => !['months', 'floors'].includes(field.id)).map(field => calculatorNumberMarkup(field, estimate)).join('')}</div>
      <fieldset class="calc-option-group calc-storeys"><legend>Этажи и площадь</legend>${calculatorNumberMarkup(calculatorFields.find(field => field.id === 'floors'), estimate)}<div class="calc-floor-grid" data-floor-controls>${calculatorFloorFields(estimate.state).map(field => calculatorNumberMarkup(field, estimate)).join('')}</div><p class="calc-floor-total" data-floor-total>Общая площадь: ${calculatorArea(estimate.totalArea)} м²</p></fieldset>
      <fieldset class="calc-option-group" id="calculator-materials"><legend>Материал стен</legend>${calculatorChoiceMarkup('material', calculatorMaterials, estimate.state.material, estimate)}</fieldset>
      <fieldset class="calc-option-group" id="calculator-packages"><legend>Комплектация</legend>${calculatorChoiceMarkup('package', calculatorPackages, estimate.state.package, estimate)}</fieldset>
      <fieldset class="calc-option-group" id="calculator-foundation"><legend>Фундамент</legend>${calculatorChoiceMarkup('foundation', calculatorFoundations, estimate.state.foundation, estimate)}<p class="calc-group-note" data-foundation-note>Тип основания уточняется после геологии. Недоступные сочетания исключены в этой модели.</p></fieldset>
      <fieldset class="calc-option-group"><legend>Срок выполнения работ</legend>${calculatorNumberMarkup(calculatorFields.find(field => field.id === 'months'), estimate)}<p class="calc-group-note" data-duration-hint>Обычный срок для этой конфигурации: ${estimate.normalMonths} мес.</p></fieldset>
      <p class="calc-status" data-calculator-status role="status" aria-live="polite"></p>
    </form><aside class="calculator-result" id="calculator-result" aria-labelledby="calculator-result-heading"><div class="calc-preview"><img data-calculator-image src="${estimate.material.image}" alt="${estimate.material.alt}" width="1122" height="1402"><span data-calculator-material>${estimate.material.title}</span></div><div class="calc-result-body"><h2 id="calculator-result-heading">Базовый бюджет</h2><p class="calc-area-summary" data-calculator-area-summary></p><output class="calc-total" data-calculator-total aria-live="polite" aria-atomic="true">${calculatorMoney(estimate.total)}</output><div class="calc-result-meta"><span data-calculator-meter>≈ ${calculatorMoney(estimate.perMeter)}/м²</span><span data-calculator-duration>${estimate.state.months} мес. с начала работ</span></div><p class="calc-scope-label" data-calculator-scope>${estimate.scope.label} · ${estimate.foundation.label}</p><p class="calc-scenario" data-calculator-scenario></p><div class="calc-budget-warnings" data-calculator-warnings role="status"></div><dl class="calc-breakdown" data-calculator-breakdown>${calculatorBreakdownMarkup(estimate)}</dl><details class="calc-formulas"><summary>Объёмы и формулы</summary><dl data-calculator-formulas></dl></details><button class="calc-primary" type="button" data-dialog="consultation" data-calculator-inquiry>Обсудить расчёт <span aria-hidden="true">↗</span></button><button class="calc-download calc-primary" type="button" data-calculator-download>Скачать расчёт PDF <span aria-hidden="true">↓</span></button><p class="calc-estimate-note">Предварительная модель, не смета. Сценарий от ±20% до ±40% допущение для планирования, не статистический интервал и не предел цены. Налоговый режим подрядчика не задан; отдельный НДС не начисляем.</p></div></aside></div>
    <section class="calc-floor-comparison" aria-labelledby="calc-floor-heading"><h2 id="calc-floor-heading">Как влияет этажность</h2><p data-comparison-description></p><div class="calc-comparison-wrap"><table><thead><tr><th scope="col">Этажей</th><th scope="col">Всего</th><th scope="col">Пятно</th><th scope="col">Базовый бюджет</th></tr></thead><tbody data-calculator-comparison>${calculatorComparisonMarkup(estimate)}</tbody></table></div><p>При одинаковой общей площади один этаж может быть дороже двух: фундамент и крыша больше. Третий этаж добавляет стены, перекрытия, лестницу и подъём материалов. Универсального процента разницы нет.</p></section>
    ${calculatorPricingMarkup(estimate)}<details class="calculator-method"><summary>Границы расчёта и допущения</summary><div><p>Модель: прямоугольные этажи с пропорциями 1:1,25 и высотой 3 м. Их площади задаются отдельно и суммируются. Крыша с уклоном 30° и свесами 0,5 м. Площадь дома указана по строительным размерам, приблизительно по наружным размерам, включая лестничную зону. Полезная внутренняя площадь будет меньше. Фундамент и кровля условно считаются по наибольшему этажу; подробная геометрия уступов, консолей и сложной крыши требует проекта.</p><p>Несущая часть считается по приведённой площади стен, тёплый контур учитывается по общей площади. Число комнат задаёт условную площадь перегородок; это не готовая планировка. Корректировки доступных значений: ограничения модели, не строительные нормы. Этапы округляются до 1 000 ₽ и складываются без скрытых начислений.</p><p>Плановый срок рассчитан условно: для 150 м² «Под ключ», один этаж: газобетон 6, кирпич 8, керамоблок 7, каркас 4, брус 6, монолит 9 месяцев. Масштабируем его на (общая площадь / 150)^0,45 и добавляем 0,8 месяца за следующий этаж; для коробки множитель 0,65, для контура 0,83. Сроки не гарантированы. Если желаемый срок меньше планового, ускорение требует отдельной оценки и в базовый бюджет не включено.</p><p>Сценарий изменения бюджета: ±20%, для трёх этажей, монолита или площади вне диапазона от 80 до 300 м² ±30%, для 4 или 5 этажей ±40%. Это допущение чувствительности модели, а не оценка рыночного разброса или гарантия попадания в диапазон.</p><p>Не включены участок, геология и геодезия, сложные грунты и рельеф, внешние сети, скважина, септик, газификация, мебель, техника, благоустройство, террасы и гаражи. Внутренняя инженерия: типовые электрика, вода, канализация и отопление, без премиальной автоматики и кондиционирования. Для бруса единая ставка внутренней отделки сохранена как консервативный бюджет полов, потолков и мокрых зон; индивидуальная смета может отличаться. Для трёх этажей и монолита сопоставимых публичных смет недостаточно; результат остаётся модельным.</p></div></details>
  </main><div class="calc-mobile-summary" data-calculator-mobile-summary><span data-calculator-mobile-total>${calculatorMoney(estimate.total)}</span><a href="${pageHref('/calculator/')}#calculator-result">К расчёту ↓</a></div>${siteFooterMarkup()}${contactDialogsMarkup()}`;
}

export function setupCalculatorPage() {
  document.title = 'Калькулятор дома | Твой дом';
  const abort = new AbortController(), options = { signal: abort.signal };
  const form = document.querySelector('[data-calculator-form]'), status = document.querySelector('[data-calculator-status]');
  let stored = calculatorDefaults;
  try { stored = JSON.parse(sessionStorage.getItem(calculatorStorageKey) || sessionStorage.getItem('tvoydom.calculator.v1')) || calculatorDefaults; } catch {}
  let estimate = calculateHouseEstimate(stored);
  const fields = () => [...calculatorFields, ...calculatorFloorFields(estimate.state)];
  const fieldValue = key => key.startsWith('floor-') ? estimate.state.floorAreas[Number(key.split('-')[1])] : estimate.state[key];

  function render(notes = []) {
    const { state, limits } = estimate;
    const floorControls = document.querySelector('[data-floor-controls]');
    if (floorControls.children.length !== state.floors) floorControls.innerHTML = calculatorFloorFields(state).map(field => calculatorNumberMarkup(field, estimate)).join('');
    for (const field of fields()) {
      const key = field.id, number = form.elements.namedItem(key), range = form.querySelector('[data-range="' + key + '"]');
      for (const input of [number, range]) { input.min = limits[key].min; input.max = limits[key].max; input.value = fieldValue(key); }
      number.removeAttribute('aria-invalid');
      document.querySelector('#calc-' + key + '-error').hidden = true;
      range.style.setProperty('--calc-fill', ((fieldValue(key) - limits[key].min) / Math.max(1, limits[key].max - limits[key].min) * 100) + '%');
      range.setAttribute('aria-valuetext', fieldValue(key) + ' ' + field.unit);
      form.querySelector('[data-min="' + key + '"]').textContent = limits[key].min;
      form.querySelector('[data-max="' + key + '"]').textContent = limits[key].max;
    }
    form.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = state[input.name] === input.value; if (input.name === 'foundation') input.disabled = !calculatorFoundationAllowed(input.value, state); });
    document.querySelector('[data-duration-hint]').textContent = 'Плановый ориентир: ' + estimate.normalMonths + ' мес. ' + (estimate.urgent ? 'Доплата за ускорение не оценена и в бюджет не включена.' : 'Продление срока не создаёт скидку.');
    document.querySelector('[data-floor-total]').textContent = 'Общая площадь: ' + calculatorArea(estimate.totalArea) + ' м²';
    document.querySelector('[data-calculator-area-summary]').textContent = 'Всего ' + calculatorArea(estimate.totalArea) + ' м² · Пятно ≈ ' + calculatorArea(estimate.footprint) + ' м²';
    document.querySelector('[data-calculator-scenario]').textContent = 'Сценарий ±' + (estimate.scenario * 100) + '%: ' + calculatorMoney(estimate.low) + ' до ' + calculatorMoney(estimate.high);
    document.querySelector('[data-calculator-warnings]').replaceChildren(...estimate.warnings.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    document.querySelector('[data-calculator-formulas]').innerHTML = calculatorDetailsMarkup(estimate);
    document.querySelector('[data-calculator-comparison]').innerHTML = calculatorComparisonMarkup(estimate);
    document.querySelector('[data-comparison-description]').textContent = 'Для сравнения сохраняем заданные площади этажей. При добавлении этажей используем их последние сохранённые площади; общий объём здания меняется.';
    document.querySelector('[data-calculator-total]').textContent = calculatorMoney(estimate.total);
    document.querySelector('[data-calculator-mobile-total]').textContent = calculatorMoney(estimate.total);
    document.querySelector('[data-calculator-meter]').textContent = '≈ ' + calculatorMoney(estimate.perMeter) + '/м²';
    document.querySelector('[data-calculator-duration]').textContent = 'Желаемый срок: ' + state.months + ' мес.';
    document.querySelector('[data-calculator-scope]').textContent = estimate.scope.label + ' · ' + estimate.foundation.label;
    document.querySelector('[data-calculator-breakdown]').innerHTML = calculatorBreakdownMarkup(estimate);
    const image = document.querySelector('[data-calculator-image]');
    if (image.getAttribute('src') !== estimate.material.image) image.src = estimate.material.image;
    image.alt = estimate.material.alt;
    document.querySelector('[data-calculator-material]').textContent = estimate.material.title;
    document.querySelectorAll('[data-price-material]').forEach(row => row.classList.toggle('is-current', row.dataset.priceMaterial === state.material));
    status.textContent = notes.join(' ');
    try { sessionStorage.setItem(calculatorStorageKey, JSON.stringify(state)); } catch {}
  }
  function update(key, value, notes = []) {
    const input = { ...estimate.state };
    if (key.startsWith('floor-')) { input.floorAreas = [...input.floorAreas]; input.floorAreas[Number(key.split('-')[1])] = value; }
    else input[key] = value;
    estimate = calculateHouseEstimate(input); render([...notes, ...estimate.notes]);
  }
  function commitNumber(input) {
    const key = input.name, limit = estimate.limits[key]; if (!limit) return;
    const raw = input.value, value = raw !== '' && Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : fieldValue(key);
    const corrected = Math.max(limit.min, Math.min(limit.max, value));
    update(key, corrected, raw === '' || value !== corrected ? ['Значение приведено к доступному диапазону.'] : []);
  }
  form.addEventListener('input', event => {
    const input = event.target;
    if (input.type === 'range') { update(input.dataset.range, Number(input.value)); return; }
    if (input.type !== 'number') return;
    const value = input.value === '' ? NaN : Number(input.value), limit = estimate.limits[input.name];
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < limit.min || value > limit.max) {
      input.setAttribute('aria-invalid', 'true'); const error = document.querySelector('#calc-' + input.name + '-error');
      error.textContent = 'Введите целое число от ' + limit.min + ' до ' + limit.max + '.'; error.hidden = false; return;
    }
    update(input.name, value);
  }, options);
  function commitIfNeeded(input) { if (input.type === 'number' && (input.value !== String(fieldValue(input.name)) || input.getAttribute('aria-invalid') === 'true')) commitNumber(input); }
  form.addEventListener('change', event => { if (event.target.type === 'radio') update(event.target.name, event.target.value); else commitIfNeeded(event.target); }, options);
  form.addEventListener('focusout', event => commitIfNeeded(event.target), options);
  form.addEventListener('submit', event => { event.preventDefault(); commitIfNeeded(document.activeElement); }, options);
  document.querySelector('[data-calculator-reset]').addEventListener('click', () => { estimate = calculateHouseEstimate(calculatorDefaults); render(['Исходные параметры восстановлены.']); }, options);
  document.querySelector('[data-calculator-inquiry]').addEventListener('click', () => {
    try { sessionStorage.setItem(calculatorStorageKey, JSON.stringify(estimate.state)); } catch {}
  }, options);
  document.querySelector('[data-calculator-download]').addEventListener('click', async event => {
    const button = event.currentTarget, snapshot = estimate;
    button.disabled = true; button.setAttribute('aria-busy', 'true'); status.textContent = 'Готовим PDF с параметрами и расчётом…';
    try {
      const bytes = await createCalculatorPdf(snapshot), url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const link = document.createElement('a'); link.href = url; link.download = 'tvoy-dom-raschet.pdf'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'PDF подготовлен и передан в загрузки браузера.';
    } catch (error) { status.textContent = 'Не удалось создать PDF. Проверьте загрузку страницы и попробуйте ещё раз.'; console.error(error); }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); }
  }, options);
  const observer = new IntersectionObserver(entries => { document.querySelector('[data-calculator-mobile-summary]').hidden = entries.some(entry => entry.isIntersecting); }, { threshold: .08 });
  observer.observe(document.querySelector('#calculator-result')); render(estimate.notes);
  return { destroy() { abort.abort(); observer.disconnect(); } };
}
