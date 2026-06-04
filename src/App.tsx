/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Coins,
  Clock,
  User as UserIcon,
  Plus,
  Shield,
  Check,
  X,
  AlertTriangle,
  Flame,
  TrendingUp,
  RefreshCw,
  Sliders,
  Calendar,
  Layers,
  HelpCircle,
  Award
} from 'lucide-react';
import { dbService, INITIAL_TEAMS, calculateMatchOdds } from './services/dbService';
import { User, Match, TournamentBet, Wager, MatchOdds } from './types';

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

  // Match Bet Form State (per-match ID map)
  const [outcomeWagersState, setOutcomeWagersState] = useState<{ [key: string]: { amount: number; outcome: 'home' | 'draw' | 'away' } }>({});
  const [scoreWagersState, setScoreWagersState] = useState<{ [key: string]: { amount: number; scoreA: number; scoreB: number } }>({});

  // Tournament Bet State
  const [tBetWagersState, setTBetWagersState] = useState<{ [key: string]: { amount: number; selectedOptionId: string } }>({});

  // Admin Panel States
  const [adminShow, setAdminShow] = useState(true);
  const [customMatchPanel, setCustomMatchPanel] = useState(false);
  const [newMatchA, setNewMatchA] = useState(INITIAL_TEAMS[0].id);
  const [newMatchB, setNewMatchB] = useState(INITIAL_TEAMS[1].id);
  const [newMatchKickoff, setNewMatchKickoff] = useState('2026-06-12T18:00:00');

  const [customBetName, setCustomBetName] = useState('');
  const [customBetDeadline, setCustomBetDeadline] = useState('2026-06-12T18:00:00');
  const [customBetOptions, setCustomBetOptions] = useState<string>('Argentina 🇦🇷:4.5\nFrance 🇫🇷:5.0\nBrazil 🇧🇷:5.5');

  // Match Scoring State
  const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);
  const [scoreAInput, setScoreAInput] = useState<number>(0);
  const [scoreBInput, setScoreBInput] = useState<number>(0);

  // Tournament Resolving State
  const [resolvingTBetId, setResolvingTBetId] = useState<string | null>(null);
  const [tBetWinnerOptionId, setTBetWinnerOptionId] = useState<string>('');

  // Admin Override Odds
  const [overwritingOddsMatchId, setOverwritingOddsMatchId] = useState<string | null>(null);
  const [customOddsHome, setCustomOddsHome] = useState<number>(2.0);
  const [customOddsDraw, setCustomOddsDraw] = useState<number>(4.0);
  const [customOddsAway, setCustomOddsAway] = useState<number>(2.0);

  // Admin Direct Coin Adjust
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
  const [adjustCoinsAmount, setAdjustCoinsAmount] = useState<number>(500);

  // Sandbox vs Production Mode state (defaults to sandbox)
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
  const handlePlaceOutcomeWager = async (matchId: string, odds: number) => {
    if (!currentUser) return;
    const wagerState = outcomeWagersState[matchId];
    if (!wagerState || wagerState.amount <= 0 || !wagerState.outcome) {
      triggerError('Please enter a valid amount and select an outcome prediction.');
      return;
    }

    if (wagerState.amount > currentUser.coins) {
      triggerError('Insufficient coins available in your wallet.');
      return;
    }

    try {
      await dbService.placeWager(
        currentUser.id,
        matchId,
        'match_outcome',
        wagerState.outcome,
        wagerState.amount,
        odds
      );
      // reset state
      setOutcomeWagersState((prev) => ({
        ...prev,
        [matchId]: { amount: 0, outcome: wagerState.outcome },
      }));
      triggerSuccess(`Successfully wagered ${wagerState.amount} 🪙 on match outcome!`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // PLACE EXACT SCORE WAGER
  const handlePlaceScoreWager = async (matchId: string) => {
    if (!currentUser) return;
    const wagerState = scoreWagersState[matchId];
    if (!wagerState || wagerState.amount <= 0 || wagerState.scoreA < 0 || wagerState.scoreB < 0) {
      triggerError('Please enter a valid amount and complete scoreline prediction.');
      return;
    }

    if (wagerState.amount > currentUser.coins) {
      triggerError('Insufficient coins available in your wallet.');
      return;
    }

    try {
      await dbService.placeWager(
        currentUser.id,
        matchId,
        'match_score',
        `${wagerState.scoreA}-${wagerState.scoreB}`,
        wagerState.amount,
        6.0, // Standard 6x payout multiplier for predicting exact score
        wagerState.scoreA,
        wagerState.scoreB
      );
      setScoreWagersState((prev) => ({
        ...prev,
        [matchId]: { amount: 0, scoreA: 0, scoreB: 0 },
      }));
      triggerSuccess(`Successfully wagered ${wagerState.amount} 🪙 on score line prediction!`);
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // PLACE TOURNAMENT WAGER
  const handlePlaceTournamentWager = async (betId: string, options: any) => {
    if (!currentUser) return;
    const betState = tBetWagersState[betId];
    if (!betState || betState.amount <= 0 || !betState.selectedOptionId) {
      triggerError('Please enter a valid amount and choose an option.');
      return;
    }

    if (betState.amount > currentUser.coins) {
      triggerError('Insufficient coins available in your wallet.');
      return;
    }

    const option = options.find((o: any) => o.id === betState.selectedOptionId);
    if (!option) return;

    try {
      await dbService.placeWager(
        currentUser.id,
        betId,
        'tournament',
        betState.selectedOptionId,
        betState.amount,
        option.odds
      );
      setTBetWagersState((prev) => ({
        ...prev,
        [betId]: { amount: 0, selectedOptionId: '' },
      }));
      triggerSuccess(`Successfully placed tournament bet of ${betState.amount} 🪙`);
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
  const handleCreateCustomMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const teamAObj = INITIAL_TEAMS.find((t) => t.id === newMatchA);
    const teamBObj = INITIAL_TEAMS.find((t) => t.id === newMatchB);
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
        new Date(newMatchKickoff).toISOString()
      );
      setCustomMatchPanel(false);
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
  const handleCreateTournamentBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBetName.trim()) {
      triggerError('Please enter a valid bet target question.');
      return;
    }
    // Parse options from textarea
    const lines = customBetOptions.split('\n');
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
        customBetName,
        optionsObj,
        new Date(customBetDeadline).toISOString()
      );
      setCustomBetName('');
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
      // Opponents exist (Sarah predicted Win for 100, David predicted Loss for 150)
      // Total Outcome Pool: 250 -> Admin Cut 25. Winner distribution pool 225
      // Winner: Sarah. Sarah gets 225 🪙 return and +3 pts!
      // Sarah exact score bet: predicted 2-1 with 50 coins. Chloe predicted 1-1 with 50 coins (Opposed!)
      // Total Score Pool: 100 -> Admin Cut 10. Winner pool 90
      // Winner: Sarah. Sarah gets 90 🪙 return and +6 pts!
      await dbService.resolveMatch('match-1', 2, 1, 'completed');

      // Resolve Brazil vs Germany with 3-0 for Brazil
      // Opponents exist (Marcus predicted Brazil 100, Chloe predicted Germany 70)
      // Total Pool: 170. Admin cut: 17. Winner pool: 153.
      // Winner: Marcus. Marcus gets 153 🪙 return and +3 pts!
      await dbService.resolveMatch('match-2', 3, 0, 'completed');

      // Shift system time forward to simulate subsequent matchups
      await dbService.setSystemTime('2026-06-13T23:00:00Z');

      triggerSuccess('Seeded fast simulation results! Argentina beat France 2-1, Brazil beat Germany 3-0. Check the leaderboard!');
      loadData();
    } catch (err: any) {
      triggerError(err.message);
    }
  };

  // Format Helper
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

  const getUrgencyStatus = (kickoffStr: string) => {
    const sys = new Date(systemTime).getTime();
    const kick = new Date(kickoffStr).getTime();
    const diff = kick - sys;
    if (diff <= 0) return 'locked';
    if (diff < 3600000 * 4) return 'critical'; // < 4 hours
    return 'scheduled';
  };

  // Calculates math stats for match wagers
  const getMatchWagersStats = (matchId: string) => {
    const list = wagers.filter((w) => w.targetId === matchId && w.targetType === 'match_outcome');
    const homeStakes = list.filter((w) => w.prediction === 'home').reduce((s, w) => s + w.amount, 0);
    const drawStakes = list.filter((w) => w.prediction === 'draw').reduce((s, w) => s + w.amount, 0);
    const awayStakes = list.filter((w) => w.prediction === 'away').reduce((s, w) => s + w.amount, 0);
    const totalStakes = homeStakes + drawStakes + awayStakes;

    const scoreList = wagers.filter((w) => w.targetId === matchId && w.targetType === 'match_score');
    const hasOpposingOutcome = new Set(list.map((w) => w.prediction)).size > 1;
    const hasOpposingScore = new Set(scoreList.map((w) => w.prediction)).size > 1;

    return {
      homeStakes,
      drawStakes,
      awayStakes,
      totalStakes,
      hasOpposingOutcome,
      hasOpposingScore,
      totalBetsCount: list.length + scoreList.length,
    };
  };

  const getTBetWagersStats = (tBetId: string) => {
    const list = wagers.filter((w) => w.targetId === tBetId);
    const totalStakes = list.reduce((s, w) => s + w.amount, 0);
    const hasOpponents = new Set(list.map((w) => w.prediction)).size > 1;
    return {
      totalStakes,
      hasOpponents,
      totalBetsCount: list.length,
    };
  };

  // Sort Users for Leaderboard (Total coins remaining first, ties broken by Points)
  const leaderboardUsers = [...users].sort((a, b) => {
    if (b.coins !== a.coins) {
      return b.coins - a.coins;
    }
    return b.points - a.points;
  });

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 overflow-x-hidden flex flex-col items-center justify-center gap-8 animate-fade-in relative">
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none"></div>

        {/* Header Branding */}
        <div className="text-center z-10 max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-500 rounded-2xl shadow-xl shadow-sky-500/20 mb-3.5 transform hover:rotate-6 transition duration-300">
            <Trophy className="w-7 h-7 text-slate-950" />
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-white uppercase text-center">
            Coucou FIFA <span className="text-sky-400">Betting Hub</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase mt-1">
            College Friend Circle P2P League
          </p>
          <div className="mt-3 flex justify-center">
            {isSandboxMode ? (
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                🧪 Sandbox Mode Active
              </span>
            ) : (
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                🚀 Production Mode Live
              </span>
            )}
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md z-10">
          <h2 className="text-sm font-bold font-mono text-slate-400 uppercase tracking-widest text-center mb-6">
            Sign In to your Player Account
          </h2>

          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <label htmlFor="login-username" className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-2">
                Enter Username / Handle
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="login-username"
                  list="registered-users"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 pl-11 pr-4 py-3.5 text-xs focus:outline-none focus:border-sky-500 font-sans shadow-inner transition duration-200"
                  placeholder="e.g. Sarah (Tactician)"
                />
                <datalist id="registered-users">
                  {users.map((u) => (
                    <option key={u.id} value={u.username} />
                  ))}
                </datalist>
              </div>
            </div>
            
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs py-3.5 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider shadow-lg shadow-sky-500/10 cursor-pointer"
            >
              Enter Betting Desk
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
              ⚠️ User registration is restricted to Administrators.<br />
              Please contact the League Host to set up a new account.
            </p>
          </div>
        </div>

        {/* Floater Notifications */}
        <div className="fixed bottom-6 right-6 max-w-sm z-50 flex flex-col gap-2">
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <p className="font-mono text-xs">{errorMessage}</p>
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
              <Check className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <p className="font-mono text-xs">{successMessage}</p>
            </div>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 overflow-x-hidden flex flex-col gap-6">
      {/* HEADER BANNER */}
      <header className="flex flex-col md:flex-row items-center justify-between bg-slate-900/50 border border-slate-800 p-4 rounded-2xl shadow-lg gap-4">
        
        {/* Logo Title & Meta */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-lg shadow-md flex-shrink-0">WC</div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">WORLD CUP 2026</span>
              <span className="text-slate-500 text-[10px] font-mono">College Friend Circle P2P</span>
              {isSandboxMode ? (
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">🧪 Sandbox</span>
              ) : (
                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">🚀 Production</span>
              )}
            </div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-1 uppercase">
              Coucou FIFA <span className="text-sky-400 font-bold">Betting Hub</span>
            </h1>
          </div>
        </div>

        {/* Wallet and Simulator Controller */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 w-full md:w-auto">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-inner">
              <UserIcon className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <span className="block text-slate-500 text-[10px] font-mono uppercase tracking-wider">Simulated Session</span>
              <span className="text-sm font-semibold text-white flex items-center gap-1">
                {currentUser?.username}
                {currentUser?.role === 'admin' && (
                  <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[9px] px-1.5 py-px rounded ml-1 font-bold">Host</span>
                )}
              </span>
            </div>
          </div>

          {/* Wallet Capsule */}
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
            <span className="text-slate-400 text-xs font-semibold uppercase font-mono">Wallet</span>
            <span className="text-sky-400 font-mono font-bold flex items-center gap-1 text-sm">
              {currentUser?.coins} 🪙
            </span>
            <span className="text-slate-500 font-mono text-xs">•</span>
            <span className="text-emerald-400 font-mono font-bold flex items-center gap-1 text-sm">
              {currentUser?.points} pts
            </span>
          </div>

          {/* Profile Swapper & Registration Trigger / Admin Mode Toggler */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 sm:border-l sm:border-slate-800 sm:pl-4">
            {currentUser?.role === 'admin' ? (
              <>
                <button
                  onClick={handleToggleMode}
                  className={`text-[10px] font-bold font-mono uppercase tracking-wider px-3 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm ${
                    isSandboxMode
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}
                  title={`Click to toggle system mode (Current: ${isSandboxMode ? 'Sandbox' : 'Production'})`}
                >
                  {isSandboxMode ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      🧪 Go Pro mode
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      🚀 Go Sandbox
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <select
                    value={currentUser?.id || ''}
                    onChange={(e) => handleSwitchUser(e.target.value)}
                    className="bg-slate-950 text-slate-200 text-xs rounded-xl border border-slate-800 px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-mono"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.username} ({u.coins} 🪙)
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setIsRegistering(true)}
                    className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 font-bold transition-all duration-250"
                    title="Add another friend to the league"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-950" /> Join
                  </button>
                </div>
              </>
            ) : null}

            {/* Logout button to unlock workspace and return to the Login card */}
            <button
              onClick={handleLogout}
              className="bg-slate-850 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-800 hover:border-rose-900/50 text-slate-300 text-xs px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all duration-200 uppercase tracking-wider font-mono shadow-sm"
              title="Logout from active session"
            >
              Sign Out
            </button>
          </div>

        </div>
      </header>

      {/* ERROR/SUCCESS FLOATING NOTIFICATIONS */}
      <div className="grid grid-cols-1 gap-2">
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <p className="font-mono text-xs">{errorMessage}</p>
          </div>
        )}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3.5 rounded-2xl flex items-center gap-3 text-sm animate-fade-in shadow-md">
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <p className="font-mono text-xs">{successMessage}</p>
          </div>
        )}
      </div>

      {/* CLOCK SIMULATION TICKER BANNER */}
      <div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="text-slate-400 font-mono">
              {isSandboxMode && currentUser?.role === 'admin' ? 'Simulated Game Time:' : 'Server Time:'}
            </span>
            <span className="text-sky-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-bold text-xs uppercase font-mono">
              {formatTime(systemTime)}
            </span>
          </div>
          {currentUser?.role === 'admin' ? (
            isSandboxMode ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500 text-xs font-mono uppercase">Jump:</span>
                  <button
                    onClick={() => handleAdjustTime('2026-06-12T17:00:00Z')}
                    className="bg-slate-950 hover:bg-slate-800 hover:text-white text-slate-300 px-3 py-1.5 rounded-xl text-[11px] font-mono border border-slate-800 transition duration-200"
                    title="1 hour before the World Cup opening kick off"
                  >
                    1h Before Match 1
                  </button>
                  <button
                    onClick={() => handleAdjustTime('2026-06-12T19:00:00Z')}
                    className="bg-slate-950 hover:bg-slate-800 hover:text-white text-slate-300 px-3 py-1.5 rounded-xl text-[11px] font-mono border border-slate-800 transition duration-200"
                    title="Match 1 started"
                  >
                    Opening Match Blocked
                  </button>
                  <button
                    onClick={() => handleAdjustTime('2026-06-13T19:00:00Z')}
                    className="bg-slate-950 hover:bg-slate-800 hover:text-white text-slate-300 px-3 py-1.5 rounded-xl text-[11px] font-mono border border-slate-800 transition duration-200"
                    title="Later stages"
                  >
                    Day 2 Kickoff
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleQuickSeedResults}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-xl text-xs font-bold transition duration-200 font-mono uppercase tracking-wider"
                    title="Resolves Match 1 & Match 2 with scores to demonstrate coins moving live!"
                  >
                    🪄 1-Click Resolve Matches
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 py-1">
                <span className="text-slate-500 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  🔒 Sandbox Clock Adjustments & Fast-Resolve Triggers disabled in active Production Environment
                </span>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* CORE COLUMNS SYSTEM */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: ACTIVE USER PERSPECTIVE BEDDING AND OUTCOMES (8/12 SPAN) */}
        <section className="lg:col-span-8 flex flex-col gap-6">

          {/* CHOOSE TAB SECTIONS */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition font-display ${
                  activeTab === 'matches'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                ⚽ World Cup Matches ({matches.length})
              </button>
              <button
                onClick={() => setActiveTab('tournament')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition font-display ${
                  activeTab === 'tournament'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                🏅 Tournament Props ({tournamentBets.length})
              </button>
              <button
                onClick={() => setActiveTab('wagers')}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition font-display ${
                  activeTab === 'wagers'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                💼 My Betting Slip ({wagers.filter((w) => w.userId === currentUser?.id).length})
              </button>
            </div>
            
            <div className="text-[10px] text-slate-500 font-mono uppercase hidden xl:block">
              10% fee taken on P2P payout resolver
            </div>
          </div>

          {/* TAB 1: WORLD CUP MATCH CONTEST FEED */}
          {activeTab === 'matches' && (
            <div className="flex flex-col gap-5">
              {matches.map((match) => {
                const isLocked = getUrgencyStatus(match.kickoffTime) === 'locked';
                const stats = getMatchWagersStats(match.id);
                const isOutcomeOpposing = stats.hasOpposingOutcome;
                const totalOppositeSum = stats.totalStakes;

                // Grab active values if entered
                const matchOutcomeState = outcomeWagersState[match.id] || { amount: 100, outcome: 'home' };
                const matchScoreState = scoreWagersState[match.id] || { amount: 50, scoreA: 2, scoreB: 1 };

                // Community percentages calculation
                const totVotes = match.votes.home + match.votes.draw + match.votes.away;
                const voteHomePct = totVotes ? Math.round((match.votes.home / totVotes) * 100) : 34;
                const voteDrawPct = totVotes ? Math.round((match.votes.draw / totVotes) * 100) : 32;
                const voteAwayPct = totVotes ? Math.round((match.votes.away / totVotes) * 100) : 34;

                return (
                  <div
                    key={match.id}
                    className={`glass-panel p-6 relative overflow-hidden transition duration-300 ${
                      isLocked ? 'border-slate-800 bg-slate-900/40 opacity-95' : 'hover:border-slate-700'
                    }`}
                  >
                    {/* Header Tag / Lockdown status */}
                    <div className="flex justify-between items-center mb-4 text-xs font-mono">
                      <span className="text-slate-500 text-xs font-mono">
                        Match #{match.id.replace('match-', '')} • {formatTime(match.kickoffTime)}
                      </span>

                      {/* Locked countdown or badge */}
                      {isLocked ? (
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase rounded-full border border-rose-500/20">
                          🔒 Locked
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold uppercase rounded-full border border-sky-500/20">
                          ⏰ Betting Open
                        </span>
                      )}
                    </div>

                    {/* Match Scoreboard display */}
                    <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 border-b border-slate-800/60 pb-5">
                      
                      {/* Team A */}
                      <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-3.5 justify-end text-center md:text-right">
                        <div className="order-2 md:order-1">
                          <span className="block font-bold text-white font-display text-base tracking-tight">{match.teamAName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Rank: {match.teamARank} • Str: {((49 - match.teamARank) / 48).toFixed(2)}</span>
                        </div>
                        <div className="order-1 md:order-2 w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-md border border-slate-700">
                          {match.teamAEmoji}
                        </div>
                      </div>

                      {/* Score or VS Center */}
                      <div className="md:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 min-h-[55px]">
                        {match.status === 'completed' ? (
                          <div className="text-center">
                            <span className="text-lg font-bold font-mono text-sky-400">{match.scoreA} - {match.scoreB}</span>
                            <span className="block text-[9px] text-slate-500 font-bold uppercase mt-0.5 font-mono tracking-wider">RESOLVED</span>
                          </div>
                        ) : match.status === 'live' ? (
                          <div className="text-center">
                            <span className="text-rose-500 font-bold font-mono uppercase text-xs tracking-widest animate-pulse">● LIVE</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-serif italic text-2xl">vs</span>
                        )}
                      </div>

                      {/* Team B */}
                      <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-3.5 justify-start text-center md:text-left">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-md border border-slate-700">
                          {match.teamBEmoji}
                        </div>
                        <div>
                          <span className="block font-bold text-white font-display text-base tracking-tight">{match.teamBName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Rank: {match.teamBRank} • Str: {((49 - match.teamBRank) / 48).toFixed(2)}</span>
                        </div>
                      </div>

                    </div>

                    {/* COMMUNITY VOTING & PREDICTOR COMPONENT */}
                    <div className="bg-slate-950/55 p-4 rounded-2xl border border-slate-800/70 my-4">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 mb-2 font-mono">
                        <span>Friend Prediction Vote</span>
                        <span className="text-sky-400">
                          {voteHomePct}% {match.teamAName.substring(0, 3).toUpperCase()} — {voteDrawPct}% Drw — {voteAwayPct}% {match.teamBName.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Voting progress bar (Bento Style) */}
                      <div className="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
                        <div
                          style={{ width: `${voteHomePct}%` }}
                          className="h-full bg-sky-500 transition-all duration-300"
                          title={`Home Win: ${voteHomePct}%`}
                        ></div>
                        <div
                          style={{ width: `${voteDrawPct}%` }}
                          className="h-full bg-slate-500 transition-all duration-300"
                          title={`Draw: ${voteDrawPct}%`}
                        ></div>
                        <div
                          style={{ width: `${voteAwayPct}%` }}
                          className="h-full bg-rose-500 opacity-80 transition-all duration-300"
                          title={`Away Win: ${voteAwayPct}%`}
                        ></div>
                      </div>

                      {/* CLICKABLE VOTE BUTTONS */}
                      {!isLocked && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleVote(match.id, 'home')}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 hover:text-white text-[10px] font-bold py-1.5 rounded-xl text-slate-400 transition border border-slate-800 font-mono uppercase"
                          >
                            Vote {match.teamAName.substring(0,3).toUpperCase()}
                          </button>
                          <button
                            onClick={() => handleVote(match.id, 'draw')}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 hover:text-white text-[10px] font-bold py-1.5 rounded-xl text-slate-400 transition border border-slate-800 font-mono uppercase"
                          >
                            Vote Draw
                          </button>
                          <button
                            onClick={() => handleVote(match.id, 'away')}
                            className="flex-1 bg-slate-900 hover:bg-slate-800 hover:text-white text-[10px] font-bold py-1.5 rounded-xl text-slate-400 transition border border-slate-800 font-mono uppercase"
                          >
                            Vote {match.teamBName.substring(0,3).toUpperCase()}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* MATCH BET LAYOUTS POOLS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      
                      {/* BET MODE 1: MATCH OUTCOME POOL (W/D/L) */}
                      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                            🎲 Option A: Match Outcome
                          </h4>
                        </div>

                        {/* Current Implied Win Probability display (Donut/Pie Chart) */}
                        {(() => {
                          const homeProb = 1 / match.odds.home;
                          const drawProb = 1 / match.odds.draw;
                          const awayProb = 1 / match.odds.away;
                          const totalProb = homeProb + drawProb + awayProb;

                          const pctHome = Math.round((homeProb / totalProb) * 100);
                          const pctDraw = Math.round((drawProb / totalProb) * 100);
                          const pctAway = 100 - pctHome - pctDraw;

                          return (
                            <div className="bg-slate-900/30 p-3 rounded-2xl border border-slate-850 mb-4">
                              <span className="block text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider mb-2 text-center">
                                📊 Algorithmic Win Probability
                              </span>
                              
                              <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Pie / Donut Chart */}
                                <div 
                                  className="relative w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-lg" 
                                  style={{ 
                                    background: `conic-gradient(#38bdf8 0% ${pctHome}%, #64748b ${pctHome}% ${pctHome + pctDraw}%, #f43f5e ${pctHome + pctDraw}% 100%)` 
                                  }}
                                >
                                  {/* Center Hole for Donut effect */}
                                  <div className="absolute w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-[10px] text-slate-500 font-mono font-bold">
                                    ⚽
                                  </div>
                                </div>

                                {/* Legend & Probability Details */}
                                <div className="flex-1 grid grid-cols-3 gap-2 w-full">
                                  <div className="text-left">
                                    <span className="flex items-center gap-1 text-[9px] text-sky-400 font-bold uppercase font-mono truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0"></span>
                                      {match.teamAName.substring(0, 3)}
                                    </span>
                                    <span className="block text-xs sm:text-sm font-bold text-white font-mono mt-0.5">{pctHome}%</span>
                                    <span className="block text-[8px] text-slate-500 font-mono font-semibold">({match.odds.home.toFixed(2)}x weight)</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold uppercase font-mono truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 flex-shrink-0"></span>
                                      Draw
                                    </span>
                                    <span className="block text-xs sm:text-sm font-bold text-white font-mono mt-0.5">{pctDraw}%</span>
                                    <span className="block text-[8px] text-slate-500 font-mono font-semibold">({match.odds.draw.toFixed(2)}x weight)</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="flex items-center justify-end gap-1 text-[9px] text-rose-400 font-bold uppercase font-mono truncate">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                                      {match.teamBName.substring(0, 3)}
                                    </span>
                                    <span className="block text-xs sm:text-sm font-bold text-white font-mono mt-0.5">{pctAway}%</span>
                                    <span className="block text-[8px] text-slate-500 font-mono font-semibold">({match.odds.away.toFixed(2)}x weight)</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Betting form */}
                        {!isLocked ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-1.5 justify-between">
                              <label className="text-xs text-slate-400 self-center font-mono uppercase tracking-wider">Pick Outcome:</label>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOutcomeWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchOutcomeState, outcome: 'home' },
                                    }))
                                  }
                                  className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border transition-all duration-150 uppercase ${
                                    matchOutcomeState.outcome === 'home'
                                      ? 'bg-sky-500/15 text-sky-400 border-sky-500'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                                  }`}
                                >
                                  {match.teamAName.substring(0, 3)}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOutcomeWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchOutcomeState, outcome: 'draw' },
                                    }))
                                  }
                                  className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border transition-all duration-150 uppercase ${
                                    matchOutcomeState.outcome === 'draw'
                                      ? 'bg-sky-500/15 text-sky-400 border-sky-500'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                                  }`}
                                >
                                  Draw
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOutcomeWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchOutcomeState, outcome: 'away' },
                                    }))
                                  }
                                  className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded-xl border transition-all duration-150 uppercase ${
                                    matchOutcomeState.outcome === 'away'
                                      ? 'bg-sky-500/15 text-sky-400 border-sky-500'
                                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                                  }`}
                                >
                                  {match.teamBName.substring(0, 3)}
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🪙</span>
                                <input
                                  type="number"
                                  value={matchOutcomeState.amount}
                                  onChange={(e) =>
                                    setOutcomeWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchOutcomeState, amount: parseInt(e.target.value) || 0 },
                                    }))
                                  }
                                  className="w-full bg-slate-900 text-white font-mono text-xs rounded-xl border border-slate-800 pl-7 pr-2 py-2.5 focus:outline-none focus:border-sky-500"
                                  placeholder="Amount"
                                />
                              </div>
                              <button
                                onClick={() =>
                                  handlePlaceOutcomeWager(
                                    match.id,
                                    matchOutcomeState.outcome === 'home'
                                      ? match.odds.home
                                      : matchOutcomeState.outcome === 'draw'
                                      ? match.odds.draw
                                      : match.odds.away
                                  )
                                }
                                className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs px-4 py-2 rounded-xl font-bold font-mono transition duration-150 flex-shrink-0 uppercase"
                              >
                                Place Bet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/40 text-center text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                            🤐 Bets Closed
                          </div>
                        )}

                        {/* Matching opposing prediction indicators */}
                        <div className="mt-3.5 flex items-center justify-between text-[10px] font-bold uppercase font-mono">
                          <span className="text-slate-500">Pool:</span>
                          <div className="flex gap-2">
                            <span className="text-slate-400">{stats.homeStakes + stats.drawStakes + stats.awayStakes}🪙</span>
                            {isOutcomeOpposing ? (
                              <span className="text-sky-400 font-bold" title="At least 2 user placed opposite bets. Bets will execute!">
                                Match OK
                              </span>
                            ) : (
                              stats.totalBetsCount > 0 && (
                                <span className="text-amber-500 font-bold" title="Only 1 outcome wagered on. Need opposing user bets to execute!">
                                  Need Competitor
                                </span>
                              )
                            )}
                          </div>
                        </div>

                      </div>

                      {/* BET MODE 2: SCORELINE EXACT SPECIFIC (W/D/L) */}
                      <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1">
                            🎯 Option B: Exact Score
                          </h4>
                          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">6.0x weight</span>
                        </div>

                        {!isLocked ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Score Guess:</span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={matchScoreState.scoreA}
                                  onChange={(e) =>
                                    setScoreWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchScoreState, scoreA: parseInt(e.target.value) || 0 },
                                    }))
                                  }
                                  className="w-12 bg-slate-900 text-white text-center font-mono font-bold text-xs rounded-xl border border-slate-800 py-1.5 focus:outline-none focus:border-sky-500"
                                />
                                <span className="text-slate-500 text-xs font-mono">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={matchScoreState.scoreB}
                                  onChange={(e) =>
                                    setScoreWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchScoreState, scoreB: parseInt(e.target.value) || 0 },
                                    }))
                                  }
                                  className="w-12 bg-slate-900 text-white text-center font-mono font-bold text-xs rounded-xl border border-slate-800 py-1.5 focus:outline-none focus:border-sky-500"
                                />
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-2.5 text-slate-500 text-xs">🪙</span>
                                <input
                                  type="number"
                                  value={matchScoreState.amount}
                                  onChange={(e) =>
                                    setScoreWagersState((prev) => ({
                                      ...prev,
                                      [match.id]: { ...matchScoreState, amount: parseInt(e.target.value) || 0 },
                                    }))
                                  }
                                  className="w-full bg-slate-900 text-white font-mono text-xs rounded-xl border border-slate-800 pl-7 pr-2 py-2.5 focus:outline-none focus:border-sky-500"
                                  placeholder="Amount"
                                />
                              </div>
                              <button
                                onClick={() => handlePlaceScoreWager(match.id)}
                                className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs px-4 py-2 rounded-xl font-bold font-mono transition duration-150 flex-shrink-0 uppercase"
                              >
                                Place Bet
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/40 text-center text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                            🤐 Bets Closed
                          </div>
                        )}

                        <div className="mt-3.5 flex items-center justify-between text-[10px] font-bold uppercase font-mono">
                          <span className="text-slate-500">Opponent:</span>
                          <span className={`${stats.hasOpposingScore ? 'text-sky-400' : 'text-amber-500'}`}>
                            {stats.hasOpposingScore ? 'Matched' : 'Unmatched'}
                          </span>
                        </div>

                      </div>

                    </div>

                    {/* ADMIN ACTION TO OVERRIDE ODDS OR RE-SCORE MATCH (Host ONLY) */}
                    {currentUser?.role === 'admin' && (
                      <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-2xl flex flex-wrap gap-2 items-center justify-between">
                        <span className="text-[10px] text-sky-400 font-mono flex items-center gap-1 font-bold uppercase tracking-wider">
                          <Shield className="w-3.5 h-3.5 text-sky-500" /> Host Alex Sandbox Mode
                        </span>
                        
                        <div className="flex gap-2">
                          {match.status !== 'completed' && (
                            <button
                              onClick={() => {
                                setResolvingMatchId(match.id);
                                setScoreAInput(match.scoreA || 0);
                                setScoreBInput(match.scoreB || 0);
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 uppercase tracking-wider font-mono"
                            >
                              ⚽ Resolve & Distribute Payouts
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setOverwritingOddsMatchId(match.id);
                              setCustomOddsHome(match.odds.home);
                              setCustomOddsDraw(match.odds.draw);
                              setCustomOddsAway(match.odds.away);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 px-3 py-1.5 rounded-xl font-bold font-mono transition uppercase"
                          >
                            ✏️ Override Weights
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: SPECIFIC TOURNAMENT BETS (CREATED BY ADMINS) */}
          {activeTab === 'tournament' && (
            <div className="flex flex-col gap-6">
              {tournamentBets.map((tBet) => {
                const isLocked = getUrgencyStatus(tBet.kickoffTime) === 'locked';
                const stats = getTBetWagersStats(tBet.id);
                const betState = tBetWagersState[tBet.id] || { amount: 100, selectedOptionId: '' };

                return (
                  <div key={tBet.id} className="glass-panel p-6 relative overflow-hidden transition-all duration-200 hover:border-slate-700">
                    
                    <div className="flex justify-between items-center mb-4 text-xs font-mono">
                      <span className="text-slate-500">Deadline: {formatTime(tBet.kickoffTime)}</span>
                      {isLocked ? (
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase rounded-full border border-rose-500/20">
                          🔒 Event Started
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold uppercase rounded-full border border-sky-500/20">
                          ⏰ Open
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white font-display mb-4 tracking-tight">
                      {tBet.question}
                    </h3>

                    {/* Display options list and current bets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                      {tBet.options.map((opt) => {
                        const isWinner = tBet.winningOptionId === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`p-3.5 rounded-xl border text-xs flex justify-between items-center transition duration-150 ${
                              isWinner
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span className="font-semibold">{opt.label}</span>
                            <span className="font-mono bg-slate-950 px-2.5 py-1 border border-slate-800 rounded-full text-[11px] text-sky-400 font-bold">
                              {opt.odds.toFixed(2)}x weight
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Placer inputs */}
                    {!isLocked && tBet.status !== 'completed' ? (
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Your Choice:</label>
                          <select
                            value={betState.selectedOptionId}
                            onChange={(e) =>
                              setTBetWagersState((prev) => ({
                                  ...prev,
                                  [tBet.id]: { ...betState, selectedOptionId: e.target.value },
                              }))
                            }
                            className="w-full bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-800 px-3 py-2.5 focus:outline-none focus:border-sky-500 transition duration-150"
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
                          <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Coin Stake:</label>
                          <input
                            type="number"
                            value={betState.amount}
                            onChange={(e) =>
                              setTBetWagersState((prev) => ({
                                ...prev,
                                [tBet.id]: { ...betState, amount: parseInt(e.target.value) || 0 },
                              }))
                            }
                            className="w-full bg-slate-900 text-white font-mono text-xs rounded-xl border border-slate-800 px-3 py-2.5 focus:outline-none focus:border-sky-500"
                            placeholder="Amount"
                          />
                        </div>

                        <div className="self-end w-full md:w-auto">
                          <button
                            onClick={() => handlePlaceTournamentWager(tBet.id, tBet.options)}
                            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs px-5 py-2.5 rounded-xl font-bold font-mono uppercase transition duration-150"
                          >
                            Place Bet
                          </button>
                        </div>
                      </div>
                    ) : tBet.status === 'completed' ? (
                      <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 font-mono text-center flex items-center justify-center gap-1">
                        🏆 Props Resolved! Correct Choice: <span className="font-bold underline">{tBet.options.find(o => o.id === tBet.winningOptionId)?.label}</span>
                      </div>
                    ) : (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center text-xs text-slate-500 font-mono uppercase tracking-wider">
                        🔒 Betting Inputs Locked
                      </div>
                    )}

                    {/* Stats for oppositional validation */}
                    <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase font-mono">
                      <span className="text-slate-500">Current Pools:</span>
                      <div className="flex gap-2">
                        <span className="text-slate-400">{stats.totalStakes} 🪙 Pool</span>
                        {stats.hasOpponents ? (
                          <span className="text-sky-400 font-bold">Matched Props</span>
                        ) : (
                          stats.totalBetsCount > 0 && (
                            <span className="text-amber-400 font-bold">No Opponent Guess</span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Admin Resolve Controls */}
                    {currentUser?.role === 'admin' && tBet.status !== 'completed' && (
                      <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-2 items-center justify-between">
                        <span className="text-[10px] text-sky-400 font-mono uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-sky-500" /> Host Alex Solve Props
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setResolvingTBetId(tBet.id);
                              setTBetWinnerOptionId(tBet.options[0].id);
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] px-3.5 py-1.5 rounded-xl font-bold uppercase transition duration-150 font-mono tracking-wider"
                          >
                            🏆 Pick Winner Option & Resolve
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: USER'S PERSONAL ACTIVE/HISTORY WAGERS */}
          {activeTab === 'wagers' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono mb-2">My Betting Slip & Open Tickets</h3>
              
              {wagers.filter((w) => w.userId === currentUser?.id).length === 0 ? (
                <div className="glass-panel text-center p-10 text-slate-500 text-xs">
                  <Flame className="w-8 h-8 mx-auto mb-3 text-slate-600 animate-pulse" />
                  No bets placed on your ticket yet. Explore the World Cup matches and start wagering!
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {wagers
                    .filter((w) => w.userId === currentUser?.id)
                    .map((wager) => {
                      // Match mapping details
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
                        <div key={wager.id} className="bg-slate-950 border border-slate-850 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <span className="block text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider">
                              {wager.targetType === 'match_score' ? 'Exact Score Option' : wager.targetType === 'match_outcome' ? 'W/D/L Outcome Option' : 'Tournament Prop'}
                            </span>
                            <span className="font-bold text-white text-sm tracking-tight">{targetTitle}</span>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 font-mono text-[11px]">
                              <span className="text-slate-400">
                                Pick: <strong className="text-sky-400 underline">{predictionReadable}</strong>
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">
                                Payout Weight: <strong className="text-sky-400">{wager.oddsAtWager.toFixed(2)}x</strong>
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">
                                Stake: <strong className="text-sky-400">{wager.amount}🪙</strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-left md:text-right flex flex-col md:items-end gap-2">
                            {/* Payout results badges or cancellation option */}
                            {wager.status === 'pending' && (
                              <div className="flex flex-col md:items-end gap-1">
                                <span className="px-3 py-1 bg-amber-500/15 text-amber-500 text-[10px] font-bold uppercase rounded-full border border-amber-500/20 font-mono">
                                  ⏳ Unmatched Pool
                                </span>
                                <button
                                  onClick={() => handleCancelWager(wager.id)}
                                  className="text-slate-500 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono underline mt-1"
                                >
                                  Cancel / Reclaim
                                </button>
                              </div>
                            )}

                            {wager.status === 'matched' && (
                              <div className="flex flex-col md:items-end gap-1">
                                <span className="px-3 py-1 bg-sky-500/10 text-sky-400 text-[10px] font-bold uppercase rounded-full border border-sky-500/20 font-mono">
                                  ✅ Executed Bet
                                </span>
                                <button
                                  onClick={() => handleCancelWager(wager.id)}
                                  className="text-slate-500 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono underline mt-1"
                                >
                                  Cancel / Refund
                                </button>
                              </div>
                            )}

                            {wager.status === 'cancelled' && (
                              <span className="px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase rounded-full border border-slate-700 font-mono">
                                🚫 Refunded
                              </span>
                            )}

                            {wager.status === 'resolved' && (
                              <div className="text-left md:text-right">
                                {wager.payoutCoins > 0 ? (
                                  <div>
                                    <span className="block text-emerald-400 text-xs font-mono font-bold">+ {wager.payoutCoins} 🪙</span>
                                    <span className="block text-emerald-500 text-[9px] font-mono uppercase font-bold tracking-wider">+ {wager.payoutPoints} Pts Gained</span>
                                  </div>
                                ) : (
                                  <span className="block text-slate-500 text-xs font-mono font-bold uppercase">0 🪙 Lost</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

        </section>

        {/* RIGHT COLUMN: STANDINGS AND LEADERBOARD PANEL (4/12 SPAN) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* LEADERBOARD STANDINGS PANEL */}
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                📊 Friendship Standings
              </h3>
              <TrendingUp className="w-5 h-5 text-sky-400" />
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed font-mono">
              College friend-group standings. Tied rankings resolved by <strong className="text-sky-400">Total Coins</strong>, then <strong className="text-sky-400">Points</strong>.
            </p>

            {/* Stands Table list */}
            <div className="flex flex-col gap-3">
              {leaderboardUsers.map((user, idx) => {
                const isActive = currentUser?.id === user.id;
                let rankBadge = `${idx + 1}`;
                if (idx === 0) rankBadge = '🥇';
                else if (idx === 1) rankBadge = '🥈';
                else if (idx === 2) rankBadge = '🥉';

                return (
                  <div
                    key={user.id}
                    className={`p-3.5 rounded-2xl flex items-center justify-between transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-500/5 border border-sky-500/30'
                        : 'bg-slate-950 border border-slate-850 hover:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono text-xs text-slate-400">{rankBadge}</span>
                      <div>
                        <span className="text-slate-200 text-xs font-bold flex items-center gap-1 tracking-tight">
                          {user.username}
                          {user.role === 'admin' && (
                            <span className="bg-sky-500/10 border border-sky-500/20 text-[8px] text-sky-400 font-bold px-1.5 py-0.5 rounded-full font-mono uppercase">Host</span>
                          )}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-mono tracking-tight">Joined {new Date(user.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-xs font-mono font-bold text-sky-400">{user.coins} 🪙</span>
                        <span className="block text-[10px] font-mono text-slate-400 font-bold">{user.points} pts</span>
                      </div>

                      {/* Admin edit trigger for Alex to change anyone's coin values */}
                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => {
                            setAdjustingUserId(user.id);
                            setAdjustCoinsAmount(user.coins);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 hover:text-white border border-slate-800 text-[10px] text-slate-400 px-2.5 py-1.5 rounded-xl font-bold font-mono transition"
                          title="Adjust balance"
                        >
                          Balance
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {currentUser?.role === 'admin' && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleResetDBDirect}
                  className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider hover:text-slate-300 transition"
                >
                  Reset Database to Seed Baseline
                </button>
              </div>
            )}
          </div>

          {/* SYSTEM DESCRIPTION GRAPH CARD */}
          <div className="glass-panel p-6 text-xs text-slate-400 leading-relaxed font-mono">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono mb-3.5 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-sky-400" /> Scoring & Formula
            </h4>
            <ul className="flex flex-col gap-3">
              <li>🏆 <strong className="text-slate-200">Point Awards Schema:</strong>
                <ul className="pl-3.5 mt-1 list-disc text-[11px] text-slate-500 flex flex-col gap-1">
                  <li>Correct Match Result: <span className="text-sky-400 font-bold">3 pts</span></li>
                  <li>Correct Exact Score: <span className="text-sky-400 font-bold">6 pts</span></li>
                  <li>Correct Tournament Outcome: <span className="text-sky-400 font-bold">10 pts</span></li>
                </ul>
              </li>
              <li>🤖 <strong className="text-slate-200">Formula Implied Win Chance:</strong>
                <p className="mt-1 text-[11px] text-slate-500 leading-normal font-mono normal-case">
                  strength = (49 - FIFA_rank) / 48.<br />
                  probA = (strengthA / (strengthA + strengthB)) * 0.75.<br />
                  Draw Prob: Flat 25%.<br />
                  Win Probability = probability * 100%.<br />
                  Implied Weight = 1 / probability.
                </p>
              </li>
              <li>💼 <strong className="text-slate-200">Host Commision cut:</strong>
                <p className="mt-1 text-[11px] text-slate-500 leading-normal">
                   To reward the host server maintenance, <strong className="text-sky-400">10% of total coins pool</strong> from execution stakes is routed to Admin (Alex). 90% is split proportionally.
                </p>
              </li>
            </ul>
          </div>

        </section>

      </main>

      {/* ADMIN FLOATING CONSOLE PANELS */}
      {currentUser?.role === 'admin' && (
        <section className="mt-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
                  🛡️ Administrator Controls (Logged in as Alex)
                </h3>
              </div>
              {isSandboxMode ? (
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider animate-pulse">
                  🧪 Full Host Sandbox Active
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
                  🚀 Production Mode Live
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* ACTION A: CREATE CUSTOM TOURNAMENT GAME */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850">
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider mb-3.5">
                  ⚽ Schedule Custom Match
                </h4>
                
                <form onSubmit={handleCreateCustomMatch} className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1">Pick Home Team:</label>
                    <select
                      value={newMatchA}
                      onChange={(e) => setNewMatchA(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-800 px-3 py-2.5 focus:outline-none focus:border-sky-500 transition duration-150"
                    >
                      {INITIAL_TEAMS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emoji} {t.name} (FIFA #{t.rank})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1">Pick Away Team:</label>
                    <select
                      value={newMatchB}
                      onChange={(e) => setNewMatchB(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-800 px-3 py-2.5 focus:outline-none focus:border-sky-500 transition duration-150"
                    >
                      {INITIAL_TEAMS.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.emoji} {t.name} (FIFA #{t.rank})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1">Kickoff Time Stamp:</label>
                    <input
                      type="datetime-local"
                      value={newMatchKickoff}
                      onChange={(e) => setNewMatchKickoff(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800 px-3 py-2.5 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs py-2.5 rounded-xl font-bold tracking-wider uppercase transition font-mono"
                  >
                    Schedule Match
                  </button>
                </form>
              </div>

              {/* ACTION B: CREATE CUSTOM TOURNAMENT BETS */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850">
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider mb-3.5">
                  🏅 Add Custom Tournament Prop
                </h4>
                
                <form onSubmit={handleCreateTournamentBet} className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1">Bet Question:</label>
                    <input
                      type="text"
                      value={customBetName}
                      onChange={(e) => setCustomBetName(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 text-xs rounded-xl border border-slate-800 px-3 py-2.5 focus:outline-none focus:border-sky-500 font-sans"
                      placeholder="e.g. Which team will reach final?"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1">Options & Payout Weights (Label:Weight):</label>
                    <textarea
                      rows={3}
                      value={customBetOptions}
                      onChange={(e) => setCustomBetOptions(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800 px-3 py-2 focus:outline-none focus:border-sky-500"
                      placeholder="Brazil:3.50&#10;Spain:4.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1">Time Lock Deadline:</label>
                    <input
                      type="datetime-local"
                      value={customBetDeadline}
                      onChange={(e) => setCustomBetDeadline(e.target.value)}
                      className="w-full bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800 px-3 py-2 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs py-2.5 rounded-xl font-bold tracking-wider uppercase transition font-mono"
                  >
                    Add Custom Bet Target
                  </button>
                </form>
              </div>

              {/* ACTION C: SYSTEM STATUS INFO OVERVIEW */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 text-xs text-slate-400 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider mb-3.5">
                    📌 Dynamic Sandbox Logs
                  </h4>
                  <ul className="flex flex-col gap-2.5 text-[11px] font-mono leading-relaxed">
                    <li>🟢 Registered college users: <span className="text-sky-400 font-bold">{users.length} friends</span></li>
                    <li>🟢 Scheduled Cup Games: <span className="text-sky-400 font-bold">{matches.length} matches</span></li>
                    <li>🟢 Active wagers executed: <span className="text-sky-400 font-bold">{wagers.length} slips</span></li>
                  </ul>
                  <p className="mt-4 text-slate-500 text-[10px] leading-normal font-mono uppercase tracking-wider">
                    Resolving matches distributes coins immediately. Unmatched opposing slips are refunded cleanly.
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-slate-850 flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest font-bold">World Cup Stadium</span>
                  <Award className="w-5 h-5 text-sky-400" />
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* INITIALIZATION/MEMBERSHIP JOIN CREATION MODAL */}
      {isRegistering && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">Join Betting Club</h3>
              <button
                onClick={() => setIsRegistering(false)}
                className="text-slate-500 hover:text-white transition duration-150"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Enter your unique handle:</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3.5 py-2.5 text-xs focus:outline-none focus:border-sky-500 font-sans tracking-tight"
                  placeholder="e.g. Mike (Guru)"
                  maxLength={25}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Starting Coin Allowancecapital (🪙):</label>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  value={startingCoins}
                  onChange={(e) => setStartingCoins(parseInt(e.target.value) || 500)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3.5 py-2.5 text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal">Starting purse balance to explore sandbox bets</p>
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition font-mono uppercase tracking-wider"
              >
                📥 Register & Start Betting
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODES FOR ADMIN: OVERWRITE ODDS */}
      {overwritingOddsMatchId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">✏️ Override Implied Weights</h3>
              <button onClick={() => setOverwritingOddsMatchId(null)} className="text-slate-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOverwriteOdds} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Home Win Multiplier:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={customOddsHome}
                  onChange={(e) => setCustomOddsHome(parseFloat(e.target.value) || 1.1)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Draw Multiplier:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={customOddsDraw}
                  onChange={(e) => setCustomOddsDraw(parseFloat(e.target.value) || 1.1)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Away Win Multiplier:</label>
                <input
                  type="number"
                  step="0.05"
                  min="1.01"
                  value={customOddsAway}
                  onChange={(e) => setCustomOddsAway(parseFloat(e.target.value) || 1.1)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3 py-2 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition uppercase font-mono tracking-wider"
              >
                Confirm Custom Weights
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODES FOR ADMIN: ADJUST COINS FOR FRIEND */}
      {adjustingUserId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">⚙️ Adjust Friend Wallet</h3>
              <button onClick={() => setAdjustingUserId(null)} className="text-slate-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 font-mono">
              Adjust balance of <strong className="text-sky-400 font-bold">{users.find(u => u.id === adjustingUserId)?.username}</strong>.
            </p>

            <form onSubmit={handleAdjustCoinsSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Set coin balance amount:</label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={adjustCoinsAmount}
                  onChange={(e) => setAdjustCoinsAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3 py-2 text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition uppercase font-mono tracking-wider"
              >
                Apply Coins Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODES FOR ADMIN: RESOLVE MATCH AND TRIGGER SCORING PAYOUT DISTRIBUTIONS */}
      {resolvingMatchId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">⚽ Enter Match Score</h3>
              <button onClick={() => setResolvingMatchId(null)} className="text-slate-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3.5 font-mono">
              Finish score inputs for: <br />
              <strong className="text-sky-400">
                {matches.find((m) => m.id === resolvingMatchId)?.teamAName} vs {matches.find((m) => m.id === resolvingMatchId)?.teamBName}
              </strong>
            </p>

            <form onSubmit={handleResolveMatchSubmit} className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 text-center uppercase font-mono mb-1">
                    {matches.find((m) => m.id === resolvingMatchId)?.teamAName.substring(0,3)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreAInput}
                    onChange={(e) => setScoreAInput(parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-950 text-white text-center rounded-xl border border-slate-800 py-1.5 text-lg font-mono font-bold text-sky-400 focus:outline-none"
                  />
                </div>
                <span className="text-slate-500 font-mono text-xl self-end mb-1">-</span>
                <div>
                  <label className="block text-[10px] text-slate-500 text-center uppercase font-mono mb-1">
                    {matches.find((m) => m.id === resolvingMatchId)?.teamBName.substring(0,3)}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scoreBInput}
                    onChange={(e) => setScoreBInput(parseInt(e.target.value) || 0)}
                    className="w-16 bg-slate-950 text-white text-center rounded-xl border border-slate-800 py-1.5 text-lg font-mono font-bold text-sky-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 text-[10px] text-slate-500 leading-normal font-mono uppercase tracking-wider">
                ⚠️ Resolves outcome & score pools. Routes <strong className="text-sky-400 font-bold">10% Host cut</strong> to administrator purse.
              </div>

              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition uppercase font-mono tracking-wider"
              >
                Distribute & Finalize Game
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODES FOR ADMIN: RESOLVE TOURNAMENT SPECIFIC BETS */}
      {resolvingTBetId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">🏅 Resolve Tournament Bet</h3>
              <button onClick={() => setResolvingTBetId(null)} className="text-slate-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3.5 font-mono">
              Question: <span className="text-sky-400 font-bold">{tournamentBets.find((b) => b.id === resolvingTBetId)?.question}</span>
            </p>

            <form onSubmit={handleResolveTournamentBetSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-1">Select Winning Option:</label>
                <select
                  value={tBetWinnerOptionId}
                  onChange={(e) => setTBetWinnerOptionId(e.target.value)}
                  className="w-full bg-slate-950 text-white rounded-xl border border-slate-800 px-3 py-2.5 text-xs font-mono"
                >
                  {tournamentBets.find((b) => b.id === resolvingTBetId)?.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                ✔️ Resolves bets proportionally. Payouts processed. Admin commission routed.
              </div>

              <button
                type="submit"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl py-2.5 text-xs font-bold transition uppercase font-mono tracking-wider"
              >
                Submit Resolution
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
