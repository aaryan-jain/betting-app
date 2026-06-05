import React from 'react';
import { X, Shield } from 'lucide-react';
import { User, Match, TournamentBet } from '../types';

interface ModalsProps {
  // Join modal props
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  newUsername: string;
  setNewUsername: (val: string) => void;
  startingCoins: number;
  setStartingCoins: (val: number) => void;
  handleRegister: (e: React.FormEvent) => Promise<void>;

  // Overwrite weights props
  overwritingOddsMatchId: string | null;
  setOverwritingOddsMatchId: (id: string | null) => void;
  customOddsHome: number;
  setCustomOddsHome: (val: number) => void;
  customOddsDraw: number;
  setCustomOddsDraw: (val: number) => void;
  customOddsAway: number;
  setCustomOddsAway: (val: number) => void;
  handleOverwriteOdds: (e: React.FormEvent) => Promise<void>;
  overwritingMatch?: Match;

  // Adjust coins props
  adjustingUserId: string | null;
  setAdjustingUserId: (id: string | null) => void;
  adjustCoinsAmount: number;
  setAdjustCoinsAmount: (val: number) => void;
  handleAdjustCoinsSubmit: (e: React.FormEvent) => Promise<void>;
  adjustingUser?: User;

  // Resolve match props
  resolvingMatchId: string | null;
  setResolvingMatchId: (id: string | null) => void;
  scoreAInput: number;
  setScoreAInput: (val: number) => void;
  scoreBInput: number;
  setScoreBInput: (val: number) => void;
  handleResolveMatchSubmit: (e: React.FormEvent) => Promise<void>;
  resolvingMatch?: Match;

  // Resolve tournament bet props
  resolvingTBetId: string | null;
  setResolvingTBetId: (id: string | null) => void;
  tBetWinnerOptionId: string;
  setTBetWinnerOptionId: (val: string) => void;
  handleResolveTournamentBetSubmit: (e: React.FormEvent) => Promise<void>;
  resolvingTBet?: TournamentBet;
}

export default function Modals({
  isRegistering,
  setIsRegistering,
  newUsername,
  setNewUsername,
  startingCoins,
  setStartingCoins,
  handleRegister,

  overwritingOddsMatchId,
  setOverwritingOddsMatchId,
  customOddsHome,
  setCustomOddsHome,
  customOddsDraw,
  setCustomOddsDraw,
  customOddsAway,
  setCustomOddsAway,
  handleOverwriteOdds,
  overwritingMatch,

  adjustingUserId,
  setAdjustingUserId,
  adjustCoinsAmount,
  setAdjustCoinsAmount,
  handleAdjustCoinsSubmit,
  adjustingUser,

  resolvingMatchId,
  setResolvingMatchId,
  scoreAInput,
  setScoreAInput,
  scoreBInput,
  setScoreBInput,
  handleResolveMatchSubmit,
  resolvingMatch,

  resolvingTBetId,
  setResolvingTBetId,
  tBetWinnerOptionId,
  setTBetWinnerOptionId,
  handleResolveTournamentBetSubmit,
  resolvingTBet,
}: ModalsProps) {

  return (
    <>
      {/* 1. INITIALIZATION/MEMBERSHIP JOIN CREATION MODAL */}
      {isRegistering && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold font-mono text-slate-800 uppercase tracking-wider">Join Betting Club</h3>
              <button
                onClick={() => setIsRegistering(false)}
                className="text-slate-400 hover:text-slate-600 transition duration-150 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Enter your unique handle:</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 px-3.5 py-3 text-xs focus:outline-none focus:border-sky-500 font-sans tracking-tight"
                  placeholder="e.g. Mike (Guru)"
                  maxLength={25}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Starting Coin Allowance (🪙):</label>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  value={startingCoins}
                  onChange={(e) => setStartingCoins(parseInt(e.target.value) || 500)}
                  className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 px-3.5 py-3 text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 font-mono mt-1.5 leading-normal">Starting purse balance to explore sandbox bets</p>
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-3 text-xs font-bold transition font-mono uppercase tracking-wider cursor-pointer shadow-md shadow-sky-500/5"
              >
                📥 Register & Start Betting
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL MODES FOR ADMIN: OVERWRITE ODDS */}
      {overwritingOddsMatchId && overwritingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase font-mono tracking-wider">✏️ Override Implied Weights</h3>
              <button onClick={() => setOverwritingOddsMatchId(null)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-mono leading-relaxed">
              Match: <strong className="text-sky-600">{overwritingMatch.teamAName} vs {overwritingMatch.teamBName}</strong>
            </p>

            <form onSubmit={handleOverwriteOdds} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Home Win Multiplier:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={customOddsHome}
                  onChange={(e) => setCustomOddsHome(parseFloat(e.target.value) || 1.1)}
                  className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Draw Multiplier:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={customOddsDraw}
                  onChange={(e) => setCustomOddsDraw(parseFloat(e.target.value) || 1.1)}
                  className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Away Win Multiplier:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={customOddsAway}
                  onChange={(e) => setCustomOddsAway(parseFloat(e.target.value) || 1.1)}
                  className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-3 text-xs font-bold transition uppercase font-mono tracking-wider cursor-pointer"
              >
                Confirm Custom Weights
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL MODES FOR ADMIN: ADJUST COINS FOR FRIEND */}
      {adjustingUserId && adjustingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase font-mono tracking-wider">⚙️ Adjust Friend Wallet</h3>
              <button onClick={() => setAdjustingUserId(null)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-mono">
              Adjust balance of <strong className="text-sky-600 font-bold">{adjustingUser.username}</strong>.
            </p>

            <form onSubmit={handleAdjustCoinsSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Set coin balance amount:</label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={adjustCoinsAmount}
                  onChange={(e) => setAdjustCoinsAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-3 text-xs font-bold transition uppercase font-mono tracking-wider cursor-pointer"
              >
                Apply Coins Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL MODES FOR ADMIN: RESOLVE MATCH AND TRIGGER SCORING PAYOUT DISTRIBUTIONS */}
      {resolvingMatchId && resolvingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase font-mono tracking-wider">⚽ Enter Match Score</h3>
              <button onClick={() => setResolvingMatchId(null)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-mono leading-normal">
              Finish score inputs for: <br />
              <strong className="text-sky-600 font-bold">
                {resolvingMatch.teamAName} vs {resolvingMatch.teamBName}
              </strong>
            </p>

            <form onSubmit={handleResolveMatchSubmit} className="flex flex-col gap-5">
              <div className="flex items-center justify-center gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 text-center uppercase font-mono mb-1.5">
                    {resolvingMatch.teamAName.substring(0,3)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreAInput}
                    onChange={(e) => setScoreAInput(parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-50/50 text-slate-800 text-center rounded-xl border border-slate-200 py-2 text-lg font-mono font-bold text-sky-600 focus:outline-none"
                  />
                </div>
                <span className="text-slate-400 font-mono text-xl self-end mb-2">-</span>
                <div>
                  <label className="block text-[10px] text-slate-500 text-center uppercase font-mono mb-1.5">
                    {resolvingMatch.teamBName.substring(0,3)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreBInput}
                    onChange={(e) => setScoreBInput(parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-50/50 text-slate-800 text-center rounded-xl border border-slate-200 py-2 text-lg font-mono font-bold text-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-[10px] text-sky-700 leading-relaxed font-mono uppercase tracking-wider">
                ⚠️ Resolves outcome & score pools. Routes <strong className="text-indigo-600 font-bold">10% Host cut</strong> to administrator purse.
              </div>

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 text-xs font-bold transition uppercase font-mono tracking-wider cursor-pointer"
              >
                Distribute & Finalize Game
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL MODES FOR ADMIN: RESOLVE TOURNAMENT SPECIFIC BETS */}
      {resolvingTBetId && resolvingTBet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase font-mono tracking-wider">🏅 Resolve Tournament Bet</h3>
              <button onClick={() => setResolvingTBetId(null)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 font-mono leading-relaxed">
              Question: <span className="text-sky-600 font-bold">{resolvingTBet.question}</span>
            </p>

            <form onSubmit={handleResolveTournamentBetSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1.5">Select Winning Option:</label>
                <select
                  value={tBetWinnerOptionId}
                  onChange={(e) => setTBetWinnerOptionId(e.target.value)}
                  className="w-full bg-slate-50/50 text-slate-700 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-mono cursor-pointer focus:outline-none focus:border-sky-500"
                >
                  {resolvingTBet.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl text-[10px] text-sky-700 font-mono uppercase tracking-wider leading-relaxed">
                ✔️ Resolves bets proportionally. Payouts processed. Admin commission routed.
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl py-3 text-xs font-bold transition uppercase font-mono tracking-wider cursor-pointer"
              >
                Submit Resolution
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
