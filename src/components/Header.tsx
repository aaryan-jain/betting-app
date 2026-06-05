import React from 'react';
import { User as UserIcon, Plus } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  users: User[];
  isSandboxMode: boolean;
  handleToggleMode: () => void;
  handleSwitchUser: (userId: string) => Promise<void>;
  setIsRegistering: (val: boolean) => void;
  handleLogout: () => void;
}

export default function Header({
  currentUser,
  users,
  isSandboxMode,
  handleToggleMode,
  handleSwitchUser,
  setIsRegistering,
  handleLogout,
}: HeaderProps) {
  if (!currentUser) return null;

  return (
    <header className="flex flex-col md:flex-row items-center justify-between bg-white/85 border border-slate-200/80 p-5 rounded-3xl shadow-sm gap-5 backdrop-blur-md">
      
      {/* Logo Title & Meta */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white text-xl shadow-md flex-shrink-0">
          WC
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="bg-sky-50 border border-sky-200 text-sky-700 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              WORLD CUP 2026
            </span>
            <span className="text-slate-400 text-[10px] font-mono">
              College Friend Circle P2P
            </span>
            {isSandboxMode ? (
              <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                🧪 Sandbox
              </span>
            ) : (
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">
                🚀 Production
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-1 uppercase">
            Coucou FIFA <span className="text-sky-600 font-bold">Betting Hub</span>
          </h1>
        </div>
      </div>

      {/* Wallet and Simulator Controller */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 w-full md:w-auto">
        
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-sm">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="block text-slate-400 text-[9px] font-mono uppercase tracking-wider">Simulated Session</span>
            <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
              {currentUser.username}
              {currentUser.role === 'admin' && (
                <span className="bg-sky-50 text-sky-700 border border-sky-200 text-[9px] px-2 py-0.5 rounded font-bold ml-1 font-mono uppercase">
                  Host
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Wallet Capsule */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200/80">
          <span className="text-slate-400 text-[10px] font-semibold uppercase font-mono">Wallet</span>
          <span className="text-sky-600 font-mono font-bold flex items-center gap-1 text-sm">
            {currentUser.coins} 🪙
          </span>
          <span className="text-slate-300 font-mono text-xs">•</span>
          <span className="text-emerald-600 font-mono font-bold flex items-center gap-1 text-sm">
            {currentUser.points} pts
          </span>
        </div>

        {/* Profile Swapper & Registration Trigger / Admin Mode Toggler */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={handleToggleMode}
                className={`text-[10px] font-bold font-mono uppercase tracking-wider px-3.5 py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  isSandboxMode
                    ? 'bg-amber-50 hover:bg-amber-100/50 text-amber-700 border-amber-200 shadow-sm'
                    : 'bg-emerald-50 hover:bg-emerald-100/50 text-emerald-700 border-emerald-200 shadow-sm'
                }`}
                title={`Click to toggle system mode (Current: ${isSandboxMode ? 'Sandbox' : 'Production'})`}
              >
                {isSandboxMode ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    🧪 Go Pro mode
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    🚀 Go Sandbox
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={currentUser.id}
                  onChange={(e) => handleSwitchUser(e.target.value)}
                  className="bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 font-mono cursor-pointer"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      👤 {u.username} ({u.coins} 🪙)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsRegistering(true)}
                  className="bg-sky-500 hover:bg-sky-600 text-white text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 font-bold transition-all duration-200 shadow-sm shadow-sky-500/10 cursor-pointer"
                  title="Add another friend to the league"
                >
                  <Plus className="w-3.5 h-3.5 text-white" /> Join
                </button>
              </div>
            </>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-slate-600 text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all duration-200 uppercase tracking-wider font-mono shadow-sm cursor-pointer"
            title="Logout from active session"
          >
            Sign Out
          </button>
        </div>

      </div>
    </header>
  );
}
