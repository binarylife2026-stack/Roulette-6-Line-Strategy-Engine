
export interface StrategyResult {
  searchLevel: number;
  patternMatches: number;
  suggestedIds: number[];
  suggestedNumbers: number[];
  foundNumbers: number[];
  betType: '6-LINE' | 'CORNER';
}

export interface BetDefinition {
  id: number;
  name: string;
  numbers: number[];
}

export const SIX_LINES: BetDefinition[] = [
  { id: 1, name: "Line 1-6", numbers: [1, 2, 3, 4, 5, 6] },
  { id: 2, name: "Line 7-12", numbers: [7, 8, 9, 10, 11, 12] },
  { id: 3, name: "Line 13-18", numbers: [13, 14, 15, 16, 17, 18] },
  { id: 4, name: "Line 19-24", numbers: [19, 20, 21, 22, 23, 24] },
  { id: 5, name: "Line 25-30", numbers: [25, 26, 27, 28, 29, 30] },
  { id: 6, name: "Line 31-36", numbers: [31, 32, 33, 34, 35, 36] },
];

export const CORNERS: BetDefinition[] = [
  { id: 101, name: "Corner 1-5", numbers: [1, 2, 4, 5] },
  { id: 102, name: "Corner 2-6", numbers: [2, 3, 5, 6] },
  { id: 103, name: "Corner 4-8", numbers: [4, 5, 7, 8] },
  { id: 104, name: "Corner 5-9", numbers: [5, 6, 8, 9] },
  { id: 105, name: "Corner 7-11", numbers: [7, 8, 10, 11] },
  { id: 106, name: "Corner 8-12", numbers: [8, 9, 11, 12] },
  { id: 107, name: "Corner 10-14", numbers: [10, 11, 13, 14] },
  { id: 108, name: "Corner 11-15", numbers: [11, 12, 14, 15] },
  { id: 109, name: "Corner 13-17", numbers: [13, 14, 16, 17] },
  { id: 110, name: "Corner 14-18", numbers: [14, 15, 17, 18] },
  { id: 111, name: "Corner 16-20", numbers: [16, 17, 19, 20] },
  { id: 112, name: "Corner 17-21", numbers: [17, 18, 20, 21] },
  { id: 113, name: "Corner 19-23", numbers: [19, 20, 22, 23] },
  { id: 114, name: "Corner 20-24", numbers: [20, 21, 23, 24] },
  { id: 115, name: "Corner 22-26", numbers: [22, 23, 25, 26] },
  { id: 116, name: "Corner 23-27", numbers: [23, 24, 26, 27] },
  { id: 117, name: "Corner 25-29", numbers: [25, 26, 28, 29] },
  { id: 118, name: "Corner 26-30", numbers: [26, 27, 29, 30] },
  { id: 119, name: "Corner 28-32", numbers: [28, 29, 31, 32] },
  { id: 120, name: "Corner 29-33", numbers: [29, 30, 32, 33] },
  { id: 121, name: "Corner 31-35", numbers: [31, 32, 34, 35] },
  { id: 122, name: "Corner 32-36", numbers: [32, 33, 35, 36] },
];
