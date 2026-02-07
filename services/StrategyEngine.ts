
import { StrategyResult, SIX_LINES } from '../types.ts';

export const parseNumberInput = (input: string): number[] => {
  return input
    .split(/[\s,;\n]+/)
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(Number)
    .filter(n => !isNaN(n));
};

export const getLineForNumber = (num: number): number | null => {
  const foundLine = SIX_LINES.find(line => line.numbers.includes(num));
  return foundLine ? foundLine.id : null;
};

export const analyzeStrategy = (
  history: number[],
  lastSpins: number[]
): StrategyResult | null => {
  // Allow analysis even with 1 spin to satisfy "check new number" request
  if (history.length === 0 || lastSpins.length < 1) return null;

  // We limit search sequence to 5, as per original logic
  const maxPossibleSearch = Math.min(lastSpins.length, 5);
  let searchLevel = maxPossibleSearch;
  let matches: number[] = []; 

  // Step-down logic: 5 -> 4 -> 3 -> 2 -> 1
  while (searchLevel >= 1) {
    const sequenceToMatch = lastSpins.slice(lastSpins.length - searchLevel);
    
    matches = [];
    // Scan history for this sequence (must have a number following it)
    for (let i = 0; i <= history.length - searchLevel - 1; i++) {
      let isMatch = true;
      for (let j = 0; j < searchLevel; j++) {
        if (history[i + j] !== sequenceToMatch[j]) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        matches.push(history[i + searchLevel]);
      }
    }

    if (matches.length > 0) break;
    searchLevel--;
  }

  if (matches.length === 0) return null;

  // Count frequencies of Lines for these "next numbers"
  const lineFrequencies: Record<number, number> = {};
  matches.forEach(num => {
    const lineId = getLineForNumber(num);
    if (lineId !== null) {
      lineFrequencies[lineId] = (lineFrequencies[lineId] || 0) + 1;
    }
  });

  // Sort lines by frequency descending
  const sortedLines = Object.entries(lineFrequencies)
    .map(([id, count]) => ({ id: parseInt(id), count }))
    .sort((a, b) => b.count - a.count);

  // Take top 2 lines for best coverage
  const top2LineIds = sortedLines.slice(0, 2).map(l => l.id);
  
  if (top2LineIds.length === 0) return null;

  const suggestedNumbers = SIX_LINES
    .filter(line => top2LineIds.includes(line.id))
    .flatMap(line => line.numbers)
    .sort((a, b) => a - b);

  return {
    searchLevel,
    patternMatches: matches.length,
    suggestedLines: top2LineIds,
    suggestedNumbers,
    foundNumbers: Array.from(new Set(matches)) // Unique numbers found in history
  };
};
