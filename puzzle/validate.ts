export function validatePuzzle(input: string[], solution: string[][]): boolean {
  // Validate constraints
  //    - Each row is a permutation of original row
  //    - Column has exactly 4 X's
  //    - Column has >= 4 B's
  //    - Column has <= 1 BX
  const originalRows = input.map((line) => line.split(/\s+/));
  for (let i = 0; i < 16; i++) {
    const sortedOriginal = [...originalRows[i]].sort();
    const sortedSolution = [...solution[i]].sort();
    for (let k = 0; k < 4; k++) {
      if (sortedOriginal[k] !== sortedSolution[k]) {
        console.error(`Row ${i} is not a permutation of its original words.`);
        return false;
      }
    }
  }

  const colCountX = [0, 0, 0, 0];
  const colCountB = [0, 0, 0, 0];
  const colCountBX = [0, 0, 0, 0];

  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 4; j++) {
      const w = solution[i][j];
      if (w === "AX" || w === "BX") {
        colCountX[j]++;
      }
      if (w === "B" || w === "BX") {
        colCountB[j]++;
      }
      if (w === "BX") {
        colCountBX[j]++;
      }
    }
  }

  for (let j = 0; j < 4; j++) {
    if (colCountX[j] !== 4) {
      console.error(`Column ${j} has ${colCountX[j]} X's (needs exactly 4).`);
      return false;
    }
    if (colCountB[j] < 4) {
      console.error(`Column ${j} has ${colCountB[j]} B's (needs >=4).`);
      return false;
    }
    if (colCountBX[j] > 1) {
      console.error(`Column ${j} has ${colCountBX[j]} BX (needs <=1).`);
      return false;
    }
  }

  return true;
}
