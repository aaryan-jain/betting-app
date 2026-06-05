import React, { useState } from 'react';
import { Sliders, Award } from 'lucide-react';
import { INITIAL_TEAMS } from '../services/dbService';
import { User, Match, Wager } from '../types';

interface AdminConsoleProps {
  users: User[];
  matches: Match[];
  wagers: Wager[];
  isSandboxMode: boolean;
  handleCreateCustomMatch: (teamAId: string, teamBId: string, kickoffTime: string) => Promise<void>;
  handleCreateTournamentBet: (question: string, optionsText: string, deadline: string) => Promise<void>;
}

export default function AdminConsole({
  users,
  matches,
  wagers,
  isSandboxMode,
  handleCreateCustomMatch,
  handleCreateTournamentBet,
}: AdminConsoleProps) {
  // Local Form States
  const [newMatchA, setNewMatchA] = useState(INITIAL_TEAMS[0].id);
  const [newMatchB, setNewMatchB] = useState(INITIAL_TEAMS[1].id);
  const [newMatchKickoff, setNewMatchKickoff] = useState('2026-06-12T18:00:00');

  const [customBetName, setCustomBetName] = useState('');
  const [customBetDeadline, setCustomBetDeadline] = useState('2026-06-12T18:00:00');
  const [customBetOptions, setCustomBetOptions] = useState<string>('Argentina 🇦🇷:4.5\nFrance 🇫🇷:5.0\nBrazil 🇧🇷:5.5');

  const onScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateCustomMatch(newMatchA, newMatchB, newMatchKickoff);
  };

  const onCreateProp = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateTournamentBet(customBetName, customBetOptions, customBetDeadline);
    setCustomBetName('');
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
      
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-sky-500" />
          <h3 className="text-base font-bold font-mono text-slate-800 uppercase tracking-wider">
            🛡️ Host Administration Desk
          </h3>
        </div>
        {isSandboxMode ? (
          <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 px-3.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider animate-pulse">
            🧪 Full Host Sandbox Active
          </span>
        ) : (
          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider">
            🚀 Production Mode Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Schedule Custom Match Form */}
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">
            ⚽ Schedule Custom Match
          </h4>
          
          <form onSubmit={onScheduleMatch} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Pick Home Team:</label>
              <select
                value={newMatchA}
                onChange={(e) => setNewMatchA(e.target.value)}
                className="w-full bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 transition duration-150 cursor-pointer"
              >
                {INITIAL_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.name} (FIFA #{t.rank})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Pick Away Team:</label>
              <select
                value={newMatchB}
                onChange={(e) => setNewMatchB(e.target.value)}
                className="w-full bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 transition duration-150 cursor-pointer"
              >
                {INITIAL_TEAMS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.emoji} {t.name} (FIFA #{t.rank})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Kickoff Time Stamp:</label>
              <input
                type="datetime-local"
                value={newMatchKickoff}
                onChange={(e) => setNewMatchKickoff(e.target.value)}
                className="w-full bg-white text-slate-700 font-mono text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs py-3 rounded-xl font-bold tracking-wider uppercase transition font-mono cursor-pointer shadow-md shadow-sky-500/5"
            >
              Schedule Match
            </button>
          </form>
        </div>

        {/* Create Tournament Prop Form */}
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 flex flex-col gap-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">
            🏅 Add Custom Tournament Prop
          </h4>
          
          <form onSubmit={onCreateProp} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Bet Question:</label>
              <input
                type="text"
                value={customBetName}
                onChange={(e) => setCustomBetName(e.target.value)}
                className="w-full bg-white text-slate-700 text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 font-sans"
                placeholder="e.g. Which team will reach final?"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Options & Odds Weights (Label:Weight):</label>
              <textarea
                rows={3}
                value={customBetOptions}
                onChange={(e) => setCustomBetOptions(e.target.value)}
                className="w-full bg-white text-slate-700 font-mono text-xs rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:border-sky-500"
                placeholder="Brazil:3.50&#10;Spain:4.00"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 font-bold uppercase font-mono mb-1.5">Time Lock Deadline:</label>
              <input
                type="datetime-local"
                value={customBetDeadline}
                onChange={(e) => setCustomBetDeadline(e.target.value)}
                className="w-full bg-white text-slate-700 font-mono text-xs rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:border-sky-500 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs py-3 rounded-xl font-bold tracking-wider uppercase transition font-mono cursor-pointer shadow-md shadow-sky-500/5"
            >
              Add Custom Bet Target
            </button>
          </form>
        </div>

        {/* Dynamic Sandbox Logs Panel */}
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 text-xs text-slate-550 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider mb-4">
              📌 Dynamic Sandbox Logs
            </h4>
            <ul className="flex flex-col gap-3 font-mono text-[11px] leading-relaxed">
              <li className="flex items-center justify-between border-b border-slate-200/40 pb-1.5">
                <span>🟢 Registered college users:</span>
                <span className="text-sky-600 font-bold">{users.length} friends</span>
              </li>
              <li className="flex items-center justify-between border-b border-slate-200/40 pb-1.5">
                <span>🟢 Scheduled Cup Games:</span>
                <span className="text-sky-600 font-bold">{matches.length} matches</span>
              </li>
              <li className="flex items-center justify-between pb-1.5">
                <span>🟢 Active wagers executed:</span>
                <span className="text-sky-600 font-bold">{wagers.length} slips</span>
              </li>
            </ul>
            <p className="mt-5 text-slate-500 text-[10px] leading-relaxed font-mono uppercase tracking-wider">
              Resolving matches distributes coins immediately. Unmatched opposing slips are refunded cleanly.
            </p>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">World Cup Hub</span>
            <Award className="w-5 h-5 text-sky-500" />
          </div>
        </div>

      </div>

    </div>
  );
}
