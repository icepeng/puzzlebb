/********************************************************
 * Feasible Puzzle Data Generator
 *
 * Generates 16 lines of 4 words (A/B/AX/BX) such that:
 *   - Each row has exactly 1 X (AX or BX).
 *   - Each column has exactly 4 X total (so 16 total X).
 *   - Each column has at most 1 BX.
 *   - Each column has at least 4 B.
 *   - Total B across entire grid is between 16 and 20.
 * Output lines can be given to the solver; they are guaranteed solvable.
 ********************************************************/

import { splitmix32 } from "../utils/prng";

export function generatePuzzleData(seed?: number): string[] {
  const rand = splitmix32(seed ?? (Math.random() * 2 ** 32) >>> 0);

  /********************************************************
   * Helper: Shuffle an array in-place (Fisher-Yates).
   ********************************************************/
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /********************************************************
   * Helper: Randomly choose `count` distinct elements
   *         from array `arr` (without replacement).
   ********************************************************/
  function sample<T>(arr: T[], count: number): T[] {
    // A simple approach: shuffle a copy and take first `count`
    const copy = arr.slice();
    shuffle(copy);
    return copy.slice(0, count);
  }

  const numRows = 16;
  const numCols = 4;

  /********************************************************
   * 1) Decide how many B's each column will have (4 or 5),
   *    such that the total across columns is in [16..20].
   ********************************************************/
  // We'll pick each column's B count in [4..5]. That ensures each column
  // meets "≥4 B." The sum is between 16 and 20.
  // You can randomize more intricately if desired.

  let totalB = 0;
  const BNeeded: number[] = [];
  for (let c = 0; c < numCols; c++) {
    // pick 4 or 5 with some probability
    const b = rand() < 0.5 ? 4 : 5;
    BNeeded.push(b);
    totalB += b;
  }
  // If you strictly want to ensure sum is <= 20, fine. (We do have at most 20.)
  // If you want exactly 16..20, this is enough. We might end up with 16..20.

  /********************************************************
   * 2) Assign exactly 4 X's per column, i.e. 16 total X's.
   *    Each row has exactly 1 X => We distribute row indices
   *    among columns.
   ********************************************************/
  const rowIndices = shuffle(Array.from({ length: numRows }, (_, i) => i));
  // We'll chunk them into groups of 4 for each column.
  // The first 4 rows => column 0’s X, next 4 => column 1’s X, etc.
  // This ensures each column has exactly 4 X and each row has exactly 1 X.
  const XRowsByCol: number[][] = [
    rowIndices.slice(0, 4),
    rowIndices.slice(4, 8),
    rowIndices.slice(8, 12),
    rowIndices.slice(12, 16),
  ];

  /********************************************************
   * 3) For each column, choose exactly 1 row to hold "BX"
   *    and the other 3 rows get "AX".
   *    => Each column has at most 1 "BX."
   ********************************************************/
  // We'll store the final arrangement in a 2D array:
  // solution[r][c] in {A, B, AX, BX} (unshuffled).
  const solution: string[][] = Array.from({ length: numRows }, () =>
    Array<string>(numCols).fill(""),
  );

  for (let c = 0; c < numCols; c++) {
    // We have 4 row indices for this column's X
    const theseRows = XRowsByCol[c];
    // pick 1 row at random to get "BX"
    const bxRow = theseRows[Math.floor(rand() * theseRows.length)];

    for (let i = 0; i < theseRows.length; i++) {
      const r = theseRows[i];
      if (r === bxRow) {
        solution[r][c] = "BX";
      } else {
        solution[r][c] = "AX";
      }
    }
  }

  /********************************************************
   * 4) For each column c, we want BNeeded[c] total B's.
   *    Some are already contributed by "BX" (which is a B).
   *    The rest we fill from the 12 "non-X" rows in that column
   *    with "B" or "A".
   ********************************************************/
  for (let c = 0; c < numCols; c++) {
    // how many of the 4 X's are "BX" in column c?
    let bxCount = 0;
    for (let r = 0; r < numRows; r++) {
      if (solution[r][c] === "BX") {
        bxCount++;
      }
    }
    // so we already have bxCount B's from those "BX"
    // we need BNeeded[c] - bxCount more B's among the "non-X" cells
    const bToAssign = BNeeded[c] - bxCount;
    if (bToAssign < 0) {
      // This would mean BNeeded[c] was smaller than the # of BX used,
      // which can't happen if we only used 1 BX. But let's be safe:
      throw new Error(
        "Column BNeeded is less than number of BX assigned. Inconsistent.",
      );
    }

    // among the 16 rows, 4 have X in column c, so 12 remain for potential B or A
    const nonXRows: number[] = [];
    for (let r = 0; r < numRows; r++) {
      if (!solution[r][c].includes("X")) {
        nonXRows.push(r);
      }
    }

    // pick bToAssign distinct rows out of nonXRows to place "B"
    if (bToAssign > nonXRows.length) {
      throw new Error(
        "Not enough cells to place required B. Shouldn't happen with these settings.",
      );
    }
    const chosenBRows = sample(nonXRows, bToAssign);
    // Mark these chosen cells as "B", the others as "A"
    const chosenSet = new Set(chosenBRows);
    for (const r of nonXRows) {
      solution[r][c] = chosenSet.has(r) ? "B" : "A";
    }
  }

  /********************************************************
   * 5) Now we have a valid internal arrangement with
   *    each row's solution[r] = 4 words that satisfy:
   *    - exactly 1 X per row
   *    - each column has 4 X, at most 1 BX, at least 4 B
   *    - total B is sum(BNeeded[c]) which is in [16..20].
   *
   * We'll shuffle each row's 4 words to produce the puzzle
   * input lines (so the solver has to "unscramble" them).
   ********************************************************/
  const puzzleLines: string[] = [];
  for (let r = 0; r < numRows; r++) {
    // shuffle the row
    const rowShuffled = shuffle(solution[r]);
    // join into a line
    puzzleLines.push(rowShuffled.join(" "));
  }

  return puzzleLines;
}
