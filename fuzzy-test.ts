import { generatePuzzleData } from "./puzzle/generate";
import { experimentSolver } from "./solvers/experiment";
import { validatePuzzle } from "./puzzle/validate";

const ITERATIONS = 100;

function fuzzy() {
  let passed = true;
  for (let i = 0; i < ITERATIONS; i++) {
    const puzzle = generatePuzzleData();
    const solution = experimentSolver(puzzle);
    passed = validatePuzzle(puzzle, solution);
    if (!passed) {
      console.log("FAILED PUZZLE:");
      console.log(puzzle);
      console.log("FAILED SOLUTION:");
      console.log(solution);
    }
  }

  if (passed) {
    console.log("All test passed!");
  } else {
    console.error("Some tests failed!");
  }
}

fuzzy();
