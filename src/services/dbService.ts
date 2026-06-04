import { User, Match, TournamentBet, Wager, MatchOdds, MatchStatus } from '../types';

export const INITIAL_TEAMS = [
  { id: 'arg', name: 'Argentina', emoji: '🇦🇷', rank: 1 },
  { id: 'fra', name: 'France', emoji: '🇫🇷', rank: 2 },
  { id: 'esp', name: 'Spain', emoji: '🇪🇸', rank: 3 },
  { id: 'eng', name: 'England', emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rank: 4 },
  { id: 'bra', name: 'Brazil', emoji: '🇧🇷', rank: 5 },
  { id: 'por', name: 'Portugal', emoji: '🇵🇹', rank: 7 },
  { id: 'ned', name: 'Netherlands', emoji: '🇳🇱', rank: 8 },
  { id: 'ita', name: 'Italy', emoji: '🇮🇹', rank: 9 },
  { id: 'ger', name: 'Germany', emoji: '🇩🇪', rank: 12 },
  { id: 'mar', name: 'Morocco', emoji: '🇲🇦', rank: 13 },
  { id: 'uru', name: 'Uruguay', emoji: '🇺🇾', rank: 14 },
  { id: 'usa', name: 'United States', emoji: '🇺🇸', rank: 16 },
  { id: 'jpn', name: 'Japan', emoji: '🇯🇵', rank: 18 },
  { id: 'sen', name: 'Senegal', emoji: '🇸🇳', rank: 19 },
  { id: 'mex', name: 'Mexico', emoji: '🇲🇽', rank: 17 },
  { id: 'kor', name: 'South Korea', emoji: '🇰🇷', rank: 22 },
  { id: 'can', name: 'Canada', emoji: '🇨🇦', rank: 35 },
  { id: 'ksa', name: 'Saudi Arabia', emoji: '🇸🇦', rank: 56 },
];

export function calculateMatchOdds(rankA: number, rankB: number): MatchOdds {
  const rA = Math.min(48, Math.max(1, rankA));
  const rB = Math.min(48, Math.max(1, rankB));

  const strengthA = (49 - rA) / 48;
  const strengthB = (49 - rB) / 48;

  const prob_ratio_A = strengthA / (strengthA + strengthB);

  const probA = prob_ratio_A * 0.75;
  const probDraw = 0.25;
  const probB = 0.75 - probA;

  const oddsA = Number((1 / probA).toFixed(2));
  const oddsB = Number((1 / probB).toFixed(2));
  const oddsDraw = Number((1 / probDraw).toFixed(2));

  return {
    home: Math.min(25, Math.max(1.1, oddsA)),
    draw: oddsDraw,
    away: Math.min(25, Math.max(1.1, oddsB)),
  };
}

export const dbService = {
  initializeDB(): void {
    // No-op: handled by backend server
  },

  async resetToDefault(): Promise<void> {
    const response = await fetch('/api/init-db', { method: 'POST' });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to reset database');
    }
  },

  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/users');
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  async getCurrentUser(): Promise<User | null> {
    const id = localStorage.getItem('wc_bet_logged_in_user_id');
    if (!id) return null;
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  },

  async setCurrentUser(id: string): Promise<User | null> {
    localStorage.setItem('wc_bet_logged_in_user_id', id);
    return this.getCurrentUser();
  },

  async registerUser(username: string, startingCoins: number = 500): Promise<User> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, startingCoins }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to register user');
    }
    return response.json();
  },

  async updateUserCoins(userId: string, amount: number): Promise<User> {
    const response = await fetch(`/api/users/${userId}/coins`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coins: amount }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update user coins');
    }
    return response.json();
  },

  async updateUserPoints(userId: string, points: number): Promise<User> {
    const response = await fetch(`/api/users/${userId}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update user points');
    }
    return response.json();
  },

  async getMatches(): Promise<Match[]> {
    const response = await fetch('/api/matches');
    if (!response.ok) {
      throw new Error('Failed to fetch matches');
    }
    return response.json();
  },

  async createMatch(
    teamAName: string,
    teamBName: string,
    teamAEmoji: string,
    teamBEmoji: string,
    teamARank: number,
    teamBRank: number,
    kickoffTime: string
  ): Promise<Match> {
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamAName, teamBName, teamAEmoji, teamBEmoji, teamARank, teamBRank, kickoffTime }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create match');
    }
    return response.json();
  },

  async updateMatchOdds(matchId: string, customOdds: MatchOdds): Promise<Match> {
    const response = await fetch(`/api/matches/${matchId}/odds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customOdds }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update match odds');
    }
    return response.json();
  },

  async updateMatchLiveStatus(matchId: string, status: MatchStatus, scoreA: number | null, scoreB: number | null): Promise<Match> {
    const response = await fetch(`/api/matches/${matchId}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, scoreA, scoreB }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update match live status');
    }
    return response.json();
  },

  async getTournamentBets(): Promise<TournamentBet[]> {
    const response = await fetch('/api/tournament-bets');
    if (!response.ok) {
      throw new Error('Failed to fetch tournament bets');
    }
    return response.json();
  },

  async createTournamentBet(question: string, options: { label: string; odds: number }[], kickoffTime: string): Promise<TournamentBet> {
    const response = await fetch('/api/tournament-bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options, kickoffTime }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create tournament bet');
    }
    return response.json();
  },

  async submitCommunityVote(userId: string, matchId: string, prediction: 'home' | 'draw' | 'away'): Promise<Match> {
    const response = await fetch(`/api/matches/${matchId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, prediction }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to submit vote');
    }
    return response.json();
  },

  async getWagers(): Promise<Wager[]> {
    const response = await fetch('/api/wagers');
    if (!response.ok) {
      throw new Error('Failed to fetch wagers');
    }
    return response.json();
  },

  async placeWager(
    userId: string,
    targetId: string,
    targetType: 'match_outcome' | 'match_score' | 'tournament',
    prediction: string,
    amount: number,
    odds: number,
    scoreA?: number,
    scoreB?: number
  ): Promise<Wager> {
    const response = await fetch('/api/wagers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, targetId, targetType, prediction, amount, odds, scoreA, scoreB }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to place wager');
    }
    return response.json();
  },

  async cancelWager(wagerId: string): Promise<{ success: boolean; returnedCoins: number }> {
    const response = await fetch(`/api/wagers/${wagerId}/cancel`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to cancel wager');
    }
    return response.json();
  },

  async getSystemTime(): Promise<string> {
    const response = await fetch('/api/system-time');
    if (!response.ok) {
      throw new Error('Failed to fetch system time');
    }
    return response.text();
  },

  async setSystemTime(isoString: string): Promise<string> {
    const response = await fetch('/api/system-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemTime: isoString }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to set system time');
    }
    return response.text();
  },

  async resolveMatch(matchId: string, scoreA: number, scoreB: number, status: MatchStatus = 'completed'): Promise<Match> {
    const response = await fetch(`/api/matches/${matchId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoreA, scoreB, status }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resolve match');
    }
    return response.json();
  },

  async resolveTournamentBet(betId: string, winningOptionId: string): Promise<TournamentBet> {
    const response = await fetch(`/api/tournament-bets/${betId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winningOptionId }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to resolve tournament bet');
    }
    return response.json();
  }
};
