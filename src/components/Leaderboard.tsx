import React from 'react';
import { TrendingUp } from 'lucide-react';
import { User } from '../types';

interface LeaderboardProps {
  users: User[];
  currentUser: User | null;
  setAdjustingUserId: (id: string | null) => void;
  setAdjustCoinsAmount: (amount: number) => void;
  handleResetDBDirect: () => Promise<void>;
}

export default function Leaderboard({
  users,
  currentUser,
  setAdjustingUserId,
  setAdjustCoinsAmount,
  handleResetDBDirect,
}: LeaderboardProps) {
  // Sort Users for Leaderboard (Total coins remaining first, ties broken by Points)
  const leaderboardUsers = [...users].sort((a, b) => {
    if (b.coins !== a.coins) {
      return b.coins - a.coins;
    }
    return b.points - a.points;
  });

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
          📊 Friendship Standings
        </h3>
        <TrendingUp className="w-5 h-5 text-sky-500" />
      </div>

      <p className="text-xs text-slate-500 leading-relaxed font-mono">
        College friend-group standings. Tied rankings resolved by <strong className="text-sky-600">Total Coins</strong>, then <strong className="text-sky-600">Points</strong>.
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
              className={`p-4 rounded-2xl flex items-center justify-between transition-all duration-150 ${
                isActive
                  ? 'bg-sky-50/70 border border-sky-200 shadow-sm'
                  : 'bg-white border border-slate-200/60 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono text-xs font-bold text-slate-400">{rankBadge}</span>
                <div>
                  <span className="text-slate-800 text-xs font-bold flex items-center gap-1.5 tracking-tight">
                    {user.username}
                    {user.role === 'admin' && (
                      <span className="bg-sky-50 border border-sky-100 text-[8px] text-sky-700 font-bold px-1.5 py-0.5 rounded-full font-mono uppercase">
                        Host
                      </span>
                    )}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono tracking-tight mt-0.5">
                    Joined {new Date(user.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="text-right flex items-center gap-3">
                <div className="text-right">
                  <span className="block text-xs font-mono font-bold text-sky-600">{user.coins} 🪙</span>
                  <span className="block text-[10px] font-mono text-slate-500 font-bold mt-0.5">{user.points} pts</span>
                </div>

                {/* Admin edit trigger for Alex to change anyone's coin values */}
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setAdjustingUserId(user.id);
                      setAdjustCoinsAmount(user.coins);
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-[10px] text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-xl font-bold font-mono transition shadow-sm cursor-pointer"
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
        <div className="mt-2 text-center border-t border-slate-100 pt-4">
          <button
            onClick={handleResetDBDirect}
            className="text-[10px] text-slate-400 font-bold font-mono uppercase tracking-wider hover:text-rose-500 transition cursor-pointer"
          >
            Reset Database to Seed Baseline
          </button>
        </div>
      )}
    </div>
  );
}
