import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, existsSync, createReadStream } from 'node:fs';
import { writeFile, stat, open, rename, unlink } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { houseModels } from '../src/data/models.js';
import { constructionProjects } from '../src/data/construction.js';
import { calculatorUnitRates, calculatorMaterials, calculatorSettings, calculatorRules, calculatorTexts, calculatorPackages, calculatorFoundations } from '../src/data/calculator.js';
import { site } from '../src/data/site.js';

const dataDir = resolve(process.env.CMS_DATA_DIR || 'cms-data');
const dist = resolve('dist'), adminDir = resolve('admin');
mkdirSync(resolve(dataDir, 'uploads'), { recursive:true });
const db = new DatabaseSync(resolve(dataDir, 'site.sqlite'));
db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, hash TEXT NOT NULL, role TEXT NOT NULL, must_change INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS content (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);');
const hashPassword = password => { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); };
const verify = (password, stored) => { const [salt, hash] = stored.split(':'); const value = scryptSync(password, salt, 64); return timingSafeEqual(value, Buffer.from(hash, 'hex')); };
if (!db.prepare('SELECT id FROM users LIMIT 1').get()) {
  const initialPassword = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO users(login,hash,role,must_change) VALUES(?,?,?,1)').run('admin', hashPassword(initialPassword), 'admin');
  console.log('Временный пароль администратора: ' + initialPassword);
}
if (!db.prepare('SELECT id FROM content WHERE id=1').get()) db.prepare('INSERT INTO content VALUES(1,?)').run(JSON.stringify({ revision:0, pages:{}, models:{}, projects:{}, rates:{} }));
const getContent = () => { const content=JSON.parse(db.prepare('SELECT data FROM content WHERE id=1').get().data); if (content.calculatorSettings && 'defaultFloorArea' in content.calculatorSettings) { for(let i=1;i<=5;i++) content.calculatorSettings['defaultFloorArea'+i] ??= content.calculatorSettings.defaultFloorArea; delete content.calculatorSettings.defaultFloorArea; } return content; };
const saveContent = content => { content.revision++; db.prepare('UPDATE content SET data=? WHERE id=1').run(JSON.stringify(content)); };
const catalog = content => [...houseModels, ...(content.addedModels || [])].map(model => ({ ...model, ...constructionProjects.find(project=>project.id===model.id), ...content.models[model.id], ...content.projects[model.id], deleted:(content.deletedModels||[]).includes(model.id) }));
const sessions = new Map(), attempts = new Map();
const roles = ['admin','editor','catalog','viewer'];
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' }); res.end(JSON.stringify(value)); };
const fail = (res, status, error) => json(res, status, { error });
async function body(req, max=1024*1024) { let size=0, chunks=[]; for await (const chunk of req) { size += chunk.length; if (size > max) throw new Error('Слишком большой запрос'); chunks.push(chunk); } return Buffer.concat(chunks); }
async function readJson(req) { return JSON.parse((await body(req)).toString('utf8')); }
function userFor(req) { const token = /(?:^|;\s*)session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1], session = sessions.get(token); if (!session || session.expires < Date.now()) { sessions.delete(token); return null; } const user = db.prepare('SELECT id, login, role, must_change FROM users WHERE id=?').get(session.id); return user ? { ...user, token } : null; }
function cookie(req, token, maxAge) { const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https'; return `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`; }
function requireRole(res, user, allowed) { if (!user) { fail(res,401,'Войдите в панель'); return false; } if (user.must_change) { fail(res,403,'Сначала смените пароль'); return false; } if (!allowed.includes(user.role)) { fail(res,403,'Недостаточно прав'); return false; } return true; }
const safeText = (value, max=3000) => typeof value === 'string' && value.length <= max && !/[<>"'&]/.test(value);
const imageUrl = value => typeof value === 'string' && /^\/uploads\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(value);
const videoUrl = value => typeof value === 'string' && /^\/uploads\/[a-f0-9]{64}\.mp4$/.test(value);
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000000;
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost'), path = decodeURIComponent(url.pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers.origin;
    if (!origin || !['http:', 'https:'].includes(new URL(origin).protocol) || new URL(origin).host !== req.headers.host) return fail(res,403,'Недопустимый источник запроса');
  }
  if (path === '/content.js' && req.method === 'GET') { res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); return res.end('window.__SITE_CONTENT = ' + JSON.stringify(getContent()).replace(/</g,'\\u003c') + ';'); }
  if (path.startsWith('/api/admin/')) {
    const user = userFor(req);
    if (path === '/api/admin/login' && req.method === 'POST') {
      const ip = process.env.TRUST_PROXY === '1' ? (req.headers['x-real-ip'] || req.socket.remoteAddress) : req.socket.remoteAddress, attempt = attempts.get(ip) || { count:0, until:0 };
      if (attempt.until > Date.now()) return fail(res,429,'Слишком много попыток. Повторите через 15 минут.');
      const input = await readJson(req), row = typeof input.login === 'string' ? db.prepare('SELECT * FROM users WHERE login=?').get(input.login) : null;
      if (!row || typeof input.password !== 'string' || !verify(input.password, row.hash)) { attempt.count++; if (attempt.count >= 8) { attempt.count=0; attempt.until=Date.now()+900000; } attempts.set(ip,attempt); return fail(res,401,'Неверный логин или пароль'); }
      attempts.delete(ip); const token=randomBytes(32).toString('hex'); sessions.set(token,{id:row.id,expires:Date.now()+8*3600000}); res.setHeader('Set-Cookie',cookie(req,token,28800)); return json(res,200,{login:row.login,role:row.role,must_change:row.must_change});
    }
    if (path === '/api/admin/session' && req.method === 'GET') return user ? json(res,200,{login:user.login,role:user.role,must_change:user.must_change}) : fail(res,401,'Войдите в панель');
    if (path === '/api/admin/logout' && req.method === 'POST') { if (user) sessions.delete(user.token); res.setHeader('Set-Cookie',cookie(req,'',0)); return json(res,200,{ok:true}); }
    if (path === '/api/admin/password' && req.method === 'POST') {
      if (!user) return fail(res,401,'Войдите в панель'); const input=await readJson(req), row=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
      if (typeof input.current !== 'string' || !verify(input.current,row.hash)) return fail(res,400,'Текущий пароль неверен');
      if (typeof input.password !== 'string' || input.password.length < 8 || input.password.length > 200) return fail(res,400,'Новый пароль должен содержать от 8 до 200 символов');
      db.prepare('UPDATE users SET hash=?, must_change=0 WHERE id=?').run(hashPassword(input.password),user.id);
      for (const [token,session] of sessions) if (session.id===user.id && token!==user.token) sessions.delete(token);
      return json(res,200,{ok:true});
    }
    if (path === '/api/admin/data' && req.method === 'GET') {
      if (!requireRole(res,user,roles)) return; const content=getContent();
      return json(res,200,{content,contacts:{...site.contacts,...content.contacts},models:catalog(content),rates:{...calculatorUnitRates,...content.rates},settings:{...calculatorSettings,...content.calculatorSettings},rules:{...calculatorRules,...content.calculatorRules},texts:Object.fromEntries(Object.entries(calculatorTexts).map(([key,value])=>[key,{...value,...content.calculatorTexts?.[key]}])),packages:calculatorPackages.map(item=>({...item,...content.calculatorPackages?.[item.id]})),foundations:calculatorFoundations.map(item=>({...item,...content.calculatorFoundations?.[item.id]})),materialRates:calculatorMaterials.map(material=>({id:material.id,label:material.label,shell:material.shell,contour:material.contour,months:material.months,...content.materialRates?.[material.id]}))});
    }
    if (path === '/api/admin/contacts' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','editor'])) return; const input=await readJson(req);
      if (!safeText(input.phone,40) || !/^[+\d()\s-]+$/.test(input.phone) || input.phone.replace(/\D/g,'').length < 5 || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input.email) || !safeText(input.telegram,100) || !safeText(input.location,300) || typeof input.mapHref !== 'string' || !/^https:\/\//.test(input.mapHref) || /[<>"'\s]/.test(input.mapHref)) return fail(res,400,'Проверьте телефон, почту и ссылку на карту');
      const content=getContent(); content.contacts={phone:input.phone,phoneHref:'tel:'+input.phone.replace(/[^+\d]/g,''),email:input.email,telegram:input.telegram,location:input.location,mapHref:input.mapHref}; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/page' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','editor'])) return; const input=await readJson(req);
      if (typeof input.route !== 'string' || !/^\/(?:[a-z0-9-]+\/)*$/.test(input.route) || typeof input.key !== 'string' || input.key.length > 1000 || !/^(?:[a-z][a-z0-9-]*:nth-of-type\(\d+\)(?: > )?)+\|(text|image)\|\d+$/.test(input.key)) return fail(res,400,'Некорректный элемент');
      if (input.key.includes('|image|') ? !imageUrl(input.value) : typeof input.value !== 'string' || input.value.length > 5000) return fail(res,400,'Некорректное значение');
      const content=getContent(); content.pages[input.route] ||= {}; content.pages[input.route][input.key]=input.value; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/model' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), content=getContent(), creating=!input.id, original=creating?null:catalog(content).find(p=>p.id===input.id); if (!creating && !original) return fail(res,400,'Проект не найден');
      if (creating && (!['house','bath'].includes(input.kind) || catalog(content).length>=100)) return fail(res,400,'Выберите тип карточки; доступно не более 100 карточек');
      const model={}, project={};
      for (const key of ['title','note','alt']) { if (!safeText(input[key],1000) || !input[key].trim()) return fail(res,400,'Заполните текст без недопустимых символов'); model[key]=input[key]; }
      if (!(imageUrl(input.image) || (original && input.image === original.image))) return fail(res,400,'Выберите фотографию'); model.image=input.image;
      for (const key of ['description','material']) { if (!safeText(input[key],3000) || !input[key].trim()) return fail(res,400,'Заполните текст без недопустимых символов'); project[key]=input[key]; }
      for (const key of ['area','plot','rooms','floors','months','price']) { if (!numeric(input[key]) || (['rooms','floors','months'].includes(key) && (!Number.isInteger(input[key]) || input[key]<1))) return fail(res,400,'Проверьте числовые характеристики'); project[key]=input[key]; }
      const id=creating ? 'project-'+randomBytes(8).toString('hex')+(input.kind==='bath'?'-bath':'') : input.id;
      if (creating) { content.addedModels ||= []; content.addedModels.push({ id, ...model }); }
      content.models[id]=model; content.projects[id]=project; saveContent(content); return json(res,200,{ok:true,id});
    }
    if (path === '/api/admin/model-visibility' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), content=getContent(), models=catalog(content), item=models.find(model=>model.id===input.id);
      if (!item || typeof input.deleted!=='boolean') return fail(res,400,'Карточка не найдена');
      if (input.deleted && !item.deleted && models.filter(model=>!model.deleted).length<=1) return fail(res,400,'Оставьте хотя бы одну карточку в каталоге');
      content.deletedModels=(content.deletedModels||[]).filter(id=>id!==input.id); if (input.deleted) content.deletedModels.push(input.id);
      saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/rates' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), rates={};
      for (const [key,value] of Object.entries(input)) { if (!Object.hasOwn(calculatorUnitRates,key)) return fail(res,400,'Проверьте ставки'); if (key==='foundationFactors') { if(!Array.isArray(value)||value.length!==5||!value.every(item=>numeric(item)&&item>0&&item<=10)) return fail(res,400,'Проверьте коэффициенты этажности'); rates[key]=value; continue; } if (!numeric(value) || (key==='aspect' && value<=0) || (key==='roofAngle' && value>=90)) return fail(res,400,'Проверьте ставки'); rates[key]=value; }
      const content=getContent(); content.rates=rates; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/material-rates' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), materialRates={};
      if (!Array.isArray(input) || input.length!==calculatorMaterials.length) return fail(res,400,'Проверьте материалы');
      for (const item of input) { if (!calculatorMaterials.some(material=>material.id===item.id) || materialRates[item.id] || !['shell','contour','months'].every(key=>numeric(item[key])) || item.months<1 || !safeText(item.label,100) || !item.label.trim()) return fail(res,400,'Проверьте ставки материалов'); materialRates[item.id]={label:item.label,shell:item.shell,contour:item.contour,months:item.months}; }
      const content=getContent(); content.materialRates=materialRates; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/calculator-settings' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), settings={...calculatorSettings,...input};
      if (Object.keys(input).some(key=>!Object.hasOwn(calculatorSettings,key)) || Object.keys(calculatorSettings).filter(key=>typeof calculatorSettings[key]==='number').some(key=>!numeric(settings[key]))) return fail(res,400,'Проверьте параметры калькулятора');
      for (const key of ['floorAreaMin','floorAreaMax','roomsMin','roomsMax','floorsMin','floorsMax','distanceMin','distanceMax','monthsMin','monthsMax','defaultFloorArea1','defaultFloorArea2','defaultFloorArea3','defaultFloorArea4','defaultFloorArea5','defaultRooms','defaultFloors','defaultDistance','defaultMonths','screwMaxFloors','complexFromFloor','highFromFloor']) if (!Number.isInteger(settings[key])) return fail(res,400,'Границы и значения по умолчанию должны быть целыми числами');
      for (const key of ['rooms','floors','distance','months']) if (settings[key+'Min']>settings[key+'Max'] || settings['default'+key[0].toUpperCase()+key.slice(1)]<settings[key+'Min'] || settings['default'+key[0].toUpperCase()+key.slice(1)]>settings[key+'Max']) return fail(res,400,'Значения по умолчанию должны находиться внутри границ');
      if (settings.floorsMin<1||settings.floorsMax>5||settings.roomsMin<1||settings.roomsMax>100||settings.floorAreaMin<1||settings.floorAreaMin>settings.floorAreaMax||settings.floorAreaMax>10000||[1,2,3,4,5].some(i=>settings['defaultFloorArea'+i]<settings.floorAreaMin||settings['defaultFloorArea'+i]>settings.floorAreaMax)||settings.monthsMin<1||settings.distanceMax>100000||settings.monthsMax>1000||settings.roomArea<=0||settings.timeReferenceArea<=0||settings.timeAreaExponent>3||settings.timeMinimum<1||settings.screwMaxFloors<1||settings.screwMaxFloors>5||settings.complexFromFloor<1||settings.complexFromFloor>5||settings.highFromFloor<settings.complexFromFloor||settings.highFromFloor>5||settings.scenarioStandard>=1||settings.scenarioComplex>=1||settings.scenarioHigh>=1||settings.scenarioSmallArea>=settings.scenarioLargeArea) return fail(res,400,'Проверьте допустимые границы, площади, сроки и сценарии');
      if (!calculatorMaterials.some(item=>item.id===settings.defaultMaterial)||!calculatorPackages.some(item=>item.id===settings.defaultPackage)||!calculatorFoundations.some(item=>item.id===settings.defaultFoundation)) return fail(res,400,'Проверьте варианты по умолчанию');
      const content=getContent(); content.calculatorSettings=settings; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/calculator-rules' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), rules={};
      for (const key of Object.keys(calculatorRules)) { if(!Array.isArray(input[key])||input[key].length>calculatorMaterials.length||input[key].some(id=>!calculatorMaterials.some(material=>material.id===id))||new Set(input[key]).size!==input[key].length) return fail(res,400,'Проверьте группы материалов'); rules[key]=input[key]; }
      const content=getContent(); content.calculatorRules=rules; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/calculator-texts' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), texts={};
      for (const key of Object.keys(calculatorTexts)) { const item=input[key]; if (!item || !['label','unit','hint'].every(name=>safeText(item[name],name==='hint'?1000:100) && item[name].trim())) return fail(res,400,'Заполните названия, единицы и подсказки полей'); texts[key]={label:item.label,unit:item.unit,hint:item.hint}; }
      const content=getContent(); content.calculatorTexts=texts; saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/calculator-options' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog'])) return; const input=await readJson(req), content=getContent();
      for (const [key,defaults] of [['packages',calculatorPackages],['foundations',calculatorFoundations]]) {
        if(!Array.isArray(input[key])||input[key].length!==defaults.length) return fail(res,400,'Проверьте варианты калькулятора'); const values={};
        for(const item of input[key]) { if(!defaults.some(value=>value.id===item.id)||values[item.id]||!safeText(item.label,100)||!item.label.trim()||!safeText(item.description,1000)||(key==='packages'&&(!numeric(item.time)||item.time<=0||item.time>10))) return fail(res,400,'Проверьте названия и коэффициенты вариантов'); values[item.id]={label:item.label,description:item.description,...(key==='packages'?{time:item.time}:{})}; }
        content[key==='packages'?'calculatorPackages':'calculatorFoundations']=values;
      }
      saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/upload' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','catalog','editor'])) return; const bytes=await body(req,8*1024*1024);
      const ext=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':null;
      if (!ext) return fail(res,400,'Загрузите изображение JPG, PNG или WebP размером до 8 МБ');
      const name=createHash('sha256').update(bytes).digest('hex')+'.'+ext; await writeFile(resolve(dataDir,'uploads',name),bytes); return json(res,200,{url:'/uploads/'+name});
    }
    if (path === '/api/admin/upload-video' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','editor'])) return;
      const temporary=resolve(dataDir,'video-'+randomBytes(16).toString('hex')+'.tmp'), hash=createHash('sha256'); let handle, size=0, header=Buffer.alloc(0);
      try {
        handle=await open(temporary,'wx');
        for await (const chunk of req) {
          size+=chunk.length; if (size>150*1024*1024) throw new Error('video too large');
          if (header.length<12) header=Buffer.concat([header,chunk]).subarray(0,12);
          hash.update(chunk); await handle.writeFile(chunk);
        }
        if (size<16 || header.subarray(4,8).toString('ascii')!=='ftyp') throw new Error('invalid video');
        await handle.close(); handle=null; const name=hash.digest('hex')+'.mp4', target=resolve(dataDir,'uploads',name); if (!existsSync(target)) await rename(temporary,target);
        return json(res,200,{url:'/uploads/'+name});
      } catch { return fail(res,400,'Загрузите корректный MP4 размером до 150 МБ'); }
      finally { if(handle) await handle.close(); await unlink(temporary).catch(()=>{}); }
    }
    if (path === '/api/admin/video' && req.method === 'POST') {
      if (!requireRole(res,user,['admin','editor'])) return; const input=await readJson(req), slots=['hero','story','portalForward','portalReverse'];
      if (!slots.includes(input.slot)) return fail(res,400,'Неизвестный блок');
      const content=getContent(); content.videos ||= {};
      if (input.reset===true) delete content.videos[input.slot];
      else {
        if (!videoUrl(input.src) || !existsSync(resolve(dataDir,'uploads',input.src.slice('/uploads/'.length))) || !numeric(input.duration) || input.duration<0.1 || input.duration>7200 || !numeric(input.fps) || input.fps<1 || input.fps>120) return fail(res,400,'Проверьте видео, длительность и частоту кадров');
        content.videos[input.slot]={src:input.src,duration:input.duration,fps:input.fps};
      }
      saveContent(content); return json(res,200,{ok:true});
    }
    if (path === '/api/admin/users' && req.method === 'GET') { if (!requireRole(res,user,['admin'])) return; return json(res,200,db.prepare('SELECT id,login,role FROM users ORDER BY login').all()); }
    if (path === '/api/admin/users' && req.method === 'POST') {
      if (!requireRole(res,user,['admin'])) return; const input=await readJson(req);
      if (typeof input.login !== 'string' || !/^[a-zA-Z0-9_.-]{3,40}$/.test(input.login) || typeof input.password !== 'string' || input.password.length<8 || input.password.length>200 || !roles.includes(input.role)) return fail(res,400,'Проверьте логин, пароль и права');
      try { db.prepare('INSERT INTO users(login,hash,role,must_change) VALUES(?,?,?,1)').run(input.login,hashPassword(input.password),input.role); } catch { return fail(res,400,'Такой логин уже существует'); } return json(res,200,{ok:true});
    }
    if (path === '/api/admin/user' && req.method === 'POST') {
      if (!requireRole(res,user,['admin'])) return; const input=await readJson(req), target=db.prepare('SELECT * FROM users WHERE id=?').get(input.id);
      if (!target || !['delete','role','reset'].includes(input.action)) return fail(res,400,'Пользователь не найден');
      if ((input.action==='delete' || input.action==='role' && input.role!=='admin') && target.role==='admin' && db.prepare("SELECT count(*) AS n FROM users WHERE role='admin'").get().n<=1) return fail(res,400,'Нельзя удалить последнего администратора');
      if (input.action==='delete') db.prepare('DELETE FROM users WHERE id=?').run(target.id);
      if (input.action==='role') { if (!roles.includes(input.role)) return fail(res,400,'Некорректная роль'); db.prepare('UPDATE users SET role=? WHERE id=?').run(input.role,target.id); }
      if (input.action==='reset') { if (typeof input.password!=='string'||input.password.length<8||input.password.length>200) return fail(res,400,'Пароль должен содержать от 8 до 200 символов'); db.prepare('UPDATE users SET hash=?,must_change=1 WHERE id=?').run(hashPassword(input.password),target.id); }
      for (const [token,session] of sessions) if (session.id===target.id) sessions.delete(token);
      return json(res,200,{ok:true});
    }
    return fail(res,404,'Не найдено');
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res,405,'Метод не поддерживается');
  let root=dist, relative=path;
  if (path.startsWith('/uploads/')) { root=resolve(dataDir,'uploads'); relative=path.slice('/uploads'.length); }
  else if (path === '/admin' || path.startsWith('/admin/')) { root=adminDir; relative=path.slice('/admin'.length) || '/'; }
  let file=resolve(root,'.'+(relative.endsWith('/')?relative+'index.html':relative));
  if (!file.startsWith(root+sep)) return fail(res,403,'Недоступно');
  if (root===dist && /^\/construction\/[a-z0-9-]+\/?$/.test(path) && !existsSync(file)) file=resolve(dist,'construction','brick','index.html');
  try {
    const info=await stat(file); if (!info.isFile()) throw new Error('not file');
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf','.svg':'image/svg+xml','.json':'application/json'};
    const headers={'Content-Type':types[extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff',...(root===adminDir?{'Content-Security-Policy':"frame-ancestors 'self'"}:{})};
    const range=req.headers.range, match=range && /^bytes=(\d+)-(\d*)$/.exec(range);
    if (range && !match) { res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end(); return; }
    if (match) { const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):info.size-1,info.size-1); if (start>end||start>=info.size) return res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end(); res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${info.size}`,'Content-Length':end-start+1}); if(req.method==='HEAD')return res.end(); return createReadStream(file,{start,end}).pipe(res); }
    res.writeHead(200,{...headers,'Content-Length':info.size}); if(req.method==='HEAD')return res.end(); createReadStream(file).pipe(res);
  } catch { fail(res,404,'Не найдено'); }
}
http.createServer((req,res)=>handle(req,res).catch(error=>{ console.error(error); if (!res.headersSent) fail(res,400,'Не удалось выполнить запрос'); else res.destroy(); })).listen(Number(process.env.PORT||4180),process.env.HOST||'127.0.0.1',()=>console.log('Сайт и админ-панель запущены на порту '+(process.env.PORT||4180)));
