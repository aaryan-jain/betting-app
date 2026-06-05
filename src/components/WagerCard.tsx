import React from 'react';
import { User } from '../types';
import { Match, TournamentBet, Wager } from '../types';

interface WagerCardProps {
  key?: React.Key | string | number;
  wager: Wager;
  matches: Match[];
  tournamentBets: TournamentBet[];
  handleCancelWager: (wagerId: string) => Promise<void>;
}

export default function WagerCard({
  wager,
  matches,
  tournamentBets,
  handleCancelWager,
}: WagerCardProps) {
  let targetTitle = 'Custom Bet';
  let predictionReadable = wager.prediction;

  if (wager.targetType === 'match_outcome' || wager.targetType === 'match_score') {
    const m = matches.find((match) => match.id === wager.targetId);
    if (m) {
      targetTitle = `${m.teamAEmoji} ${m.teamAName} vs ${m.teamBName} ${m.teamBEmoji}`;
      if (wager.prediction === 'home') predictionReadable = `${m.teamAName} Win`;
      else if (wager.prediction === 'draw') predictionReadable = 'Draw';
      else if (wager.prediction === 'away') predictionReadable = `${m.teamBName} Win`;
    }
  } else {
    const tb = tournamentBets.find((t) => t.id === wager.targetId);
    if (tb) {
      targetTitle = `🏅 ${tb.question}`;
      const opt = tb.options.find((o) => o.id === wager.prediction);
      if (opt) predictionReadable = opt.label;
    }
  }

  return (
    <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-slate-300 transition-all duration-200">
      <div>
        <span className="block text-[9px] text-slate-500 font-bold font-mono uppercase tracking-wider mb-1">
          {wager.targetType === 'match_score' 
            ? 'Exact Score Option' 
            : wager.targetType === 'match_outcome' 
              ? 'W/D/L Outcome Option' 
              : 'Tournament Prop'}
        </span>
        <span className="font-bold text-slate-800 text-sm tracking-tight">{targetTitle}</span>
        
        <div className="flex flex-wrap items-center gap-3 mt-2 font-mono text-[11px]">
          <span className="text-slate-500">
            Pick: <strong className="text-sky-600 underline decoration-sky-300 underline-offset-2">{predictionReadable}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Payout Weight: <strong className="text-sky-600">{Number(wager.oddsAtWager).toFixed(2)}x</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">
            Stake: <strong className="text-sky-600">{wager.amount}🪙</strong>
          </span>
        </div>
      </div>

      <div className="text-left md:text-right flex flex-col md:items-end gap-1.5 flex-shrink-0">
        {/* Payout results badges or cancellation option */}
        {wager.status === 'pending' && (
          <div className="flex flex-col md:items-end gap-1">
            <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase rounded-full font-mono shadow-sm">
              ⏳ Unmatched Pool
            </span>
            <button
              onClick={() => handleCancelWager(wager.id)}
              className="text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-wider font-mono underline mt-1.5 cursor-pointer"
            >
              Cancel / Reclaim
            </button>
          </div>
        )}

        {wager.status === 'matched' && (
          <div className="flex flex-col md:items-end gap-1">
            <span className="px-3 py-1 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold uppercase rounded-full font-mono shadow-sm">
              ✅ Executed Bet
            </span>
            <button
              onClick={() => handleCancelWager(wager.id)}
              className="text-slate-400 hover:text-rose-500 text-[10px] font-bold uppercase tracking-wider font-mono underline mt-1.5 cursor-pointer"
            >
              Cancel / Refund
            </button>
          </div>
        )}

        {wager.status === 'cancelled' && (
          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase rounded-full font-mono shadow-sm">
            🚫 Refunded
          </span>
        )}

        {wager.status === 'resolved' && (
          <div className="text-left md:text-right">
            {wager.payoutCoins > 0 ? (
              <div>
                <span className="block text-emerald-600 text-sm font-mono font-bold">+ {wager.payoutCoins} 🪙</span>
                <span className="block text-emerald-700 text-[9px] font-mono uppercase font-bold tracking-wider mt-0.5">
                  + {wager.payoutPoints} Pts Gained
                </span>
              </div>
            ) : (
              <span className="block text-slate-400 text-xs font-mono font-bold uppercase">0 🪙 Lost</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
