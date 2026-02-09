
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { parseNumberInput, analyzeStrategy, EnhancedStrategyResult } from './services/StrategyEngine';
import { SIX_LINES, CORNERS } from './types';
import { TrendingUp, Flame, History, Snowflake, RotateCcw, Undo2, BrainCircuit, Coins, ShieldCheck, Activity, Target, Zap, Info, Trash2, Layers, CheckCircle2, XCircle, Gauge, ChevronRight, RefreshCw, BarChart3, AlertCircle, Fingerprint, SearchCheck, ShieldAlert, Waves } from 'lucide-react';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const STAKE_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];

const ROULETTE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

interface OutcomeRecord {
  result: 'HIT' | 'MISS';
  depth: number;
  num: number;
}

export default function App() {
  const [historyData, setHistoryData] = useState<string>('');
  const [lastSpins, setLastSpins] = useState<number[]>([]);
  const [result, setResult] = useState<EnhancedStrategyResult | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<'6-LINE' | 'CORNER'>('6-LINE');
  const [baseStake, setBaseStake] = useState<number>(5);
  
  const [totalPL, setTotalPL] = useState<number>(0);
  const [currentUnit, setCurrentUnit] = useState<number>(1);
  const [lossStreak, setLossStreak] = useState<number>(0);
  const [outcomeHistory, setOutcomeHistory] = useState<OutcomeRecord[]>([]);
  const [isHit, setIsHit] = useState(false);

  const activeBetRef = useRef<{ 
    numbers: number[], 
    unit: number, 
    lineCount: number,
    baseStake: number,
    depth: number
  } | null>(null);

  const missingStreaks = useMemo(() => {
    return SIX_LINES.map(line => {
      let streak = 0;
      for (let i = lastSpins.length - 1; i >= 0; i--) {
        if (line.numbers.includes(lastSpins[i])) break;
        streak++;
      }
      return { id: line.id, name: line.name, streak };
    }).sort((a,b) => b.streak - a.streak);
  }, [lastSpins]);

  useEffect(() => {
    const trimmedHistory = historyData.trim();
    if (trimmedHistory !== '' && lastSpins.length >= 1) {
      const parsedHistory = parseNumberInput(trimmedHistory);
      const analysis = analyzeStrategy(parsedHistory, lastSpins, 1, selectedBetType, missingStreaks);
      
      if (analysis) {
        setResult(analysis);
        activeBetRef.current = {
          numbers: analysis.suggestedNumbers,
          unit: currentUnit,
          lineCount: analysis.suggestedIds.length,
          baseStake: baseStake,
          depth: analysis.searchLevel
        };
      } else {
        setResult(null);
        activeBetRef.current = null;
      }
    } else {
      setResult(null);
      activeBetRef.current = null;
    }
  }, [historyData, lastSpins, currentUnit, selectedBetType, baseStake, missingStreaks]);

  const addNumber = (num: number) => {
    if (activeBetRef.current) {
      const { numbers, unit, lineCount, baseStake: turnStake, depth } = activeBetRef.current;
      const stakePerLine = unit * turnStake;
      const totalStake = stakePerLine * lineCount;
      const multiplier = selectedBetType === '6-LINE' ? 5 : 8;

      if (numbers.includes(num)) {
        const netProfit = (stakePerLine * multiplier) - (stakePerLine * (lineCount - 1));
        setTotalPL(prev => prev + netProfit);
        setIsHit(true);
        setLossStreak(0);
        setCurrentUnit(1); 
        setOutcomeHistory(prev => [{ result: 'HIT' as const, depth, num }, ...prev].slice(0, 5));
        setTimeout(() => setIsHit(false), 2000);
      } else {
        setTotalPL(prev => prev - totalStake);
        setIsHit(false);
        const newStreak = lossStreak + 1;
        setLossStreak(newStreak);
        setOutcomeHistory(prev => [{ result: 'MISS' as const, depth, num }, ...prev].slice(0, 5));
        
        if (newStreak > 0 && newStreak % 3 === 0) {
          setCurrentUnit(prev => prev + 1);
        }
      }
    }

    setHistoryData(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return num.toString();
      return trimmed + ", " + num;
    });

    setLastSpins(prev => {
      const next = [...prev, num];
      return next.length > 50 ? next.slice(1) : next;
    });
  };

  const handleFullReset = () => {
    if (window.confirm("CRITICAL: Wipe all history, streaks, and data logs?")) {
      setLastSpins([]);
      setHistoryData('');
      setResult(null);
      setOutcomeHistory([]);
      setLossStreak(0);
      setTotalPL(0);
      setCurrentUnit(1);
      activeBetRef.current = null;
    }
  };

  const undoLast = () => {
    if (lastSpins.length === 0) return;
    setLastSpins(prev => prev.slice(0, -1));
    setHistoryData(prev => {
      const nums = parseNumberInput(prev);
      return nums.length <= 1 ? '' : nums.slice(0, -1).join(', ');
    });
    setOutcomeHistory(prev => prev.slice(1));
  };

  const lastSpinValue = lastSpins.length > 0 ? lastSpins[lastSpins.length - 1] : null;

  return (
    <div className="min-h-screen casino-bg text-slate-100 flex flex-col font-sans selection:bg-amber-500/30">
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-card border-b border-white/5 px-6 py-4 mb-6">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShieldCheck className="text-slate-950 w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic gold-text">
                PRO AI EXPERT <span className="text-slate-500 not-italic font-medium text-sm ml-2">v5.5</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`flex h-2 w-2 rounded-full animate-pulse ${lossStreak === 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{lossStreak === 0 ? 'TABLE STABLE' : `RISK LEVEL: ${lossStreak}`}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-white/5 shadow-2xl">
              <div className="flex flex-col border-r border-white/10 pr-5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Session Profit</span>
                <span className={`text-xl font-black leading-none ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {totalPL >= 0 ? '+' : ''}{totalPL} <span className="text-[10px] text-slate-500 ml-1">TK</span>
                </span>
              </div>
              <div className="flex flex-col items-center pl-2">
                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Bet Power</span>
                <span className="text-xl font-black text-white leading-none">x{currentUnit}</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto w-full px-4 lg:px-8 pb-12 grid grid-cols-1 xl:grid-cols-12 gap-8 flex-grow">
        
        {/* Left: Professional Analytics */}
        <aside className="xl:col-span-3 space-y-6 flex flex-col h-full">
          
          {/* Stability Meter */}
          <section className="glass-card p-6 rounded-[2.5rem] bg-slate-900/40 border border-white/5">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
               <Waves className="w-4 h-4 text-sky-400" /> Table Stability Index
            </h2>
            <div className="flex flex-col items-center py-2">
               <div className="relative w-32 h-16 overflow-hidden">
                 <div className="absolute inset-0 rounded-t-full border-[10px] border-slate-800"></div>
                 <div 
                   className={`absolute inset-0 rounded-t-full border-[10px] transition-all duration-1000 origin-bottom ${result && result.stability > 60 ? 'border-emerald-500' : result && result.stability > 30 ? 'border-amber-500' : 'border-rose-500'}`}
                   style={{ transform: `rotate(${(result?.stability || 0) * 1.8 - 180}deg)` }}
                 ></div>
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-black">{result?.stability || 0}%</div>
               </div>
               <span className="text-[9px] font-black text-slate-500 uppercase mt-2">{result && result.stability < 35 ? 'DANGEROUS SCATTER' : 'PREDICTABLE RANGE'}</span>
            </div>
          </section>

          <section className="glass-card p-6 rounded-[2.5rem] flex flex-col h-[180px]">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-amber-500" /> Raw History Stream
            </h2>
            <textarea
              className="w-full h-full bg-black/40 border border-white/5 rounded-3xl p-5 text-[14px] font-mono text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none leading-relaxed no-scrollbar shadow-inner"
              placeholder="Paste data for deep scan..."
              value={historyData}
              onChange={(e) => setHistoryData(e.target.value)}
            />
          </section>

          <section className="glass-card p-6 rounded-[2.5rem] bg-slate-900/30">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
               <BarChart3 className="w-4 h-4 text-sky-400" /> Sector Gravity (Missing)
            </h2>
            <div className="space-y-2">
              {missingStreaks.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[11px] font-black text-white uppercase italic">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-bold">MISSING</span>
                    <span className={`text-sm font-black ${item.streak > 12 ? 'text-rose-500 animate-pulse' : item.streak > 8 ? 'text-amber-500' : 'text-emerald-500'}`}>{item.streak}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-6 rounded-[2.5rem] flex flex-col flex-grow">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-emerald-500" /> Performance Log
            </h2>
            <div className="space-y-3">
              {outcomeHistory.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl border ${item.result === 'HIT' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 opacity-70'}`}>
                  <div className="flex items-center gap-2">
                    {item.result === 'HIT' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                    <span className={`text-[10px] font-black uppercase ${item.result === 'HIT' ? 'text-emerald-400' : 'text-rose-400'}`}>{item.result}</span>
                  </div>
                  <span className="text-white font-black text-sm">#{item.num}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>

        {/* Center: Interactive Board */}
        <section className="xl:col-span-6 flex flex-col">
          <div className="glass-card p-6 md:p-10 rounded-[4rem] relative overflow-hidden flex-grow flex flex-col shadow-2xl border border-white/5">
            {isHit && (
              <div className="absolute inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300 pointer-events-none">
                <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xl animate-pulse"></div>
                <div className="text-white text-9xl font-black italic tracking-tighter gold-text scale-up">HIT!</div>
              </div>
            )}

            <header className="flex justify-between items-center mb-8">
               <div className="px-4 py-2 bg-black/60 rounded-2xl border border-white/5 flex items-center gap-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Table Stream</span>
                  <div className="flex gap-1">
                    {lastSpins.slice(-6).map((n, i) => (
                      <div key={i} className={`w-7 h-7 rounded-md border flex items-center justify-center text-[12px] font-black ${RED_NUMBERS.includes(n) ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' : n === 0 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-500/10 border-slate-500/40 text-white'}`}>{n}</div>
                    ))}
                  </div>
               </div>
               <h3 className="text-[11px] font-black text-amber-500/80 uppercase tracking-[0.4em] px-6 py-2 bg-black/40 rounded-full border border-white/5">Pro Interface v5.5</h3>
            </header>

            {/* Roulette Matrix */}
            <div className="bg-[#0f1115] p-2 rounded-[2rem] border-[8px] border-[#22252a] shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] self-center w-full max-w-[900px]">
              <div className="flex w-full aspect-[4.5/1]">
                <button onClick={() => addNumber(0)} className={`w-[8%] h-full text-white font-black text-4xl flex items-center justify-center rounded-l-[1.5rem] border-r border-[#22252a]/50 ${lastSpinValue === 0 ? 'bg-white text-black scale-y-105 z-10 shadow-2xl' : 'bg-[#10b981] hover:bg-emerald-400'}`}>0</button>
                <div className="flex-1 flex flex-col gap-0.5">
                  {ROULETTE_ROWS.map((row, rIdx) => (
                    <div key={rIdx} className="flex flex-1 gap-0.5">
                      {row.map((num, nIdx) => {
                        const isRed = RED_NUMBERS.includes(num);
                        const isSuggested = result?.suggestedNumbers.includes(num);
                        const isLast = lastSpinValue === num;
                        return (
                          <button key={num} onClick={() => addNumber(num)} className={`flex-1 flex items-center justify-center font-black text-2xl md:text-3xl transition-all relative ${
                            isLast ? 'bg-white text-black z-20 scale-[1.08] shadow-[0_0_40px_rgba(255,255,255,0.4)]' : isRed ? 'bg-[#ef4444] hover:bg-rose-500' : 'bg-[#1a1c21] hover:bg-slate-700'
                          } ${nIdx === row.length - 1 ? 'rounded-r-[1.5rem]' : ''}`}>
                            {num}
                            {isSuggested && !isLast && <div className="absolute inset-1 border-[3px] border-amber-400/80 animate-pulse rounded-sm shadow-[inset_0_0_10px_rgba(251,191,36,0.5)]"></div>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-center items-center gap-6">
               <button onClick={undoLast} className="flex-1 max-w-[200px] flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-slate-800/50 hover:bg-slate-700 border border-white/10 text-slate-300 font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-xl group">
                 <Undo2 className="w-5 h-5 group-hover:-rotate-45 transition-transform" /> Undo
               </button>
               <button onClick={handleFullReset} className="flex-1 max-w-[200px] flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-500 font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-xl group">
                 <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" /> Hard Reset
               </button>
            </div>

            {/* Expert Advice Status */}
            <div className={`mt-10 p-6 rounded-[3rem] border transition-all duration-500 flex items-center justify-between shadow-2xl overflow-hidden relative ${result && result.stability < 35 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-black/60 border-white/5'}`}>
              <div className="flex items-center gap-5 z-10">
                <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center border ${result && result.stability < 35 ? 'bg-rose-500/20 border-rose-500/30' : 'bg-amber-500/10 border-amber-500/20'}`}>
                  {result && result.stability < 35 ? <ShieldAlert className="w-7 h-7 text-rose-500" /> : <BrainCircuit className="w-7 h-7 text-amber-500" />}
                </div>
                <div>
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 italic">Expert Pro Advice</span>
                   <p className={`text-base font-black italic tracking-tight ${result && result.stability < 35 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                     {result ? result.expertAdvice : 'Monitoring table frequency for strategic entry...'}
                   </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right: Expert Signal Dashboard */}
        <aside className="xl:col-span-3 space-y-6 flex flex-col h-full">
          <section className="glass-card p-8 rounded-[3rem] border-2 border-amber-500/10 flex-grow flex flex-col relative overflow-hidden h-full shadow-2xl">
            
            {/* Confidence & Provenance */}
            {result && (
              <div className="mb-8 p-6 rounded-[2.5rem] bg-black/60 border border-white/10 relative overflow-hidden text-center">
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 block mb-2">Confidence Level</span>
                 <div className="flex flex-col items-center">
                   <div className="text-5xl font-black italic gold-text tracking-tighter mb-1">{result.confidence}%</div>
                   <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
                      <div 
                        className={`h-full transition-all duration-1000 ${result.confidence > 80 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : result.confidence > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${result.confidence}%` }}
                      ></div>
                   </div>
                   
                   {/* Trigger Path - Visual Proof */}
                   <div className="mt-6 flex flex-col items-center w-full">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Verified Pattern Path</span>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {result.triggerSequence.map((n, i) => (
                          <div key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black text-emerald-400 italic">
                            {n}
                          </div>
                        ))}
                      </div>
                   </div>
                 </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                <Coins className="w-4 h-4" /> Chip Selection
              </h2>
              <div className="grid grid-cols-5 gap-1.5">
                {STAKE_OPTIONS.map(val => (
                  <button key={val} onClick={() => setBaseStake(val)} className={`py-3 rounded-[1.2rem] text-[10px] font-black border transition-all ${
                    baseStake === val ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg scale-105' : 'bg-black/40 border-white/5 text-slate-500 hover:text-white'
                  }`}>{val}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pb-6">
              <div className="flex gap-2 p-2 bg-black/60 rounded-[2rem] border border-white/5 shadow-inner">
                <button onClick={() => setSelectedBetType('6-LINE')} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${selectedBetType === '6-LINE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-lg' : 'text-slate-600'}`}>6-Line</button>
                <button onClick={() => setSelectedBetType('CORNER')} className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase transition-all ${selectedBetType === 'CORNER' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20 shadow-lg' : 'text-slate-600'}`}>Corner</button>
              </div>

              {result ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-5">
                  <div className={`p-8 rounded-[3rem] border-2 transition-all bg-amber-500/5 border-amber-500/30 relative overflow-hidden group shadow-[0_0_50px_rgba(245,158,11,0.1)]`}>
                    <div className="absolute -right-4 -top-4 opacity-[0.05] group-hover:rotate-12 transition-transform duration-1000">
                       <Zap className="w-32 h-32 text-white" />
                    </div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <Flame className="w-6 h-6 text-amber-500 animate-bounce" />
                        <span className="text-[11px] font-black uppercase tracking-[0.5em] text-amber-500 gold-glow italic">Target Signal</span>
                      </div>
                    </div>
                    <div className="mb-4 text-center">
                      <div className="mb-4 p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex flex-col items-center">
                        <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-[0.2em] mb-1">Signal Strategy</span>
                        <span className="text-xl font-black text-white italic tracking-tighter uppercase">{result.betType} #{result.suggestedIds[0]}</span>
                      </div>

                      {result.suggestedIds.map((id: number) => {
                        const bet = (result.betType === 'CORNER' ? CORNERS : SIX_LINES).find(b => b.id === id);
                        return <div key={id} className="text-4xl font-black text-white uppercase italic tracking-tighter leading-tight gold-text mb-1">{bet?.name}</div>;
                      })}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block flex items-center gap-3">Prediction Matrix <div className="h-px flex-1 bg-white/5"></div></span>
                    <div className="grid grid-cols-6 gap-2">
                      {result.suggestedNumbers.map((num: number) => (
                        <div key={num} className={`aspect-square flex items-center justify-center rounded-xl text-[12px] font-black border-2 transition-all duration-500 ${result.foundNumbers.includes(num) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-black/40 border-white/5 text-slate-700'}`}>
                          {num}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 grayscale">
                  <Activity className="w-16 h-16 text-amber-500 animate-pulse mb-8" />
                  <span className="text-[11px] font-black uppercase tracking-[0.6em] italic text-center leading-relaxed">System Syncing...<br/>Deep Scanning Streams</span>
                </div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
