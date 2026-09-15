'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { CandidateProfile, CandidateSubdomainChoice, InterviewDate, InterviewSlot, InterviewBooking, SubdomainRoundGuideline } from '@/types';

export default function InterviewPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [allDates, setAllDates] = useState<InterviewDate[]>([]);
  const [bookings, setBookings] = useState<InterviewBooking[]>([]);
  const [guidelines, setGuidelines] = useState<Record<string, SubdomainRoundGuideline>>({});
  const [activeSubdomainId, setActiveSubdomainId] = useState('');
  const [roundStartAt, setRoundStartAt] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [{ data: p }, { data: b }, { data: schedule }] = await Promise.all([
        supabase.from('candidate_profiles').select('*, domain:domains(*), subdomain:subdomains(*), subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').eq('id', user.id).single(),
        supabase.from('interview_bookings').select('*, slot:interview_slots(*, date:interview_dates(*))').eq('candidate_id', user.id).order('booked_at'),
        supabase.from('recruitment_settings').select('value').eq('key', 'round_2_start_at').maybeSingle(),
      ]);

      setProfile(p);
      setBookings((b ?? []) as InterviewBooking[]);
      const choices = [...(p?.subdomain_choices ?? [])].sort((left, right) => left.priority - right.priority);
      setActiveSubdomainId(choices[0]?.subdomain_id ?? p?.subdomain_id ?? '');
      const scheduleValue = schedule?.value as { at?: string | null } | null;
      setRoundStartAt(scheduleValue?.at ?? null);

      if (choices.length) {
        const [{ data: d }, { data: guidelineRows }] = await Promise.all([
          supabase.from('interview_dates').select('*, slots:interview_slots(*)').in('subdomain_id', choices.map((choice) => choice.subdomain_id)).eq('is_active', true).order('date'),
          supabase.from('subdomain_round_guidelines').select('*').eq('round_number', 3).in('subdomain_id', choices.map((choice) => choice.subdomain_id)),
        ]);
        setAllDates(d ?? []);
        setGuidelines(Object.fromEntries(((guidelineRows ?? []) as SubdomainRoundGuideline[]).map((item) => [item.subdomain_id, item])));
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const confirmBooking = async () => {
    if (!selectedSlot || !profile) return;
    setConfirming(true);
    setError('');

    const { error: err } = await supabase.rpc('book_interview_slot', { p_slot_id: selectedSlot });
    if (err) { setError(err.message.includes('SLOT_UNAVAILABLE') ? 'This slot was just taken. Please choose another.' : err.message); setConfirming(false); return; }

    window.location.reload();
  };

  if (loading) return <Spinner />;

  const eligible = profile?.round_1_status === 'qualified';
  const tracks = [...(profile?.subdomain_choices ?? [])].sort((a, b) => a.priority - b.priority);
  const dates = allDates.filter((date) => date.subdomain_id === activeSubdomainId);
  const booking = bookings.find((item) => item.subdomain_id === activeSubdomainId) ?? null;
  const roundOpen = Boolean(roundStartAt && now >= new Date(roundStartAt).getTime());

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="mb-2 text-2xl font-bold text-text">Round 3 — Interview</h1>
      <p className="mb-6 text-muted">Book a slot for your one-on-one interview with the team.</p>
      <TrackTabs tracks={tracks} active={activeSubdomainId} onSelect={(id) => { setActiveSubdomainId(id); setSelectedSlot(null); setError(''); }} />
      {guidelines[activeSubdomainId]?.guidelines && <section className="mb-6 border border-accent/30 bg-accent/5 p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent">Round 3 guidelines</p><pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-text">{guidelines[activeSubdomainId].guidelines}</pre></section>}

      {!roundOpen && <div className="rounded-xl border border-border bg-surface p-8 text-center"><div className="mb-3 text-3xl">📅</div><p className="font-medium text-text">Round 3 starts</p><p className="mt-2 font-mono text-sm text-accent">{roundStartAt ? formatDateTime(roundStartAt) : 'To be announced'}</p></div>}

      {roundOpen && !eligible && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <p className="font-medium text-text">Not Available Yet</p>
          <p className="mt-2 text-sm text-muted">Complete and pass Round 2 (Project) to unlock interview booking.</p>
        </div>
      )}

      {roundOpen && eligible && booking && (
        <div className="rounded-xl border border-success/30 bg-success/10 p-6">
          <h3 className="mb-1 font-semibold text-success">✓ Interview Booked</h3>
          <p className="mb-3 text-sm text-muted">Your booking is confirmed.</p>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="w-28 text-muted">Reference</span>
              <span className="font-mono font-bold text-accent">{booking.booking_ref}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-28 text-muted">Date</span>
              <span className="text-text">{booking.slot?.date ? formatDate(booking.slot.date.date) : '—'}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-28 text-muted">Time</span>
              <span className="text-text">{booking.slot?.slot_time}</span>
            </div>
            {booking.slot?.date?.location && (
              <div className="flex gap-3">
                <span className="w-28 text-muted">Location</span>
                <span className="text-text">{booking.slot.date.location}</span>
              </div>
            )}
            {booking.slot?.date?.meeting_link && (
              <div className="flex gap-3">
                <span className="w-28 text-muted">Meeting Link</span>
                <a href={booking.slot.date.meeting_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Open Link
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {roundOpen && eligible && !booking && (
        <div>
          {error && <div className="mb-4 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div>}
          {dates.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <div className="text-3xl mb-3">📅</div>
              <p className="font-medium text-text">No Slots Available Yet</p>
              <p className="mt-2 text-sm text-muted">Interview slots haven't been published for your domain. Check back soon.</p>
            </div>
          ) : (
            <>
              {dates.map((d) => (
                <div key={d.id} className="mb-6 rounded-xl border border-border bg-surface p-5">
                  <h3 className="mb-3 font-semibold text-text">
                    {formatDate(d.date)}
                    {d.location && <span className="ml-2 text-sm font-normal text-muted">· {d.location}</span>}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {d.slots?.map((slot) => (
                      <button
                        key={slot.id}
                        disabled={slot.is_booked}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`rounded-lg border px-4 py-2 text-sm font-mono transition ${
                          slot.is_booked
                            ? 'cursor-not-allowed border-border bg-panel text-dim line-through'
                            : selectedSlot === slot.id
                            ? 'border-accent bg-accent/20 text-accent'
                            : 'border-border bg-panel text-text hover:border-accent/50'
                        }`}
                      >
                        {slot.slot_time.slice(0, 5)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={confirmBooking}
                disabled={!selectedSlot || confirming}
                className="rounded-xl bg-accent px-8 py-3.5 font-semibold text-bg transition hover:bg-accent-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirming ? 'Confirming…' : 'Confirm Booking'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}

function TrackTabs({ tracks, active, onSelect }: { tracks: CandidateSubdomainChoice[]; active: string; onSelect: (id: string) => void }) {
  if (tracks.length < 2) return null;
  return <div className="mb-6 flex border-b border-border" role="tablist" aria-label="Interview subdomains">{tracks.map((track) => <button key={track.subdomain_id} role="tab" aria-selected={active === track.subdomain_id} onClick={() => onSelect(track.subdomain_id)} className={`border-b-2 px-4 py-3 text-left font-mono text-xs uppercase ${active === track.subdomain_id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-text'}`}>{track.priority}. {track.subdomain?.name}</button>)}</div>;
}
