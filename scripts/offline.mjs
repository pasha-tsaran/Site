import { posix } from 'node:path';
import { pageLoadingMarkup, pageLoadingBootstrap } from '../src/components/page-loading.js';
import { readFile, writeFile } from 'node:fs/promises';
const data = async (path, type) => `data:${type};base64,${(await readFile(path)).toString('base64')}`;
const video = await data('dist/assets/hero-scrub.mp4', 'video/mp4');
const poster = await data('dist/assets/hero-poster.jpg', 'image/jpeg');
const files = ['src/data/media-streams.js', 'src/components/segmented-video.js', 'src/data/site.js', 'src/data/gallery.js', 'src/data/portal.js', 'src/data/models.js', 'src/data/construction.js', 'src/data/about.js', 'src/data/calculator.js', 'src/components/models-gallery.js', 'src/components/dream-gallery.js', 'src/components/brand-portal.js', 'src/components/dream-footer.js', 'src/components/site-header.js', 'src/components/site-footer.js', 'src/pages/home.js', 'src/pages/construction.js', 'src/pages/about.js', 'src/pages/calculator.js', 'src/pages/legal.js', 'src/components/calculator-pdf.js', 'src/components/scroll-video.js', 'src/components/dialogs.js', 'src/components/button-motion.js', 'src/components/page-loading.js', 'src/components/content-editor.js', 'src/main.js'];
const sources = new Map(await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')])));
const exportsByFile = new Map([...sources].map(([file, source]) => [file, [...source.matchAll(/^export (?:async )?(?:function|const|class) (\w+)/gm)].map(match => match[1])]));
// Factories keep imported names in module scope, outside local destructuring bindings.
let code = 'const offlineModules = {' + [...exportsByFile].map(([file, names]) => JSON.stringify(file) + ':()=>({' + names.join(',') + '})').join(',') + '};\n';
for (const file of files) {
  let source = sources.get(file);
  source = source.replace(/import\(['"](.+?)['"]\)/g, (_, relative) => {
    const target = posix.normalize(posix.join(posix.dirname(file), relative));
    const names = exportsByFile.get(target);
    if (!names) throw new Error('Unknown offline module: ' + target);
    return 'Promise.resolve(offlineModules[' + JSON.stringify(target) + ']())';
  });
  source = source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  if (file.endsWith('site.js')) source += `\nsite.media.stream = null;\nsite.media.src = ${JSON.stringify(video)};\nsite.media.poster = ${JSON.stringify(poster)};\n`;
  if (file.endsWith('site.js')) source += `\nsite.contacts.mapImage = ${JSON.stringify(await data('dist/assets/odintsovo-map.webp', 'image/webp'))};\n`;
  if (file.endsWith('/data/about.js')) source += `\naboutCompany.director.image = ${JSON.stringify(await data('dist/assets/about/director.png', 'image/png'))};\n`;
  if (file.endsWith('gallery.js') && file.includes('/data/')) {
    source += `\nstoryMedia.stream = null;\nstoryMedia.src = ${JSON.stringify(await data('dist/assets/dream-story.mp4','video/mp4'))};\nstoryMedia.poster = ${JSON.stringify(await data('dist/assets/houses/house-01.webp','image/webp'))};\n`;
  }
  if (file.endsWith('/data/portal.js')) {
    source += `\nportalMedia.src = ${JSON.stringify(await data('dist/assets/brand-transition.mp4','video/mp4'))};\nportalMedia.reverseSrc = ${JSON.stringify(await data('dist/assets/brand-transition-reverse.mp4','video/mp4'))};\nportalMedia.poster = ${JSON.stringify(await data('dist/assets/brand-transition-poster.jpg','image/jpeg'))};\n`;
  }
  if (file.endsWith('/data/models.js')) {
    for (let i = 0; i < 9; i++) {
      source += '\nhouseModels[' + i + '].image = ' + JSON.stringify(await data('dist/assets/models/model-' + String(i + 1).padStart(2, '0') + '.webp','image/webp')) + ';\n';
    }
  }
  if (file.endsWith('/components/calculator-pdf.js')) {
    source += '\ncalculatorPdfAssets.regular = ' + JSON.stringify(await data('dist/assets/pdf/NotoSans-Regular.ttf','font/ttf')) + ';\ncalculatorPdfAssets.bold = ' + JSON.stringify(await data('dist/assets/pdf/NotoSans-Bold.ttf','font/ttf')) + ';\n';
  }
  code += source + '\n';
}
const styleFiles = ['loading', 'main', 'gallery', 'button-motion', 'portal', 'models', 'footer', 'construction', 'about', 'calculator', 'legal', 'responsive'];
const css = (await Promise.all(styleFiles.map(name => readFile('src/styles/' + name + '.css', 'utf8')))).join('\n');
const lenisCss = await readFile('dist/assets/lenis-1.3.26.css', 'utf8');
const lenis = (await readFile('dist/assets/lenis-1.3.26.min.js', 'utf8')).replace(/\/\/# sourceMappingURL=.*$/gm, '');
const pdfVendor = (await Promise.all(['pdf-lib.min.js','fontkit.umd.min.js'].map(name => readFile('dist/assets/vendor/' + name,'utf8')))).join('\n').replace(/\/\/# sourceMappingURL=.*$/gm,'').replace(/<\/script/gi,'<\\/script');
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#efe6cf"><title>ДОМ | Архитектура жизни</title><script>${pageLoadingBootstrap}</script><style>${lenisCss}\n${css}</style></head><body>${pageLoadingMarkup()}<div id="app" aria-busy="true"></div><script>${lenis}</script><script>${pdfVendor}</script><script>${code.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
await writeFile('../OPEN-HOUSE.html', html);
console.log(`Offline page created: ${Buffer.byteLength(html)} bytes`);
