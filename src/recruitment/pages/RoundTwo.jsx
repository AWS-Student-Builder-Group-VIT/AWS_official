import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Clock3, ExternalLink, Github, Hammer, MessagesSquare } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { normalizeGithubRepoUrl } from '../lib/github-url.js';

const formatWhen = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function RoundTwo() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const authed = useCallback(async (path, init = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/recruitment/login', { replace: true }); return null; }
    const response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    // A missing route or crashed function replies with HTML, not JSON.
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `Request failed (HTTP ${response.status}).`);
    return result;
  }, [supabase, navigate]);

  const load = useCallback(async () => {
    try {
      const result = await authed('/api/recruitment/round-2');
      if (result) setData(result);
    } catch (err) {
      setError(err.message);
    }
  }, [authed]);

  useEffect(() => { load(); }, [load]);

  if (!data && !error) {
    return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;
  }

  if (!data) {
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

  const projectTracks = data.tracks.filter((track) => track.kind === 'project');
  const interviewTracks = data.tracks.filter((track) => track.kind !== 'project');

  const summary = !projectTracks.length
    ? 'Round 2 is a project round for Technical tracks only. Your domains go straight to interview.'
    : data.open
      ? 'Build the project assigned to you for each qualified Technical track, then submit your GitHub repository.'
      : 'Round 2 has not opened yet. Your Technical tracks will appear here once it does.';

  const chip = !projectTracks.length
    ? { text: 'Direct interview', border: 'rgba(255,153,0,.45)', color: 'var(--accent)' }
    : data.open && !data.submissionsOpen
      ? { text: 'Submissions closed', border: 'rgba(239,68,68,.5)', color: 'var(--error)' }
    : data.open
      ? { text: 'Round 2 open', border: 'rgba(34,197,94,.5)', color: 'var(--success)' }
      : { text: 'Not started', border: 'var(--border)', color: 'var(--accent)' };

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="eyebrow">04 / ROUND_2</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Project round.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--muted)' }}>{summary}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span className="status-chip" style={{ borderColor: chip.border, color: chip.color }}>{chip.text}</span>
          {data.open && projectTracks.length > 0 && data.deadlineAt && (
            <span className="inline-flex items-center gap-2 font-mono text-xs" style={{ color: data.submissionsOpen ? 'var(--accent)' : 'var(--error)' }}>
              <Clock3 size={13} /> {data.submissionsOpen ? 'Submit by' : 'Closed'} {formatWhen(data.deadlineAt)}
            </span>
          )}
        </div>
      </header>

      {data.tracks.length === 0 && (
        <section className="technical-panel mt-8 p-6">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>You have not selected any domains yet.</p>
          <Link to="/recruitment/subdomain" className="action mt-5 inline-flex">Choose domains →</Link>
        </section>
      )}

      {projectTracks.length > 0 && (
        <section className="mt-8 space-y-5">
          {interviewTracks.length > 0 && <p className="label">Technical · project round</p>}
          {projectTracks.map((track) => (
            <ProjectTrack key={track.subdomainId} track={track} round={data} authed={authed} onSubmitted={load} />
          ))}
        </section>
      )}

      {interviewTracks.length > 0 && (
        <section className="mt-8">
          {projectTracks.length > 0 && <p className="label mb-3">Other domains · direct interview</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {interviewTracks.map((track) => (
              <article key={track.subdomainId} className="technical-panel min-h-48 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <span className="status-chip" style={{ borderColor: 'rgba(255,153,0,.45)', color: 'var(--accent)' }}>Direct interview</span>
                  <MessagesSquare size={20} style={{ color: 'var(--accent)' }} />
                </div>
                <h2 className="mt-6 text-xl font-bold">{track.displayName || track.domainName}</h2>
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm leading-6" style={{ color: 'var(--muted)' }}>
                    There is no project round for {track.domainName}. Once you are declared qualified in Round 1,
                    you will get a direct interview call when your interview date is allotted.
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function ProjectTrack({ track, round, authed, onSubmitted }) {
  const stateMessage = {
    round_closed: `Round 2 will start shortly.${round.startsAt ? ` Opens ${formatWhen(round.startsAt)}.` : ''}`,
    not_qualified: 'Round 2 projects are assigned to candidates qualified in this track in Round 1.',
    no_projects: 'Your project is being prepared. Check back soon.',
    deadline_passed: 'The Round 2 deadline has passed. New projects can no longer be started.',
  }[track.status];

  return (
    <article className="technical-panel p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.16em]" style={{ color: 'var(--dim)' }}>{track.domainName}</p>
          <h2 className="mt-1 text-xl font-bold">{track.name}</h2>
        </div>
        <Hammer size={20} style={{ color: 'var(--accent)' }} />
      </div>

      {!track.project ? (
        <p className="mt-5 border-t pt-4 text-sm leading-6" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>{stateMessage}</p>
      ) : (
        <>
          <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Your project · {track.project.code}</p>
            <h3 className="mt-2 text-2xl font-bold">{track.project.title}</h3>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--muted)' }}>{track.project.problemStatement}</p>
          </div>

          <div className="mt-6 border p-5" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.25)' }}>
            <p className="whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--text)' }}>{track.project.requirements}</p>
          </div>

          {track.project.bonus && (
            <div className="mt-4 border-l-2 pl-4" style={{ borderColor: 'var(--accent)' }}>
              <p className="label">Bonus (optional)</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--muted)' }}>{track.project.bonus}</p>
            </div>
          )}

          <SubmissionForm track={track} round={round} authed={authed} onSubmitted={onSubmitted} />
        </>
      )}
    </article>
  );
}

function SubmissionForm({ track, round, authed, onSubmitted }) {
  const existing = track.submission;
  const [githubUrl, setGithubUrl] = useState(existing?.githubUrl ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const closed = !round.submissionsOpen;

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!normalizeGithubRepoUrl(githubUrl)) {
      setError('Enter a link to a GitHub repository, like https://github.com/your-name/your-project.');
      return;
    }
    setSaving(true);
    try {
      await authed('/api/recruitment/round-2/submit', {
        method: 'POST',
        body: JSON.stringify({ subdomainId: track.subdomainId, githubUrl, notes }),
      });
      await onSubmitted();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label !mb-0">Submission</p>
        {existing && (
          <span className="inline-flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--success)' }}>
            <Check size={14} /> Submitted {formatWhen(existing.submittedAt)}
          </span>
        )}
      </div>

      {existing && (
        <a href={existing.githubUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 break-all text-sm hover:underline" style={{ color: 'var(--accent)' }}>
          <Github size={15} /> {existing.githubUrl} <ExternalLink size={13} />
        </a>
      )}

      {closed ? (
        <p className="mt-3 text-sm" style={{ color: existing ? 'var(--muted)' : 'var(--error)' }}>
          {existing ? 'The deadline has passed. Your submission above is final.' : 'The submission deadline has passed.'}
        </p>
      ) : (
        <>
          <label className="mt-4 block">
            <span className="label">GitHub repository link</span>
            <input type="url" required value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/your-name/your-project" className="field" />
          </label>
          <label className="mt-4 block">
            <span className="label">Notes for reviewers (optional)</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000}
              placeholder="Anything reviewers should know — setup steps, trade-offs, what you would improve." className="field resize-y" />
          </label>
          {error && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="action inline-flex items-center gap-2">
              <Github size={15} /> {saving ? 'Submitting…' : existing ? 'Update submission' : 'Submit project'}
            </button>
            <span className="text-xs" style={{ color: 'var(--dim)' }}>
              Make sure the repository is public.{round.deadlineAt ? ` You can update it until ${formatWhen(round.deadlineAt)}.` : ''}
            </span>
          </div>
        </>
      )}
    </form>
  );
}
