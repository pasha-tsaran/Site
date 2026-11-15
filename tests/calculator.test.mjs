import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHouseEstimate, normalizeCalculatorState, calculatorDefaults, calculatorMaterials, calculatorPackages, calculatorFoundationAllowed, calculatorEstimateText } from '../src/data/calculator.js';
const estimate = change => calculateHouseEstimate({ ...calculatorDefaults, ...change });
const line = (e,id) => e.lines.find(item=>item.id===id).amount;

test('810 configurations across five floors, material, scope, floor geometry and foundation',()=>{
  for(const material of calculatorMaterials)for(const scope of calculatorPackages)for(const floors of [1,2,3,4,5])
    for(const floorAreas of [[40,40,40,40,40],[160,120,100,80,60],[500,500,500,500,500]])for(const foundation of ['slab','strip','screw']){
      const e=estimate({material:material.id,package:scope.id,floors,floorAreas,foundation});
      assert(Number.isFinite(e.total)&&e.total>0);
      assert.equal(e.total,e.lines.reduce((sum,stage)=>sum+stage.amount,0));
      assert(e.lines.every(stage=>stage.amount>=0&&stage.amount%1000===0));
      assert.equal(e.totalArea,e.state.floorAreas.slice(0,e.state.floors).reduce((a,b)=>a+b,0));
      assert(calculatorFoundationAllowed(e.state.foundation,e.state));
      assert.deepEqual(normalizeCalculatorState(e.state).state,e.state);
    }
});
test('unchanged default geometry retains the audited budget',()=>assert.equal(estimate({}).total,14608000));
test('unequal floors use their individual perimeters and upper floor areas',()=>{
  const e=estimate({floors:3,floorAreas:[120,80,60,50,40]});
  assert.equal(e.totalArea,260);assert.equal(e.footprint,120);assert.equal(e.floorArea,140);
  const expected=[120,80,60].reduce((sum,a)=>sum+2*(Math.sqrt(a/1.25)+Math.sqrt(a*1.25))*3,0);
  assert(Math.abs(e.wallArea-expected)<1e-8);
  assert.equal(line(e,'stairs'),700000);
  assert(estimate({floors:3,floorAreas:[120,90,60]}).total>e.total);
});
test('adding equal floors increases the full-house budget for every material and scope',()=>{
  for(const material of calculatorMaterials)for(const scope of calculatorPackages){
    const values=[1,2,3,4,5].map(floors=>estimate({floors,floorAreas:[80,80,80,80,80],material:material.id,package:scope.id}));
    for(let i=1;i<values.length;i++)assert(values[i].total>values[i-1].total);
    assert(values.every(e=>e.footprint===80));
    assert.equal(line(values[0],'roof'),line(values[4],'roof'));
  }
});
test('hidden floors retain their areas when floor count is reduced and restored',()=>{
  const e=estimate({floors:5,floorAreas:[120,100,80,60,40]});
  const two=calculateHouseEstimate({...e.state,floors:2});
  assert.equal(two.totalArea,220);assert.deepEqual(two.state.floorAreas,e.state.floorAreas);
  assert.equal(calculateHouseEstimate({...two.state,floors:5}).total,e.total);
});
test('legacy area modes migrate without losing total area and do not override individual floors',()=>{
  const total=calculateHouseEstimate({area:160,areaMode:'total',floors:3});
  assert.equal(total.totalArea,160);assert.equal(total.state.floors,3);
  assert.equal(calculateHouseEstimate({area:160,areaMode:'perFloor',floors:3}).totalArea,480);
  assert.equal(calculateHouseEstimate({area:40,floors:3}).state.floors,1);
  assert.equal(estimate({area:900,floorAreas:[90,60,40,40,40]}).totalArea,150);
});
test('foundations and separate finishing stages are counted once',()=>{
  const box=estimate({package:'box'}),contour=estimate({package:'contour'}),key=estimate({});
  assert.equal(line(box,'foundation'),line(key,'foundation'));
  assert.equal(line(box,'contour'),0);
  for(const id of ['engineering','roughFinish','finish']){assert.equal(line(contour,id),0);assert(line(key,id)>0);}
  assert(box.total<contour.total&&contour.total<key.total);
  assert.equal(estimate({material:'frame',foundation:'screw'}).floorArea,160);
});
test('warnings expose limits for five floors, expanding upper floors and acceleration',()=>{
  const e=estimate({floors:5,floorAreas:[80,100,80,60,40],months:2});
  assert.equal(e.scenario,.4);
  assert(e.warnings.some(text=>text.includes('ИЖС')));
  assert(e.warnings.some(text=>text.includes('Верхний этаж')));
  assert(e.warnings.some(text=>text.includes('не включена')));
  assert.equal(estimate({months:2}).total,estimate({months:48}).total);
});
test('invalid input remains finite; floors clamp to five; exported parameters contain each active floor',()=>{
  for(const input of [null,{}, {floors:999,floorAreas:[NaN,Infinity,-1,'',90000]}, {material:'unknown',foundation:'unknown'}])assert(Number.isFinite(calculateHouseEstimate(input).total));
  assert.equal(estimate({floors:6}).state.floors,5);
  const e=estimate({floors:5,floorAreas:[120,100,80,60,40]});
  const text=calculatorEstimateText(e);
  assert(text.includes('Этаж 5: 40 м²')&&text.includes('Общая площадь: 400 м²'));
  assert(text.includes('Итоговая стоимость по модели:'));
});
