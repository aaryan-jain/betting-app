import React, { useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { User, Match, Wager } from '../types';

interface MatchCardProps {
  key?: React.Key | string | number;
  match: Match;
  currentUser: User | null;
  wagers: Wager[];
  systemTime: string;
  handleVote: (matchId: string, prediction: 'home' | 'draw' | 'away') => Promise<void>;
  handlePlaceOutcomeWager: (matchId: string, amount: number, outcome: 'home' | 'draw' | 'away', odds: number) => Promise<void>;
  handlePlaceScoreWager: (matchId: string, amount: number, scoreA: number, scoreB: number) => Promise<void>;
  setResolvingMatchId: (id: string | null) => void;
  setScoreAInput: (score: number) => void;
  setScoreBInput: (score: number) => void;
  setOverwritingOddsMatchId: (id: string | null) => void;
  setCustomOddsHome: (val: number) => void;
  setCustomOddsDraw: (val: number) => void;
  setCustomOddsAway: (val: number) => void;
}

export default function MatchCard({
  match,
  currentUser,
  wagers,
  systemTime,
  handleVote,
  handlePlaceOutcomeWager,
  handlePlaceScoreWager,
  setResolvingMatchId,
  setScoreAInput,
  setScoreBInput,
  setOverwritingOddsMatchId,
  setCustomOddsHome,
  setCustomOddsDraw,
  setCustomOddsAway,
}: MatchCardProps) {
  // Local active wagering sub-tab: 'outcome' | 'score'
  const [activeSubTab, setActiveSubTab] = useState<'outcome' | 'score'>('outcome');

  // Local outcome wager state
  const [outcomeVal, setOutcomeVal] = useState<'home' | 'draw' | 'away'>('home');
  const [outcomeAmount, setOutcomeAmount] = useState<number>(100);

  // Local score wager state
  const [scoreAVal, setScoreAVal] = useState<number>(2);
  const [scoreBVal, setScoreBVal] = useState<number>(1);
  const [scoreAmount, setScoreAmount] = useState<number>(50);

  // Time metrics
  const sys = new Date(systemTime).getTime();
  const kick = new Date(match.kickoffTime).getTime();
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

  // Stats calculation
  const list = wagers.filter((w) => w.targetId === match.id && w.targetType === 'match_outcome');
  const homeStakes = list.filter((w) => w.prediction === 'home').reduce((s, w) => s + w.amount, 0);
  const drawStakes = list.filter((w) => w.prediction === 'draw').reduce((s, w) => s + w.amount, 0);
  const awayStakes = list.filter((w) => w.prediction === 'away').reduce((s, w) => s + w.amount, 0);
  const totalStakes = homeStakes + drawStakes + awayStakes;

  const scoreList = wagers.filter((w) => w.targetId === match.id && w.targetType === 'match_score');
  const hasOpposingOutcome = new Set(list.map((w) => w.prediction)).size > 1;
  const hasOpposingScore = new Set(scoreList.map((w) => w.prediction)).size > 1;
  const totalBetsCount = list.length + scoreList.length;

  // Community percentages
  const totVotes = match.votes.home + match.votes.draw + match.votes.away;
  const voteHomePct = totVotes ? Math.round((match.votes.home / totVotes) * 100) : 34;
  const voteDrawPct = totVotes ? Math.round((match.votes.draw / totVotes) * 100) : 32;
  const voteAwayPct = totVotes ? Math.round((match.votes.away / totVotes) * 100) : 34;

  const onPlaceOutcomeBet = async () => {
    if (outcomeAmount <= 0) return;
    const odds = outcomeVal === 'home' ? match.odds.home : outcomeVal === 'draw' ? match.odds.draw : match.odds.away;
    await handlePlaceOutcomeWager(match.id, outcomeAmount, outcomeVal, odds);
    setOutcomeAmount(100);
  };

  const onPlaceScoreBet = async () => {
    if (scoreAmount <= 0 || scoreAVal < 0 || scoreBVal < 0) return;
    await handlePlaceScoreWager(match.id, scoreAmount, scoreAVal, scoreBVal);
    setScoreAmount(50);
  };

  return (
    <div className={`glass-panel p-6 relative overflow-hidden transition duration-300 ${isLocked ? 'border-slate-200/60 bg-white/75 opacity-95' : 'hover:border-slate-300 hover:shadow-sm'}`}>
      
      {/* Header Tag / Lockdown status */}
      <div className="flex justify-between items-center mb-4 text-xs font-mono">
        <span className="text-slate-400">
          Match #{match.id.replace('match-', '')} • {formatTime(match.kickoffTime)}
        </span>

        {isLocked ? (
          <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-[10px] font-bold uppercase rounded-full">
            🔒 Locked
          </span>
        ) : (
          <span className="px-3 py-1 bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold uppercase rounded-full">
            ⏰ Betting Open
          </span>
        )}
      </div>

      {/* Match Scoreboard display */}
      <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-5 border-b border-slate-100 pb-5">
        
        {/* Team A */}
        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-3.5 justify-end text-center md:text-right">
          <div className="order-2 md:order-1">
            <span className="block font-bold text-slate-800 font-display text-base tracking-tight">{match.teamAName}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">Rank: {match.teamARank} • Str: {((49 - match.teamARank) / 48).toFixed(2)}</span>
          </div>
          <div className="order-1 md:order-2 w-16 h-16 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
            {match.teamAEmoji}
          </div>
        </div>

        {/* Score or VS Center */}
        <div className="md:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200/60 min-h-[60px] shadow-inner">
          {match.status === 'completed' ? (
            <div className="text-center">
              <span className="text-xl font-bold font-mono text-sky-600">{match.scoreA} - {match.scoreB}</span>
              <span className="block text-[9px] text-slate-400 font-bold uppercase mt-1 font-mono tracking-wider">RESOLVED</span>
            </div>
          ) : match.status === 'live' ? (
            <div className="text-center">
              <span className="text-rose-500 font-bold font-mono uppercase text-xs tracking-widest animate-pulse">● LIVE</span>
            </div>
          ) : (
            <span className="text-slate-400 font-serif italic text-2xl">vs</span>
          )}
        </div>

        {/* Team B */}
        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-3.5 justify-start text-center md:text-left">
          <div className="w-16 h-16 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
            {match.teamBEmoji}
          </div>
          <div>
            <span className="block font-bold text-slate-800 font-display text-base tracking-tight">{match.teamBName}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5">Rank: {match.teamBRank} • Str: {((49 - match.teamBRank) / 48).toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* COMMUNITY VOTING & PREDICTOR COMPONENT */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 my-5">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-500 mb-2.5 font-mono">
          <span>Friend Prediction Vote</span>
          <span className="text-sky-600">
            {voteHomePct}% {match.teamAName.substring(0, 3).toUpperCase()} — {voteDrawPct}% Drw — {voteAwayPct}% {match.teamBName.substring(0, 3).toUpperCase()}
          </span>
        </div>
        
        {/* Voting progress bar */}
        <div className="h-2 w-full bg-slate-200/60 rounded-full flex overflow-hidden">
          <div
            style={{ width: `${voteHomePct}%` }}
            className="h-full bg-sky-500 transition-all duration-300"
            title={`Home Win: ${voteHomePct}%`}
          ></div>
          <div
            style={{ width: `${voteDrawPct}%` }}
            className="h-full bg-slate-400 transition-all duration-300"
            title={`Draw: ${voteDrawPct}%`}
          ></div>
          <div
            style={{ width: `${voteAwayPct}%` }}
            className="h-full bg-rose-400 transition-all duration-300"
            title={`Away Win: ${voteAwayPct}%`}
          ></div>
        </div>

        {/* CLICKABLE VOTE BUTTONS */}
        {!isLocked && (
          <div className="flex gap-2.5 mt-3">
            <button
              onClick={() => handleVote(match.id, 'home')}
              className="flex-1 bg-white hover:bg-slate-50 text-[10px] font-bold py-2 rounded-xl text-slate-500 hover:text-slate-800 transition border border-slate-200 font-mono uppercase cursor-pointer"
            >
              Vote {match.teamAName.substring(0,3).toUpperCase()}
            </button>
            <button
              onClick={() => handleVote(match.id, 'draw')}
              className="flex-1 bg-white hover:bg-slate-50 text-[10px] font-bold py-2 rounded-xl text-slate-500 hover:text-slate-800 transition border border-slate-200 font-mono uppercase cursor-pointer"
            >
              Vote Draw
            </button>
            <button
              onClick={() => handleVote(match.id, 'away')}
              className="flex-1 bg-white hover:bg-slate-50 text-[10px] font-bold py-2 rounded-xl text-slate-500 hover:text-slate-800 transition border border-slate-200 font-mono uppercase cursor-pointer"
            >
              Vote {match.teamBName.substring(0,3).toUpperCase()}
            </button>
          </div>
        )}
      </div>

      {/* DYNAMIC CARD SCROLL / MODE TAB */}
      <div className="bg-slate-50/20 rounded-2xl border border-slate-200/60 p-4">
        
        {/* Segmented Control Header */}
        <div className="flex border-b border-slate-200/80 mb-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('outcome')}
            className={`flex-1 pb-2.5 text-xs font-bold font-mono tracking-wider transition cursor-pointer ${
              activeSubTab === 'outcome'
                ? 'border-b-2 border-sky-500 text-sky-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            🎲 Winner Bet (W/D/L)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('score')}
            className={`flex-1 pb-2.5 text-xs font-bold font-mono tracking-wider transition cursor-pointer ${
              activeSubTab === 'score'
                ? 'border-b-2 border-sky-500 text-sky-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            🎯 Exact Score Guess
          </button>
        </div>

        {/* TAB A: MATCH OUTCOME POOL FORM */}
        {activeSubTab === 'outcome' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Probability Donut Area */}
            {(() => {
              const homeProb = 1 / match.odds.home;
              const drawProb = 1 / match.odds.draw;
              const awayProb = 1 / match.odds.away;
              const totalProb = homeProb + drawProb + awayProb;

              const pctHome = Math.round((homeProb / totalProb) * 100);
              const pctDraw = Math.round((drawProb / totalProb) * 100);
              const pctAway = 100 - pctHome - pctDraw;

              return (
                <div className="bg-white/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4.5 shadow-sm">
                  {/* Donut Chart visual */}
                  <div
                    className="relative w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm"
                    style={{
                      background: `conic-gradient(#0ea5e9 0% ${pctHome}%, #94a3b8 ${pctHome}% ${pctHome + pctDraw}%, #f43f5e ${pctHome + pctDraw}% 100%)`
                    }}
                  >
                    <div className="absolute w-10 h-10 rounded-full bg-white flex items-center justify-center text-[10px] text-slate-400 font-mono font-bold shadow-inner">
                      ⚽
                    </div>
                  </div>

                  {/* Legend weights */}
                  <div className="flex-1 grid grid-cols-3 gap-2 w-full">
                    <div className="text-left">
                      <span className="flex items-center gap-1.5 text-[9px] text-sky-600 font-bold uppercase font-mono truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                        {match.teamAName.substring(0, 3)}
                      </span>
                      <span className="block text-sm font-bold text-slate-800 font-mono mt-0.5">{pctHome}%</span>
                      <span className="block text-[8px] text-slate-400 font-mono font-semibold">({match.odds.home.toFixed(2)}x)</span>
                    </div>
                    <div className="text-center">
                      <span className="flex items-center justify-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase font-mono truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"></span>
                        Draw
                      </span>
                      <span className="block text-sm font-bold text-slate-800 font-mono mt-0.5">{pctDraw}%</span>
                      <span className="block text-[8px] text-slate-400 font-mono font-semibold">({match.odds.draw.toFixed(2)}x)</span>
                    </div>
                    <div className="text-right">
                      <span className="flex items-center justify-end gap-1.5 text-[9px] text-rose-600 font-bold uppercase font-mono truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                        {match.teamBName.substring(0, 3)}
                      </span>
                      <span className="block text-sm font-bold text-slate-800 font-mono mt-0.5">{pctAway}%</span>
                      <span className="block text-[8px] text-slate-400 font-mono font-semibold">({match.odds.away.toFixed(2)}x)</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Betting Input Fields */}
            {!isLocked ? (
              <div className="flex flex-col gap-3.5">
                <div className="flex gap-2 justify-between">
                  <label className="text-xs text-slate-500 self-center font-mono uppercase tracking-wider">Outcome:</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOutcomeVal('home')}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border transition-all duration-150 uppercase cursor-pointer ${
                        outcomeVal === 'home'
                          ? 'bg-sky-50 border-sky-400 text-sky-700 font-bold shadow-sm'
                          : 'bg-white text-slate-505 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {match.teamAName.substring(0, 3)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcomeVal('draw')}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border transition-all duration-150 uppercase cursor-pointer ${
                        outcomeVal === 'draw'
                          ? 'bg-sky-50 border-sky-400 text-sky-700 font-bold shadow-sm'
                          : 'bg-white text-slate-505 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={() => setOutcomeVal('away')}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border transition-all duration-150 uppercase cursor-pointer ${
                        outcomeVal === 'away'
                          ? 'bg-sky-50 border-sky-400 text-sky-700 font-bold shadow-sm'
                          : 'bg-white text-slate-505 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {match.teamBName.substring(0, 3)}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🪙</span>
                    <input
                      type="number"
                      value={outcomeAmount}
                      onChange={(e) => setOutcomeAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-white text-slate-700 font-mono text-xs rounded-xl border border-slate-250 pl-7 pr-3 py-2.5 focus:outline-none focus:border-sky-500"
                      placeholder="Amount"
                    />
                  </div>
                  <button
                    onClick={onPlaceOutcomeBet}
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs px-4.5 py-2.5 rounded-xl font-bold font-mono transition duration-150 flex-shrink-0 uppercase cursor-pointer shadow-md shadow-sky-500/5"
                  >
                    Place Bet
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100/60 p-3 rounded-2xl border border-slate-200/40 text-center text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                🤐 Bets Closed
              </div>
            )}

            {/* Pools stakes info */}
            <div className="flex items-center justify-between text-[10px] font-bold uppercase font-mono border-t border-slate-100 pt-2.5 mt-1">
              <span className="text-slate-400">Total stakes pool:</span>
              <div className="flex gap-2.5">
                <span className="text-slate-600">{totalStakes} 🪙</span>
                {hasOpposingOutcome ? (
                  <span className="text-emerald-600 font-bold" title="Opposing predictions found. Executed!">
                    Match OK
                  </span>
                ) : (
                  totalBetsCount > 0 && (
                    <span className="text-amber-600 font-bold" title="Need opponents predicting other outcomes for payout split.">
                      Need Competitor
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB B: EXACT SCORE FORM */}
        {activeSubTab === 'score' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {!isLocked ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">Guess Score:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={scoreAVal}
                      onChange={(e) => setScoreAVal(parseInt(e.target.value) || 0)}
                      className="w-12 bg-white text-slate-800 text-center font-mono font-bold text-xs rounded-xl border border-slate-250 py-1.5 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-slate-400 text-xs font-mono">-</span>
                    <input
                      type="number"
                      min="0"
                      value={scoreBVal}
                      onChange={(e) => setScoreBVal(parseInt(e.target.value) || 0)}
                      className="w-12 bg-white text-slate-800 text-center font-mono font-bold text-xs rounded-xl border border-slate-250 py-1.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🪙</span>
                    <input
                      type="number"
                      value={scoreAmount}
                      onChange={(e) => setScoreAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-white text-slate-700 font-mono text-xs rounded-xl border border-slate-250 pl-7 pr-3 py-2.5 focus:outline-none focus:border-sky-500"
                      placeholder="Amount"
                    />
                  </div>
                  <button
                    onClick={onPlaceScoreBet}
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs px-4.5 py-2.5 rounded-xl font-bold font-mono transition duration-150 flex-shrink-0 uppercase cursor-pointer shadow-md shadow-sky-500/5"
                  >
                    Place Bet
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100/60 p-3 rounded-2xl border border-slate-200/40 text-center text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                🤐 Bets Closed
              </div>
            )}

            {/* Score opponent indicators */}
            <div className="flex items-center justify-between text-[10px] font-bold uppercase font-mono border-t border-slate-100 pt-2.5 mt-1">
              <span className="text-slate-400">Score payout ratio:</span>
              <div className="flex gap-2">
                <span className="text-slate-600 font-bold bg-sky-50 text-sky-700 border border-sky-100 px-1.5 rounded font-mono text-[9px]">
                  6.0x Multiplier
                </span>
                <span className={`${hasOpposingScore ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {hasOpposingScore ? 'Matched' : 'Unmatched'}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ADMIN HOST CONTROLS */}
      {currentUser?.role === 'admin' && (
        <div className="mt-4.5 p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-2 items-center justify-between shadow-sm">
          <span className="text-[9px] text-sky-700 font-mono flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-sky-500" /> Host Controls
          </span>
          
          <div className="flex gap-2">
            {match.status !== 'completed' && (
              <button
                onClick={() => {
                  setResolvingMatchId(match.id);
                  setScoreAInput(match.scoreA || 0);
                  setScoreBInput(match.scoreB || 0);
                }}
                className="bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-250 text-emerald-700 text-[10px] px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 uppercase tracking-wider font-mono cursor-pointer"
              >
                ⚽ Resolve & Distribute
              </button>
            )}
            <button
              onClick={() => {
                setOverwritingOddsMatchId(match.id);
                setCustomOddsHome(match.odds.home);
                setCustomOddsDraw(match.odds.draw);
                setCustomOddsAway(match.odds.away);
              }}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-[10px] text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-xl font-bold font-mono transition uppercase cursor-pointer"
            >
              ✏️ Override Weights
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
