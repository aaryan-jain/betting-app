import React, { useState } from 'react';
import { Award, Shield } from 'lucide-react';
import { User, TournamentBet } from '../types';

interface TournamentCardProps {
  key?: React.Key | string | number;
  tBet: TournamentBet;
  currentUser: User | null;
  systemTime: string;
  handlePlaceTournamentWager: (betId: string, amount: number, selectedOptionId: string) => Promise<void>;
  setResolvingTBetId: (id: string | null) => void;
  setTBetWinnerOptionId: (id: string) => void;
  wagersCount: number;
}

export default function TournamentCard({
  tBet,
  currentUser,
  systemTime,
  handlePlaceTournamentWager,
  setResolvingTBetId,
  setTBetWinnerOptionId,
  wagersCount,
}: TournamentCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [amount, setAmount] = useState<number>(100);

  const sys = new Date(systemTime).getTime();
  const kick = new Date(tBet.kickoffTime).getTime();
  const diff = kick - sys;
  const isLocked = diff <= 0;

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const onPlaceBet = async () => {
    if (!selectedOptionId || amount <= 0) return;
    await handlePlaceTournamentWager(tBet.id, amount, selectedOptionId);
    setAmount(100);
    setSelectedOptionId('');
  };

  return (
    <div className="glass-panel p-6 relative overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-sm">
      <div className="flex justify-between items-center mb-4 text-xs font-mono">
        <span className="text-slate-500">Deadline: {formatTime(tBet.kickoffTime)}</span>
        {isLocked ? (
          <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase rounded-full">
            🔒 Event Started
          </span>
        ) : (
          <span className="px-3 py-1 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold uppercase rounded-full">
            ⏰ Open
          </span>
        )}
      </div>

      <h3 className="text-base font-bold text-slate-800 font-display mb-4 tracking-tight">
        {tBet.question}
      </h3>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-5">
        {tBet.options.map((opt) => {
          const isWinner = tBet.winningOptionId === opt.id;
          return (
            <div
              key={opt.id}
              className={`p-3.5 rounded-xl border text-xs flex justify-between items-center transition duration-150 ${
                isWinner
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold shadow-sm'
                  : 'bg-slate-50/50 border-slate-200/80 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="font-mono bg-white px-2.5 py-1 border border-slate-200 rounded-full text-[11px] text-sky-600 font-bold shadow-sm">
                {opt.odds.toFixed(2)}x weight
              </span>
            </div>
          );
        })}
      </div>

      {/* Bet Form or Resolution */}
      {!isLocked && tBet.status !== 'completed' ? (
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3.5 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">
              Your Choice:
            </label>
            <select
              value={selectedOptionId}
              onChange={(e) => setSelectedOptionId(e.target.value)}
              className="w-full bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 transition duration-150 cursor-pointer"
            >
              <option value="">-- Choose Option --</option>
              {tBet.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.odds.toFixed(2)}x weight)
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-36">
            <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">
              Coin Stake:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🪙</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-white text-slate-700 font-mono text-xs rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 focus:outline-none focus:border-sky-500"
                placeholder="Amount"
              />
            </div>
          </div>

          <div className="w-full md:w-auto">
            <button
              onClick={onPlaceBet}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs px-5 py-3 rounded-xl font-bold font-mono uppercase transition duration-150 cursor-pointer shadow-md shadow-sky-500/5"
            >
              Place Bet
            </button>
          </div>
        </div>
      ) : tBet.status === 'completed' ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-700 font-mono text-center flex items-center justify-center gap-1.5 shadow-sm">
          🏆 Props Resolved! Correct Choice: <span className="font-bold underline">{tBet.options.find(o => o.id === tBet.winningOptionId)?.label}</span>
        </div>
      ) : (
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 text-center text-xs text-slate-400 font-mono uppercase tracking-wider">
          🤐 Bets Closed
        </div>
      )}

      {/* Host Actions */}
      {currentUser?.role === 'admin' && tBet.status !== 'completed' && (
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <span className="text-[10px] text-sky-700 font-mono flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-sky-500" /> Host Controls
          </span>
          <button
            onClick={() => {
              setResolvingTBetId(tBet.id);
              if (tBet.options.length > 0) {
                setTBetWinnerOptionId(tBet.options[0].id);
              }
            }}
            className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-700 text-[10px] px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1 uppercase tracking-wider font-mono cursor-pointer"
          >
            Resolve Prop Bet
          </button>
        </div>
      )}
    </div>
  );
}
