
import React, { useState, useEffect, useRef } from 'react';
import { parseNumberInput, analyzeStrategy } from './services/StrategyEngine.ts';
import { StrategyResult, SIX_LINES } from './types.ts';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BASE_STAKE = 5;

export default function App() {
  const [historyData, setHistoryData] = useState<string>('');
  const [lastSpins, setLastSpins] = useState<number[]>([]);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [maxLines, setMaxLines] = useState<number>(1);
  
  // Money Management State
  const [totalPL, setTotalPL] = useState<number>(0);
  const [currentUnit, setCurrentUnit] = useState<number>(1);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);
  
  const [previousSuggestions, setPreviousSuggestions] = useState<number[]>([]);
  const [isHit, setIsHit] = useState(false);

  // Reference to track the state of the bet BEFORE the number was clicked
  const activeBetRef = useRef<{ 
    numbers: number[], 
    unit: number, 
    lineCount: number 
  } | null>(null);

  useEffect(() => {
    const trimmedHistory = historyData.trim();
    if (trimmedHistory !== '' && lastSpins.length >= 1) {
      const parsedHistory = parseNumberInput(trimmedHistory);
      const analysis = analyzeStrategy(parsedHistory, lastSpins, maxLines);
      
      if (analysis) {
        setResult(analysis);
        setHasSearched(true);
        // Store this as the active bet for the NEXT click
        activeBetRef.current = {
          numbers: analysis.suggestedNumbers,
          unit: currentUnit,
          lineCount: analysis.suggestedLines.length
        };
      } else {
        setResult(null);
        activeBetRef.current = null;
      }
    } else {
      setResult(null);
      setHasSearched(false);
      activeBetRef.current = null;
    }
  }, [historyData, lastSpins, maxLines, currentUnit]);

  const addNumber = (num: number) => {
    // 1. Process Money Management based on the PREVIOUS suggestion
    if (activeBetRef.current) {
      const { numbers, unit, lineCount } = activeBetRef.current;
      const totalStake = unit * BASE_STAKE * lineCount;
      
      if (numbers.includes(num)) {
        // WIN logic
        // Payout for 6-line is 5 to 1. 
        // Profit = (Stake per line * 5) - (Other stakes)
        const profitPerLine = (unit * BASE_STAKE) * 5;
        const netProfit = profitPerLine - (unit * BASE_STAKE * (lineCount - 1));
        
        setTotalPL(prev => prev + netProfit);
        setIsHit(true);
        setConsecutiveLosses(0);
        setCurrentUnit(prev => Math.max(1, prev - 1));
        setTimeout(() => setIsHit(false), 2500);
      } else {
        // LOSS logic
        setTotalPL(prev => prev - totalStake);
        setIsHit(false);
        const newLossCount = consecutiveLosses + 1;
        setConsecutiveLosses(newLossCount);
        
        // Every 3 losses, add 1 unit
        if (newLossCount >= 3) {
          setCurrentUnit(prev => prev + 1);
          setConsecutiveLosses(0); // Reset counter after increasing unit
        }
      }
    }

    // 2. Update History and Sequence
    setHistoryData(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return num.toString();
      const separator = trimmed.endsWith(',') ? ' ' : ', ';
      return trimmed + separator + num;
    });

    setLastSpins(prev => {
      const next = [...prev, num];
      return next.length > 12 ? next.slice(1) : next;
    });
  };

  useEffect(() => {
    if (result) {
      setPreviousSuggestions(result.suggestedNumbers);
    }
  }, [result]);

  const clearSession = () => {
    setLastSpins([]);
    setResult(null);
    setHasSearched(false);
    setPreviousSuggestions([]);
    setIsHit(false);
    activeBetRef.current = null;
  };

  const resetBankroll = () => {
    if (window.confirm("Reset all Profit/Loss and Unit data?")) {
      setTotalPL(0);
      setCurrentUnit(1);
      setConsecutiveLosses(0);
    }
  };

  const undoLast = () => {
    if (lastSpins.length === 0) return;
    setLastSpins(prev => prev.slice(0, -1));
  };

  const clearHistory = () => {
    if (window.confirm("Delete history database?")) {
      setHistoryData('');
    }
  };

  return (
    <div className="casino-gradient p-3 md:p-6 lg:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-6 text-center">
        <h1 className="text-3xl md:text-5xl font-black gold-text tracking-tighter uppercase italic">
          6-Line Strategy Engine
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">
          Professional Pattern Analysis Pro v2.5
        </p>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Col: Database */}
        <div className="lg:col-span-3 h-full flex flex-col order-2 lg:order-1">
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-3xl shadow-2xl flex flex-col min-h-[300px] lg:h-[600px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Database</h2>
              <button onClick={clearHistory} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase transition-colors px-3 py-1 bg-red-500/10 rounded-full">Reset</button>
            </div>
            <textarea
              className="flex-1 w-full bg-[#020617] border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none leading-relaxed"
              placeholder="Click numbers to auto-populate history..."
              value={historyData}
              onChange={(e) => setHistoryData(e.target.value)}
            />
            
            {/* Money Management Display */}
            <div className="mt-4 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-black text-slate-500 uppercase">Bankroll Status</span>
                <button onClick={resetBankroll} className="text-[9px] text-amber-500 font-bold uppercase hover:underline">Reset P/L</button>
              </div>
              <div className={`text-2xl font-black mb-1 ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {totalPL >= 0 ? '+' : ''}{totalPL} <span className="text-[10px] text-slate-500">TAKA</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div className="bg-black/40 p-2 rounded-lg border border-slate-800/50">
                  <p className="text-[8px] text-slate-500 uppercase font-black">Current Unit</p>
                  <p className="text-sm font-black text-white">{currentUnit}x</p>
                </div>
                <div className="bg-black/40 p-2 rounded-lg border border-slate-800/50">
                  <p className="text-[8px] text-slate-500 uppercase font-black">Streak Loss</p>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${consecutiveLosses >= i ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'bg-slate-800'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Col: Keypad */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="bg-[#0f172a] border border-slate-800 p-5 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            {isHit && (
              <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none border-8 border-emerald-500/40 rounded-3xl z-30 animate-pulse flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-emerald-400 text-7xl md:text-9xl font-black rotate-[-12deg] drop-shadow-[0_0_40px_rgba(16,185,129,1)] scale-110">HIT!</span>
              </div>
            )}
            
            <h2 className="text-[11px] font-black text-amber-500 uppercase mb-6 text-center tracking-[0.4em]">
              Numeric Input Pad
            </h2>
            
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8">
              <button 
                onClick={() => addNumber(0)} 
                className="col-span-3 py-5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-2xl rounded-2xl border-b-8 border-emerald-900 transition-all active:translate-y-2 active:border-b-0 shadow-2xl"
              >
                0
              </button>
              
              {Array.from({ length: 36 }, (_, i) => {
                const num = i + 1;
                const isRed = RED_NUMBERS.includes(num);
                return (
                  <button
                    key={num}
                    onClick={() => addNumber(num)}
                    className={`py-5 md:py-7 rounded-2xl font-black text-2xl border-b-8 transition-all active:translate-y-2 active:border-b-0 shadow-lg ${
                      isRed 
                        ? 'bg-red-700 hover:bg-red-600 border-red-900 text-white' 
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-950 text-white'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={undoLast} className="py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black rounded-2xl uppercase border border-slate-700 transition-all">Undo</button>
              <button onClick={clearSession} className="py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black rounded-2xl uppercase border border-slate-700 transition-all">Clear Session</button>
            </div>
          </div>
        </div>

        {/* Right Col: AI Results */}
        <div className="lg:col-span-4 flex flex-col h-full order-3">
          <div className="bg-[#0f172a] border-2 border-amber-500/30 p-6 md:p-8 rounded-3xl shadow-2xl flex-1 flex flex-col relative overflow-hidden min-h-[500px]">
            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-5 mb-8">
              <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em]">
                Live AI Result
              </h2>
              <div className="flex bg-slate-900/80 p-1 rounded-full border border-slate-800">
                <button 
                  onClick={() => setMaxLines(1)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${maxLines === 1 ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  1 Line
                </button>
                <button 
                  onClick={() => setMaxLines(2)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${maxLines === 2 ? 'bg-amber-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  2 Lines
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-8">
              {!hasSearched ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-600 animate-spin flex items-center justify-center mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-700"></div>
                  </div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest">
                    Awaiting First Spin
                  </p>
                </div>
              ) : !result ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="text-red-500 text-lg font-black uppercase tracking-widest bg-red-500/10 p-6 rounded-3xl border border-red-500/20 mb-4">
                    NO MATCH
                  </div>
                  <p className="text-slate-500 text-[11px] font-bold leading-relaxed px-4">
                    The current sequence was not found in the database. Continue clicking numbers to expand pattern recognition.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  
                  {/* Financial Advisory Block */}
                  <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl">
                     <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest">Stake Advisory</p>
                        <p className="text-[10px] text-emerald-500 font-black uppercase">Unit: {currentUnit}x</p>
                     </div>
                     <div className="flex items-end gap-3">
                        <p className="text-3xl font-black text-white italic">{(currentUnit * BASE_STAKE * result.suggestedLines.length)} <span className="text-xs not-italic text-slate-500 uppercase">Taka Total</span></p>
                     </div>
                     <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-tight">
                        {result.suggestedLines.length > 1 ? `Bet ${currentUnit * BASE_STAKE} on each street` : `Bet full stake on ${SIX_LINES.find(l => l.id === result.suggestedLines[0])?.name}`}
                     </p>
                  </div>

                  <div className={`p-6 border-2 rounded-3xl text-center shadow-2xl transition-all duration-700 ${isHit ? 'bg-emerald-600 border-emerald-400 scale-105 shadow-emerald-500/40' : 'bg-slate-950 border-amber-500/50'}`}>
                    <p className={`text-[11px] font-black uppercase mb-3 tracking-[0.4em] ${isHit ? 'text-white' : 'text-amber-500'}`}>
                      {isHit ? 'TARGET HIT!' : 'SUGGESTED BET'}
                    </p>
                    <p className="text-2xl md:text-3xl font-black text-white leading-tight">
                      {result.suggestedLines.map(id => SIX_LINES.find(l => l.id === id)?.name).join(' & ')}
                    </p>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Winning Targets</p>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></div>
                        <span className="text-[10px] text-emerald-400 font-black uppercase">Found Match</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                      {result.suggestedNumbers.map(num => {
                        const isFoundInHistory = result.foundNumbers.includes(num);
                        const isCurrentLast = lastSpins[lastSpins.length - 1] === num;
                        
                        return (
                          <div 
                            key={num} 
                            className={`aspect-square flex items-center justify-center rounded-xl text-sm md:text-base font-black border transition-all duration-500 ${
                              isCurrentLast 
                                ? 'bg-emerald-500 border-emerald-300 text-white scale-125 shadow-[0_0_25px_rgba(16,185,129,1)] z-40' 
                                : isFoundInHistory
                                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110 ring-2 ring-emerald-500/20' 
                                  : RED_NUMBERS.includes(num) 
                                    ? 'bg-red-950/40 border-red-900/60 text-red-500' 
                                    : 'bg-slate-950 border-slate-800 text-amber-500/40'
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {lastSpins.length > 0 && (
              <div className="mt-10 pt-6 border-t border-slate-800/80">
                <p className="text-[10px] text-slate-600 uppercase font-black mb-5 tracking-[0.5em] text-center">Sequence History</p>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  {lastSpins.map((n, i) => (
                    <div 
                      key={i} 
                      className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center text-sm md:text-base font-black shadow-xl border-2 transition-all hover:scale-110 ${
                        RED_NUMBERS.includes(n) 
                          ? 'bg-red-700 border-red-500 text-white' 
                          : n === 0 
                            ? 'bg-emerald-600 border-emerald-400 text-white' 
                            : 'bg-slate-900 border-slate-700 text-white'
                      }`}
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      <footer className="mt-16 mb-8 text-slate-800 text-[10px] uppercase font-black tracking-[0.6em] opacity-30 text-center">
        Proprietary Engine - Professional Series - v2.5.1
      </footer>
    </div>
  );
}
