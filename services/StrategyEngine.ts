
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

export interface EnhancedStrategyResult extends StrategyResult {
  confidence: number;
  matchCount: number;
  isHotTrend: boolean;
  triggerSequence: number[];
}

export const analyzeStrategy = (
  history: number[],
  lastSpins: number[],
  maxBets: number = 1,
  betType: '6-LINE' | 'CORNER' = '6-LINE',
  targetDepth: number = 3
): EnhancedStrategyResult | null => {
  if (history.length === 0 || lastSpins.length < 1) return null;

  let searchLevel = Math.min(lastSpins.length, targetDepth);
  let matches: number[] = []; 
  let actualSearchLevel = 0;
  let triggerSequence: number[] = [];

  // Progressive deep scan
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
    if (matches.length > 0) {
      actualSearchLevel = searchLevel;
      triggerSequence = sequenceToMatch;
      break;
    }
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

  if (sortedBets.length === 0) return null;

  const finalBets = sortedBets.slice(0, maxBets);
  const selectedBetIds = finalBets.map(b => b.id);
  const source = betType === '6-LINE' ? SIX_LINES : CORNERS;
  const suggestedNumbers = source
    .filter(bet => selectedBetIds.includes(bet.id))
    .flatMap(bet => bet.numbers);

  // Advanced Confidence Score
  const matchVolume = matches.length;
  const bestBetCount = sortedBets[0].count;
  const volumeBonus = Math.min(matchVolume * 5, 25);
  const depthBonus = actualSearchLevel * 12;
  const consistencyBonus = (bestBetCount / matchVolume) * 45;
  
  const confidence = Math.min(Math.round(volumeBonus + depthBonus + consistencyBonus), 99);
  const isHotTrend = bestBetCount > 2;

  return {
    searchLevel: actualSearchLevel,
    patternMatches: matchVolume,
    suggestedIds: selectedBetIds,
    suggestedNumbers: Array.from(new Set(suggestedNumbers)).sort((a,b) => a-b),
    foundNumbers: Array.from(new Set(matches)),
    betType,
    hotness: confidence > 80 ? 'HOT' : 'LESS-HOT',
    confidence,
    matchCount: bestBetCount,
    isHotTrend,
    triggerSequence
  };
};
