import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Hammer } from 'lucide-react';
import { createClient } from '../lib/supabase.js';

export default function RoundTwo() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/recruitment/login', { replace: true }); return; }
    try {
      const response = await fetch('/api/recruitment/round-2', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      // A missing route or crashed function replies with HTML, not JSON.
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Unable to load Round 2 (HTTP ${response.status}).`);
      setData(result);
    } catch (err) {
      setError(err.message);
    }
  }, [supabase, navigate]);

  useEffect(() => { load(); }, [load]);

  if (!data && !error) {
    return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-5 sm:p-8">
        <section className="technical-panel p-6">
          <p className="eyebrow">ROUND 2 / PROJECT</p>
          <h1 className="mt-3 text-2xl font-bold">Round 2 could not be loaded.</h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          <Link to="/recruitment/dashboard" className="action-secondary mt-6 inline-flex">Back to dashboard</Link>
        </section>
      </main>
    );
  }

  const startsLabel = data.startsAt ? new Date(data.startsAt).toLocaleString() : null;

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="eyebrow">04 / ROUND_2</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Project round.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {data.open
              ? 'Open your problem statement for each selected track and build it.'
              : 'Round 2 has not opened yet. Each selected track will appear here once it does.'}
          </p>
        </div>
        <span className="status-chip self-start" style={{ borderColor: data.open ? 'rgba(34,197,94,.5)' : 'var(--border)', color: data.open ? 'var(--success)' : 'var(--accent)' }}>
          {data.open ? 'Round 2 open' : 'Not started'}
        </span>
      </header>

      {data.tracks.length === 0 ? (
        <section className="technical-panel mt-8 p-6">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>You have not selected any domains yet.</p>
          <Link to="/recruitment/subdomain" className="action mt-5 inline-flex">Choose domains →</Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {data.tracks.map((track, index) => (
            <article key={track.subdomainId} className="technical-panel min-h-56 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{String(index + 1).padStart(2, '0')}</span>
                <Hammer size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="mt-6 font-mono text-[10px] uppercase tracking-[.16em]" style={{ color: 'var(--dim)' }}>{track.domainName}</p>
              <h2 className="mt-2 text-xl font-bold">{track.name}</h2>

              {!data.open ? (
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Round 2 will start shortly.</p>
                  {startsLabel && <p className="mt-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>Opens {startsLabel}</p>}
                </div>
              ) : track.project ? (
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="font-semibold">{track.project.title}</p>
                  <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>{track.project.problem_statement}</p>
                  {track.guidelines && <p className="mt-3 whitespace-pre-wrap text-xs leading-5" style={{ color: 'var(--dim)' }}>{track.guidelines}</p>}
                  {track.project.task_document_url && (
                    <a href={track.project.task_document_url} target="_blank" rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase" style={{ color: 'var(--accent)' }}>
                      Task document <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>Your problem statement is being prepared.</p>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
