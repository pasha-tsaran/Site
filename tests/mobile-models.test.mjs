import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileModelIndex} from '../src/components/models-gallery.js';
import {heroScrollEase,createHeroInertia} from '../src/components/scroll-video.js';
test('a horizontal gesture moves exactly one card regardless of swipe distance',()=>{
 assert.equal(mobileModelIndex(2,-2000,12,375,9),3);assert.equal(mobileModelIndex(2,2000,12,375,9),1);
 assert.equal(mobileModelIndex(0,500,0,375,9),0);assert.equal(mobileModelIndex(8,-500,0,375,9),8);
});
test('vertical scrolling and short gestures do not change the selected card',()=>{
 assert.equal(mobileModelIndex(3,20,0,375,9),3);assert.equal(mobileModelIndex(3,200,400,375,9),3);
});
test('hero motion covers its base step in the first half and decelerates through its extra half-step',()=>{
 assert.equal(heroScrollEase(0),0);assert.equal(heroScrollEase(.5)*1.5,1);assert.equal(heroScrollEase(1)*1.5,1.5);
 const samples=Array.from({length:101},(_,i)=>heroScrollEase(i/100));for(let i=1;i<samples.length;i++)assert(samples[i]>=samples[i-1]);
 const firstTail=heroScrollEase(.6)-heroScrollEase(.5),lastTail=heroScrollEase(1)-heroScrollEase(.9);assert(firstTail>lastTail*5);
});

test('one impulse has a full base step followed by a shrinking half-step and settles identically at 60/120 Hz',()=>{
 const motion=createHeroInertia();motion.push(120,0);
 assert.equal(motion.advance(450),120);
 const tail=[motion.advance(600),motion.advance(750),motion.advance(900)];
 assert(Math.abs(tail.reduce((a,b)=>a+b,0)-60)<1e-9);
 assert(tail[0]>tail[1] && tail[1]>tail[2]);assert.equal(motion.active,false);assert.equal(motion.advance(1100),0);
 for(const fps of [60,120]){const m=createHeroInertia();m.push(120,0);let total=0;for(let t=0;t<900;t+=1000/fps)total+=m.advance(t);total+=m.advance(900);assert(Math.abs(total-180)<1e-9);}
 const epsilon=1e-5;assert(heroScrollEase(epsilon)/epsilon<.001);assert((1-heroScrollEase(1-epsilon))/epsilon<.001);
});
