/*******************************************************
 * Puzzle Solver with "BX <= 1 per column"
 * and EXACT 4 X per column, AT LEAST 4 B per column.
 *
 * Constraints:
 *   1) 16 rows × 4 columns total.
 *   2) Each row has exactly 4 words from {A, B, AX, BX},
 *      with exactly one X-word (AX or BX).
 *   3) Each column must have EXACTLY 4 X's total.
 *   4) Each column must have AT LEAST 4 B's total.
 *   5) Each column can have AT MOST 1 "BX".
 *
 * We use a memo (Map<stateKey, boolean>) to avoid
 * re-checking the same partial states in backtracking.
 *******************************************************/

const ORDER = ["BX", "AX", "B", "A"];

export function baselineSolver(inputLines: string[]): string[][] {
  if (inputLines.length !== 16) {
    throw new Error("We expect exactly 16 lines of input.");
  }

  // Parse input
  const rows: string[][] = inputLines.map((line) =>
    line
      .trim()
      .split(/\s+/)
      .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)),
  );

  if (!rows.every((r) => r.length === 4)) {
    throw new Error("Each input line must have exactly 4 words.");
  }
  // Validate only {A, B, AX, BX}:
  for (let i = 0; i < 16; i++) {
    for (let k = 0; k < 4; k++) {
      const w = rows[i][k];
      if (!["A", "B", "AX", "BX"].includes(w)) {
        throw new Error(
          `Invalid word "${w}" in row ${i}. Allowed are A, B, AX, BX.`,
        );
      }
    }
  }

  // Identify the X-word index & whether it's BX or AX
  const xIsBX = new Array<boolean>(16);
  // Also track hasB and totalB
  const hasB = rows.map((r) => r.map((w) => w.includes("B")));
  const totalB = new Array<number>(16).fill(0);

  let totalBInPuzzle = 0;

  for (let i = 0; i < 16; i++) {
    let bCount = 0;
    for (let k = 0; k < 4; k++) {
      if (rows[i][k].includes("B")) {
        bCount++;
      }
    }
    xIsBX[i] = rows[i][0] === "BX";
    totalB[i] = bCount;
    totalBInPuzzle += bCount;
  }

  // We'll build final arrangement
  const finalArrangement: string[][] = Array.from({ length: 16 }, () =>
    Array<string>(4).fill(""),
  );

  // XCapacity, BXCapacity, BCount arrays
  const XCapacity = [4, 4, 4, 4];
  const BXCapacity = [1, 1, 1, 1];
  const BCount = [0, 0, 0, 0];

  // Row ordering: place BX rows first, ties break by totalB ascending
  const rowOrder = Array.from({ length: 16 }, (_, i) => i);
  rowOrder.sort((i, j) => {
    // BX first
    if (xIsBX[i] && !xIsBX[j]) return -1;
    if (!xIsBX[i] && xIsBX[j]) return 1;
    // Then by totalB ascending
    return totalB[i] - totalB[j];
  });

  const lines = rows.map((r) => r.join(" "));
  const sameLineWithBefore = Array.from(
    { length: 16 },
    (_, i) => i > 0 && lines[rowOrder[i]] === lines[rowOrder[i - 1]],
  );

  // Generate unique permutations of the 3 non‐X words for each row
  const rowNonXPerms: number[][][] = new Array(16);
  for (let i = 0; i < 16; i++) {
    rowNonXPerms[i] = makeUniquePerms3(i);
  }

  function makeUniquePerms3(rowIdx: number): number[][] {
    const xi = 0;
    const others = [0, 1, 2, 3].filter((k) => k !== xi);
    const words = others.map((k) => rows[rowIdx][k]);
    return uniquePermutationsOf3(words, others);
  }

  function uniquePermutationsOf3(words: string[], idxs: number[]): number[][] {
    // Deduplicate permutations of 3 items
    const result: number[][] = [];
    const used = [false, false, false];
    const perm: number[] = [];

    // Combine (word, idx), then sort by word to cluster duplicates
    const combined = [
      { w: words[0], i: idxs[0] },
      { w: words[1], i: idxs[1] },
      { w: words[2], i: idxs[2] },
    ];
    combined.sort((a, b) => a.w.localeCompare(b.w));

    function backtrack() {
      if (perm.length === 3) {
        result.push([...perm]);
        return;
      }
      for (let i = 0; i < 3; i++) {
        if (!used[i]) {
          // skip duplicates
          if (i > 0 && !used[i - 1] && combined[i].w === combined[i - 1].w) {
            continue;
          }
          used[i] = true;
          perm.push(combined[i].i);
          backtrack();
          perm.pop();
          used[i] = false;
        }
      }
    }
    backtrack();
    return result;
  }

  // "Can we still reach 4 B's in column c?" -> BCount[c] + rowsLeft >= 4
  function canStillReach4B(c: number, rowsLeft: number): boolean {
    return BCount[c] + rowsLeft >= 4;
  }

  function isOverloadedB(c: number): boolean {
    return BCount[c] > totalBInPuzzle - 12;
  }

  // --------------------------
  //  STATE ENCODING FOR MEMO
  // --------------------------
  // We'll convert (pos, XCapacity, BXCapacity, BCount) into a string key.
  // If we get the same state again, we skip re-solving it.
  //
  // Or we can do a bit-packed approach. For simplicity, we'll do a string
  // though it's less memory-efficient.
  //
  // We'll store memo: Map<string, boolean>, meaning "from this state,
  // can we eventually find a solution?" true/false.

  const memo = new Map<string, boolean>();

  function encodeState(pos: number): string {
    // We'll do: pos|Xcap0Xcap1Xcap2Xcap3|BXcap0...|BCount0...3
    // Each capacity/bcount turned into a short piece of string, e.g. "X2" => "2" if capacity=2
    // BCount might be 0..16 => use an underscore + the numeric value

    // XCapacity is each in [0..4], BXCapacity in [0..1], BCount in [0..16]
    return [
      pos,
      XCapacity.join(","), // e.g. "3,4,1,0"
      BXCapacity.join(","), // e.g. "1,0,1,1"
      BCount.join(","), // e.g. "5,3,9,0"
    ].join("|");
  }

  let prevColX = -1;

  // --------------------------
  //  RECURSIVE BACKTRACK W/ MEMO
  // --------------------------
  function assignRow(pos: number): boolean {
    if (pos === 16) {
      // Check final constraints
      for (let c = 0; c < 4; c++) {
        if (XCapacity[c] !== 0) return false;
        if (BCount[c] < 4) return false;
        if (BXCapacity[c] < 0) return false; // sanity check
      }
      return true;
    }

    // Check if we've seen this state
    const stateKey = encodeState(pos);
    if (memo.has(stateKey)) {
      return memo.get(stateKey)!;
    }

    const rIdx = rowOrder[pos];
    const row = rows[rIdx];
    const xi = 0;
    const isBX = xIsBX[rIdx];

    // We'll attempt to place the X in each column
    // if (sameLineWithBefore[pos]) {
    //   console.log(rIdx, prevColX);
    // }
    for (let colX = 0; colX < 4; colX++) {
      if (XCapacity[colX] <= 0) continue;
      if (isBX && BXCapacity[colX] <= 0) continue;

      // Save state
      const oldXCap = XCapacity[colX];
      const oldBXCap = BXCapacity[colX];
      const oldB = [...BCount];

      // Place the X
      finalArrangement[rIdx][colX] = row[xi];
      XCapacity[colX] = oldXCap - 1;
      if (isBX) {
        BXCapacity[colX] = oldBXCap - 1;
      }
      if (hasB[rIdx][xi]) {
        BCount[colX]++;
      }

      // Permute the other 3 words
      const otherCols = [0, 1, 2, 3].filter((c) => c !== colX);
      const perms3 = rowNonXPerms[rIdx];

      let foundSolution = false;
      for (const p3 of perms3) {
        const oldB2 = [...BCount];
        let valid = true;

        for (let i3 = 0; i3 < 3; i3++) {
          const wIndex = p3[i3];
          const c = otherCols[i3];
          finalArrangement[rIdx][c] = row[wIndex];
          if (hasB[rIdx][wIndex]) {
            BCount[c]++;
          }
        }

        // B pruning
        const rowsLeft = 16 - (pos + 1);

        for (let c = 0; c < 4; c++) {
          if (!canStillReach4B(c, rowsLeft) || isOverloadedB(c)) {
            valid = false;
            break;
          }
        }

        if (valid) {
          prevColX = colX;
          if (assignRow(pos + 1)) {
            foundSolution = true;
            break;
          }
        }

        // Revert BCount after placing these 3 words
        for (let c = 0; c < 4; c++) {
          BCount[c] = oldB2[c];
        }
      }

      if (foundSolution) {
        memo.set(stateKey, true);
        return true;
      }

      // Revert X
      XCapacity[colX] = oldXCap;
      BXCapacity[colX] = oldBXCap;
      for (let c = 0; c < 4; c++) {
        BCount[c] = oldB[c];
      }
    }

    // If no column worked
    memo.set(stateKey, false);
    return false;
  }

  // Start recursion
  const ok = assignRow(0);
  if (!ok) {
    throw new Error("No valid solution found under the puzzle constraints.");
  }
  return finalArrangement;
}
