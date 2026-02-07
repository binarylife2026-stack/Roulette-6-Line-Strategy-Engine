
export interface StrategyResult {
  searchLevel: number;
  patternMatches: number;
  suggestedLines: number[];
  suggestedNumbers: number[];
  foundNumbers: number[]; // Specific numbers found in history matches
}

export interface LineDefinition {
  id: number;
  name: string;
  numbers: number[];
}

export const SIX_LINES: LineDefinition[] = [
  { id: 1, name: "Line 1", numbers: [1, 2, 3, 4, 5, 6] },
  { id: 2, name: "Line 2", numbers: [7, 8, 9, 10, 11, 12] },
  { id: 3, name: "Line 3", numbers: [13, 14, 15, 16, 17, 18] },
  { id: 4, name: "Line 4", numbers: [19, 20, 21, 22, 23, 24] },
  { id: 5, name: "Line 5", numbers: [25, 26, 27, 28, 29, 30] },
  { id: 6, name: "Line 6", numbers: [31, 32, 33, 34, 35, 36] },
];
