import { bench, boxplot, group, run, summary } from "mitata";
import { baselineSolver } from "./solvers/baseline";
import { experimentSolver } from "./solvers/experiment";
import { generatePuzzleData } from "./puzzle/generate";
import { splitmix32 } from "./utils/prng";

const rng1 = splitmix32(0);
const rng2 = splitmix32(0);

for (let bxCount: 0 = 0; bxCount <= 4; bxCount++) {
  group(`BX=${bxCount}`, () => {
    boxplot(() => {
      summary(() => {
        bench("baseline", () => {
          baselineSolver(generatePuzzleData({ seed: rng1(), bxCount }));
        }).baseline(true);
        bench("experiment", () => {
          experimentSolver(generatePuzzleData({ seed: rng2(), bxCount }));
        });
      });
    });
  });
}

await run();
