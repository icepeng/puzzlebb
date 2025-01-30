import { bench, boxplot, run, summary } from "mitata";
import { baselineSolver } from "./solvers/baseline";
import { experimentSolver } from "./solvers/experiment";
import { generatePuzzleData } from "./puzzle/generate";
import { splitmix32 } from "./utils/prng";

const rng1 = splitmix32(0);
const rng2 = splitmix32(0);

boxplot(() => {
  summary(() => {
    bench("baseline", () => {
      baselineSolver(generatePuzzleData(rng1()));
    }).baseline(true);
    bench("experiment", () => {
      experimentSolver(generatePuzzleData(rng2()));
    });
  });
});

await run();
