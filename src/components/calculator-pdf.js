import { calculatorMoney, calculatorArea, calculatorSummaryRows, calculatorRatesDate, calculatorSources } from '../data/calculator.js';

export const calculatorPdfAssets = { library: './assets/vendor/pdf-lib.min.js', fontkit: './assets/vendor/fontkit.umd.min.js', regular: './assets/pdf/NotoSans-Regular.ttf', bold: './assets/pdf/NotoSans-Bold.ttf' };
let calculatorPdfLibraries;
function calculatorPdfScript(src) {
  return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = () => { script.remove(); reject(new Error('Не удалось загрузить модуль PDF.')); }; document.head.append(script); });
}
async function calculatorPdfReady() {
  if (!calculatorPdfLibraries) calculatorPdfLibraries = (async () => {
    if (!globalThis.PDFLib) await calculatorPdfScript(calculatorPdfAssets.library);
    if (!globalThis.fontkit) await calculatorPdfScript(calculatorPdfAssets.fontkit);
  })().catch(error => { calculatorPdfLibraries = null; throw error; });
  await calculatorPdfLibraries;
}

async function calculatorPdfImage(src) {
  try {
    const img = new Image(); img.src = src; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1545; canvas.height = 615;
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    canvas.getContext('2d').drawImage(img, (canvas.width-img.naturalWidth*scale)/2, (canvas.height-img.naturalHeight*scale)*.3, img.naturalWidth*scale, img.naturalHeight*scale);
    return new Uint8Array(await (await fetch(canvas.toDataURL('image/jpeg', .9))).arrayBuffer());
  } catch { return null; }
}

export async function createCalculatorPdf(estimate) {
  await calculatorPdfReady();
  const { PDFDocument, rgb } = globalThis.PDFLib;
  const doc = await PDFDocument.create(); doc.registerFontkit(globalThis.fontkit);
  const fontBytes = await Promise.all([calculatorPdfAssets.regular, calculatorPdfAssets.bold].map(async path => { const response = await fetch(path); if (!response.ok) throw new Error('Не удалось загрузить шрифт PDF.'); return response.arrayBuffer(); }));
  const regular = await doc.embedFont(fontBytes[0], { subset: true }), bold = await doc.embedFont(fontBytes[1], { subset: true });
  doc.setTitle('ДОМ. - Расчёт строительства'); doc.setAuthor('ДОМ.'); doc.setSubject('Параметры проекта и предварительный бюджет'); doc.setLanguage('ru-RU');
  const W=595.28,H=841.89,M=40,C=W-M*2;
  const olive=rgb(98/255,103/255,71/255),paper=rgb(239/255,230/255,207/255),cream=rgb(248/255,241/255,223/255);
  const date=new Date().toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'});
  const clean = text => String(text).replace(/[\u00a0\u202f]/g,' ').replace(/[–—−]/g,'-').replace(/≈\s*/g,'около ');
  function text(page, value, x, top, size=11, font=regular, color=olive) { page.drawText(clean(value), {x,y:H-top-size,font,size,color}); }
  function rect(page,x,top,width,height,color){page.drawRectangle({x,y:H-top-height,width,height,color});}
  function wrap(value,width,size=11,font=regular){
    const lines=[];let line='';
    for(const word of clean(value).split(/\s+/)){
      const next=line?line+' '+word:word;
      if(font.widthOfTextAtSize(next,size)<=width){line=next;continue;}
      if(line)lines.push(line);line='';
      for(const char of word){if(font.widthOfTextAtSize(line+char,size)>width){lines.push(line);line='';}line+=char;}
    }
    if(line)lines.push(line);return lines;
  }
  function page(title){const p=doc.addPage([W,H]);rect(p,0,0,W,H,paper);text(p,'ДОМ.',M,27,33,bold);text(p,'АРХИТЕКТУРА ЖИЗНИ',M+145,43,8);text(p,date,W-M-66,43,10);if(title)text(p,title,M,112,27,bold);return p;}
  function paragraph(p,value,top,size=10,width=C,color=olive){const lines=wrap(value,width,size);lines.forEach((line,i)=>text(p,line,M,top+i*size*1.45,size,regular,color));return top+lines.length*size*1.45;}

  let p=page('Ваш будущий дом');
  text(p,estimate.material.label+' · '+estimate.scope.label,M,160,14);
  const image=await calculatorPdfImage(estimate.material.image);
  if(image){const jpg=await doc.embedJpg(image);p.drawImage(jpg,{x:M,y:H-205-205,width:C,height:205});}
  else rect(p,M,205,C,205,cream);
  rect(p,M,435,C,164,olive);text(p,'ИТОГОВАЯ СТОИМОСТЬ ПО МОДЕЛИ',M+22,456,10,bold,paper);
  text(p,calculatorMoney(estimate.total),M+22,482,34,bold,paper);
  text(p,calculatorArea(estimate.totalArea)+' м² · '+estimate.state.floors+' эт. · '+calculatorMoney(estimate.perMeter)+'/м²',M+22,538,12,regular,paper);
  let y=paragraph(p,'Строим дом. Создаём место для жизни.',633,21);
  y=paragraph(p,'Предварительный бюджет по выбранным параметрам. Не является сметой, публичной офертой или гарантией конечной цены. Изображение показывает тип материала и не является проектом выбранной планировки.',y+20,10);
  if(estimate.urgent)paragraph(p,'Ускорение графика не оценено и в сумму не включено.',y+12,10);

  p=page('Параметры проекта');y=170;
  for(const [label,value] of calculatorSummaryRows(estimate).filter(([label])=>label!=='Базовый бюджет')){
    rect(p,M,y-5,C,29,y%2?paper:cream);text(p,label,M+12,y+2,10);text(p,value,M+230,y+2,11,bold);y+=34;
  }
  y=paragraph(p,'Пятно для расчёта основания: ≈ '+calculatorArea(estimate.footprint)+' м². Площади этажей суммируются; террасы и гаражи не включены.',y+15,10);
  paragraph(p,'Окончательный конструктив, планировку, геологию и спецификацию оборудования согласуем отдельно.',y+12,10);

  p=page('Из чего складывается бюджет');y=171;
  for(const line of estimate.lines){
    const detail=line.amount?line.detail:'Не входит в выбранную комплектацию / не требуется';
    const detailLines=wrap(detail,C-24,7.8);const rowHeight=24+detailLines.length*10;
    if(y+rowHeight>H-110){p=page('Расчёт по этапам · продолжение');y=171;}
    rect(p,M,y,C,rowHeight-4,cream);text(p,line.label,M+12,y+7,10.3,bold);
    const amount=line.amount?calculatorMoney(line.amount):'—';text(p,amount,W-M-12-bold.widthOfTextAtSize(clean(amount),11),y+8,11,bold);
    detailLines.forEach((line,i)=>text(p,line,M+12,y+22+i*10,7.8));y+=rowHeight;
  }
  if(y+62>H-65){p=page('Итог расчёта');y=171;}
  rect(p,M,y+8,C,52,olive);text(p,'ИТОГО',M+15,y+24,12,bold,paper);text(p,calculatorMoney(estimate.total),W-M-15-bold.widthOfTextAtSize(clean(calculatorMoney(estimate.total)),20),y+17,20,bold,paper);

  p=page('Условия и источники');y=170;
  const notes=[
    'Сценарий ±'+estimate.scenario*100+'%: '+calculatorMoney(estimate.low)+' - '+calculatorMoney(estimate.high)+'. Это допущение чувствительности модели, не статистический интервал и не гарантированный предел цены.',
    ...estimate.warnings,
    'В стоимость не включены участок, внешние сети, скважина, септик, газификация, геология, сложные грунты, мебель, техника, благоустройство, террасы, гаражи и ускорение. НДС отдельно не пересчитывается: налоговый режим подрядчика не задан.',
    'Геометрия условная: прямоугольные этажи 1:1,25, высота 3 м, скаты 30°, свесы 0,5 м. Основание и покрытие приняты по наибольшему этажу. Все этажи, их периметры и перекрытия рассчитываются отдельно. Каждая строка округлена до 1 000 ₽, итог равен сумме строк.',
    'Публичные предложения проверены '+calculatorRatesDate+'. Они имеют разный состав и стартовые цены «от». Собственные ставки, поправки на этажность и сроки остаются допущениями. Это не статистическая средняя рынка.',
  ];
  for(const note of notes){const needed=wrap(note,C,10).length*14.5+15;if(y+needed>H-80){p=page('Условия · продолжение');y=170;}y=paragraph(p,note,y,10)+15;}
  for(const source of calculatorSources){const needed=wrap(source.url,C,8.3).length*12+22;if(y+needed>H-75){p=page('Источники расчёта');y=170;}text(p,source.name,M,y,9.5,bold);y=paragraph(p,source.url,y+14,8.3)+7;}
  doc.getPages().forEach((page,index)=>{text(page,'ДОМ. · Предварительный расчёт · '+date,M,H-39,8);text(page,(index+1)+' / '+doc.getPageCount(),W-M-30,H-39,8);});
  return doc.save();
}
