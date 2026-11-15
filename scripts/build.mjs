import { cp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { legalPage } from '../src/pages/legal.js';
import { constructionProjects } from '../src/data/construction.js';
import { constructionPage } from '../src/pages/construction.js';
import { aboutPage } from '../src/pages/about.js';
import { calculatorPage } from '../src/pages/calculator.js';
import { homePage } from '../src/pages/home.js';
import { pageDocument } from './document.mjs';
await mkdir('dist/assets', { recursive: true });
await writeFile('dist/content.js', 'window.__SITE_CONTENT = {};\n');
await cp('src', 'dist/app', { recursive: true });
const styles = async names => (await Promise.all(names.map(name => readFile('src/styles/' + name + '.css', 'utf8')))).join('\n');
await writeFile('dist/app/styles/site.css', await styles(['main', 'button-motion', 'construction', 'legal']));
await writeFile('dist/app/styles/home.css', await styles(['gallery', 'portal', 'models', 'footer']));
await writeFile('dist/index.html', pageDocument({ kind:'home', title:'ДОМ', description:'Частные дома и индивидуальная архитектура. Пространство, которое начинается с вас.', content:homePage(), styles:['home'], home:true }));
await writeFile('dist/assets/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#626747"/><path d="M19 53V34L40 19l21 15v19H47V39H33v14Z" fill="none" stroke="#efe6cf" stroke-width="4"/></svg>');
const descriptions = { about:'Твой дом: история команды с 2012 года, строительство домов под ключ и офис в Одинцово.', calculator:'Калькулятор стоимости дома: площади этажей, комнаты, материал, комплектация, фундамент и срок строительства.', privacy:'Политика обработки персональных данных и работа тестовой формы обратной связи.', consent:'Отдельное согласие на обработку данных при обращении о строительстве дома.' };
const constructionDocument = project => pageDocument({kind:'construction',title:project?.title || 'Строительство',description:project?.description || 'Дома и бани: кирпич, газобетон, дерево и бетон. Выберите материал и познакомьтесь с проектом.',base:project?'../../':'../',className:'construction-page',content:constructionPage(project?.id)});
await mkdir('dist/construction', { recursive:true });
await writeFile('dist/construction/index.html',constructionDocument());
for (const project of constructionProjects) {
  await mkdir('dist/construction/'+project.id,{recursive:true});
  await writeFile('dist/construction/'+project.id+'/index.html',constructionDocument(project));
}
for (const [kind,title,content] of [['about','О нас',aboutPage()],['calculator','Калькулятор дома',calculatorPage()],['privacy','Политика конфиденциальности',legalPage('privacy')],['consent','Согласие на обработку данных',legalPage('consent')]]) {
  await mkdir('dist/'+kind,{recursive:true});
  await writeFile('dist/'+kind+'/index.html',pageDocument({kind,title,description:descriptions[kind],base:'../',className:'construction-page '+(kind==='about'?'about-page':kind==='calculator'?'calculator-page':''),styles:kind==='about'||kind==='calculator'?[kind]:[],content}));
}
console.log('Built static pages with initial loading shell and route styles in dist/');
