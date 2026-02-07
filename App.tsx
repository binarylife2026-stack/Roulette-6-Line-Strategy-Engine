
import React, { useState, useEffect, useRef } from 'react';
import { parseNumberInput, analyzeStrategy } from './services/StrategyEngine.ts';
import { StrategyResult, SIX_LINES, CORNERS } from './types.ts';

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 33, 34, 36];
const BASE_STAKE = 5;

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
    betType: '6-LINE' | 'CORNER'
  } | null>(null);

  useEffect(() => {
    const trimmedHistory = historyData.trim();
    if (trimmedHistory !== '' && lastSpins.length >= 1) {
      const parsedHistory = parseNumberInput(trimmedHistory);
      const analysis = analyzeStrategy(parsedHistory, lastSpins, maxLines, selectedBetType);
      
      if (analysis) {
        setResult(analysis);
        setHasSearched(true);
        activeBetRef.current = {
          numbers: analysis.suggestedNumbers,
          unit: currentUnit,
          lineCount: analysis.suggestedIds.length,
          betType: analysis.betType
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
  }, [historyData, lastSpins, maxLines, currentUnit, selectedBetType]);

  const addNumber = (num: number) => {
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});

    if (activeBetRef.current) {
      const { numbers, unit, lineCount, betType } = activeBetRef.current;
      const stakePerLine = unit * BASE_STAKE;
      const totalStake = stakePerLine * lineCount;
      
      // 1:5 for 6-line, 1:8 for Corner (8 to 1 payout)
      const multiplier = betType === '6-LINE' ? 5 : 8;

      if (numbers.includes(num)) {
        const profitFromWinningLine = stakePerLine * multiplier;
        const lossFromOtherLines = stakePerLine * (lineCount - 1);
        const netProfit = profitFromWinningLine - lossFromOtherLines;
        
        setTotalPL(prev => prev + netProfit);
        setIsHit(true);
        setConsecutiveLosses(0);
        setCurrentUnit(prev => Math.max(1, prev - 1));
        
        const math = lineCount === 1 
          ? `(${stakePerLine} × ${multiplier}) = +${netProfit}` 
          : `(${stakePerLine} × ${multiplier}) - ${lossFromOtherLines} = +${netProfit}`;

        const newTx: Transaction = { type: 'WIN', betType, amount: netProfit, unit, time: timeStr, math };
        setTransactions(prev => [newTx, ...prev].slice(0, 5));
        setLastReport({ msg: `WIN: +${netProfit} TK`, color: 'text-emerald-400' });
        
        setTimeout(() => setIsHit(false), 2500);
      } else {
        setTotalPL(prev => prev - totalStake);
        setIsHit(false);
        const newLossCount = consecutiveLosses + 1;
        setConsecutiveLosses(newLossCount);
        
        const math = `-${totalStake} TK`;
        const newTx: Transaction = { type: 'LOSS', betType, amount: -totalStake, unit, time: timeStr, math };
        setTransactions(prev => [newTx, ...prev].slice(0, 5));
        
        if (newLossCount >= 3) {
          setCurrentUnit(prev => prev + 1);
          setConsecutiveLosses(0);
          setLastReport({ msg: `STREAK LOSS: UNIT UP (${currentUnit + 1}x)`, color: 'text-red-500' });
        } else {
          setLastReport({ msg: `LOSS: -${totalStake} TK`, color: 'text-red-400' });
        }
      }
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
    <div className="casino-gradient p-3 md:p-6 lg:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-6 text-center">
        <h1 className="text-3xl md:text-5xl font-black gold-text tracking-tighter uppercase italic drop-shadow-lg">
          Roulette AI Engine
        </h1>
        <div className="flex justify-center gap-4 mt-2">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Corner: 1:8 Ratio</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">6-Line: 1:5 Ratio</p>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <div className="lg:col-span-3 flex flex-col order-2 lg:order-1 gap-6">
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-3xl shadow-2xl flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-widest">History Log</h2>
              <button onClick={clearHistory} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase px-3 py-1 bg-red-500/10 rounded-full transition-colors">Clear</button>
            </div>
            <textarea
              className="flex-1 w-full bg-[#020617] border border-slate-800 rounded-2xl p-4 text-xs font-mono text-emerald-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none leading-relaxed"
              placeholder="Database autocompletes from pad..."
              value={historyData}
              onChange={(e) => setHistoryData(e.target.value)}
            />
          </div>

          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-3xl shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Bankroll Status</h2>
              <button onClick={resetBankroll} className="text-[10px] text-slate-500 font-bold uppercase hover:text-white underline">Reset P/L</button>
            </div>
            
            <div className={`text-4xl font-black mb-1 tracking-tight ${totalPL >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`}>
              {totalPL >= 0 ? '+' : ''}{totalPL}<span className="text-xs ml-1 text-slate-500">TK</span>
            </div>

            {lastReport && (
              <div className={`text-[10px] font-black uppercase mb-4 py-1 px-3 rounded bg-white/5 inline-block ${lastReport.color}`}>
                Last: {lastReport.msg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Betting Unit</p>
                <p className="text-xl font-black text-white">{currentUnit}x</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Loss Tracker</p>
                <div className="flex gap-1.5 mt-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300 ${consecutiveLosses >= i ? 'bg-red-500' : 'bg-slate-800'}`}></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
               <p className="text-[9px] text-slate-600 font-black uppercase mb-1">Transaction Math</p>
               {transactions.map((tx, i) => (
                 <div key={i} className="flex flex-col bg-black/30 p-2 rounded-lg border border-slate-800/50">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className={`font-black ${tx.type === 'WIN' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {tx.type} ({tx.betType === 'CORNER' ? 'CRN' : '6LN'})
                      </span>
                      <span className={`font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount} TK</span>
                    </div>
                    <div className="text-[9px] text-slate-600 font-mono mt-0.5 flex justify-between">
                       <span>{tx.math}</span>
                       <span>{tx.time}</span>
                    </div>
                 </div>
               ))}
               {transactions.length === 0 && <p className="text-[10px] text-slate-700 italic text-center py-4">Awaiting session activity...</p>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="bg-[#0f172a] border border-slate-800 p-5 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            {isHit && (
              <div className="absolute inset-0 bg-emerald-500/20 pointer-events-none border-8 border-emerald-500/40 rounded-3xl z-30 animate-pulse flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-emerald-400 text-7xl md:text-9xl font-black rotate-[-12deg] drop-shadow-[0_0_40px_rgba(16,185,129,1)] scale-110">HIT!</span>
              </div>
            )}
            
            <h2 className="text-[11px] font-black text-amber-500 uppercase mb-6 text-center tracking-[0.4em]">
              Numeric Entry Pad
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
              <button onClick={undoLast} className="py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black rounded-2xl uppercase border border-slate-700 transition-all">Undo Last</button>
              <button onClick={clearSession} className="py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black rounded-2xl uppercase border border-slate-700 transition-all">Reset Sequence</button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col h-full order-3 gap-6">
          <div className="bg-[#0f172a] border-2 border-amber-500/30 p-6 md:p-8 rounded-3xl shadow-2xl flex-1 flex flex-col relative overflow-hidden min-h-[500px]">
            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 mb-8">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em]">AI Engine v3.0</h2>
                <div className="flex bg-slate-900/80 p-1 rounded-full border border-slate-800">
                  <button onClick={() => setMaxLines(1)} className={`px-2 py-1 rounded-full text-[8px] font-black uppercase transition-all ${maxLines === 1 ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}>1 Bet</button>
                  <button onClick={() => setMaxLines(2)} className={`px-2 py-1 rounded-full text-[8px] font-black uppercase transition-all ${maxLines === 2 ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}>2 Bets</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setSelectedBetType('6-LINE')}
                  className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${selectedBetType === '6-LINE' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500'}`}
                >
                  6-Line (1:5)
                </button>
                <button 
                  onClick={() => setSelectedBetType('CORNER')}
                  className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${selectedBetType === 'CORNER' ? 'bg-amber-600/20 border-amber-500 text-amber-400' : 'border-slate-800 text-slate-500'}`}
                >
                  Corner (1:8)
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {!hasSearched ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                  <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-600 animate-spin flex items-center justify-center mb-6">
                    <div className="w-8 h-8 rounded-full bg-slate-700"></div>
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Awaiting Spin Pattern...</p>
                </div>
              ) : !result ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="text-red-500 text-lg font-black uppercase tracking-widest bg-red-500/10 p-6 rounded-3xl border border-red-500/20 mb-4 italic">NO DATA MATCH</div>
                  <p className="text-slate-500 text-[10px] font-bold leading-relaxed px-4">Pattern depth too shallow for {selectedBetType}. Try switching modes or adding more data.</p>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                  
                  <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-10">
                        <span className="text-4xl font-black">{selectedBetType === 'CORNER' ? 'CRN' : '6LN'}</span>
                     </div>
                     <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-widest">Stake Advisory</p>
                        <p className="text-[10px] text-emerald-500 font-black uppercase">Lv. {result.searchLevel}</p>
                     </div>
                     <div className="flex items-baseline gap-2">
                        <span className="text-xs text-slate-500 uppercase font-black">Total:</span>
                        <p className="text-3xl font-black text-white italic">{(currentUnit * BASE_STAKE * result.suggestedIds.length)} <span className="text-[10px] not-italic text-amber-500 uppercase tracking-widest font-bold ml-1">TK</span></p>
                     </div>
                     <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between text-[10px]">
                        <div className="flex flex-col">
                           <span className="text-slate-600 font-black uppercase">Net (Win)</span>
                           <span className="text-emerald-400 font-black">+{ (currentUnit * BASE_STAKE * (result.betType === 'CORNER' ? 8 : 5)) - (currentUnit * BASE_STAKE * (result.suggestedIds.length - 1)) } TK</span>
                        </div>
                        <div className="flex flex-col text-right">
                           <span className="text-slate-600 font-black uppercase">Net (Loss)</span>
                           <span className="text-red-500 font-black">-{ currentUnit * BASE_STAKE * result.suggestedIds.length } TK</span>
                        </div>
                     </div>
                  </div>

                  <div className={`p-6 border-2 rounded-3xl text-center shadow-2xl transition-all duration-700 ${isHit ? 'bg-emerald-600 border-emerald-400 scale-105 shadow-emerald-500/40' : 'bg-slate-950 border-amber-500/50'}`}>
                    <p className={`text-[11px] font-black uppercase mb-3 tracking-[0.4em] ${isHit ? 'text-white' : 'text-amber-500'}`}>
                      {isHit ? 'TARGET HIT!' : 'SUGGESTED BET'}
                    </p>
                    <div className="space-y-1">
                      {result.suggestedIds.map(id => {
                        const betDef = (result.betType === 'CORNER' ? CORNERS : SIX_LINES).find(b => b.id === id);
                        return (
                          <p key={id} className="text-2xl font-black text-white leading-tight uppercase italic">{betDef?.name}</p>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-4">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Winning Targets</p>
                    </div>
                    <div className="grid grid-cols-6 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                      {result.suggestedNumbers.map(num => {
                        const isFoundInHistory = result.foundNumbers.includes(num);
                        const isCurrentLast = lastSpins[lastSpins.length - 1] === num;
                        
                        return (
                          <div 
                            key={num} 
                            className={`aspect-square flex items-center justify-center rounded-xl text-xs md:text-sm font-black border transition-all duration-500 ${
                              isCurrentLast 
                                ? 'bg-emerald-500 border-emerald-300 text-white scale-125 shadow-[0_0_25px_rgba(16,185,129,1)] z-40' 
                                : isFoundInHistory
                                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' 
                                  : RED_NUMBERS.includes(num) 
                                    ? 'bg-red-950/40 border-red-900/60 text-red-500/80' 
                                    : 'bg-slate-950 border-slate-800 text-amber-500/20'
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
              <div className="mt-auto pt-6 border-t border-slate-800/80">
                <p className="text-[10px] text-slate-600 uppercase font-black mb-5 tracking-[0.4em] text-center">Last Sequence</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {lastSpins.map((n, i) => (
                    <div 
                      key={i} 
                      className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-black shadow-xl border transition-all ${
                        RED_NUMBERS.includes(n) 
                          ? 'bg-red-700/80 border-red-500 text-white' 
                          : n === 0 
                            ? 'bg-emerald-600/80 border-emerald-400 text-white' 
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
        Proprietary Engine - Professional Series - v3.0.0
      </footer>
    </div>
  );
}
