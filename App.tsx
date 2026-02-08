
import React, { useState, useEffect, useRef } from 'react';
import { parseNumberInput, analyzeStrategy } from './services/StrategyEngine';
import { StrategyResult, SIX_LINES, CORNERS } from './types';
import { TrendingUp, Flame, History, Landmark, RotateCcw, Undo2, BrainCircuit, Coins, ShieldCheck, Activity, Target } from 'lucide-react';

// Standard European Roulette Red Numbers
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const STAKE_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

const ROULETTE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

interface Transaction {
  type: 'WIN' | 'LOSS';
  betType: '6-LINE' | 'CORNER';
  amount: number;
  totalBet: number;
  unit: number;
  time: string;
  math: string;
}

export default function App() {
  const [historyData, setHistoryData] = useState<string>('');
  const [lastSpins, setLastSpins] = useState<number[]>([]);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [maxLines, setMaxLines] = useState<number>(1);
  const [selectedBetType, setSelectedBetType] = useState<'6-LINE' | 'CORNER'>('6-LINE');
  const [engineProtocol, setEngineProtocol] = useState<'HOT' | 'LESS-HOT'>('HOT');
  const [baseStake, setBaseStake] = useState<number>(5);
  
  const [totalPL, setTotalPL] = useState<number>(0);
  const [currentUnit, setCurrentUnit] = useState<number>(1);
  const [consecutiveLosses, setConsecutiveLosses] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isHit, setIsHit] = useState(false);

  const activeBetRef = useRef<{ 
    numbers: number[], 
    unit: number, 
    lineCount: number,
    betType: '6-LINE' | 'CORNER',
    hotness: 'HOT' | 'LESS-HOT',
    baseStake: number
  } | null>(null);

  useEffect(() => {
    const trimmedHistory = historyData.trim();
    if (trimmedHistory !== '' && lastSpins.length >= 1) {
      const parsedHistory = parseNumberInput(trimmedHistory);
      const analysis = analyzeStrategy(parsedHistory, lastSpins, maxLines, selectedBetType, engineProtocol);
      
      if (analysis) {
        setResult(analysis);
        activeBetRef.current = {
          numbers: analysis.suggestedNumbers,
          unit: currentUnit,
          lineCount: analysis.suggestedIds.length,
          betType: analysis.betType,
          hotness: analysis.hotness,
          baseStake: baseStake
        };
      } else {
        setResult(null);
        activeBetRef.current = null;
      }
    } else {
      setResult(null);
      activeBetRef.current = null;
    }
  }, [historyData, lastSpins, maxLines, currentUnit, selectedBetType, engineProtocol, baseStake]);

  const addNumber = (num: number) => {
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});

    if (activeBetRef.current) {
      const { numbers, unit, lineCount, betType, baseStake: turnStake } = activeBetRef.current;
      const stakePerLine = unit * turnStake;
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

        const newTx: Transaction = { 
          type: 'WIN', 
          betType, 
          amount: netProfit, 
          totalBet: totalStake, 
          unit, 
          time: timeStr, 
          math 
        };
        setTransactions(prev => [newTx, ...prev].slice(0, 10));
        
        setTimeout(() => setIsHit(false), 2000);
      } else {
        setTotalPL(prev => prev - totalStake);
        setIsHit(false);
        const newLossCount = consecutiveLosses + 1;
        setConsecutiveLosses(newLossCount);
        setEngineProtocol('LESS-HOT');
        
        const math = `Lost: -${totalStake} TK`;
        const newTx: Transaction = { 
          type: 'LOSS', 
          betType, 
          amount: -totalStake, 
          totalBet: totalStake, 
          unit, 
          time: timeStr, 
          math 
        };
        setTransactions(prev => [newTx, ...prev].slice(0, 10));
        
        if (newLossCount >= 3) {
          setCurrentUnit(prev => prev + 1);
          setConsecutiveLosses(0);
        }
      }
    } else {
      setEngineProtocol('HOT');
    }

    setHistoryData(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return num.toString();
      const lastChar = trimmed.slice(-1);
      const separator = /[\d]/.test(lastChar) ? ', ' : ' ';
      return trimmed + separator + num;
    });

    setLastSpins(prev => {
      const next = [...prev, num];
      return next.length > 20 ? next.slice(1) : next;
    });
  };

  const clearSession = () => {
    setLastSpins([]);
    setResult(null);
    setIsHit(false);
    activeBetRef.current = null;
    setEngineProtocol('HOT');
  };

  const resetBankroll = () => {
    if (window.confirm("Confirm: Reset Bankroll Data?")) {
      setTotalPL(0);
      setCurrentUnit(1);
      setConsecutiveLosses(0);
      setTransactions([]);
    }
  };

  const undoLast = () => {
    if (lastSpins.length === 0) return;
    setLastSpins(prev => prev.slice(0, -1));
  };

  const lastSpinValue = lastSpins.length > 0 ? lastSpins[lastSpins.length - 1] : null;
  const nextBetAmount = result ? (currentUnit * baseStake * result.suggestedIds.length) : 0;
  const currentChipValue = baseStake * currentUnit;

  return (
    <div className="min-h-screen casino-bg text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Premium Navigation Header */}
      <nav className="sticky top-0 z-50 glass-card border-b border-white/5 px-6 py-4 mb-6">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <BrainCircuit className="text-slate-950 w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic gold-text">
                AI ENGINE <span className="text-slate-500 not-italic font-medium text-sm ml-2">v3.2</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{engineProtocol} ACTIVE</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center h-full">
            <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-white/5">
              <div className="flex flex-col border-r border-white/10 pr-5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Landmark className="w-3 h-3" /> P/L Balance
                </span>
                <span className={`text-xl font-black leading-none ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {totalPL >= 0 ? '+' : ''}{totalPL} <span className="text-[10px] text-slate-500 ml-1">TK</span>
                </span>
              </div>
              <div className="flex flex-col items-center border-r border-white/10 px-5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Bet Unit</span>
                <span className="text-xl font-black text-amber-400 leading-none">{currentUnit}x</span>
              </div>
              <div className="flex flex-col items-end pl-2">
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Next Bet</span>
                <span className="text-xl font-black text-white leading-none">{nextBetAmount} <span className="text-[10px] text-slate-500">TK</span></span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Orchestration Layer */}
      <main className="max-w-[1800px] mx-auto w-full px-4 lg:px-8 pb-12 grid grid-cols-1 xl:grid-cols-12 gap-8 flex-grow">
        
        {/* Left Control Center */}
        <aside className="xl:col-span-3 space-y-8 h-full">
          <section className="glass-card p-6 rounded-[2.5rem] flex flex-col h-[380px] group transition-all duration-500 hover:shadow-amber-500/5">
            <div className="flex justify-between items-center mb-5 px-1">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" /> Database Log
              </h2>
              <button onClick={() => setHistoryData('')} className="text-[9px] text-rose-500 hover:text-rose-400 font-black uppercase px-3 py-1 bg-rose-500/10 rounded-full transition-all active:scale-95 border border-rose-500/20">Clear</button>
            </div>
            <div className="relative flex-1">
              <textarea
                className="w-full h-full bg-black/40 border border-white/5 rounded-3xl p-5 text-[14px] font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed no-scrollbar shadow-inner placeholder:opacity-30"
                placeholder="Paste numbers here (e.g. 12, 5, 30)..."
                value={historyData}
                onChange={(e) => setHistoryData(e.target.value)}
              />
            </div>
          </section>

          <section className="glass-card p-6 rounded-[2.5rem] border-t-2 border-amber-500/5">
            <div className="flex justify-between items-center mb-6 px-1">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-500" /> Real-time Ledger
              </h2>
              <button onClick={resetBankroll} className="text-[9px] text-slate-500 hover:text-white uppercase font-bold underline transition-colors">Reset P/L</button>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[400px] no-scrollbar pr-1">
              {transactions.length === 0 && (
                <div className="py-10 text-center opacity-20">
                  <span className="text-[10px] font-black uppercase tracking-widest">No Transactions</span>
                </div>
              )}
              {transactions.map((tx, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5 flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] ${tx.type === 'WIN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {tx.type === 'WIN' ? '+' : '-'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{tx.time} | {tx.betType}</span>
                        <span className="text-xs font-bold text-white/80">Bet: {tx.totalBet} TK</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount} TK
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono">{tx.math}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Center Pad */}
        <section className="xl:col-span-6 space-y-8 flex flex-col">
          <div className="glass-card p-6 md:p-8 rounded-[4rem] relative overflow-hidden flex-grow shadow-[0_0_80px_rgba(0,0,0,0.5)] border-2 border-white/5 flex flex-col">
            
            {/* Immersive Hit Visualizer */}
            {isHit && (
              <div className="absolute inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300 pointer-events-none">
                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-md animate-pulse"></div>
                <div className="relative text-center scale-up">
                  <div className="text-white text-9xl md:text-[14rem] font-black italic tracking-tighter drop-shadow-[0_0_80px_rgba(16,185,129,1)]">HIT!</div>
                </div>
              </div>
            )}

            <header className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 px-2 gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-amber-500 w-5 h-5" />
                  <h3 className="text-[11px] font-black text-amber-500/80 uppercase tracking-[0.4em]">Matrix Control Pad</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={undoLast} className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-slate-300 uppercase rounded-xl transition-all active:scale-95 border border-white/5 shadow-lg">
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button onClick={clearSession} className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-slate-300 uppercase rounded-xl transition-all active:scale-95 border border-white/5 shadow-lg">
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </header>

            {/* AI Highlighting Roulette Grid */}
            <div className="bg-[#0f1115] p-1 md:p-2 rounded-[1.25rem] border-[3px] md:border-[6px] border-[#22252a] shadow-2xl overflow-hidden self-center w-full max-w-[1000px]">
              <div className="flex w-full aspect-[4/1]">
                
                {/* Zero Button */}
                <button 
                  onClick={() => addNumber(0)} 
                  className={`w-[8%] md:w-[7.5%] h-full text-white font-black text-xl md:text-5xl flex items-center justify-center rounded-l-[0.75rem] transition-all active:brightness-75 mr-[1px] md:mr-0.5 border-r border-[#22252a]/50 relative group ${
                    lastSpinValue === 0 ? 'bg-white z-10 shadow-[0_0_40px_rgba(255,255,255,0.4)]' : 'bg-[#10b981] hover:bg-[#059669]'
                  }`}
                >
                  <span className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${lastSpinValue === 0 ? 'text-[#0f1115]' : 'text-white'}`}>0</span>
                  {result?.suggestedNumbers.includes(0) && (
                    <div className="absolute inset-1 border-2 border-amber-400 rounded-sm animate-pulse pointer-events-none"></div>
                  )}
                </button>

                {/* Grid 1-36 */}
                <div className="flex-1 flex flex-col gap-[1px] md:gap-0.5">
                  {ROULETTE_ROWS.map((row, rIdx) => (
                    <div key={rIdx} className="flex flex-1 gap-[1px] md:gap-0.5">
                      {row.map((num, nIdx) => {
                        const isRed = RED_NUMBERS.includes(num);
                        const isLastInRow = nIdx === row.length - 1;
                        const isSuggested = result?.suggestedNumbers.includes(num);
                        const isLastSpin = lastSpinValue === num;
                        
                        return (
                          <button
                            key={num}
                            onClick={() => addNumber(num)}
                            className={`flex-1 h-full flex items-center justify-center font-black text-base md:text-3xl transition-all active:brightness-75 group relative ${
                              isLastSpin 
                                ? 'bg-white z-10 scale-[1.03] shadow-[0_0_50px_rgba(255,255,255,0.5)]' 
                                : isRed 
                                  ? 'bg-[#ef4444] hover:bg-rose-500' 
                                  : 'bg-[#1a1c21] hover:bg-slate-800'
                            } ${isLastInRow ? 'rounded-r-[0.75rem]' : ''}`}
                          >
                            <span className={`group-hover:scale-110 transition-transform drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${isLastSpin ? 'text-[#0f1115]' : 'text-white'}`}>
                              {num}
                            </span>
                            
                            {/* Suggestion Highlight Layer */}
                            {isSuggested && !isLastSpin && (
                              <div className={`absolute inset-[1px] border-2 border-amber-400/80 rounded-sm pointer-events-none shadow-[inset_0_0_15px_rgba(251,191,36,0.2)]`}>
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
                              </div>
                            )}

                            {/* Flash for last spin */}
                            {isLastSpin && (
                                <div className="absolute inset-0 border-[3px] border-amber-500/50 animate-pulse rounded-sm"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <footer className="mt-auto pt-10 flex items-center justify-center opacity-70">
               <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-4 h-4 bg-white rounded-md shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Spin</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-4 h-4 border-2 border-amber-400 rounded-md"></div>
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">AI Target</span>
                  </div>
               </div>
            </footer>
          </div>

          <section className="glass-card p-6 md:p-8 rounded-[3rem] border-t border-white/5">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
               <History className="w-4 h-4 text-slate-400" /> Database History (20 Spins)
            </h2>
            <div className="flex flex-wrap gap-3 max-h-[120px] overflow-y-auto no-scrollbar">
              {lastSpins.length > 0 ? (
                lastSpins.map((n, i) => (
                  <div key={i} className={`w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center text-sm md:text-lg font-black shadow-xl border-b-2 transition-all ${
                    RED_NUMBERS.includes(n) ? 'bg-rose-600/80' : n === 0 ? 'bg-emerald-600/80' : 'bg-slate-800'
                  } border-black/40 text-white animate-in slide-in-from-right-2`}>
                    {n}
                  </div>
                ))
              ) : (
                <div className="w-full flex justify-center py-4 border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em]">Input Sequence Empty</span>
                </div>
              )}
            </div>
          </section>
        </section>

        {/* Right Intelligence Panel */}
        <aside className="xl:col-span-3 space-y-8 h-full flex flex-col">
          <section className="glass-card p-8 rounded-[3rem] border-2 border-amber-500/10 flex-grow flex flex-col relative overflow-hidden h-full">
            
            {/* ENHANCED SYSTEM STATUS AT TOP */}
            <div className="mb-8 p-6 rounded-[2rem] bg-black/40 border border-white/10 relative overflow-hidden z-10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-6 h-6 ${consecutiveLosses === 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">System Engine</span>
                    <span className={`text-[11px] font-black uppercase tracking-tighter ${consecutiveLosses === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {consecutiveLosses === 0 ? 'STATUS: OPTIMAL' : 'STATUS: RECOVERY ACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                   <Activity className={`w-4 h-4 ${consecutiveLosses === 0 ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Recovery Cycle</span>
                  </div>
                  <span className={`text-2xl font-black ${consecutiveLosses > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {consecutiveLosses}<span className="text-xs text-slate-600 ml-1">/ 3</span>
                  </span>
                </div>

                <div className="flex flex-col bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Current Chip</span>
                  </div>
                  <span className="text-2xl font-black text-white italic">
                    {currentChipValue}<span className="text-[10px] ml-1 not-italic text-slate-500">TK</span>
                  </span>
                </div>
              </div>

              {/* Visual Step Tracker with Glow */}
              <div className="mt-6 flex gap-2 h-2 w-full">
                {[1, 2, 3].map(step => (
                  <div 
                    key={step} 
                    className={`flex-1 rounded-full transition-all duration-700 ${
                      consecutiveLosses >= step 
                      ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]' 
                      : 'bg-white/5 border border-white/5'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stake Selector Section */}
            <div className="mb-10 relative z-10">
              <div className="flex items-center gap-2 mb-4 px-1">
                <Coins className="text-amber-500 w-5 h-5" />
                <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em]">Stake Inventory</h2>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {STAKE_OPTIONS.map(val => (
                  <button
                    key={val}
                    onClick={() => setBaseStake(val)}
                    className={`py-2 rounded-xl text-[10px] font-black border transition-all ${
                      baseStake === val 
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                        : 'bg-black/40 border-white/5 text-slate-500 hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <header className="flex flex-col gap-6 mb-10 relative z-10">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                   <BrainCircuit className="text-amber-500 w-5 h-5" />
                   <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em]">AI Intelligence</h2>
                </div>
                <div className="flex gap-1 bg-black/60 p-1.5 rounded-2xl border border-white/5">
                  {[1, 2].map(l => (
                    <button key={l} onClick={() => setMaxLines(l)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${maxLines === l ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500'}`}>{l}X</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => setSelectedBetType('6-LINE')} className={`py-4 rounded-[1.5rem] text-[10px] font-black uppercase border-2 transition-all flex justify-between px-6 items-center ${selectedBetType === '6-LINE' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/5 text-slate-600 hover:border-white/10'}`}>
                  <span>Double Street</span>
                  <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-500/20 italic">P: 1:5</span>
                </button>
                <button onClick={() => setSelectedBetType('CORNER')} className={`py-4 rounded-[1.5rem] text-[10px] font-black uppercase border-2 transition-all flex justify-between px-6 items-center ${selectedBetType === 'CORNER' ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'border-white/5 text-slate-600 hover:border-white/10'}`}>
                  <span>Corner Grid</span>
                  <span className="text-[8px] px-2 py-0.5 rounded bg-amber-500/20 italic">P: 1:8</span>
                </button>
              </div>
            </header>

            <div className="flex-1 relative z-10">
              {result ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
                  <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-700 ${result.hotness === 'HOT' ? 'bg-amber-500/10 border-amber-500/40 shadow-xl' : 'bg-slate-900 border-white/10'}`}>
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <Flame className={`w-5 h-5 ${result.hotness === 'HOT' ? 'text-amber-500 animate-bounce' : 'text-slate-600'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${result.hotness === 'HOT' ? 'text-amber-500' : 'text-slate-500'}`}>
                          {result.hotness === 'HOT' ? 'CRITICAL SIGNAL' : 'COLD SEQUENCE'}
                        </span>
                      </div>
                      <span className="bg-white/5 px-3 py-1.5 rounded-xl text-[10px] text-slate-400 font-black">LVL_{result.searchLevel}</span>
                    </div>
                    <div className="space-y-4">
                      {result.suggestedIds.map(id => {
                        const betDef = (result.betType === 'CORNER' ? CORNERS : SIX_LINES).find(b => b.id === id);
                        return <div key={id} className="text-4xl font-black text-white italic uppercase tracking-tighter drop-shadow-md">{betDef?.name}</div>;
                      })}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[9px] text-slate-500 font-black uppercase tracking-[0.6em] mb-6 flex items-center gap-2">Target Numbers <div className="h-px flex-1 bg-white/5"></div></h5>
                    <div className="grid grid-cols-6 gap-3">
                      {result.suggestedNumbers.map(num => {
                        const isFound = result.foundNumbers.includes(num);
                        const isLast = lastSpinValue === num;
                        
                        let itemStyle = "border-white/5 bg-black/40 text-slate-700 shadow-inner";
                        if (isLast) {
                          itemStyle = "bg-white text-black border-white scale-110 shadow-lg z-10";
                        } else if (isFound) {
                          itemStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                        }

                        return (
                          <div key={num} className={`aspect-square flex items-center justify-center rounded-2xl text-[13px] font-black border-2 transition-all duration-500 ${itemStyle}`}>
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-10">
                   <div className="w-16 h-16 border-4 border-dashed border-amber-500 rounded-full animate-spin mb-8"></div>
                   <p className="text-[10px] font-black uppercase tracking-[0.6em] italic">Scanning Matrix Patterns...</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
