/**
 * Example scenarios: (L = left, R = right)
 *     L  L      L  L
 * R R                R R
 *
 *   L            L
 * R  R2  R  R2 R3   R3 R4 R4
 *
 * L    L   ...
 *    R            R
 *
 *    L   L
 * R         R
 *
 * L          L
 *    R   R R2   R2
 *
 */
const findFreeIntervalsInLeft = (
  left: number[][],
  right: number[][],
  logSteps = false,
) => {
  left.sort((a, b) => a[0] - b[0]);
  right.sort((a, b) => a[0] - b[0]);

  if (left.length <= 0) {
    return [];
  }
  if (right.length <= 0) {
    return left;
  }

  let lPtr = 0;
  let rPtr = 0;
  let candidateInterval: number[] = left[lPtr];
  let step = 0;
  const result = [];
  while (rPtr < right.length && lPtr < left.length) {
    step++;
    // until everthing in right has been checked.
    const [lStart, lEnd] = candidateInterval;
    const [rStart, rEnd] = right[rPtr];
    if (logSteps) {
      console.log("");
      console.log("step", step);
      console.log("candidate", candidateInterval);
      console.log("left: ", [lStart, lEnd]);
      console.log("right: ", right[rPtr]);
    }

    if (rStart >= lEnd) {
      if (
        candidateInterval.length > 0 &&
        candidateInterval[1] > candidateInterval[0]
      ) {
        result.push(candidateInterval);
      }
      lPtr++;
      candidateInterval = left[lPtr];
    } else if (rEnd <= lStart) {
      if (
        candidateInterval.length > 0 &&
        candidateInterval[1] > candidateInterval[0]
      ) {
        result.push(candidateInterval);
      }
      lPtr++;
      rPtr++;
      candidateInterval = left[lPtr];
    } else if (rStart <= lStart && rEnd < lEnd) {
      // free interval in left is established, but more intervals in right could overlap
      candidateInterval = [rEnd, lEnd];
      rPtr++;
    } else if (rStart > lStart && rEnd >= lEnd) {
      // rEnd could be farther out to cover more left intervals so we simply move lPtr
      result.push([lStart, rStart]);
      lPtr++;
      candidateInterval = left[lPtr];
    } else if (lStart >= rStart && lEnd <= rEnd) {
      // left is engulfed, nothing to add to result set
      lPtr++;
      candidateInterval = left[lPtr];
    } else if (rStart > lStart && rEnd < lEnd) {
      // left is split into two intervals, keep checking right
      result.push([lStart, rStart]);
      candidateInterval = [rEnd, lEnd];
      rPtr++;
    } else {
      lPtr++;
      candidateInterval = left[lPtr];
    }
    if (logSteps) {
      console.log("result", result);
    }
  }
  if (
    (candidateInterval || []).length > 0 &&
    candidateInterval[1] > candidateInterval[0]
  ) {
    result.push(candidateInterval);
    lPtr++;
  }
  for (let i = lPtr; i < left.length; i++) {
    result.push(left[i]);
  }
  return result;
};

// Test Cases

//Case 1: Non-overlapping intervals
const left1: number[][] = [
  [0, 5],
  [10, 15],
  [20, 25],
];
const right1: number[][] = [
  [6, 9],
  [16, 18],
  [26, 30],
];
console.log("case 1", findFreeIntervalsInLeft(left1, right1));
// Expected output: [[0, 5], [10, 15], [20, 25]]

// Case 2: Overlapping intervals
const left2: number[][] = [
  [0, 5],
  [10, 15],
  [20, 25],
];
const right2: number[][] = [
  [3, 12],
  [18, 22],
];
console.log("case 2", findFreeIntervalsInLeft(left2, right2));
// Expected output: [[0, 3], [12, 15], [22, 25]]

// Case 3: Completely overlapping intervals
const left3: number[][] = [
  [0, 10],
  [15, 20],
  [25, 30],
];
const right3: number[][] = [[0, 30]];
console.log("case 3", findFreeIntervalsInLeft(left3, right3));
// Expected output: []

// Case 4: Empty intervals
const left4: number[][] = [];
const right4: number[][] = [
  [3, 8],
  [10, 15],
];
console.log("case 4", findFreeIntervalsInLeft(left4, right4));
// Expected output: []

// Case 5: Large intervals
const left5: number[][] = [
  [0, 100],
  [150, 200],
  [300, 400],
];
const right5: number[][] = [
  [50, 80],
  [120, 160],
  [220, 250],
];
console.log("case 5", findFreeIntervalsInLeft(left5, right5));

const left6: number[][] = [
  [324, 612],
  [648, 684],
];
const right6: number[][] = [
  [324, 360],
  [450, 486],
  [504, 666],
];
console.log("case 6", findFreeIntervalsInLeft(left6, right6, true));
// Expected output: [[0, 50], [80, 100], [160, 200], [300, 400]]
