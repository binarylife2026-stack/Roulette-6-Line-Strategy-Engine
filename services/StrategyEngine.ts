
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
  lastSpins: number[],
  maxLines: number = 1
): StrategyResult | null => {
  if (history.length === 0 || lastSpins.length < 1) return null;

  const maxPossibleSearch = Math.min(lastSpins.length, 5);
  let searchLevel = maxPossibleSearch;
  let matches: number[] = []; 

  while (searchLevel >= 1) {
    const sequenceToMatch = lastSpins.slice(lastSpins.length - searchLevel);
    
    matches = [];
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

  const lineFrequencies: Record<number, number> = {};
  matches.forEach(num => {
    const lineId = getLineForNumber(num);
    if (lineId !== null) {
      lineFrequencies[lineId] = (lineFrequencies[lineId] || 0) + 1;
    }
  });

  const sortedLines = Object.entries(lineFrequencies)
    .map(([id, count]) => ({ id: parseInt(id), count }))
    .sort((a, b) => b.count - a.count);

  const selectedLineIds = sortedLines.slice(0, maxLines).map(l => l.id);
  
  if (selectedLineIds.length === 0) return null;

  const suggestedNumbers = SIX_LINES
    .filter(line => selectedLineIds.includes(line.id))
    .flatMap(line => line.numbers)
    .sort((a, b) => a - b);

  return {
    searchLevel,
    patternMatches: matches.length,
    suggestedLines: selectedLineIds,
    suggestedNumbers,
    foundNumbers: Array.from(new Set(matches))
  };
};
