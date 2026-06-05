import React from 'react';
import { Trophy, User as UserIcon, AlertTriangle, Check } from 'lucide-react';
import { User } from '../types';

interface AuthProps {
  users: User[];
  loginUsername: string;
  setLoginUsername: (val: string) => void;
  handleLoginSubmit: (e: React.FormEvent) => void;
  isSandboxMode: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export default function Auth({
  users,
  loginUsername,
  setLoginUsername,
  handleLoginSubmit,
  isSandboxMode,
  errorMessage,
  successMessage,
}: AuthProps) {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-sky-50/50 text-slate-800 font-sans p-6 overflow-x-hidden flex flex-col items-center justify-center gap-8 relative">
      
      {/* Background Soft Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-sky-200/40 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none"></div>

      {/* Header Branding */}
      <div className="text-center z-10 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl shadow-lg shadow-sky-500/20 mb-4 transform hover:rotate-6 transition duration-300">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold font-display tracking-tight text-slate-900 uppercase text-center">
          Coucou FIFA <span className="text-sky-600">Betting Hub</span>
        </h1>
        <p className="text-xs text-slate-500 font-mono tracking-wider uppercase mt-2">
          College Friend Circle P2P League
        </p>
        <div className="mt-4 flex justify-center">
          {isSandboxMode ? (
            <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] px-3.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              🧪 Sandbox Mode Active
            </span>
          ) : (
            <span className="bg-emerald-50 border border-emerald-250 text-emerald-700 text-[10px] px-3.5 py-1 rounded-full font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              🚀 Production Mode Live
            </span>
          )}
        </div>
      </div>

      {/* Login Card */}
      <div className="bg-white/80 border border-slate-200/80 p-8 md:p-10 rounded-3xl shadow-xl backdrop-blur-md w-full max-w-md z-10">
        <h2 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest text-center mb-8">
          Sign In to your Player Account
        </h2>

        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-6">
          <div className="relative">
            <label htmlFor="login-username" className="block text-[10px] text-slate-500 font-mono font-bold uppercase mb-2">
              Enter Username / Handle
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                id="login-username"
                list="registered-users"
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full bg-slate-50/50 text-slate-800 rounded-xl border border-slate-200 pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-sky-500 font-sans shadow-inner transition duration-200"
                placeholder="e.g. AJ (Tactician)"
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
            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white text-xs py-4 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider shadow-lg shadow-sky-500/10 cursor-pointer"
          >
            Enter Betting Desk
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 pt-6 text-center">
          <p className="text-[10px] text-slate-450 font-mono leading-relaxed">
            ⚠️ User registration is restricted to Administrators.<br />
            Please contact the League Host to set up a new account.
          </p>
        </div>
      </div>

      {/* Floater Notifications */}
      <div className="fixed bottom-6 right-6 max-w-sm z-50 flex flex-col gap-2">
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

    </div>
  );
}
