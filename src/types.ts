/**
 * Types and interfaces for the FIFA World Cup Betting Application
 */

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  coins: number;
  points: number;
  joinedAt: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface MatchOdds {
  home: number;
  draw: number;
  away: number;
}

export interface MatchVotes {
  home: number;
  draw: number;
  away: number;
}

export interface Match {
  id: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  teamAEmoji: string;
  teamBEmoji: string;
  teamARank: number;
  teamBRank: number;
  kickoffTime: string; // ISO date string
  odds: MatchOdds;
  status: MatchStatus;
  scoreA: number | null;
  scoreB: number | null;
  votes: MatchVotes;
  isAutoCreated: boolean;
}

export type TournamentBetStatus = 'scheduled' | 'completed' | 'cancelled';

export interface TournamentBetOption {
  id: string;
  label: string;
  odds: number;
}

export interface TournamentBet {
  id: string;
  question: string;
  options: TournamentBetOption[];
  kickoffTime: string; // ISO date string
  status: TournamentBetStatus;
  winningOptionId: string | null; // ID of the correct option
}

export type WagerPrediction = 'home' | 'draw' | 'away' | string; // 'home'/'draw'/'away' for matches, or optionId for tournament bets, or exact score string like "2-1"

export type WagerStatus = 'pending' | 'matched' | 'resolved' | 'cancelled';

export interface Wager {
  id: string;
  userId: string;
  userUsername: string;
  targetId: string; // Match ID or Tournament Bet ID
  targetType: 'match_outcome' | 'match_score' | 'tournament';
  prediction: WagerPrediction; // 'home'|'draw'|'away' (for outcome), or string "2-1" (for exact score), or optionId (for tournament)
  exactScoreA?: number; // only if match_score
  exactScoreB?: number; // only if match_score
  amount: number; // wagered coins
  status: WagerStatus;
  oddsAtWager: number; // the odds locked in when bet was placed
  payoutPoints: number; // points gained (if resolved & correct)
  payoutCoins: number; // coins earned (if resolved & correct, net return)
  resolvedAt?: string;
  createdAt: string;
}

export interface Vote {
  id: string;
  userId: string;
  matchId: string;
  prediction: 'home' | 'draw' | 'away';
}
