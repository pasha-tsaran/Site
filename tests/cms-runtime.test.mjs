import { test } from 'node:test';
import assert from 'node:assert/strict';

test('published changes reach catalog, calculator, about page and video modules', async () => {
  globalThis.window={__SITE_CONTENT:{
    deletedModels:['brick','concrete'],
    addedModels:[{id:'project-example',title:'Новый дом',note:'Подпись',alt:'Фото',image:'/uploads/example.webp'}],
    models:{}, projects:{'project-example':{area:120,plot:8,rooms:3,floors:2,months:6,material:'Дерево',price:1000000,description:'Дом'}},
    calculatorSettings:{defaultFloorArea1:110,defaultFloorArea2:90,scenarioStandard:.12},
    calculatorRules:{screwMaterials:['brick']}, calculatorTexts:{rooms:{label:'Спальни'}},
    rates:{foundationFactors:[1,1.4,1.5,1.6,1.7]},
    videos:{hero:{src:'/uploads/example.mp4',fps:25,duration:10},story:{src:'/uploads/story.mp4'},portalForward:{src:'/uploads/forward.mp4'}},
  }};
  try {
    const {houseModels}=await import('../src/data/models.js');
    const {constructionProjects}=await import('../src/data/construction.js');
    const calc=await import('../src/data/calculator.js');
    const {aboutCompany}=await import('../src/data/about.js');
    const {site}=await import('../src/data/site.js');
    const {storyMedia}=await import('../src/data/gallery.js');
    const {portalMedia}=await import('../src/data/portal.js');
    assert(!houseModels.some(model=>model.id==='brick'));
    assert.equal(constructionProjects.find(project=>project.id==='project-example').price,1000000);
    assert(calc.calculatorMaterials.some(material=>material.id==='brick'));
    assert.equal(aboutCompany.hero.id,'concrete');
    assert.deepEqual(calc.calculatorDefaults.floorAreas.slice(0,2),[110,90]);
    assert.equal(calc.calculatorFields.find(field=>field.id==='rooms').label,'Спальни');
    assert.equal(calc.calculatorUnitRates.foundationFactors[1],1.4);
    assert.equal(calc.calculateHouseEstimate().scenario,.12);
    assert.equal(site.media.frameCount,250);
    assert.equal(site.media.stream,null);
    assert.equal(storyMedia.src,'/uploads/story.mp4');
    assert.equal(portalMedia.src,'/uploads/forward.mp4');
  } finally { delete globalThis.window; }
});
