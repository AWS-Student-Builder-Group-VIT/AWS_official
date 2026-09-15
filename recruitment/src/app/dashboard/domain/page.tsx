'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, Clock3, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { toggleTrackSelection } from '@/lib/selection-rules.mjs';
import type { Domain, Subdomain } from '@/types';

type ChoiceRow = { subdomain_id: string; priority: number };
type Popup = { title: string; message: string };
type SelectionTrack = Subdomain & { domainId: string; domainSlug: string; domainName: string };

export default function DomainPage() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const [choiceResult, domainResult, settingResult] = await Promise.all([
        supabase
          .from('candidate_subdomain_choices')
          .select('subdomain_id, priority')
          .eq('candidate_id', user.id)
          .order('priority'),
        supabase
          .from('domains')
          .select('*, subdomains(*)')
          .eq('is_active', true)
          .eq('subdomains.is_active', true)
          .order('sort_order')
          .order('sort_order', { referencedTable: 'subdomains' }),
        supabase
          .from('recruitment_settings')
          .select('value')
          .eq('key', 'application_deadline')
          .maybeSingle(),
      ]);

      if (choiceResult.error) {
        setPopup({ title: 'Unable to load choices', message: choiceResult.error.message });
      } else {
        setSelected(((choiceResult.data || []) as ChoiceRow[]).map((choice) => choice.subdomain_id));
      }
      if (domainResult.error) {
        setPopup({ title: 'Unable to load domains', message: domainResult.error.message });
      }
      setDomains((domainResult.data || []) as Domain[]);
      const setting = settingResult.data?.value as { at?: string | null } | null;
      setDeadline(setting?.at ?? null);
      setLoading(false);
    })();
  }, [router, supabase]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!popup) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopup(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [popup]);

  const allTracks = useMemo<SelectionTrack[]>(() => domains.flatMap((domain) =>
    (domain.subdomains || []).map((subdomain) => ({
      ...subdomain,
      domainId: domain.id,
      domainSlug: domain.slug,
      domainName: domain.name,
    })),
  ), [domains]);

  const selectedDetails = useMemo(() => selected
    .map((id) => allTracks.find((track) => track.id === id))
    .filter(Boolean) as SelectionTrack[], [allTracks, selected]);

  const closed = Boolean(deadline && now >= new Date(deadline).getTime());
  const technicalCount = selectedDetails.filter((track) => track.domainSlug === 'technical').length;

  function toggle(track: SelectionTrack) {
    if (closed) return;
    const result = toggleTrackSelection(selected, track, allTracks);
    if (result.error === 'TECHNICAL_SELECTION_LIMIT') {
      setPopup({
        title: 'Technical selection limit reached',
        message: 'You can select up to two Technical specializations. Remove one before adding another.',
      });
      return;
    }
    setSelected(result.ids);
  }

  async function save() {
    if (selected.length < 1 || closed) return;
    setSaving(true);
    const { error: saveError } = await supabase.rpc('set_candidate_subdomains', {
      p_subdomain_ids: selected,
    });
    if (saveError) {
      const migrationRequired = saveError.message.includes('SELECT_ONE_OR_TWO_SUBDOMAINS');
      setPopup({
        title: saveError.message.includes('APPLICATION_DEADLINE_PASSED')
          ? 'Applications closed'
          : migrationRequired
            ? 'Database update required'
            : 'Unable to save application',
        message: saveError.message.includes('APPLICATION_DEADLINE_PASSED')
          ? 'The application deadline has passed. Your choices can no longer be changed.'
          : migrationRequired
            ? 'Apply the latest recruitment migration before saving the expanded domain choices.'
            : saveError.message,
      });
      setSaving(false);
      return;
    }
    router.push('/dashboard/round-1');
    router.refresh();
  }

  if (loading) {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">02 / DOMAIN_PROTOCOL</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Build your application.</h1>
          <p className="mt-3 max-w-3xl text-muted">
            Apply to any domains that match your interests. Technical is optional and allows up to two specializations; all other choices are unrestricted.
          </p>
        </div>
        <div className={`status-chip inline-flex items-center gap-2 self-start ${closed ? 'text-error' : 'text-accent'}`}>
          <Clock3 size={15} />
          {deadline ? `${closed ? 'Closed' : 'Closes'} ${new Date(deadline).toLocaleString()}` : 'No deadline set'}
        </div>
      </div>

      <section className="technical-panel mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label">YOUR APPLICATION</p>
            <p className="mt-2 text-sm text-muted">
              {selected.length} selection{selected.length === 1 ? '' : 's'} · {technicalCount}/2 Technical
            </p>
          </div>
          {selectedDetails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedDetails.map((track) => (
                <span key={track.id} className="inline-flex items-center gap-2 border border-accent/40 bg-accent/10 px-3 py-2 font-mono text-xs text-accent">
                  <span>
                    {track.domainSlug === 'finance' || track.domainSlug === 'outreach'
                      ? track.domainName
                      : `${track.domainName} / ${track.name}`}
                  </span>
                  {!closed && (
                    <button
                      type="button"
                      onClick={() => toggle(track)}
                      className="grid h-5 w-5 place-items-center border border-accent/40 hover:bg-accent hover:text-bg"
                      aria-label={`Remove ${track.name}`}
                    >
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {closed && (
          <p className="mt-4 border-l-2 border-error pl-4 text-sm text-muted">
            The deadline has passed. Your submitted choices are now locked.
          </p>
        )}
      </section>

      <div className="mt-8 space-y-8">
        {domains.map((domain, domainIndex) => {
          const wholeDomain = domain.selection_mode === 'whole_domain';
          const wholeTrack = allTracks.find((track) => track.domainId === domain.id);
          const wholeSelected = Boolean(wholeTrack && selected.includes(wholeTrack.id));

          return (
            <section key={domain.id}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-accent">{String(domainIndex + 1).padStart(2, '0')}</span>
                  <div>
                    <h2 className="font-mono text-base uppercase tracking-wide">{domain.name}</h2>
                    <p className="mt-1 text-xs text-muted">{domain.description}</p>
                  </div>
                </div>
                {wholeDomain && (
                  <button
                    type="button"
                    disabled={closed || !wholeTrack}
                    onClick={() => wholeTrack && toggle(wholeTrack)}
                    className={`grid h-11 w-11 shrink-0 place-items-center border transition ${wholeSelected ? 'border-accent bg-accent text-bg' : 'border-border bg-surface text-accent hover:border-accent'} disabled:cursor-not-allowed disabled:opacity-50`}
                    aria-label={`${wholeSelected ? 'Remove' : 'Add'} ${domain.name}`}
                  >
                    {wholeSelected ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                )}
              </div>

              {!wholeDomain && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {domain.subdomains?.map((subdomain) => {
                    const track = allTracks.find((item) => item.id === subdomain.id)!;
                    const isSelected = selected.includes(subdomain.id);
                    return (
                      <button
                        key={subdomain.id}
                        type="button"
                        disabled={closed}
                        onClick={() => toggle(track)}
                        className={`group relative min-h-32 border p-5 text-left transition ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/60'} disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-mono text-sm uppercase leading-5">{subdomain.name}</h3>
                          <span className={`grid h-7 w-7 shrink-0 place-items-center border font-mono text-[10px] ${isSelected ? 'border-accent bg-accent text-bg' : 'border-border text-dim'}`}>
                            {isSelected ? <Check size={15} /> : '+'}
                          </span>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted">{subdomain.description}</p>
                        {isSelected && (
                          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-accent">Selected</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!closed && (
        <div className="sticky bottom-4 mt-10 flex flex-wrap items-center justify-between gap-4 border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur">
          <p className="text-xs text-muted">Save your choices to continue directly to Round 1.</p>
          <button onClick={save} disabled={selected.length === 0 || saving} className="action">
            {saving ? 'Saving…' : 'Continue to Round 1 →'}
          </button>
        </div>
      )}

      {popup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setPopup(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="selection-popup-title" aria-describedby="selection-popup-message" className="technical-panel w-full max-w-md p-6 shadow-2xl sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center border border-accent/40 bg-accent/10 text-accent"><AlertTriangle size={19} /></span>
              <div className="flex-1">
                <p className="eyebrow">SELECTION NOTICE</p>
                <h2 id="selection-popup-title" className="mt-2 text-xl font-bold text-text">{popup.title}</h2>
                <p id="selection-popup-message" className="mt-3 text-sm leading-6 text-muted">{popup.message}</p>
              </div>
              <button type="button" onClick={() => setPopup(null)} className="grid h-8 w-8 shrink-0 place-items-center border border-border text-muted hover:border-accent hover:text-accent" aria-label="Close popup"><X size={16} /></button>
            </div>
            <button type="button" autoFocus onClick={() => setPopup(null)} className="action mt-6 w-full">Understood</button>
          </section>
        </div>
      )}
    </main>
  );
}
