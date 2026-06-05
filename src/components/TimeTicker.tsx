import React from 'react';
import { Clock } from 'lucide-react';
import { User } from '../types';

interface TimeTickerProps {
  currentUser: User | null;
  systemTime: string;
  isSandboxMode: boolean;
  handleAdjustTime: (newTimeStr: string) => Promise<void>;
  handleQuickSeedResults: () => Promise<void>;
}

export default function TimeTicker({
  currentUser,
  systemTime,
  isSandboxMode,
  handleAdjustTime,
  handleQuickSeedResults,
}: TimeTickerProps) {
  if (!currentUser) return null;

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

  return (
    <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-5 text-sm">
      <div className="flex items-center gap-2.5">
        <Clock className="w-4.5 h-4.5 text-sky-500 animate-pulse" />
        <span className="text-slate-500 font-mono">
          {isSandboxMode && currentUser.role === 'admin' ? 'Simulated Game Time:' : 'Server Time:'}
        </span>
        <span className="text-sky-700 bg-sky-50 px-4 py-1.5 rounded-full border border-sky-100 font-bold text-xs uppercase font-mono shadow-inner">
          {formatTime(systemTime)}
        </span>
      </div>

      {currentUser.role === 'admin' ? (
        isSandboxMode ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 text-xs font-mono uppercase">Jump:</span>
            <button
              onClick={() => handleAdjustTime('2026-06-12T17:00:00Z')}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono border border-slate-200 shadow-sm transition duration-200 cursor-pointer"
              title="1 hour before the World Cup opening kickoff"
            >
              1h Before Match 1
            </button>
            <button
              onClick={() => handleAdjustTime('2026-06-12T19:00:00Z')}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono border border-slate-200 shadow-sm transition duration-200 cursor-pointer"
              title="Match 1 started"
            >
              Opening Match Blocked
            </button>
            <button
              onClick={() => handleAdjustTime('2026-06-13T19:00:00Z')}
              className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono border border-slate-200 shadow-sm transition duration-200 cursor-pointer"
              title="Later stages"
            >
              Day 2 Kickoff
            </button>
            <button
              onClick={handleQuickSeedResults}
              className="bg-emerald-50 hover:bg-emerald-100/60 border border-emerald-200 text-emerald-700 px-4.5 py-2 rounded-xl text-xs font-bold transition duration-200 font-mono uppercase tracking-wider shadow-sm cursor-pointer ml-2"
              title="Resolves Match 1 & Match 2 with scores to demonstrate coins moving live!"
            >
              🪄 1-Click Resolve Matches
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-1">
            <span className="text-slate-405 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              🔒 Sandbox Clock Adjustments & Fast-Resolve Triggers disabled in active Production Environment
            </span>
          </div>
        )
      ) : null}
    </div>
  );
}
