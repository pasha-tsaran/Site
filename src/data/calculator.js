import { allHouseModels as houseModels } from './models.js';

// Public starting offers are benchmarks, not a representative market average.
// Unquoted rates and quantities are disclosed planning assumptions: pricing-audit.md.
export const calculatorRatesDate = '24.10.2026';
export const calculatorUnitRates = {
  project: 1500, setup: 50000, screw: 4500, strip: 10000, slab: 10000,
  foundationFactors: [1, 1.1, 1.25, 1.45, 1.7], roof: 7400, concreteFloor: 5500, timberFloor: 3500,
  partition: 2500, partitionPerRoom: 20, stair: 350000, lifting: 900,
  engineering: 11000, roughFinish: 14500, finish: 21000,
  logisticsBase: 90000, includedDistance: 20, extraKm: 1400,
  includedArea: 100, extraAreaLogistics: 180,
  aspect: 1.25, height: 3, eaves: .5, roofAngle: 30,
};
if (typeof window !== 'undefined') Object.assign(calculatorUnitRates, window.__SITE_CONTENT?.rates || {});
const calculatorMaterialRates = {
  brick: { label: 'Кирпич', shell: 12000, contour: 14000, months: 8 },
  aerated: { label: 'Газобетон', shell: 9500, contour: 12000, months: 6 },
  ceramic: { label: 'Керамические блоки', shell: 11500, contour: 13000, months: 7 },
  frame: { label: 'Каркас', shell: 8500, contour: 12000, months: 4 },
  timber: { label: 'Клеёный брус', shell: 35000, contour: 5000, months: 6 },
  concrete: { label: 'Монолитный бетон', shell: 15000, contour: 16000, months: 9 },
};
if (typeof window !== 'undefined') for (const [id, rates] of Object.entries(calculatorMaterialRates)) {
  Object.assign(rates, window.__SITE_CONTENT?.materialRates?.[id] || {});
}
export const calculatorMaterials = houseModels.filter(model => calculatorMaterialRates[model.id]).map(model => ({ ...model, ...calculatorMaterialRates[model.id] }));
export const calculatorPackages = [
  { id: 'box', label: 'Коробка', description: 'Фундамент, несущие стены, перегородки, перекрытия, лестницы и кровля', time: .65 },
  { id: 'contour', label: 'Тёплый контур', description: 'Коробка, окна, наружные двери, утепление и фасад', time: .83 },
  { id: 'key', label: 'Под ключ', description: 'Тёплый контур, внутренняя инженерия, черновая и чистовая отделка', time: 1 },
];
export const calculatorFoundations = [
  { id: 'screw', label: 'Винтовые сваи', description: 'С ростверком. В модели доступны каркас и брус до двух этажей' },
  { id: 'strip', label: 'Ленточный', description: 'По условной длине наружных и внутренних лент' },
  { id: 'slab', label: 'Монолитная плита', description: 'По пятну застройки. Геология и проект обязательны' },
];
export const calculatorSettings = {
  floorAreaMin:40, floorAreaMax:500, roomsMin:1, roomsMax:12, floorsMin:1, floorsMax:5, distanceMin:0, distanceMax:300, monthsMin:2, monthsMax:48,
  defaultFloorArea1:80, defaultFloorArea2:80, defaultFloorArea3:80, defaultFloorArea4:80, defaultFloorArea5:80, defaultRooms:4, defaultFloors:2, defaultDistance:50, defaultMonths:8,
  defaultMaterial:'aerated', defaultPackage:'key', defaultFoundation:'slab',
  roomBaseArea:18, roomExtraFloorArea:8, roomArea:12, timeReferenceArea:150, timeAreaExponent:.45, timeExtraFloor:.8, timeMinimum:2,
  scenarioStandard:.2, scenarioComplex:.3, scenarioHigh:.4, scenarioSmallArea:80, scenarioLargeArea:300,
  screwMaxFloors:2, complexFromFloor:3, highFromFloor:4,
};
export const calculatorRules = { screwMaterials:['frame','timber'], slabOnlyMaterials:['concrete'], timberFloorMaterials:['frame','timber'], complexMaterials:['concrete'] };
export const calculatorTexts = {
  rooms:{label:'Жилые комнаты',unit:'комн.',hint:'Во всём доме, без кухни, санузлов и технических помещений.'},
  floors:{label:'Количество этажей',unit:'эт.',hint:'Площадь каждого этажа задайте ниже.'},
  distance:{label:'Удалённость от МКАД',unit:'км',hint:'Расстояние по дороге.'},
  months:{label:'Желаемый срок',unit:'мес.',hint:'От начала работ. Ускоренный график и его стоимость согласовываются отдельно.'},
  floor:{label:'Этаж',unit:'м²',hint:'Строительная площадь по наружным размерам.'},
};
if (typeof window !== 'undefined') {
  Object.assign(calculatorSettings, window.__SITE_CONTENT?.calculatorSettings || {});
  Object.assign(calculatorRules, window.__SITE_CONTENT?.calculatorRules || {});
  for (const [key,value] of Object.entries(calculatorTexts)) Object.assign(value, window.__SITE_CONTENT?.calculatorTexts?.[key] || {});
  for (const item of calculatorPackages) Object.assign(item, window.__SITE_CONTENT?.calculatorPackages?.[item.id] || {});
  for (const item of calculatorFoundations) Object.assign(item, window.__SITE_CONTENT?.calculatorFoundations?.[item.id] || {});
}
export const calculatorDefaults = Object.freeze({ area: Array.from({length:calculatorSettings.defaultFloors},(_,i)=>calculatorSettings['defaultFloorArea'+(i+1)]).reduce((a,b)=>a+b,0), areaMode: 'individual', floorAreas: Object.freeze(Array.from({length:5},(_,i)=>calculatorSettings['defaultFloorArea'+(i+1)])), rooms: calculatorSettings.defaultRooms, floors: calculatorSettings.defaultFloors, distance: calculatorSettings.defaultDistance, months: calculatorSettings.defaultMonths, material: calculatorSettings.defaultMaterial, package: calculatorSettings.defaultPackage, foundation: calculatorSettings.defaultFoundation });
export const calculatorFields = [
  { id:'rooms', ...calculatorTexts.rooms },
  { id:'floors', ...calculatorTexts.floors },
  { id:'distance', ...calculatorTexts.distance },
  { id:'months', ...calculatorTexts.months },
];
for (const field of calculatorFields) { field.min=calculatorSettings[field.id+'Min']; field.max=calculatorSettings[field.id+'Max']; }
export const calculatorSources = [
  { name: 'VEDARES', url: 'https://vedares.ru/stroitelstvo/', text: 'Коробка с фундаментом и кровлей: газобетон от 30 000 ₽/м², кирпич и керамоблок от 34 000 ₽/м². Тёплый контур от 42 000 и 48 000 ₽/м² соответственно. Перегородки в коробку не включены.' },
  { name: 'ЮржилСервис', url: 'https://ugsdom.ru/ceny/dom-pod-klyuch-moskovskaya-oblast', text: 'Для 150 м²: газобетонный тёплый контур с фундаментом 48 000 ₽/м²; каркасный 38 000 ₽/м² без фундамента. Инженерия и отделка отдельно.' },
  { name: 'КСУ Нордвест', url: 'https://www.ksu-nordwest.ru/price/', text: 'Коробка с фундаментом, крышей и перегородками: газобетон от 44 500, кирпич от 45 000, керамоблок от 46 500 ₽/м². Черновая отделка с материалами от 14 500, чистовая от 21 000 ₽/м²; инженерия от 8 500 ₽/м².' },
  { name: 'Рубкофф', url: 'https://rubkoff.ru/catalog/doma-iz-kleenogo-brusa/', text: 'Клеёный брус: холодный контур от 65 000 ₽/м², тёплый от 70 000 ₽/м². Включены фундамент, кровля и логистика; инженерия и внутренняя отделка не входят.' },
  { name: 'Опора дома', url: 'https://oporadoma-fundament-msk.ru/', text: 'Материалы и работы: плита от 8 000 ₽/м², лента от 7 000 ₽/пог. м. Это стартовые предложения, а не расчёт несущей способности основания.' },
  { name: 'ТГВ строй', url: 'https://tgv-stroy.ru/uslugi/ustrojstvo-perekrytij/monolitnoe/', text: 'Монолитное межэтажное перекрытие под ключ: ориентир от 4 500 до 6 500 ₽/м². В модели взята середина этого диапазона 5 500 ₽/м².' },
  { name: 'Рифей Б', url: 'https://rifeyb.ru/uslugi/krovlya/', text: 'Холодная кровля со стропилами, металлочерепицей, водостоком и подшивкой: опубликован ориентир 7 400 ₽/м² ската с материалами и работой. Утепление в модели добавляется в тёплом контуре.' },
  { name: 'B&P STROY', url: 'https://bpstroydom.ru/blog/skolko-stoit-inzheneriya-doma', text: 'Комплекс инженерных систем от 11 000 ₽/м². Принят как ориентир внутренней инженерии; наружные сети и премиальное оборудование в наш расчёт не включены.' },
  { name: 'Интел Групп', url: 'https://doma-karkas.ru/articles/odnoetazhnyy-ili-dvukhetazhnyy-dom-chto-deshevle-pri-odinakovoy-ploshchadi/', text: 'Сравнение одинаковой общей площади объясняет возможную экономию двух этажей меньшей площадью фундамента и кровли. Процент экономии из статьи не используется как коэффициент калькулятора.' },
];

const calculatorClamp = (value, min, max) => Math.max(min, Math.min(max, value));
const calculatorInteger = (value, fallback) => value !== '' && Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback;
const calculatorMoneyRound = value => Math.round(value / 1000) * 1000;
export const calculatorMoney = value => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
export const calculatorArea = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
export const calculatorStorageKey = 'tvoydom.calculator.v2';
export const calculatorFloorFields = state => Array.from({ length: state.floors }, (_, index) => ({ id: 'floor-' + index, label: calculatorTexts.floor.label + ' ' + (index + 1), unit: calculatorTexts.floor.unit, min: calculatorSettings.floorAreaMin, max: calculatorSettings.floorAreaMax, hint: calculatorTexts.floor.hint }));
export const calculatorTotalArea = state => state.floorAreas.slice(0, state.floors).reduce((sum, value) => sum + value, 0);

export function calculatorFoundationAllowed(id, state) {
  if (calculatorRules.slabOnlyMaterials.includes(state.material)) return id === 'slab';
  if (id === 'screw') return calculatorRules.screwMaterials.includes(state.material) && state.floors <= calculatorSettings.screwMaxFloors;
  return id === 'strip' || id === 'slab';
}

export function calculatorNormalMonths(state) {
  const material = calculatorMaterials.find(item => item.id === state.material);
  const scope = calculatorPackages.find(item => item.id === state.package);
  return Math.max(calculatorSettings.timeMinimum, Math.ceil(material.months * (calculatorTotalArea(state) / calculatorSettings.timeReferenceArea) ** calculatorSettings.timeAreaExponent * scope.time + (state.floors - 1) * calculatorSettings.timeExtraFloor));
}

export function normalizeCalculatorState(input = {}) {
  input = input && typeof input === 'object' ? input : {};
  const state = { ...calculatorDefaults }, notes = [];
  for (const [key, list] of [['material', calculatorMaterials], ['package', calculatorPackages], ['foundation', calculatorFoundations]]) {
    if (list.some(item => item.id === input[key])) state[key] = input[key];
  }
  for (const field of calculatorFields) state[field.id] = calculatorClamp(calculatorInteger(input[field.id] ?? state[field.id], state[field.id]), field.min, field.max);
  let areas = input.floorAreas;
  // Migrate saved total/per-floor input without changing the meaning of old estimates.
  if (!Array.isArray(areas) && input.area != null) {
    const entered = calculatorClamp(calculatorInteger(input.area, calculatorDefaults.area), calculatorSettings.floorAreaMin, calculatorSettings.floorAreaMax * 5);
    if (input.areaMode === 'perFloor') areas = Array(5).fill(entered);
    else {
      state.floors = Math.min(state.floors, Math.max(1, Math.floor(entered / calculatorSettings.floorAreaMin)));
      const base = Math.floor(entered / state.floors), remainder = entered % state.floors;
      areas = Array.from({ length: 5 }, (_, i) => base + (i < remainder ? 1 : 0));
    }
  }
  state.floorAreas = Array.from({ length: 5 }, (_, i) => calculatorClamp(calculatorInteger(areas?.[i], calculatorDefaults.floorAreas[i]), calculatorSettings.floorAreaMin, calculatorSettings.floorAreaMax));
  state.areaMode = 'individual';
  state.area = calculatorTotalArea(state);
  const maxRooms = Math.max(calculatorSettings.roomsMin, Math.min(calculatorSettings.roomsMax, Math.floor((state.area - calculatorSettings.roomBaseArea - (state.floors - 1) * calculatorSettings.roomExtraFloorArea) / calculatorSettings.roomArea)));
  if (state.rooms > maxRooms) { state.rooms = maxRooms; notes.push('Количество комнат скорректировано под общую площадь.'); }
  if (!calculatorFoundationAllowed(state.foundation, state)) { state.foundation = 'slab'; notes.push('Для этой конфигурации модель использует плиту. Тип основания уточняется по геологии.'); }
  const normalMonths = calculatorNormalMonths(state);
  const limits = Object.fromEntries([...calculatorFields, ...calculatorFloorFields(state)].map(field => [field.id, { min: field.min, max: field.max }]));
  limits.rooms.max = maxRooms;
  return { state, limits, notes, normalMonths };
}

export function calculateHouseEstimate(input = {}) {
  const normalized = normalizeCalculatorState(input);
  const { state, normalMonths } = normalized;
  const material = calculatorMaterials.find(item => item.id === state.material);
  const scope = calculatorPackages.find(item => item.id === state.package);
  const foundation = calculatorFoundations.find(item => item.id === state.foundation);
  const r = calculatorUnitRates, areas = state.floorAreas.slice(0, state.floors), totalArea = calculatorTotalArea(state), footprint = Math.max(...areas);
  const width = Math.sqrt(footprint / r.aspect), length = width * r.aspect;
  const perimeter = 2 * (width + length);
  const wallAreas = areas.map(area => 2 * (Math.sqrt(area / r.aspect) + Math.sqrt(area * r.aspect)) * r.height);
  const wallArea = wallAreas.reduce((sum, value) => sum + value, 0);
  const roofArea = (width + 2 * r.eaves) * (length + 2 * r.eaves) / Math.cos(r.roofAngle * Math.PI / 180);
  const stripLength = perimeter + length + width;
  const floorArea = areas.slice(1).reduce((sum, area) => sum + area, 0) + (state.foundation === 'slab' ? 0 : areas[0]);
  const light = calculatorRules.timberFloorMaterials.includes(state.material);
  const floorRate = light ? r.timberFloor : r.concreteFloor;
  const foundationFactor = r.foundationFactors[state.floors - 1];
  const foundationRaw = state.foundation === 'screw' ? footprint * r.screw : (state.foundation === 'strip' ? stripLength * r.strip : footprint * r.slab) * foundationFactor;
  const partitionArea = (state.rooms - 1) * r.partitionPerRoom;
  const upperWallArea = wallAreas.slice(1).reduce((sum, value) => sum + value, 0);
  const makeLine = (id, label, amount, detail) => ({ id, label, amount: calculatorMoneyRound(amount), detail });
  const lines = [
    makeLine('design', 'Проект и организация', totalArea * r.project + r.setup, calculatorArea(totalArea) + ' м² × ' + calculatorMoney(r.project) + ' + ' + calculatorMoney(r.setup)),
    makeLine('foundation', 'Фундамент', foundationRaw, state.foundation === 'strip' ? calculatorArea(stripLength) + ' пог. м × ' + calculatorMoney(r.strip) + ' × ' + foundationFactor : calculatorArea(footprint) + ' м² × ' + calculatorMoney(state.foundation === 'screw' ? r.screw : r.slab) + (state.foundation === 'screw' ? '' : ' × ' + foundationFactor)),
    makeLine('shell', 'Несущие стены и конструктив', wallArea * material.shell, calculatorArea(wallArea) + ' м² приведённой стены × ' + calculatorMoney(material.shell)),
    makeLine('partitions', 'Внутренние перегородки', partitionArea * r.partition, calculatorArea(partitionArea) + ' м² × ' + calculatorMoney(r.partition)),
    makeLine('floors', 'Перекрытия', floorArea * floorRate, calculatorArea(floorArea) + ' м² × ' + calculatorMoney(floorRate) + (state.foundation === 'slab' ? '; пол первого этажа плита основания' : '; включая перекрытие первого этажа')),
    makeLine('stairs', 'Межэтажные лестницы', (state.floors - 1) * r.stair, (state.floors - 1) + ' шт. × ' + calculatorMoney(r.stair)),
    makeLine('lifting', 'Подъём материалов и леса', upperWallArea * r.lifting, calculatorArea(upperWallArea) + ' м² верхних стен × ' + calculatorMoney(r.lifting)),
    makeLine('roof', 'Кровля', roofArea * r.roof, calculatorArea(roofArea) + ' м² скатов × ' + calculatorMoney(r.roof)),
    makeLine('contour', 'Окна, утепление и фасад', scope.id === 'box' ? 0 : totalArea * material.contour, calculatorArea(totalArea) + ' м² × ' + calculatorMoney(material.contour)),
    makeLine('engineering', 'Внутренняя инженерия', scope.id === 'key' ? totalArea * r.engineering : 0, calculatorArea(totalArea) + ' м² × ' + calculatorMoney(r.engineering)),
    makeLine('roughFinish', 'Черновая отделка', scope.id === 'key' ? totalArea * r.roughFinish : 0, calculatorArea(totalArea) + ' м² × ' + calculatorMoney(r.roughFinish)),
    makeLine('finish', 'Чистовая отделка', scope.id === 'key' ? totalArea * r.finish : 0, calculatorArea(totalArea) + ' м² × ' + calculatorMoney(r.finish)),
    makeLine('logistics', 'Доставка и логистика', r.logisticsBase + Math.max(0, state.distance - r.includedDistance) * r.extraKm + Math.max(0, totalArea - r.includedArea) * r.extraAreaLogistics, calculatorMoney(r.logisticsBase) + ' + ' + Math.max(0, state.distance - r.includedDistance) + ' км × ' + calculatorMoney(r.extraKm) + ' + ' + Math.max(0, totalArea - r.includedArea) + ' м² × ' + calculatorMoney(r.extraAreaLogistics)),
  ];
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const urgent = state.months < normalMonths;
  const scenario = state.floors >= calculatorSettings.highFromFloor ? calculatorSettings.scenarioHigh : state.floors >= calculatorSettings.complexFromFloor || calculatorRules.complexMaterials.includes(state.material) || totalArea > calculatorSettings.scenarioLargeArea || totalArea < calculatorSettings.scenarioSmallArea ? calculatorSettings.scenarioComplex : calculatorSettings.scenarioStandard;
  const warnings = [];
  if (urgent) warnings.push('Желаемый срок короче планового. Стоимость ускорения не оценена и в сумму не включена; график требует согласования.');
  if (state.floors >= 3) warnings.push('От трёх этажей: требуется индивидуальный конструктивный расчёт. Сопоставимых открытых смет недостаточно; точность модели ниже.');
  if (state.floors > 3) warnings.push('4 или 5 надземных этажей выходят за обычные параметры объекта ИЖС (п. 39 ст. 1 ГрК РФ). Это сценарная оценка отдельного формата здания, а не предложение типового частного дома.');
  if (areas.some((area, index) => index > 0 && area > areas[index - 1])) warnings.push('Верхний этаж больше нижнего. Консоли и нестандартный несущий каркас не оценены: требуется проект. Фундамент и кровля условно посчитаны по наибольшему этажу.');
  if (state.material === 'concrete') warnings.push('Монолит: ставка несущих конструкций: допущение. Сопоставимый публичный прайс на полный дом не подтверждён.');
  if (totalArea > calculatorSettings.scenarioLargeArea || totalArea < calculatorSettings.scenarioSmallArea) warnings.push('Площадь выходит за основной диапазон сравнения от ' + calculatorSettings.scenarioSmallArea + ' до ' + calculatorSettings.scenarioLargeArea + ' м²; нужна индивидуальная смета.');
  return { ...normalized, material, scope, foundation, totalArea, footprint, wallArea, roofArea, floorArea, stripLength, partitionArea, lines, total, perMeter: Math.round(total / totalArea / 100) * 100, urgent, warnings, scenario, low: calculatorMoneyRound(total * (1 - scenario)), high: calculatorMoneyRound(total * (1 + scenario)) };
}

export function calculatorSummaryRows(estimate) {
  const s = estimate.state;
  return [
    ['Материал', estimate.material.label], ['Комплектация', estimate.scope.label], ['Фундамент', estimate.foundation.label],
    ['Общая площадь', calculatorArea(estimate.totalArea) + ' м²'],
    ...s.floorAreas.slice(0, s.floors).map((area, index) => ['Этаж ' + (index + 1), calculatorArea(area) + ' м²']),
    [calculatorTexts.floors.label, String(s.floors)], [calculatorTexts.rooms.label, String(s.rooms)],
    [calculatorTexts.distance.label, s.distance + ' ' + calculatorTexts.distance.unit], [calculatorTexts.months.label, s.months + ' ' + calculatorTexts.months.unit],
    ['Плановый ориентир', estimate.normalMonths + ' мес.'], ['Базовый бюджет', calculatorMoney(estimate.total)],
  ];
}

export function calculatorEstimateText(estimate) {
  return ['ДОМ · предварительный расчёт', ...calculatorSummaryRows(estimate).map(([label, value]) => label + ': ' + value), '',
    ...estimate.lines.map(line => line.label + ': ' + (line.amount ? calculatorMoney(line.amount) + ' (' + line.detail + ')' : 'не входит / не требуется')),
    '', 'Итоговая стоимость по модели: ' + calculatorMoney(estimate.total),
    'Сценарий ±' + (estimate.scenario * 100) + '%: ' + calculatorMoney(estimate.low) + ' до ' + calculatorMoney(estimate.high) + '. Это допущение, не гарантированный диапазон.',
    ...estimate.warnings, 'Источники проверены ' + calculatorRatesDate + '. Не является сметой или офертой.',
    'Участок, внешние сети, мебель, благоустройство, геология, сложные грунты и ускорение не включены.', '',
    ...calculatorSources.map(source => source.name + ': ' + source.url)].join('\n');
}
