import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, Clock3, Plus, X } from 'lucide-react';
import { createClient } from '../lib/supabase.js';
import { toggleTrackSelection } from '../lib/selection-rules.js';

export default function SubdomainSelection() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [domains, setDomains] = useState([]);
  const [selected, setSelected] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [profile, setProfile] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [writtenSubmitted, setWrittenSubmitted] = useState(false);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/recruitment/login', { replace: true }); return; }
      const [choiceResult, domainResult, settingResult, profileResult, attemptResult, writtenResult] = await Promise.all([
        supabase.from('candidate_subdomain_choices').select('subdomain_id,priority').eq('candidate_id', user.id).order('priority'),
        supabase.from('domains').select('*, subdomains(*)').eq('is_active', true).eq('subdomains.is_active', true).order('sort_order').order('sort_order', { referencedTable: 'subdomains' }),
        supabase.from('recruitment_settings').select('value').eq('key', 'application_deadline').maybeSingle(),
        supabase.from('candidate_profiles').select('domain_locked, round_0_status, status').eq('id', user.id).maybeSingle(),
        // One attempt per technical track, so this is a list rather than a single row.
        supabase.from('assessment_attempts').select('status').eq('candidate_id', user.id),
        supabase.from('candidate_written_answers').select('domain_id').eq('candidate_id', user.id).eq('is_final', true).limit(1),
      ]);
      setWrittenSubmitted(Boolean(writtenResult.data?.length));
      if (choiceResult.error) setPopup({ title: 'Unable to load choices', message: choiceResult.error.message });
      else setSelected((choiceResult.data || []).map((c) => c.subdomain_id));
      if (domainResult.error) setPopup({ title: 'Unable to load domains', message: domainResult.error.message });
      setDomains(domainResult.data || []);
      setDeadline(settingResult.data?.value?.at ?? null);
      setProfile(profileResult.data ?? null);
      setAttempt(attemptResult.data ?? []);
      setLoading(false);
    })();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const close = (e) => { if (e.key === 'Escape') setPopup(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [popup]);

  const allTracks = useMemo(() => domains.flatMap((domain) =>
    (domain.subdomains || []).map((sub) => ({ ...sub, domainId: domain.id, domainSlug: domain.slug, domainName: domain.name }))
  ), [domains]);

  const selectedDetails = useMemo(() =>
    selected.map((id) => allTracks.find((t) => t.id === id)).filter(Boolean), [allTracks, selected]);

  const closed = Boolean(deadline && now >= new Date(deadline).getTime());
  // Any started track, a submitted written domain, or the database lock freezes the application.
  const isAssessmentLocked = Boolean(
    attempt?.length
    || profile?.domain_locked
    || (profile?.round_0_status && profile?.round_0_status !== 'not_started')
    || writtenSubmitted,
  );
  const isLocked = closed || isAssessmentLocked;
  const technicalCount = selectedDetails.filter((t) => t.domainSlug === 'technical').length;

  function toggle(track) {
    if (isLocked) return;
    const result = toggleTrackSelection(selected, track, allTracks);
    if (result.error === 'TECHNICAL_SELECTION_LIMIT') {
      setPopup({ title: 'Technical selection limit reached', message: 'You can select up to two Technical specializations. Remove one before adding another.' });
      return;
    }
    setSelected(result.ids);
  }

  async function save() {
    if (selected.length < 1 || isLocked) return;
    setSaving(true);
    const { error: saveError } = await supabase.rpc('set_candidate_subdomains', { p_subdomain_ids: selected });
    if (saveError) {
      const isPassed = saveError.message.includes('APPLICATION_DEADLINE_PASSED');
      const isLockedError = saveError.message.includes('DOMAIN_CHOICES_LOCKED');
      const needsMigration = saveError.message.includes('SELECT_ONE_OR_TWO_SUBDOMAINS');
      setPopup({
        title: isPassed ? 'Applications closed' : isLockedError ? 'Choices locked' : needsMigration ? 'Database update required' : 'Unable to save application',
        message: isPassed ? 'The application deadline has passed. Your choices can no longer be changed.'
          : isLockedError ? 'Your domain choices are locked because your Round 1 assessment has already been started or submitted.'
          : needsMigration ? 'Apply the latest recruitment migration before saving the expanded domain choices.'
          : saveError.message,
      });
      setSaving(false);
      return;
    }
    navigate('/recruitment/dashboard/round-1');
  }

  if (loading) return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;

  return (
    <main className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">02 / DOMAIN_PROTOCOL</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Build your application.</h1>
          <p className="mt-3 max-w-3xl" style={{ color: 'var(--muted)' }}>Apply to any domains that match your interests. Technical is optional and allows up to two specializations; all other choices are unrestricted.</p>
        </div>
        <div className="status-chip inline-flex items-center gap-2 self-start" style={{ color: closed ? 'var(--error)' : isAssessmentLocked ? 'var(--dim)' : 'var(--accent)' }}>
          <Clock3 size={15} />
          {closed ? 'Closed' : isAssessmentLocked ? 'Choices locked' : deadline ? `Closes ${new Date(deadline).toLocaleString()}` : 'No deadline set'}
        </div>
      </div>

      <section className="technical-panel mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label">YOUR APPLICATION</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{selected.length} selection{selected.length === 1 ? '' : 's'} · {technicalCount}/2 Technical</p>
          </div>
          {selectedDetails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedDetails.map((track) => (
                <span key={track.id} className="inline-flex items-center gap-2 border px-3 py-2 font-mono text-xs" style={{ borderColor: 'rgba(255,153,0,.4)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}>
                  <span>{track.domainSlug === 'finance' || track.domainSlug === 'outreach' ? track.domainName : `${track.domainName} / ${track.name}`}</span>
                  {!isLocked && (
                    <button type="button" onClick={() => toggle(track)} className="grid h-5 w-5 place-items-center border" style={{ borderColor: 'rgba(255,153,0,.4)' }} aria-label={`Remove ${track.name}`}><X size={12} /></button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {isLocked && (
          <p className="mt-4 border-l-2 pl-4 text-sm" style={{ borderColor: 'var(--error)', color: 'var(--muted)' }}>
            {closed
              ? 'The deadline has passed. Your submitted choices are now locked.'
              : 'Your domain choices are locked because you have already started Round 1.'}
          </p>
        )}
      </section>

      <div className="mt-8 space-y-8">
        {domains.map((domain, domainIndex) => {
          const wholeDomain = domain.selection_mode === 'whole_domain';
          const wholeTrack = allTracks.find((t) => t.domainId === domain.id);
          const wholeSelected = Boolean(wholeTrack && selected.includes(wholeTrack.id));
          return (
            <section key={domain.id}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{String(domainIndex + 1).padStart(2, '0')}</span>
                  <div>
                    <h2 className="font-mono text-base uppercase tracking-wide">{domain.name}</h2>
                    <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{domain.description}</p>
                  </div>
                </div>
                {wholeDomain && (
                  <button type="button" disabled={isLocked || !wholeTrack} onClick={() => wholeTrack && toggle(wholeTrack)}
                    className="grid h-11 w-11 shrink-0 place-items-center border transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ borderColor: wholeSelected ? 'var(--accent)' : 'var(--border)', background: wholeSelected ? 'var(--accent)' : 'var(--surface)', color: wholeSelected ? 'var(--bg)' : 'var(--accent)' }}
                    aria-label={`${wholeSelected ? 'Remove' : 'Add'} ${domain.name}`}>
                    {wholeSelected ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                )}
              </div>
              {!wholeDomain && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {domain.subdomains?.map((sub) => {
                    const track = allTracks.find((t) => t.id === sub.id);
                    const isSelected = selected.includes(sub.id);
                    return (
                      <button key={sub.id} type="button" disabled={isLocked} onClick={() => track && toggle(track)}
                        className="group relative min-h-32 border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-70"
                        style={{ borderColor: isSelected ? 'var(--accent)' : 'var(--border)', background: isSelected ? 'rgba(255,153,0,.1)' : 'var(--surface)' }}>
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-mono text-sm uppercase leading-5">{sub.name}</h3>
                          <span className="grid h-7 w-7 shrink-0 place-items-center border font-mono text-[10px]"
                            style={{ borderColor: isSelected ? 'var(--accent)' : 'var(--border)', background: isSelected ? 'var(--accent)' : 'transparent', color: isSelected ? 'var(--bg)' : 'var(--dim)' }}>
                            {isSelected ? <Check size={15} /> : '+'}
                          </span>
                        </div>
                        <p className="mt-3 text-xs leading-5" style={{ color: 'var(--muted)' }}>{sub.description}</p>
                        {isSelected && <p className="mt-4 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Selected</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-4 mt-10 flex flex-wrap items-center justify-between gap-4 border p-4 shadow-2xl backdrop-blur" style={{ borderColor: 'var(--border)', background: 'rgba(17,19,24,.95)' }}>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {isLocked
            ? (closed ? 'Applications are closed. Your submitted choices are locked.' : 'Your domain choices are locked because your Round 1 assessment has already been started or submitted.')
            : 'Save your choices to continue directly to Round 1.'}
        </p>
        {isLocked ? (
          <Link to="/recruitment/dashboard/round-1" className="action">Back to Round 1 →</Link>
        ) : (
          <button onClick={save} disabled={selected.length === 0 || saving} className="action">{saving ? 'Saving…' : 'Continue to Round 1 →'}</button>
        )}
      </div>

      {popup && (
        <div className="fixed inset-0 z-50 grid place-items-center p-5 backdrop-blur-sm" style={{ background: 'rgba(10,11,14,.8)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPopup(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="selection-popup-title" className="technical-panel w-full max-w-md p-6 shadow-2xl sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center border" style={{ borderColor: 'rgba(255,153,0,.4)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}><AlertTriangle size={19} /></span>
              <div className="flex-1">
                <p className="eyebrow">SELECTION NOTICE</p>
                <h2 id="selection-popup-title" className="mt-2 text-xl font-bold">{popup.title}</h2>
                <p className="mt-3 text-sm leading-6" style={{ color: 'var(--muted)' }}>{popup.message}</p>
              </div>
              <button type="button" onClick={() => setPopup(null)} className="grid h-8 w-8 shrink-0 place-items-center border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }} aria-label="Close popup"><X size={16} /></button>
            </div>
            <button type="button" autoFocus onClick={() => setPopup(null)} className="action mt-6 w-full">Understood</button>
          </section>
        </div>
      )}
    </main>
  );
}
