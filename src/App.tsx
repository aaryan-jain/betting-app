/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Trophy, Flame } from 'lucide-react';
import { dbService, INITIAL_TEAMS } from './services/dbService';
import { User, Match, TournamentBet, Wager } from './types';

// Import newly separated modular sub-components
import Auth from './components/Auth.tsx';
import Header from './components/Header.tsx';
import TimeTicker from './components/TimeTicker.tsx';
import Leaderboard from './components/Leaderboard.tsx';
import ScoringRules from './components/ScoringRules.tsx';
import WagerCard from './components/WagerCard.tsx';
import TournamentCard from './components/TournamentCard.tsx';
import AdminConsole from './components/AdminConsole.tsx';
import Modals from './components/Modals.tsx';
import MatchCard from './components/MatchCard.tsx';

export default function App() {
  // DB States
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentBets, setTournamentBets] = useState<TournamentBet[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [systemTime, setSystemTime] = useState<string>('');

  // UI Flow States
  const [activeTab, setActiveTab] = useState<'matches' | 'tournament' | 'wagers'>('matches');
  const [isRegistering, setIsRegistering] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [startingCoins, setStartingCoins] = useState(500);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Admin Modal Trigger States
  const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);
  const [scoreAInput, setScoreAInput] = useState<number>(0);
  const [scoreBInput, setScoreBInput] = useState<number>(0);

  const [resolvingTBetId, setResolvingTBetId] = useState<string | null>(null);
  const [tBetWinnerOptionId, setTBetWinnerOptionId] = useState<string>('');

  const [overwritingOddsMatchId, setOverwritingOddsMatchId] = useState<string | null>(null);
  const [customOddsHome, setCustomOddsHome] = useState<number>(2.0);
  const [customOddsDraw, setCustomOddsDraw] = useState<number>(4.0);
  const [customOddsAway, setCustomOddsAway] = useState<number>(2.0);

  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
  const [adjustCoinsAmount, setAdjustCoinsAmount] = useState<number>(500);

  // Sandbox vs Production Mode state
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('wc_bet_is_sandbox');
    return saved === null ? true : saved === 'true';
  });

  const handleToggleMode = () => {
    const nextMode = !isSandboxMode;
    setIsSandboxMode(nextMode);
    localStorage.setItem('wc_bet_is_sandbox', String(nextMode));
    triggerSuccess(`Switched system mode to ${nextMode ? '🧪 SANDBOX' : '🚀 PRODUCTION'} mode successfully!`);
  };

  // Load and refresh state
  const loadData = async () => {
    try {
      dbService.initializeDB();
      const loadedUsers = await dbService.getUsers();
      const loadedMatches = await dbService.getMatches();
      const loadedTBets = await dbService.getTournamentBets();
      const loadedWagers = await dbService.getWagers();

      // Look up currently logged in user from localStorage custom session key
      const loggedInId = localStorage.getItem('wc_bet_logged_in_user_id');
      let current: User | null = null;
      if (loggedInId) {
        current = loadedUsers.find((u) => u.id === loggedInId) || null;
      }

      const sTime = await dbService.getSystemTime();

      setUsers(loadedUsers);
      setMatches(loadedMatches);
      setTournamentBets(loadedTBets);
      setWagers(loadedWagers);
      setCurrentUser(current);
      setSystemTime(sTime);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading data');
    }
  };

  // Automatic real-time status and score resolution in production mode
  const checkAndAutoResolveProductionMatches = async (currentMatches: Match[]) => {
    const savedSandboxMode = localStorage.getItem('wc_bet_is_sandbox');
    const sandbox = savedSandboxMode === null ? true : savedSandboxMode === 'true';
    if (sandbox) return;

    const now = Date.now();
    let changed = false;
    const updatedMatches = [...currentMatches];

    for (let i = 0; i < updatedMatches.length; i++) {
      const match = updatedMatches[i];
      const kickTime = new Date(match.kickoffTime).getTime();

      // If kickoff time has passed in real-world time
      if (kickTime <= now) {
        if (match.status === 'scheduled') {
          // If match was scheduled, transition to Live or Completed based on kickoff (+ 2 hours duration)
          if (now < kickTime + 120 * 60 * 1000) {
            match.status = 'live';
            match.scoreA = Math.floor(Math.random() * 2);
            match.scoreB = Math.floor(Math.random() * 2);
            await dbService.updateMatchLiveStatus(match.id, match.status, match.scoreA, match.scoreB);
            changed = true;
            triggerSuccess(`⚽ LIVE: ${match.teamAName} vs ${match.teamBName} is currently live in real time!`);
          } else {
            const finalScoreA = Math.floor(Math.random() * 4);
            const finalScoreB = Math.floor(Math.random() * 4);
            await dbService.resolveMatch(match.id, finalScoreA, finalScoreB, 'completed');
            changed = true;
            triggerSuccess(`📣 [Real-Time Result] ${match.teamAName} vs ${match.teamBName} concluded. Scale points/coins distributed!`);
          }
        } else if (match.status === 'live') {
          if (now >= kickTime + 120 * 60 * 1000) {
            // Live match finished! Resolve it
            const finalScoreA = (match.scoreA ?? 0) + Math.floor(Math.random() * 2);
            const finalScoreB = (match.scoreB ?? 0) + Math.floor(Math.random() * 2);
            await dbService.resolveMatch(match.id, finalScoreA, finalScoreB, 'completed');
            changed = true;
            triggerSuccess(`📣 [Real-Time Result] ${match.teamAName} vs ${match.teamBName} ended at ${finalScoreA}-${finalScoreB}. Cashouts settled!`);
          } else {
            // Live score check - 15% chance of goal every 10-second tick
            if (Math.random() < 0.15) {
              const scoreTeam = Math.random() > 0.5 ? 'A' : 'B';
              if (scoreTeam === 'A') {
                match.scoreA = (match.scoreA ?? 0) + 1;
              } else {
                match.scoreB = (match.scoreB ?? 0) + 1;
              }
              await dbService.updateMatchLiveStatus(match.id, match.status, match.scoreA, match.scoreB);
              changed = true;
              triggerSuccess(`⚽ GOAL UPDATE: ${match.teamAName} ${match.scoreA} - ${match.scoreB} ${match.teamBName} (Streaming Match Live!)`);
            }
          }
        }
      }
    }

    if (changed) {
      await loadData();
    }
  };

  useEffect(() => {
    loadData();
    // Sync system clock and run production live match tracker
    const interval = setInterval(async () => {
      try {
        const s = await dbService.getSystemTime();
        setSystemTime(s);

        // Run real-time check of matches in the background if in active production mode
        const latestMatches = await dbService.getMatches();
        const savedSandboxMode = localStorage.getItem('wc_bet_is_sandbox');
        const sandbox = savedSandboxMode === null ? true : savedSandboxMode === 'true';
        if (!sandbox) {
          checkAndAutoResolveProductionMatches(latestMatches);
        }
      } catch (err) {
        console.error('Error syncing system time / matches:', err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isSandboxMode]);

  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // HANDLE SWITCH CURRENT SIMULATED USER OR ADMIN OVERRIDE
  const handleSwitchUser = async (userId: string) => {
    try {
      localStorage.setItem('wc_bet_logged_in_user_id', userId);
      const switched = await dbService.setCurrentUser(userId);
      setCurrentUser(switched);
      triggerSuccess(`Profile active: Welcome, ${switched?.username}!`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // HANDLE USER LOGIN SUBMISSION
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = loginUsername.trim().toLowerCase();
    if (!cleanUsername) return;
    try {
      const found = users.find((u) => u.username.toLowerCase() === cleanUsername);
      if (found) {
        await handleSwitchUser(found.id);
        setLoginUsername('');
      } else {
        triggerError(`Username "${loginUsername}" not found. Please contact the Admin to register.`);
      }
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // REGISTER USER FLOW
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    try {
      const created = await dbService.registerUser(newUsername, startingCoins);
      setIsRegistering(false);
      setNewUsername('');
      triggerSuccess(`Successfully registered ${created.username} with ${startingCoins} 🪙`);
      await handleSwitchUser(created.id);
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // USER LOGOUT ACTION
  const handleLogout = () => {
    localStorage.removeItem('wc_bet_logged_in_user_id');
    setCurrentUser(null);
    triggerSuccess('Signed out successfully.');
  };

  // SUBMIT COMMUNITY VOTE
  const handleVote = async (matchId: string, prediction: 'home' | 'draw' | 'away') => {
    if (!currentUser) return;
    try {
      await dbService.submitCommunityVote(currentUser.id, matchId, prediction);
      triggerSuccess(`Your match prediction vote recorded for ${prediction === 'home' ? 'Home' : prediction === 'draw' ? 'Draw' : 'Away'}`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // PLACE MATCH OUTCOME WAGER
  const handlePlaceOutcomeWager = async (matchId: string, amount: number, outcome: 'home' | 'draw' | 'away', odds: number) => {
    if (!currentUser) return;
    if (amount <= 0 || !outcome) {
      triggerError('Please enter a valid amount and select an outcome prediction.');
      return;
    }

    if (amount > currentUser.coins) {
      triggerError('Insufficient coins available in your wallet.');
      return;
    }

    try {
      await dbService.placeWager(
        currentUser.id,
        matchId,
        'match_outcome',
        outcome,
        amount,
        odds
      );
      triggerSuccess(`Successfully wagered ${amount} 🪙 on match outcome!`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // PLACE EXACT SCORE WAGER
  const handlePlaceScoreWager = async (matchId: string, amount: number, scoreA: number, scoreB: number) => {
    if (!currentUser) return;
    if (amount <= 0 || scoreA < 0 || scoreB < 0) {
      triggerError('Please enter a valid amount and complete scoreline prediction.');
      return;
    }

    if (amount > currentUser.coins) {
      triggerError('Insufficient coins available in your wallet.');
      return;
    }

    try {
      await dbService.placeWager(
        currentUser.id,
        matchId,
        'match_score',
        `${scoreA}-${scoreB}`,
        amount,
        6.0, // Standard 6x payout multiplier for predicting exact score
        scoreA,
        scoreB
      );
      triggerSuccess(`Successfully wagered ${amount} 🪙 on score line prediction!`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // PLACE TOURNAMENT WAGER
  const handlePlaceTournamentWager = async (betId: string, amount: number, selectedOptionId: string) => {
    if (!currentUser) return;
    if (amount <= 0 || !selectedOptionId) {
      triggerError('Please enter a valid amount and choose an option.');
      return;
    }

    if (amount > currentUser.coins) {
      triggerError('Insufficient coins available in your wallet.');
      return;
    }

    const tBet = tournamentBets.find((b) => b.id === betId);
    const option = tBet?.options.find((o: any) => o.id === selectedOptionId);
    if (!option) return;

    try {
      await dbService.placeWager(
        currentUser.id,
        betId,
        'tournament',
        selectedOptionId,
        amount,
        option.odds
      );
      triggerSuccess(`Successfully placed tournament bet of ${amount} 🪙`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // CANCEL WAGER P2P COINS RETURN
  const handleCancelWager = async (wagerId: string) => {
    try {
      const response = await dbService.cancelWager(wagerId);
      triggerSuccess(`Wager cancelled! Returned ${response.returnedCoins} 🪙 directly back to your account.`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN TIME SIMULATOR ADJUSTER
  const handleAdjustTime = async (newTimeStr: string) => {
    try {
      await dbService.setSystemTime(newTimeStr);
      setSystemTime(newTimeStr);
      triggerSuccess(`Simulated clock time altered to: ${new Date(newTimeStr).toLocaleString()}`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN CUSTOM MATCH CREATION
  const handleCreateCustomMatch = async (teamAId: string, teamBId: string, kickoffTime: string) => {
    const teamAObj = INITIAL_TEAMS.find((t) => t.id === teamAId);
    const teamBObj = INITIAL_TEAMS.find((t) => t.id === teamBId);
    if (!teamAObj || !teamBObj || teamAObj.id === teamBObj.id) {
      triggerError('Teams must be different!');
      return;
    }
    try {
      await dbService.createMatch(
        teamAObj.name,
        teamBObj.name,
        teamAObj.emoji,
        teamBObj.emoji,
        teamAObj.rank,
        teamBObj.rank,
        new Date(kickoffTime).toISOString()
      );
      triggerSuccess(`Custom World Cup Match scheduled between ${teamAObj.name} and ${teamBObj.name}`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN OVERWRITE ODDS
  const handleOverwriteOdds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overwritingOddsMatchId) return;
    try {
      await dbService.updateMatchOdds(overwritingOddsMatchId, {
        home: customOddsHome,
        draw: customOddsDraw,
        away: customOddsAway,
      });
      setOverwritingOddsMatchId(null);
      triggerSuccess('Weights overwritten successfully by Admin!');
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN TRIGGER COIN ADJUSTMENT
  const handleAdjustCoinsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUserId) return;
    try {
      await dbService.updateUserCoins(adjustingUserId, adjustCoinsAmount);
      setAdjustingUserId(null);
      triggerSuccess('User coin balance adjusted successfully by Admin!');
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN DIRECT ADD CUSTOM TOURNEY QUEST
  const handleCreateTournamentBet = async (question: string, optionsText: string, deadline: string) => {
    if (!question.trim()) {
      triggerError('Please enter a valid bet target question.');
      return;
    }
    // Parse options from text
    const lines = optionsText.split('\n');
    const optionsObj: { label: string; odds: number }[] = [];
    for (const line of lines) {
      if (!line.includes(':')) continue;
      const parts = line.split(':');
      if (parts.length >= 2) {
        optionsObj.push({
          label: parts[0].trim(),
          odds: parseFloat(parts[1].trim()) || 2.0,
        });
      }
    }

    if (optionsObj.length < 2) {
      triggerError('You must specify at least two options formatted as "Option Label:Weight"');
      return;
    }

    try {
      await dbService.createTournamentBet(
        question,
        optionsObj,
        new Date(deadline).toISOString()
      );
      triggerSuccess('Successfully created custom tournament-wide specific bet!');
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN RESOLVE MATCH AND TRIGGER AUTO-SCORING ENGINE
  const handleResolveMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingMatchId) return;
    try {
      const match = await dbService.resolveMatch(resolvingMatchId, scoreAInput, scoreBInput, 'completed');
      setResolvingMatchId(null);
      triggerSuccess(`Match marked COMPLETED! Final score: ${match.teamAName} ${scoreAInput} - ${scoreBInput} ${match.teamBName}. P2P coin distributions processed & 10% admin cut claimed!`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // ADMIN RESOLVE TOURNAMENT BET
  const handleResolveTournamentBetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTBetId || !tBetWinnerOptionId) return;
    try {
      await dbService.resolveTournamentBet(resolvingTBetId, tBetWinnerOptionId);
      setResolvingTBetId(null);
      triggerSuccess(`Tournament bet resolved! P2P coins distributed and points tallied.`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // RESET ALL TO SEED SIMULATION FOR TESTING
  const handleResetDBDirect = async () => {
    try {
      await dbService.resetToDefault();
      triggerSuccess('Simulated database/localstorage reset to pristine seeding values.');
      await loadData();
    } catch (err: any) {
      triggerError(err.message || 'Failed to reset database');
    }
  };

  // SEED FAST COMPETITIVE RESULTS FOR DEMONSTRATION
  const handleQuickSeedResults = async () => {
    try {
      // Resolve Argentina vs France with a 2-1 Win for Argentina
      await dbService.resolveMatch('match-1', 2, 1, 'completed');

      // Resolve Brazil vs Germany with 3-0 for Brazil
      await dbService.resolveMatch('match-2', 3, 0, 'completed');

      // Shift system time forward to simulate subsequent matchups
      await dbService.setSystemTime('2026-06-13T23:00:00Z');

      triggerSuccess('Seeded fast simulation results! Argentina beat France 2-1, Brazil beat Germany 3-0. Check the leaderboard!');
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Render Login view if no user active
  if (!currentUser) {
    return (
      <Auth
        users={users}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        handleLoginSubmit={handleLoginSubmit}
        isSandboxMode={isSandboxMode}
        errorMessage={errorMessage}
        successMessage={successMessage}
      />
    );
  }

  // Active modal targets for helper bindings
  const overwritingMatch = matches.find((m) => m.id === overwritingOddsMatchId);
  const adjustingUser = users.find((u) => u.id === adjustingUserId);
  const resolvingMatch = matches.find((m) => m.id === resolvingMatchId);
  const resolvingTBet = tournamentBets.find((b) => b.id === resolvingTBetId);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-sky-50/50 text-slate-800 font-sans p-6 md:p-8 overflow-x-hidden flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
      
      {/* HEADER BANNER */}
      <Header
        currentUser={currentUser}
        users={users}
        isSandboxMode={isSandboxMode}
        handleToggleMode={handleToggleMode}
        handleSwitchUser={handleSwitchUser}
        setIsRegistering={setIsRegistering}
        handleLogout={handleLogout}
      />

      {/* ERROR/SUCCESS FLOATING NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 max-w-sm z-50 flex flex-col gap-2.5">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <p className="font-mono text-xs">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-lg">
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <p className="font-mono text-xs">{successMessage}</p>
          </div>
        )}
      </div>

      {/* CLOCK SIMULATION TICKER BANNER */}
      <TimeTicker
        currentUser={currentUser}
        systemTime={systemTime}
        isSandboxMode={isSandboxMode}
        handleAdjustTime={handleAdjustTime}
        handleQuickSeedResults={handleQuickSeedResults}
      />

      {/* CORE COLUMNS SYSTEM */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

        {/* LEFT COLUMN: ACTIVE USER PERSPECTIVE BEDDING AND OUTCOMES (8/12 SPAN) */}
        <section className="lg:col-span-8 flex flex-col gap-6">

          {/* CHOOSE TAB SECTIONS */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition font-display cursor-pointer ${
                  activeTab === 'matches'
                    ? 'border-sky-500 text-sky-600 font-extrabold'
                    : 'border-transparent text-slate-450 hover:text-slate-600'
                }`}
              >
                ⚽ World Cup Matches ({matches.length})
              </button>
              <button
                onClick={() => setActiveTab('tournament')}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition font-display cursor-pointer ${
                  activeTab === 'tournament'
                    ? 'border-sky-500 text-sky-600 font-extrabold'
                    : 'border-transparent text-slate-450 hover:text-slate-600'
                }`}
              >
                🏅 Tournament Props ({tournamentBets.length})
              </button>
              <button
                onClick={() => setActiveTab('wagers')}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition font-display cursor-pointer ${
                  activeTab === 'wagers'
                    ? 'border-sky-500 text-sky-600 font-extrabold'
                    : 'border-transparent text-slate-450 hover:text-slate-600'
                }`}
              >
                💼 My Betting Slip ({wagers.filter((w) => w.userId === currentUser?.id).length})
              </button>
            </div>
            
            <div className="text-[10px] text-slate-400 font-mono uppercase hidden xl:block">
              10% fee taken on P2P payout resolver
            </div>
          </div>

          {/* TAB 1: WORLD CUP MATCH CONTEST FEED */}
          {activeTab === 'matches' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  currentUser={currentUser}
                  wagers={wagers}
                  systemTime={systemTime}
                  handleVote={handleVote}
                  handlePlaceOutcomeWager={handlePlaceOutcomeWager}
                  handlePlaceScoreWager={handlePlaceScoreWager}
                  setResolvingMatchId={setResolvingMatchId}
                  setScoreAInput={setScoreAInput}
                  setScoreBInput={setScoreBInput}
                  setOverwritingOddsMatchId={setOverwritingOddsMatchId}
                  setCustomOddsHome={setCustomOddsHome}
                  setCustomOddsDraw={setCustomOddsDraw}
                  setCustomOddsAway={setCustomOddsAway}
                />
              ))}
            </div>
          )}

          {/* TAB 2: SPECIFIC TOURNAMENT PROP BETS */}
          {activeTab === 'tournament' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {tournamentBets.map((tBet) => (
                <TournamentCard
                  key={tBet.id}
                  tBet={tBet}
                  currentUser={currentUser}
                  systemTime={systemTime}
                  handlePlaceTournamentWager={handlePlaceTournamentWager}
                  setResolvingTBetId={setResolvingTBetId}
                  setTBetWinnerOptionId={setTBetWinnerOptionId}
                  wagersCount={wagers.filter((w) => w.targetId === tBet.id).length}
                />
              ))}
            </div>
          )}

          {/* TAB 3: BETTING SLIP */}
          {activeTab === 'wagers' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {wagers.filter((w) => w.userId === currentUser?.id).length === 0 ? (
                <div className="glass-panel text-center p-12 text-slate-400 text-xs">
                  <Flame className="w-9 h-9 mx-auto mb-3 text-slate-300 animate-pulse" />
                  No bets placed on your ticket yet. Explore the World Cup matches and start wagering!
                </div>
              ) : (
                wagers
                  .filter((w) => w.userId === currentUser?.id)
                  .map((wager) => (
                    <WagerCard
                      key={wager.id}
                      wager={wager}
                      matches={matches}
                      tournamentBets={tournamentBets}
                      handleCancelWager={handleCancelWager}
                    />
                  ))
              )}
            </div>
          )}

        </section>

        {/* RIGHT COLUMN: STANDINGS AND LEADERBOARD PANEL (4/12 SPAN) */}
        <section className="lg:col-span-4 flex flex-col gap-6 md:gap-8">
          
          {/* LEADERBOARD STANDINGS PANEL */}
          <Leaderboard
            users={users}
            currentUser={currentUser}
            setAdjustingUserId={setAdjustingUserId}
            setAdjustCoinsAmount={setAdjustCoinsAmount}
            handleResetDBDirect={handleResetDBDirect}
          />

          {/* SYSTEM DESCRIPTION SCORING PANEL */}
          <ScoringRules />

        </section>

      </main>

      {/* ADMIN FLOATING CONSOLE PANELS */}
      {currentUser?.role === 'admin' && (
        <section className="mt-4">
          <AdminConsole
            users={users}
            matches={matches}
            wagers={wagers}
            isSandboxMode={isSandboxMode}
            handleCreateCustomMatch={handleCreateCustomMatch}
            handleCreateTournamentBet={handleCreateTournamentBet}
          />
        </section>
      )}

      {/* INTERACTIVE MODALS OVERLAYS */}
      <Modals
        isRegistering={isRegistering}
        setIsRegistering={setIsRegistering}
        newUsername={newUsername}
        setNewUsername={setNewUsername}
        startingCoins={startingCoins}
        setStartingCoins={setStartingCoins}
        handleRegister={handleRegister}

        overwritingOddsMatchId={overwritingOddsMatchId}
        setOverwritingOddsMatchId={setOverwritingOddsMatchId}
        customOddsHome={customOddsHome}
        setCustomOddsHome={setCustomOddsHome}
        customOddsDraw={customOddsDraw}
        setCustomOddsDraw={setCustomOddsDraw}
        customOddsAway={customOddsAway}
        setCustomOddsAway={setCustomOddsAway}
        handleOverwriteOdds={handleOverwriteOdds}
        overwritingMatch={overwritingMatch}

        adjustingUserId={adjustingUserId}
        setAdjustingUserId={setAdjustingUserId}
        adjustCoinsAmount={adjustCoinsAmount}
        setAdjustCoinsAmount={setAdjustCoinsAmount}
        handleAdjustCoinsSubmit={handleAdjustCoinsSubmit}
        adjustingUser={adjustingUser}

        resolvingMatchId={resolvingMatchId}
        setResolvingMatchId={setResolvingMatchId}
        scoreAInput={scoreAInput}
        setScoreAInput={setScoreAInput}
        scoreBInput={scoreBInput}
        setScoreBInput={setScoreBInput}
        handleResolveMatchSubmit={handleResolveMatchSubmit}
        resolvingMatch={resolvingMatch}

        resolvingTBetId={resolvingTBetId}
        setResolvingTBetId={setResolvingTBetId}
        tBetWinnerOptionId={tBetWinnerOptionId}
        setTBetWinnerOptionId={setTBetWinnerOptionId}
        handleResolveTournamentBetSubmit={handleResolveTournamentBetSubmit}
        resolvingTBet={resolvingTBet}
      />

    </div>
  );
}
