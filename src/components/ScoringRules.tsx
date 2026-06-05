import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function ScoringRules() {
  return (
    <div className="glass-panel p-6 text-xs text-slate-500 leading-relaxed font-mono flex flex-col gap-4">
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-mono flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <HelpCircle className="w-4.5 h-4.5 text-sky-500" /> Scoring & Formula
      </h4>
      <ul className="flex flex-col gap-3">
        <li>
          🏆 <strong className="text-slate-700">Point Awards Schema:</strong>
          <ul className="pl-4 mt-1.5 list-disc text-[11px] text-slate-500 flex flex-col gap-1">
            <li>Correct Match Result: <span className="text-sky-600 font-bold">3 pts</span></li>
            <li>Correct Exact Score: <span className="text-sky-600 font-bold">6 pts</span></li>
            <li>Correct Tournament Outcome: <span className="text-sky-600 font-bold">10 pts</span></li>
          </ul>
        </li>
        <li>
          🤖 <strong className="text-slate-700">Formula Implied Win Chance:</strong>
          <p className="mt-1 text-[11px] text-slate-500 leading-normal font-mono normal-case">
            strength = (49 - FIFA_rank) / 48.<br />
            probA = (strengthA / (strengthA + strengthB)) * 0.75.<br />
            Draw Prob: Flat 25%.<br />
            Win Probability = probability * 100%.<br />
            Implied Weight = 1 / probability.
          </p>
        </li>
        <li>
          💼 <strong className="text-slate-700">Host Commission Cut:</strong>
          <p className="mt-1 text-[11px] text-slate-500 leading-normal">
            To reward host server maintenance, <strong className="text-sky-600 font-bold">10% of total coins pool</strong> from execution stakes is routed to Admin (Alex/Vaasan). 90% is split proportionally among winners.
          </p>
        </li>
      </ul>
    </div>
  );
}
