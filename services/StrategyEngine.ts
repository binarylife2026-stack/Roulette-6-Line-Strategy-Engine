
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
  stability: number;
  expertAdvice: string;
}

export const analyzeStrategy = (
  history: number[],
  lastSpins: number[],
  maxBets: number = 1,
  betType: '6-LINE' | 'CORNER' = '6-LINE',
  missingData: { id: number, streak: number }[] = []
): EnhancedStrategyResult | null => {
  if (history.length === 0 || lastSpins.length < 1) return null;

  // 1. Calculate Table Stability (Scatter analysis)
  // Logic: Are numbers hitting close to each other in terms of 6-line sectors?
  const recentBets = lastSpins.slice(-5).map(n => getBetsForNumber(n, '6-LINE')[0]);
  const uniqueSectors = new Set(recentBets).size;
  const stability = Math.max(0, 100 - (uniqueSectors * 15));

  let searchLevel = Math.min(lastSpins.length, 12); // Deep scan limit
  let matches: number[] = []; 
  let actualSearchLevel = 0;
  let triggerSequence: number[] = [];

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
    .map(([id, count]) => {
      const betId = parseInt(id);
      const missingInfo = missingData.find(m => m.id === betId);
      // Sector Gravity: Bonus weight if it hasn't hit for a while
      const gravityBonus = missingInfo ? Math.min(missingInfo.streak / 2, 5) : 0;
      return { id: betId, count: count + gravityBonus, rawCount: count };
    })
    .sort((a, b) => b.count - a.count);

  if (sortedBets.length === 0) return null;

  const selectedBetId = sortedBets[0].id;
  const source = betType === '6-LINE' ? SIX_LINES : CORNERS;
  const suggestedNumbers = source.find(b => b.id === selectedBetId)?.numbers || [];

  // Confidence Calculation 2.5 (Professional Weighting)
  const baseConfidence = (actualSearchLevel * 10) + (sortedBets[0].rawCount * 8);
  const stabilityModifier = stability > 60 ? 1.2 : stability < 30 ? 0.6 : 1.0;
  let confidence = Math.round(baseConfidence * stabilityModifier);
  
  // Cap at 99%
  confidence = Math.min(confidence, 99);

  // Expert Advice Generation
  let expertAdvice = "Pattern identified. Proceed with standard unit.";
  if (stability < 30) {
    expertAdvice = "CRITICAL: High table variance detected. Wait for 2 spins.";
  } else if (confidence > 85) {
    expertAdvice = "STRONG SIGNAL: Pattern + Sector Gravity align perfectly.";
  } else if (actualSearchLevel < 2) {
    expertAdvice = "WEAK SIGNAL: Short sequence match. Bet small or skip.";
  }

  return {
    searchLevel: actualSearchLevel,
    patternMatches: matches.length,
    suggestedIds: [selectedBetId],
    suggestedNumbers: suggestedNumbers.sort((a,b) => a-b),
    foundNumbers: Array.from(new Set(matches)),
    betType,
    hotness: confidence > 80 ? 'HOT' : 'LESS-HOT',
    confidence,
    matchCount: sortedBets[0].rawCount,
    isHotTrend: sortedBets[0].rawCount > 2,
    triggerSequence,
    stability,
    expertAdvice
  };
};
