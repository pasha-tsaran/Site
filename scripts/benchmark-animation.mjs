import {readFile} from 'node:fs/promises';
import {scrollHarness} from '../tests/helpers/scroll-harness.mjs';
const inputs=[...(process.argv[2]?[['baseline',process.argv[2]]]:[]),['current','src/components/scroll-video.js']];
for(const [variant,file] of inputs){
 const harness=scrollHarness(await readFile(file,'utf8'));
 const initialCallbacks=harness.flush(120),idleCallbacks=harness.flush(120);
 harness.controller.suspend();const modalCallbacks=harness.flush(120);harness.controller.destroy();
 console.log(JSON.stringify({variant,initialCallbacks,idleCallbacks,modalCallbacks}));
}
// Deterministic scheduler workload, not browser FPS or a wall-clock speed score.
