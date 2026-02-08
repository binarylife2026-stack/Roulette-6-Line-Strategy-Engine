
import React, { useState, useEffect, useRef } from 'react';
import { parseNumberInput, analyzeStrategy } from './services/StrategyEngine';
import { StrategyResult, SIX_LINES, CORNERS } from './types';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 33, 34, 36];
const BASE_STAKE = 5;

// Horizontal Pad Mapping (Top down matching common table layout)
const ROULETTE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

interface Transaction {
  type: 'WIN' | 'LOSS';
  betType: '6-LINE' | 'CORNER';
  amount: number;
  unit: number;
  time: string;
  math: string;
}

export default function App() {
  const [historyData, setHistoryData] = useState<string>('');
  const [lastSpins, setLastSpins] = useState<number[]>([]);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [maxLines, setMaxLines] = useState<number>(1);
  const [selectedBetType, setSelectedBetType] = useState<'6-LINE' | 'CORNER'>('6-LINE');
  const [engineProtocol, setEngineProtocol] = useState<'HOT' | 'LESS-HOT'>('HOT');
  
  // Money Management State
  const [totalPL, setTotalPL] = useState<number>(0);
  const [currentUnit, setCurrentUnit] = useState<number>(1);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastReport, setLastReport] = useState<{msg: string, color: string} | null>(null);
  
  const [isHit, setIsHit] = useState(false);

  // Reference to track the state of the bet BEFORE the number was clicked
  const activeBetRef = useRef<{ 
    numbers: number[], 
    unit: number, 
    lineCount: number,
    betType: '6-LINE' | 'CORNER',
    hotness: 'HOT' | 'LESS-HOT'
  } | null>(null);

  useEffect(() => {
    const trimmedHistory = historyData.trim();
    if (trimmedHistory !== '' && lastSpins.length >= 1) {
      const parsedHistory = parseNumberInput(trimmedHistory);
      const analysis = analyzeStrategy(parsedHistory, lastSpins, maxLines, selectedBetType, engineProtocol);
      
      if (analysis) {
        setResult(analysis);
        setHasSearched(true);
        activeBetRef.current = {
          numbers: analysis.suggestedNumbers,
          unit: currentUnit,
          lineCount: analysis.suggestedIds.length,
          betType: analysis.betType,
          hotness: analysis.hotness
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
  }, [historyData, lastSpins, maxLines, currentUnit, selectedBetType, engineProtocol]);

  const addNumber = (num: number) => {
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});

    if (activeBetRef.current) {
      const { numbers, unit, lineCount, betType } = activeBetRef.current;
      const stakePerLine = unit * BASE_STAKE;
      const totalStake = stakePerLine * lineCount;
      const multiplier = betType === '6-LINE' ? 5 : 8;

      if (numbers.includes(num)) {
        const profitFromWinningLine = stakePerLine * multiplier;
        const lossFromOtherLines = stakePerLine * (lineCount - 1);
        const netProfit = profitFromWinningLine - lossFromOtherLines;
        
        setTotalPL(prev => prev + netProfit);
        setIsHit(true);
        setConsecutiveLosses(0);
        setCurrentUnit(prev => Math.max(1, prev - 1));
        setEngineProtocol('LESS-HOT');
        
        const math = lineCount === 1 
          ? `(${stakePerLine} × ${multiplier}) = +${netProfit}` 
          : `(${stakePerLine} × ${multiplier}) - ${lossFromOtherLines} = +${netProfit}`;

        const newTx: Transaction = { type: 'WIN', betType, amount: netProfit, unit, time: timeStr, math };
        setTransactions(prev => [newTx, ...prev].slice(0, 5));
        setLastReport({ msg: `WIN: +${netProfit} TK`, color: 'text-emerald-400' });
        
        setTimeout(() => setIsHit(false), 2000);
      } else {
        setTotalPL(prev => prev - totalStake);
        setIsHit(false);
        const newLossCount = consecutiveLosses + 1;
        setConsecutiveLosses(newLossCount);
        setEngineProtocol('LESS-HOT');
        
        const math = `-${totalStake} TK`;
        const newTx: Transaction = { type: 'LOSS', betType, amount: -totalStake, unit, time: timeStr, math };
        setTransactions(prev => [newTx, ...prev].slice(0, 5));
        
        if (newLossCount >= 3) {
          setCurrentUnit(prev => prev + 1);
          setConsecutiveLosses(0);
          setLastReport({ msg: `UNIT INCREASED (${currentUnit + 1}x)`, color: 'text-rose-500' });
        } else {
          setLastReport({ msg: `LOSS: -${totalStake} TK`, color: 'text-rose-400' });
        }
      }
    } else {
      setEngineProtocol('HOT');
    }

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

  const clearSession = () => {
    setLastSpins([]);
    setResult(null);
    setHasSearched(false);
    setIsHit(false);
    activeBetRef.current = null;
    setLastReport(null);
    setEngineProtocol('HOT');
  };

  const resetBankroll = () => {
    if (window.confirm("Reset all Profit/Loss and Transaction data?")) {
      setTotalPL(0);
      setCurrentUnit(1);
      setConsecutiveLosses(0);
      setTransactions([]);
      setLastReport(null);
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
    <div className="max-w-[1600px] mx-auto p-4 lg:p-10 space-y-8 animate-in fade-in duration-1000">
      
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tighter gold-text gold-glow uppercase italic leading-none">
            AI Engine <span className="text-white opacity-40">v3.0.4</span>
          </h1>
          <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">
              Real-time Analysis Sequence • {engineProtocol} PROTOCOL
            </p>
          </div>
        </div>

        <div className="flex gap-4 items-center glass-card px-6 py-4 rounded-3xl">
          <div className="flex flex-col items-center border-r border-white/10 pr-6">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total P/L</span>
            <span className={`text-2xl font-black ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {totalPL >= 0 ? '+' : ''}{totalPL} <span className="text-[10px] opacity-40">TK</span>
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Active Unit</span>
            <span className="text-2xl font-black text-amber-400">{currentUnit}x</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left: Dashboard Stats */}
        <div className="xl:col-span-3 space-y-8">
          
          <div className="glass-card p-6 rounded-[2rem] flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">History Log</h2>
              <button onClick={clearHistory} className="text-[10px] text-rose-500 hover:text-rose-400 font-black uppercase px-3 py-1 bg-rose-500/10 rounded-full transition-colors">Clear</button>
            </div>
            <textarea
              className="flex-1 w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-[13px] font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none leading-relaxed shadow-inner no-scrollbar"
              placeholder="Waiting for pad input..."
              value={historyData}
              onChange={(e) => setHistoryData(e.target.value)}
            />
          </div>

          <div className="glass-card p-6 rounded-[2rem]">
            <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-5">Ledger Math</h2>
            <div className="space-y-3">
              {transactions.map((tx, i) => (
                <div key={i} className="group relative overflow-hidden bg-white/5 hover:bg-white/[0.08] p-4 rounded-2xl border border-white/5 transition-all duration-300">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase ${tx.type === 'WIN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {tx.type} • {tx.betType === 'CORNER' ? 'CORNER' : '6-LINE'}
                      </span>
                      <span className="text-[13px] text-white/90 font-mono mt-1">{tx.math}</span>
                    </div>
                    <span className={`text-lg font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-600 font-bold mt-2 text-right uppercase tracking-wider">{tx.time}</div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-widest italic">No Data recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: The Massive Pad */}
        <div className="xl:col-span-6 space-y-8">
          
          <div className="glass-card p-4 md:p-8 rounded-[3rem] relative overflow-hidden group">
            
            {/* Hit Overlay */}
            {isHit && (
              <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-md z-40 flex items-center justify-center animate-in fade-in zoom-in duration-300 border-8 border-emerald-400/50 rounded-[3rem]">
                <div className="text-center">
                  <h3 className="text-white text-8xl md:text-[10rem] font-black italic tracking-tighter drop-shadow-[0_0_50px_rgba(16,185,129,0.8)]">HIT!</h3>
                  <p className="text-white text-xl font-bold uppercase tracking-[0.5em] mt-2">Target Sequence Verified</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-8 px-2">
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em]">Roulette Sequence Matrix</span>
                <div className="h-[1px] w-12 bg-white/10 hidden md:block"></div>
              </div>
              <div className="flex gap-2">
                <button onClick={undoLast} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black text-slate-400 uppercase rounded-xl transition-all active:scale-90 border border-white/5">Undo</button>
                <button onClick={clearSession} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black text-slate-400 uppercase rounded-xl transition-all active:scale-90 border border-white/5">Reset</button>
              </div>
            </div>

            <div className="relative p-1 md:p-3 bg-black/40 rounded-[2rem] border border-white/5 shadow-2xl overflow-x-auto no-scrollbar">
              <div className="flex gap-2 md:gap-3 min-w-[700px] md:min-w-0">
                
                {/* Zero Cell */}
                <button 
                  onClick={() => addNumber(0)} 
                  className="w-16 md:w-24 bg-emerald-600 hover:bg-emerald-500 rounded-2xl flex flex-col items-center justify-center border-b-4 border-emerald-800 shadow-xl roulette-button group"
                >
                  <span className="text-white text-3xl md:text-5xl font-black italic drop-shadow-lg group-hover:scale-110 transition-transform">0</span>
                </button>

                {/* Main Grid */}
                <div className="flex-1 grid grid-rows-3 gap-2 md:gap-3">
                  {ROULETTE_ROWS.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-12 gap-2 md:gap-3">
                      {row.map(num => {
                        const isRed = RED_NUMBERS.includes(num);
                        return (
                          <button
                            key={num}
                            onClick={() => addNumber(num)}
                            className={`h-12 md:h-20 lg:h-24 rounded-xl md:rounded-2xl flex items-center justify-center border-b-4 shadow-xl roulette-button group ${
                              isRed 
                                ? 'bg-[#ef4444] border-rose-900 hover:bg-rose-500' 
                                : 'bg-[#1e293b] border-slate-950 hover:bg-slate-700'
                            }`}
                          >
                            <span className="text-white text-xl md:text-3xl font-black group-hover:scale-110 transition-transform">
                              {num}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[2rem]">
            <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Session Stream</h2>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {lastSpins.map((n, i) => (
                <div 
                  key={i} 
                  className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-sm md:text-lg font-black shadow-lg border-b-2 transition-all animate-in slide-in-from-right-4 duration-300 ${
                    RED_NUMBERS.includes(n) 
                      ? 'bg-rose-700/80 border-rose-900 text-white' 
                      : n === 0 
                        ? 'bg-emerald-600/80 border-emerald-800 text-white' 
                        : 'bg-slate-800 border-slate-950 text-white'
                  }`}
                >
                  {n}
                </div>
              ))}
              {lastSpins.length === 0 && <p className="text-slate-600 text-xs font-bold uppercase italic p-4">Waiting for initial spin data...</p>}
            </div>
          </div>
        </div>

        {/* Right: AI Prediction Engine */}
        <div className="xl:col-span-3 space-y-8">
          
          <div className="glass-card p-8 rounded-[2rem] border-2 border-amber-500/20 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-40 h-40" viewBox="0 0 24 24" fill="white">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6M12,8A4,4 0 0,0 8,12A4,4 0 0,0 12,16A4,4 0 0,0 16,12A4,4 0 0,0 12,8Z" />
              </svg>
            </div>

            <div className="flex flex-col gap-6 mb-8 relative z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em]">Prediction Ops</h2>
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  <button onClick={() => setMaxLines(1)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${maxLines === 1 ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500'}`}>1X</button>
                  <button onClick={() => setMaxLines(2)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${maxLines === 2 ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500'}`}>2X</button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setSelectedBetType('6-LINE')}
                  className={`py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all flex justify-between px-6 items-center ${selectedBetType === '6-LINE' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/5 text-slate-600'}`}
                >
                  <span>6-Line Matrix</span>
                  <span className="opacity-40 italic">1:5</span>
                </button>
                <button 
                  onClick={() => setSelectedBetType('CORNER')}
                  className={`py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all flex justify-between px-6 items-center ${selectedBetType === 'CORNER' ? 'bg-amber-600/10 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'border-white/5 text-slate-600'}`}
                >
                  <span>Corner Grid</span>
                  <span className="opacity-40 italic">1:8</span>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-8 relative z-10">
              {!hasSearched ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <div className="w-20 h-20 rounded-full border-t-2 border-r-2 border-amber-500 animate-spin mb-6"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Scanning History...</p>
                </div>
              ) : !result ? (
                <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl text-center">
                  <h4 className="text-rose-500 text-sm font-black uppercase tracking-widest mb-2 italic">Signal Lost</h4>
                  <p className="text-slate-500 text-[10px] leading-relaxed font-bold uppercase tracking-wider">Protocol mismatch. Stabilizing sequence. Add more spin data for recovery.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-700">
                  
                  <div className={`p-6 rounded-3xl border transition-all duration-500 ${result.hotness === 'HOT' ? 'bg-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/5' : 'bg-slate-900 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${result.hotness === 'HOT' ? 'text-amber-500' : 'text-slate-500'}`}>
                        {result.hotness === 'HOT' ? 'HOT PATTERN FOUND' : 'STABILIZING CYCLE'}
                      </span>
                      <span className="bg-white/5 px-2 py-1 rounded text-[9px] text-slate-400 font-bold uppercase">DEPTH {result.searchLevel}</span>
                    </div>

                    <div className="space-y-3">
                      {result.suggestedIds.map(id => {
                        const betDef = (result.betType === 'CORNER' ? CORNERS : SIX_LINES).find(b => b.id === id);
                        return (
                          <div key={id} className="text-3xl font-black text-white italic uppercase tracking-tighter">
                            {betDef?.name}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Est. Win</span>
                        <span className="text-2xl font-black text-emerald-400">
                          +{ (currentUnit * BASE_STAKE * (result.betType === 'CORNER' ? 8 : 5)) - (currentUnit * BASE_STAKE * (result.suggestedIds.length - 1)) }
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Stake</span>
                        <span className="text-lg font-black text-white/40">
                          {(currentUnit * BASE_STAKE * result.suggestedIds.length)} TK
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[9px] text-slate-600 font-black uppercase tracking-[0.5em] mb-4">Winning Targets</h5>
                    <div className="grid grid-cols-6 gap-2">
                      {result.suggestedNumbers.map(num => {
                        const isMatch = result.foundNumbers.includes(num);
                        const isLast = lastSpins[lastSpins.length - 1] === num;
                        return (
                          <div 
                            key={num} 
                            className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black border transition-all duration-700 ${
                              isLast 
                                ? 'bg-emerald-500 border-emerald-300 text-white scale-125 shadow-[0_0_20px_rgba(16,185,129,0.8)] z-20' 
                                : isMatch
                                  ? 'bg-emerald-600/50 border-emerald-500 text-white' 
                                  : RED_NUMBERS.includes(num)
                                    ? 'bg-rose-950/20 border-rose-900/40 text-rose-800'
                                    : 'bg-black/20 border-white/5 text-slate-800'
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

            <div className="mt-auto pt-8 border-t border-white/5">
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${consecutiveLosses > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]'}`}></div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Engine Status</span>
                  <span className="text-[11px] text-white/90 font-bold uppercase">{consecutiveLosses > 0 ? `${consecutiveLosses} Sequential Losses` : 'Signal Strength Optimal'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      <footer className="pt-12 pb-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-600 font-black uppercase tracking-[0.6em]">
        <span>Proprietary Engine • 2025 Series</span>
        <span>Secure Protocol 3.0.4 • Optimized for Desktop</span>
      </footer>
    </div>
  );
}
