
import React, { useState, useEffect } from 'react';
import { parseNumberInput, analyzeStrategy } from './services/StrategyEngine.ts';
import { StrategyResult, SIX_LINES } from './types.ts';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export default function App() {
  const [historyData, setHistoryData] = useState<string>('');
  const [lastSpins, setLastSpins] = useState<number[]>([]);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Track previous suggestions to detect "Hits"
  const [previousSuggestions, setPreviousSuggestions] = useState<number[]>([]);
  const [isHit, setIsHit] = useState(false);

  // Auto-analyze whenever inputs change
  useEffect(() => {
    const trimmedHistory = historyData.trim();
    if (trimmedHistory !== '' && lastSpins.length >= 1) {
      const parsedHistory = parseNumberInput(trimmedHistory);
      const analysis = analyzeStrategy(parsedHistory, lastSpins);
      
      if (analysis) {
        setResult(analysis);
        setHasSearched(true);
      } else {
        setResult(null);
      }
    } else {
      setResult(null);
      setHasSearched(false);
    }
  }, [historyData, lastSpins]);

  const addNumber = (num: number) => {
    // 1. Check if this number was a "Hit" based on previous prediction
    if (previousSuggestions.includes(num)) {
      setIsHit(true);
      setTimeout(() => setIsHit(false), 3000);
    } else {
      setIsHit(false);
    }

    // 2. Auto-Add to History Data string
    setHistoryData(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return num.toString();
      const separator = trimmed.endsWith(',') ? ' ' : ', ';
      return trimmed + separator + num;
    });

    // 3. Update Current Session Sequence
    setLastSpins(prev => {
      const next = [...prev, num];
      if (next.length > 12) return next.slice(1);
      return next;
    });
  };

  // Keep track of what we suggested *before* the next click
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
  };

  const undoLast = () => {
    if (lastSpins.length === 0) return;
    setLastSpins(prev => prev.slice(0, -1));
  };

  const clearHistory = () => {
    if (window.confirm("Clear all history data?")) {
      setHistoryData('');
    }
  };

  return (
    <div className="min-h-screen casino-gradient p-4 flex flex-col items-center">
      <header className="w-full max-w-5xl mb-4 text-center">
        <h1 className="text-2xl md:text-3xl font-black gold-text tracking-tighter uppercase italic">
          Professional 6-Line Engine
        </h1>
        <div className="h-0.5 w-32 bg-amber-500/50 mx-auto mt-1"></div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Step 1: History Database */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl shadow-2xl flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">1. History Database (Auto-Update)</h2>
              <button onClick={clearHistory} className="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase transition-colors">Clear</button>
            </div>
            <textarea
              className="flex-1 w-full bg-[#020617] border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none transition-all"
              placeholder="Numbers auto-populate here as you click..."
              value={historyData}
              onChange={(e) => setHistoryData(e.target.value)}
            />
            <div className="mt-3 p-2 bg-slate-900 rounded border border-slate-800 text-[9px] text-slate-500 text-center uppercase font-bold">
              Editing history will update AI live
            </div>
          </div>
        </div>

        {/* Step 2: Keypad */}
        <div className="lg:col-span-5">
          <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl shadow-2xl relative">
            {isHit && (
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border-4 border-emerald-500/50 rounded-xl z-10 animate-pulse flex items-center justify-center">
                <span className="text-emerald-400 text-6xl font-black rotate-[-12deg] drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">HIT!</span>
              </div>
            )}
            
            <h2 className="text-[10px] font-bold text-amber-500 uppercase mb-4 text-center tracking-widest">2. Input Latest Spins</h2>
            
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              <button onClick={() => addNumber(0)} className="col-span-3 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg border-b-4 border-emerald-900 transition-all active:translate-y-0.5 active:border-b-0 shadow-md">0</button>
              {Array.from({ length: 12 }, (_, col) => (
                <div key={col} className="flex flex-col gap-1.5">
                  {[1, 2, 3].map(row => {
                    const num = col * 3 + row;
                    const isRed = RED_NUMBERS.includes(num);
                    return (
                      <button
                        key={num}
                        onClick={() => addNumber(num)}
                        className={`py-3.5 rounded-lg font-black text-lg border-b-4 transition-all active:translate-y-0.5 active:border-b-0 shadow-md ${isRed ? 'bg-red-700 hover:bg-red-600 border-red-900 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-950 text-white'}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={undoLast} className="flex-1 py-2 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase border border-slate-700">Undo Last</button>
              <button onClick={clearSession} className="flex-1 py-2 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase border border-slate-700">Clear Session</button>
            </div>
          </div>
        </div>

        {/* Step 3: Result */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-[#0f172a] border-2 border-amber-500/30 p-5 rounded-xl shadow-2xl flex-1 flex flex-col relative overflow-hidden">
            <h2 className="text-xs font-black text-amber-500 uppercase mb-5 text-center tracking-[0.2em] border-b border-slate-800 pb-3">
              AI Analysis Result
            </h2>

            <div className="flex-1">
              {!hasSearched ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <p className="text-slate-500 text-[11px] font-medium max-w-[180px] leading-relaxed">
                    INPUT A NUMBER TO START LIVE SCANNING
                  </p>
                </div>
              ) : !result ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="text-red-500 text-sm font-bold uppercase tracking-widest bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    No Pattern Match
                  </div>
                  <p className="text-slate-500 text-[10px] max-w-[200px]">
                    This sequence is unique in your database. Keep playing to build patterns.
                  </p>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                      <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">Match Level</p>
                      <p className="text-lg font-black text-white leading-none">Lvl {result.searchLevel}</p>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                      <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">Frequency</p>
                      <p className="text-lg font-black text-emerald-400 leading-none">{result.patternMatches}x</p>
                    </div>
                  </div>

                  <div className={`p-4 border rounded-xl text-center shadow-inner transition-all duration-500 ${isHit ? 'bg-emerald-500/20 border-emerald-500 shadow-emerald-500/20 scale-105' : 'bg-amber-500/5 border-amber-500/20'}`}>
                    <p className={`text-[9px] font-black uppercase mb-1.5 tracking-widest ${isHit ? 'text-emerald-400' : 'text-amber-500'}`}>
                      {isHit ? 'LAST BET WAS A HIT!' : 'NEXT SUGGESTED BETS'}
                    </p>
                    <p className="text-xl md:text-2xl font-black text-white">
                      {result.suggestedLines.map(id => SIX_LINES.find(l => l.id === id)?.name).join(' and ')}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-500 text-[9px] font-bold uppercase mb-2 text-center">Numbers to Bet (Green = Found in History)</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {result.suggestedNumbers.map(num => {
                        const isFoundInHistory = result.foundNumbers.includes(num);
                        const isCurrentLast = lastSpins[lastSpins.length - 1] === num;
                        
                        return (
                          <div 
                            key={num} 
                            className={`py-1.5 text-center rounded text-xs font-black border transition-all duration-300 ${
                              isCurrentLast 
                                ? 'bg-emerald-500 border-emerald-400 text-white scale-110 shadow-lg shadow-emerald-500/50 z-20' 
                                : isFoundInHistory
                                  ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                                  : RED_NUMBERS.includes(num) 
                                    ? 'bg-red-950/30 border-red-900/50 text-red-400' 
                                    : 'bg-slate-950 border-slate-800 text-amber-400'
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
              <div className="mt-6 pt-4 border-t border-slate-800/50">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest">Recent Sequence</p>
                <div className="flex flex-wrap gap-2.5">
                  {lastSpins.map((n, i) => (
                    <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shadow-lg border-2 border-slate-900/50 transition-all ${RED_NUMBERS.includes(n) ? 'bg-[#b91c1c] text-white shadow-red-900/20' : n === 0 ? 'bg-[#15803d] text-white shadow-green-900/20' : 'bg-[#1e293b] text-white border-slate-700/50'}`}>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      <footer className="mt-8 text-slate-700 text-[10px] uppercase font-bold tracking-[0.4em] opacity-40">
        AI Live Tracking Mode • Professional Analysis
      </footer>
    </div>
  );
}
