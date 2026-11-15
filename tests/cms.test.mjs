import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

test('CMS enforces roles, changes passwords and persists public content', async () => {
  const dir=await mkdtemp(join(tmpdir(),'house-cms-')),port=19000+Math.floor(Math.random()*10000),base='http://127.0.0.1:'+port;
  let startupOutput='';
  const start=()=>{
    startupOutput='';
    const child=spawn(process.execPath,['scripts/cms-server.mjs'],{env:{...process.env,PORT:String(port),CMS_DATA_DIR:dir},stdio:['ignore','pipe','ignore']});
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',chunk=>{startupOutput+=chunk;});
    return child;
  };
  let server=start();
  async function stop(){
    if(server.exitCode!==null||server.signalCode!==null)return;
    const exited=once(server,'exit');
    server.kill();
    await exited;
  }
  async function ready(){for(let n=0;n<80;n++){try{await fetch(base+'/content.js');return;}catch{await delay(100);}}throw new Error('Server did not start');}
  async function request(path,method='GET',data,cookie,origin=base){const response=await fetch(base+path,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};}
  try {
    await ready();
    assert.equal((await request('/api/admin/data')).status,401);
    assert.equal((await request('/api/admin/login','POST',{login:'admin',password:'wrong'})).status,401);
    const initialPassword=startupOutput.match(/Временный пароль администратора: ([A-Za-z0-9_-]{32})/)?.[1];
    assert.ok(initialPassword,'New databases must issue a temporary password');
    let login=await request('/api/admin/login','POST',{login:'admin',password:initialPassword});assert.equal(login.status,200);assert.equal(login.body.must_change,1);let admin=login.cookie;
    assert.equal((await request('/api/admin/data','GET',null,admin)).status,403);
    assert.equal((await request('/api/admin/password','POST',{current:initialPassword,password:'password123'},admin)).status,200);
    assert.equal((await request('/api/admin/users','POST',{login:'editor',password:'password123',role:'editor'},admin,'https://untrusted.example')).status,403);
    assert.equal((await request('/api/admin/users','POST',{login:'editor',password:'password123',role:'editor'},admin)).status,200);
    login=await request('/api/admin/login','POST',{login:'editor',password:'password123'});const editor=login.cookie;
    assert.equal((await request('/api/admin/password','POST',{current:'password123',password:'newpassword'},editor)).status,200);
    assert.equal((await request('/api/admin/users','GET',null,editor)).status,403);
    assert.equal((await request('/api/admin/rates','POST',{roof:1},editor)).status,403);
    assert.equal((await request('/api/admin/page','POST',{route:'/',key:'main:nth-of-type(1) > h1:nth-of-type(1)|text|0',value:'Новый текст'},editor)).status,200);
    const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    const upload=await fetch(base+'/api/admin/upload',{method:'POST',headers:{Origin:base,Cookie:editor,'Content-Type':'image/png'},body:image});assert.equal(upload.status,200);const imagePath=(await upload.json()).url;
    assert.equal((await request('/api/admin/page','POST',{route:'/',key:'img:nth-of-type(1)|image|0',value:imagePath},editor)).status,200);
    assert.deepEqual(Buffer.from(await (await fetch(base+imagePath)).arrayBuffer()),image);
    const project={kind:'house',title:'Новый дом',note:'Светлый дом',alt:'Фотография дома',image:imagePath,description:'Описание нового дома',material:'Кирпич',price:1000000,area:120,plot:8,rooms:3,floors:2,months:6};
    assert.equal((await request('/api/admin/model','POST',project,editor)).status,403);
    const created=await request('/api/admin/model','POST',project,admin);assert.equal(created.status,200);const id=created.body.id;
    assert.equal((await fetch(base+'/construction/'+id+'/')).status,200);
    let panel=await request('/api/admin/data','GET',null,admin);assert(panel.body.models.some(item=>item.id===id&&!item.deleted));
    assert.equal((await request('/api/admin/model-visibility','POST',{id,deleted:true},admin)).status,200);
    panel=await request('/api/admin/data','GET',null,admin);assert(panel.body.models.find(item=>item.id===id).deleted);
    assert.equal((await request('/api/admin/model-visibility','POST',{id,deleted:false},admin)).status,200);
    const movie=await readFile('dist/assets/dream-story.mp4');
    const videoUpload=await fetch(base+'/api/admin/upload-video',{method:'POST',headers:{Origin:base,Cookie:editor,'Content-Type':'video/mp4'},body:movie});assert.equal(videoUpload.status,200);const videoPath=(await videoUpload.json()).url;
    assert.equal((await request('/api/admin/video','POST',{slot:'story',src:videoPath,duration:19,fps:24},editor)).status,200);
    const range=await fetch(base+videoPath,{headers:{Range:'bytes=0-15'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),movie.subarray(0,16));
    assert.equal((await request('/api/admin/video','POST',{slot:'hero',src:'/uploads/evil.svg',duration:19,fps:24},editor)).status,400);
    assert.equal((await request('/api/admin/calculator-settings','POST',{floorsMax:6},admin)).status,400);
    assert.equal((await request('/api/admin/calculator-settings','POST',{defaultFloorArea1:95,scenarioStandard:.15},admin)).status,200);
    assert.equal((await request('/api/admin/calculator-rules','POST',{screwMaterials:['brick'],slabOnlyMaterials:[],timberFloorMaterials:['frame'],complexMaterials:['concrete']},admin)).status,200);
    panel=await request('/api/admin/data','GET',null,admin);panel.body.texts.rooms.label='Спальни';
    assert.equal((await request('/api/admin/calculator-texts','POST',panel.body.texts,admin)).status,200);
    panel.body.packages[0].time=.7;
    assert.equal((await request('/api/admin/calculator-options','POST',{packages:panel.body.packages,foundations:panel.body.foundations},admin)).status,200);
    assert.equal((await request('/api/admin/rates','POST',{roof:12345,foundationFactors:[1,1.2,1.4,1.6,2]},admin)).status,200);
    assert.equal((await request('/api/admin/contacts','POST',{phone:'+7 (999) 123-45-67',email:'test@example.com',telegram:'@example',location:'Москва',mapHref:'https://example.com/map?a=1&b=2'},editor)).status,200);
    assert.equal((await request('/api/admin/contacts','POST',{phone:'+7 (999) 123-45-67',email:'test@example.com',telegram:'@example',location:'Москва',mapHref:'javascript:alert(1)'},editor)).status,400);
    const publicContent=await (await fetch(base+'/content.js')).text();assert.match(publicContent,/Новый текст/);assert.match(publicContent,/12345/);assert.match(publicContent,/tel:\+79991234567/);assert.match(publicContent,/Новый дом/);assert.match(publicContent,/defaultFloorArea1/);
    await stop();server=start();await ready();
    assert.equal(startupOutput.includes('Временный пароль администратора:'),false);
    assert.match(await (await fetch(base+'/content.js')).text(),/Новый текст/);
    assert.equal((await request('/api/admin/login','POST',{login:'admin',password:initialPassword})).status,401);
    assert.equal((await request('/api/admin/login','POST',{login:'admin',password:'password123'})).status,200);
  } finally { await stop(); await rm(dir,{recursive:true,force:true}); }
});
