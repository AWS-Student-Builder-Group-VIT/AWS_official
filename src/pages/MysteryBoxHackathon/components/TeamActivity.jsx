import { useEffect, useState } from 'react';
import { fetchTeamGameScores } from '../../../utils/auth';
import { startGameScorePolling } from '../gameScorePolling';

export default function TeamActivity({ team }) {
  const [summary,setSummary] = useState(null);
  useEffect(() => startGameScorePolling({loadScores:()=>fetchTeamGameScores(team.code),onSuccess:setSummary}),[team.code]);
  return <section className="bg-white/[0.02] border border-white/5 p-6 rounded-[24px]">
    <h4 className="text-primary-container uppercase tracking-widest">Team Activity</h4>
    <dl className="text-sm space-y-3">
      {Object.entries({'Points earned':summary?.earnedPoints ?? '…','Points spent':summary?.spentPoints ?? '…','Official games':summary ? `${summary.usedAttempts}/${summary.maxAttempts}` : '…','Spins remaining':`${team.remainingSpins ?? 5}/5`,'Free change cards':team.freeChangeCards ?? 0}).map(([label,value])=><div className="flex justify-between" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p className="text-xs uppercase mt-6">Recent point activity</p>
    {!summary?.ledger?.length && <p className="text-xs text-on-surface-variant">No recorded point activity yet.</p>}
    {summary?.ledger?.slice(0,5).map(entry=><div key={`${entry.sourceType}:${entry.sourceRef}`} className="flex justify-between gap-3 border-b border-white/10 py-2 text-xs"><span>{entry.reason}</span><b>{entry.delta>0?'+':''}{entry.delta}</b></div>)}
  </section>;
}
