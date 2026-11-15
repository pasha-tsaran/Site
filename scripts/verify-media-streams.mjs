import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {mediaStreams} from '../src/data/media-streams.js';
const fileHashes=(input,bytes)=>{
 const args=['-hide_banner','-loglevel','error','-i',input,'-map','0:v:0','-f','framemd5','pipe:1'];
 const result=spawnSync('ffmpeg',args,{input:bytes,maxBuffer:4*1024*1024});
 if(result.status!==0)throw Error(result.stderr.toString());
 return result.stdout.toString().split(/\r?\n/).filter(line=>line && !line.startsWith('#'));
};
for(const [name,stream] of Object.entries(mediaStreams)){
 const original=`dist/assets/${name==='hero'?'hero-scrub':'dream-story'}.mp4`;
 const bytes=Buffer.concat(await Promise.all([stream.init,...stream.segments.map(s=>s.src)].map(src=>readFile('dist/'+src.slice(2)))));
 const reference=fileHashes(original),fragmented=fileHashes('pipe:0',bytes);
 assert.deepEqual(fragmented,reference,`${name}: decoded frames or timestamps changed`);
 console.log(`PASS ${name}: all ${reference.length} decoded frames and timestamps are identical`);
}
