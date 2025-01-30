/********************************************************
 * Feasible Puzzle Data Generator with Controllable BX Count
 *
 * Generates 16 lines of 4 words (A/B/AX/BX) such that:
 *   - Each row has exactly 1 X (AX or BX).
 *   - Each column has exactly 4 X total (16 total X).
 *   - Each column has at most 1 BX in total, but the number
 *     of columns that contain a BX can be chosen.
 *   - Each column has at least 4 B.
 *   - Total B across entire grid is between 16 and 20.
 *
 *   bxOption ∈ {0,1,2,3,4,"random"}
 *     - 0..4 means exactly that many total BX across columns.
 *     - "random" picks a random number in [0..4].
 *
 * Output lines can be given to the solver; they are guaranteed solvable.
 ********************************************************/

import { splitmix32 } from "../utils/prng";

type BXCount = 0 | 1 | 2 | 3 | 4 | "random";

export function generatePuzzleData({ seed, bxCount = "random" }: { seed?: number, bxCount?: BXCount } = {}): string[] {
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
    // Shuffle a copy and take first `count`
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
  let totalB = 0;
  const BNeeded: number[] = [];
  for (let c = 0; c < numCols; c++) {
    // pick 4 or 5 with ~50% chance
    const b = rand() < 0.5 ? 4 : 5;
    BNeeded.push(b);
    totalB += b;
  }
  // Now each column has BNeeded[c] in [4..5],
  // so totalB is in [16..20].

  /********************************************************
   * 2) Assign exactly 4 X's per column, i.e. 16 total X's.
   *    Each row has exactly 1 X => distribute row indices
   *    among the columns.
   ********************************************************/
  // We'll randomly shuffle [0..15]. The first 4 become
  // the X-rows for column 0, next 4 for column 1, etc.
  const rowIndices = shuffle(Array.from({ length: numRows }, (_, i) => i));
  const XRowsByCol: number[][] = [
    rowIndices.slice(0, 4),
    rowIndices.slice(4, 8),
    rowIndices.slice(8, 12),
    rowIndices.slice(12, 16),
  ];

  /********************************************************
   * 3) Decide how many columns (out of 4) will contain a BX,
   *    based on bxOption. Then pick which columns get BX.
   ********************************************************/
  let numBXColumns: number;
  if (bxCount === "random") {
    numBXColumns = Math.floor(rand() * 5); // random integer in [0..4]
  } else {
    numBXColumns = bxCount;
  }
  // So exactly numBXColumns columns will each have 1 BX
  // (the other columns have 0 BX).
  // Ensure 0 <= numBXColumns <= 4

  // Randomly choose which columns get BX
  const allCols = [0, 1, 2, 3];
  const chosenColumnsForBX = sample(allCols, numBXColumns);

  // We'll store the final arrangement in a 2D array:
  // solution[r][c] ∈ {A, B, AX, BX}
  const solution: string[][] = Array.from({ length: numRows }, () =>
    Array<string>(numCols).fill(""),
  );

  // For each column:
  //   - If it's chosen for BX, pick exactly one of its 4 X rows for BX, rest are AX.
  //   - Otherwise, all 4 X rows get AX.
  for (let c = 0; c < numCols; c++) {
    const theseRows = XRowsByCol[c]; // 4 rows that contain X in col c
    if (chosenColumnsForBX.includes(c)) {
      // pick 1 row for BX
      const bxRow = theseRows[Math.floor(rand() * theseRows.length)];
      for (const r of theseRows) {
        solution[r][c] = (r === bxRow) ? "BX" : "AX";
      }
    } else {
      // all are AX
      for (const r of theseRows) {
        solution[r][c] = "AX";
      }
    }
  }

  /********************************************************
   * 4) For each column c, place enough B to reach BNeeded[c].
   *    Some B's might already come from BX if that column has BX.
   *    The remaining "non-X" cells get B or A.
   ********************************************************/
  for (let c = 0; c < numCols; c++) {
    // how many BX in this column? (0 or 1)
    let bxCount = 0;
    for (let r = 0; r < numRows; r++) {
      if (solution[r][c] === "BX") {
        bxCount++;
      }
    }
    // we already have bxCount B from those "BX"
    const bToAssign = BNeeded[c] - bxCount;
    if (bToAssign < 0) {
      // Should not happen if we only have 0..1 BX in each column
      throw new Error("Column needs fewer B than we already have from BX. Inconsistent.");
    }

    // among 16 rows, 4 have X in col c => 12 remain for B/A
    const nonXRows: number[] = [];
    for (let r = 0; r < numRows; r++) {
      if (!solution[r][c].includes("X")) {
        nonXRows.push(r);
      }
    }

    // pick bToAssign of those 12 for B, rest are A
    if (bToAssign > nonXRows.length) {
      throw new Error("Not enough cells for required B. Shouldn't happen with these settings.");
    }
    const chosenBRows = sample(nonXRows, bToAssign);
    const chosenBSet = new Set(chosenBRows);
    for (const r of nonXRows) {
      solution[r][c] = chosenBSet.has(r) ? "B" : "A";
    }
  }

  /********************************************************
   * 5) Shuffle each row's 4 words => final puzzle lines
   ********************************************************/
  const puzzleLines: string[] = [];
  for (let r = 0; r < numRows; r++) {
    const rowCopy = solution[r].slice();
    shuffle(rowCopy);
    puzzleLines.push(rowCopy.join(" "));
  }

  return puzzleLines;
}
