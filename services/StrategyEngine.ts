
import { StrategyResult, SIX_LINES, CORNERS, BetDefinition } from '../types';

export const parseNumberInput = (input: string): number[] => {
  return input
    .split(/[\s,;\n]+/)
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(Number)
    .filter(n => !isNaN(n));
};

export const getBetsForNumber = (num: number, type: '6-LINE' | 'CORNER'): number[] => {
  const source = type === '6-LINE' ? SIX_LINES : CORNERS;
  return source.filter(bet => bet.numbers.includes(num)).map(bet => bet.id);
};

export const analyzeStrategy = (
  history: number[],
  lastSpins: number[],
  maxBets: number = 1,
  betType: '6-LINE' | 'CORNER' = '6-LINE'
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

  const betFrequencies: Record<number, number> = {};
  matches.forEach(num => {
    const betIds = getBetsForNumber(num, betType);
    betIds.forEach(id => {
      betFrequencies[id] = (betFrequencies[id] || 0) + 1;
    });
  });

  const sortedBets = Object.entries(betFrequencies)
    .map(([id, count]) => ({ id: parseInt(id), count }))
    .sort((a, b) => b.count - a.count);

  const selectedBetIds = sortedBets.slice(0, maxBets).map(b => b.id);
  
  if (selectedBetIds.length === 0) return null;

  const source = betType === '6-LINE' ? SIX_LINES : CORNERS;
  const suggestedNumbers = source
    .filter(bet => selectedBetIds.includes(bet.id))
    .flatMap(bet => bet.numbers)
    .sort((a, b) => a - b);

  return {
    searchLevel,
    patternMatches: matches.length,
    suggestedIds: selectedBetIds,
    suggestedNumbers: Array.from(new Set(suggestedNumbers)),
    foundNumbers: Array.from(new Set(matches)),
    betType
  };
};
