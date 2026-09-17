import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Mail, RotateCcw, X } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { formatDateTime } from '../lib/utils.js';

function humanize(value) { return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Not started'; }
function initials(name = '') { return name.split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase(); }
function scorePercent(attempt) { return attempt?.score == null || !attempt.total_marks ? null : Math.round((attempt.score / attempt.total_marks) * 100); }

const decisionStyle = {
  true: { text: 'Qualified', color: 'var(--success)', border: 'rgba(34,197,94,.5)', bg: 'rgba(34,197,94,.08)' },
  false: { text: 'Not qualified', color: 'var(--error)', border: 'rgba(239,68,68,.5)', bg: 'rgba(239,68,68,.08)' },
  null: { text: 'Pending', color: 'var(--warning)', border: 'var(--border)', bg: 'rgba(0,0,0,.3)' },
};

function Section({ title, children, aside }) {
  return (
    <section className="border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
        <h2 className="font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Data({ label, value }) {
  return <div><dt className="font-mono text-[10px] uppercase" style={{ color: 'var(--dim)' }}>{label}</dt><dd className="mt-1 break-words text-sm" style={{ color: 'var(--text)' }}>{value}</dd></div>;
}

export default function CandidateDossier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [dossier, setDossier] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const api = useCallback(async (path, init = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/recruitment/admin/login', { replace: true }); return null; }
    const response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `Request failed (HTTP ${response.status}).`);
    return result;
  }, [supabase, navigate]);

  useEffect(() => {
    let cancelled = false;
    api(`/api/recruitment/admin/candidates/${encodeURIComponent(id)}`)
      .then((result) => { if (!cancelled && result) setDossier(result); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [api, id]);

  async function decide(subdomainId, qualified) {
    setBusy(subdomainId); setError('');
    try {
      const result = await api(`/api/recruitment/admin/candidates/${encodeURIComponent(id)}/qualify`, { method: 'POST', body: JSON.stringify({ subdomainId, qualified }) });
      if (result) setDossier(result);
    } catch (err) { setError(err.message); }
    setBusy('');
  }

  async function toggleMarks(attempt) {
    setBusy(attempt.id); setError('');
    try {
      await api('/api/recruitment/admin/assessments/release', { method: 'POST', body: JSON.stringify({ attempt_id: attempt.id, release: !attempt.results_released_at }) });
      setDossier(await api(`/api/recruitment/admin/candidates/${encodeURIComponent(id)}`));
    } catch (err) { setError(err.message); }
    setBusy('');
  }

  // Deleting is irreversible, so it asks for the registration number first.
  async function deleteCandidate() {
    const { profile } = dossier;
    const typed = prompt(`This permanently deletes ${profile.full_name} and all of their recruitment data.\n\nType their registration number (${profile.registration_number}) to confirm:`);
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== (profile.registration_number ?? '').toLowerCase()) { setError('Registration number did not match. Nothing was deleted.'); return; }
    setBusy('delete'); setError('');
    try {
      await api(`/api/recruitment/admin/candidates?id=${encodeURIComponent(profile.id)}`, { method: 'DELETE' });
      navigate('/recruitment/admin/candidates', { replace: true });
    } catch (err) { setError(err.message); setBusy(''); }
  }

  const back = (
    <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/recruitment/admin/candidates'))}
      className="inline-flex items-center gap-2 font-mono text-xs hover:underline" style={{ color: 'var(--muted)' }}>
      <ArrowLeft size={14} /> Back
    </button>
  );

  if (!dossier) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        {back}
        {error
          ? <p role="alert" className="mt-6 text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          : <div className="mt-16 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>}
      </main>
    );
  }

  const { profile, tracks, assignments, bookings, result, writtenAnswers } = dossier;

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      {back}
      <header className="mt-5 flex flex-wrap items-start justify-between gap-5 border-b pb-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center border font-mono text-lg font-bold" style={{ borderColor: 'rgba(255,153,0,.5)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}>{initials(profile.full_name)}</span>
          <div>
            <p className="eyebrow">CANDIDATE DOSSIER</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{profile.full_name}</h1>
            <p className="mt-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>#{profile.registration_number}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase">
          <span className="border px-3 py-2" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Stage: {humanize(profile.status)}</span>
          <span className="border px-3 py-2" style={{ borderColor: 'var(--border)', color: profile.round_0_status === 'qualified' ? 'var(--success)' : profile.round_0_status === 'not_qualified' ? 'var(--error)' : 'var(--muted)' }}>Round 1: {humanize(profile.round_0_status)}</span>
        </div>
      </header>

      {error && <div role="alert" className="mt-5 border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-5">
          <Section title="Identity">
            <dl className="grid grid-cols-2 gap-4">
              <Data label="Email" value={profile.email} />
              <Data label="Phone" value={profile.phone ?? 'Not provided'} />
              <Data label="Branch" value={profile.branch ?? '—'} />
              <Data label="Year" value={profile.year ?? '—'} />
              <Data label="Applied" value={profile.created_at ? formatDateTime(profile.created_at) : '—'} />
            </dl>
            <a href={`mailto:${profile.email}`} className="mt-4 inline-flex items-center gap-2 border px-3 py-2 font-mono text-[10px] transition" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><Mail size={13} />EMAIL</a>
          </Section>

          <Section title="Round 2 · Projects">
            <div className="space-y-3">
              {assignments.length ? assignments.map((assignment) => {
                const submission = Array.isArray(assignment.submission) ? assignment.submission[0] : assignment.submission;
                const evaluation = Array.isArray(submission?.evaluation) ? submission.evaluation[0] : submission?.evaluation;
                return (
                  <div key={assignment.id} className="border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.3)' }}>
                    <p className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>{assignment.project?.code ?? 'PROJECT'} · {humanize(assignment.status)}</p>
                    <p className="mt-1 text-sm font-semibold">{assignment.project?.title ?? 'Unavailable'}</p>
                    {submission
                      ? <>
                        <a href={submission.github_url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs hover:underline" style={{ color: 'var(--accent)' }}>{submission.github_url} ↗</a>
                        {submission.notes && <p className="mt-2 whitespace-pre-wrap text-xs" style={{ color: 'var(--muted)' }}>{submission.notes}</p>}
                        <p className="mt-2 font-mono text-[10px]" style={{ color: evaluation ? 'var(--success)' : 'var(--warning)' }}>{evaluation ? `Evaluation: ${evaluation.total_score ?? '—'}/100` : `Submitted ${formatDateTime(submission.submitted_at)} · awaiting evaluation`}</p>
                      </>
                      : <p className="mt-2 font-mono text-[10px]" style={{ color: 'var(--warning)' }}>Not submitted</p>}
                  </div>
                );
              }) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No projects assigned.</p>}
            </div>
          </Section>

          <Section title="Round 3 · Interviews">
            {bookings.length ? bookings.map((b) => (
              <p key={b.id} className="text-sm">{b.slot?.date?.date ?? '—'} · {b.slot?.slot_time ?? ''} {b.slot?.date?.location ? `· ${b.slot.date.location}` : ''}</p>
            )) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No interview booked.</p>}
          </Section>

          <Section title="Final decision">
            <p className="font-mono text-sm" style={{ color: result?.result === 'selected' ? 'var(--success)' : result?.result === 'not_selected' ? 'var(--error)' : 'var(--accent)' }}>{humanize(result?.result ?? profile.final_status ?? 'pending')}</p>
            {result?.feedback && <p className="mt-2 text-xs leading-5" style={{ color: 'var(--muted)' }}>{result.feedback}</p>}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Round 1 · Qualify by domain">
            <p className="mb-4 text-xs leading-5" style={{ color: 'var(--muted)' }}>
              Decide each domain separately. Qualified in any domain moves the candidate on; not qualified in every domain rejects them.
              Technical tracks that are qualified get a Round 2 project.
            </p>
            <div className="space-y-3">
              {tracks.length ? tracks.map((track) => {
                const style = decisionStyle[String(track.decision)];
                const pct = scorePercent(track.attempt);
                const noAttempt = track.technical && !track.attempt;
                const saving = busy === track.subdomainId;
                return (
                  <div key={track.subdomainId} className="border p-4" style={{ borderColor: style.border, background: style.bg }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{track.label}</p>
                        <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--dim)' }}>
                          {track.technical
                            ? track.attempt
                              ? `Assessment ${pct == null ? 'unscored' : `${track.attempt.score}/${track.attempt.total_marks} (${pct}%)`} · ${humanize(track.attempt.status)}${track.attempt.auto_submitted ? ' · auto-submitted' : ''}`
                              : 'Assessment not taken'
                            : 'Written responses below'}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] font-bold uppercase" style={{ color: style.color }}>{style.text}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={saving || noAttempt || track.decision === true} onClick={() => decide(track.subdomainId, true)}
                        className="inline-flex items-center gap-1 border px-3 py-2 font-mono text-[10px] font-bold uppercase transition disabled:opacity-35"
                        style={{ borderColor: 'rgba(34,197,94,.6)', color: 'var(--success)' }}><Check size={12} />Qualify</button>
                      <button type="button" disabled={saving || noAttempt || track.decision === false} onClick={() => decide(track.subdomainId, false)}
                        className="inline-flex items-center gap-1 border px-3 py-2 font-mono text-[10px] font-bold uppercase transition disabled:opacity-35"
                        style={{ borderColor: 'rgba(239,68,68,.6)', color: 'var(--error)' }}><X size={12} />Not qualified</button>
                      {track.decision != null && (
                        <button type="button" disabled={saving} onClick={() => decide(track.subdomainId, null)}
                          className="inline-flex items-center gap-1 border px-3 py-2 font-mono text-[10px] uppercase transition disabled:opacity-35"
                          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}><RotateCcw size={12} />Reset</button>
                      )}
                      {track.attempt?.status === 'submitted' && (
                        <button type="button" disabled={busy === track.attempt.id} onClick={() => toggleMarks(track.attempt)}
                          className="ml-auto border px-3 py-2 font-mono text-[10px] uppercase transition disabled:opacity-35"
                          style={{ borderColor: 'var(--border)', color: track.attempt.results_released_at ? 'var(--warning)' : 'var(--muted)' }}>
                          {track.attempt.results_released_at ? 'Hide marks' : 'Release marks'}
                        </button>
                      )}
                    </div>
                    {saving && <p className="mt-2 font-mono text-[10px]" style={{ color: 'var(--muted)' }}>Saving…</p>}
                  </div>
                );
              }) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No domains selected.</p>}
            </div>
          </Section>

          <Section title="Round 1 · Written responses">
            <div className="space-y-3">
              {writtenAnswers.length ? writtenAnswers.map((answer) => (
                <article key={`${answer.domain_id}:${answer.question_id}`} className="border p-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.3)' }}>
                  <div className="flex justify-between gap-3">
                    <p className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>{answer.domain?.name ?? 'Domain'}</p>
                    <span className="font-mono text-[10px]" style={{ color: answer.is_final ? 'var(--success)' : 'var(--warning)' }}>{answer.is_final ? 'FINAL' : 'NOT SUBMITTED'}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{answer.question?.prompt ?? 'Question'}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: 'var(--muted)' }}>{answer.answer_text || 'No written explanation.'}</p>
                  {answer.submission_links?.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs hover:underline" style={{ color: 'var(--accent)' }}>{link} ↗</a>)}
                </article>
              )) : <p className="text-xs" style={{ color: 'var(--muted)' }}>No written responses saved.</p>}
            </div>
          </Section>

          <section className="border p-5" style={{ borderColor: 'rgba(239,68,68,.35)', background: 'rgba(239,68,68,.06)' }}>
            <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider" style={{ color: 'var(--error)' }}>Danger zone</h2>
            <p className="text-xs leading-5" style={{ color: 'var(--muted)' }}>Permanently removes this candidate, every answer and attempt they have, and their sign-in account.</p>
            <button type="button" onClick={deleteCandidate} disabled={busy === 'delete'}
              className="mt-3 border px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition disabled:opacity-40"
              style={{ borderColor: 'rgba(239,68,68,.5)', color: 'var(--error)' }}>
              {busy === 'delete' ? 'Deleting…' : 'Delete candidate'}
            </button>
          </section>
        </div>
      </div>
      <p className="mt-8 text-center"><Link to="/recruitment/admin/operations" className="font-mono text-[10px] hover:underline" style={{ color: 'var(--dim)' }}>Operations console</Link></p>
    </main>
  );
}
