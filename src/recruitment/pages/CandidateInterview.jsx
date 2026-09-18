import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';

export default function CandidateInterview() {
  const [supabase] = useState(createClient);
  const [booking, setBooking] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(u);
      const [{ data: existingBooking }, { data: profile }] = await Promise.all([
        supabase.from('interview_bookings').select('*, slot:interview_slots(slot_time, date:interview_dates(date, location, meeting_link))').eq('candidate_id', u.id).maybeSingle(),
        supabase.from('candidate_profiles').select('subdomain_id').eq('id', u.id).single(),
      ]);
      if (existingBooking) { setBooking(existingBooking); setLoading(false); return; }
      if (profile?.subdomain_id) {
        const { data: availableSlots } = await supabase
          .from('interview_slots')
          .select('*, date:interview_dates(date, location, meeting_link, subdomain_id)')
          .eq('is_booked', false)
          .eq('interview_dates.subdomain_id', profile.subdomain_id)
          .order('slot_time');
        setSlots(availableSlots?.filter((s) => s.date) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  async function book(slotId) {
    setSaving(true);
    setError('');
    const ref = `INT-${Date.now().toString(36).toUpperCase()}`;
    const { error: bookError } = await supabase.from('interview_bookings').insert({ candidate_id: user.id, slot_id: slotId, booking_ref: ref, booked_at: new Date().toISOString() });
    if (bookError) { setError(bookError.message); setSaving(false); return; }
    await supabase.from('interview_slots').update({ is_booked: true }).eq('id', slotId);
    window.location.reload();
  }

  if (loading) return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;

  return (
    <main className="mx-auto max-w-3xl p-5 sm:p-8">
      <p className="eyebrow">03 / ROUND_3 · INTERVIEW</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Schedule your interview.</h1>

      {booking ? (
        <div className="technical-panel mt-8 p-6 sm:p-8">
          <p className="eyebrow text-[var(--success)]">INTERVIEW BOOKED</p>
          <div className="mt-5 space-y-3">
            {[['Date', booking.slot?.date?.date], ['Time', booking.slot?.slot_time?.slice(0,5)], ['Location', booking.slot?.date?.location || '—'], ['Reference', booking.booking_ref]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{k}</span>
                <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
            {booking.slot?.date?.meeting_link && <a href={booking.slot.date.meeting_link} target="_blank" rel="noopener noreferrer" className="block text-sm hover:underline" style={{ color: 'var(--accent)' }}>Join online meeting →</a>}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          {error && <div className="mb-4 border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.4)', color: 'var(--error)' }}>{error}</div>}
          {slots.length === 0
            ? <div className="technical-panel p-8 text-center"><p className="text-sm" style={{ color: 'var(--muted)' }}>No interview slots are available for your subdomain right now. Check back later.</p></div>
            : <div className="space-y-3">
                {slots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div>
                      <p className="font-mono text-sm">{slot.date?.date} at {slot.slot_time?.slice(0, 5)}</p>
                      {slot.date?.location && <p className="text-xs" style={{ color: 'var(--muted)' }}>{slot.date.location}</p>}
                    </div>
                    <button onClick={() => book(slot.id)} disabled={saving} className="action !min-h-9 !px-4">{saving ? '…' : 'Book'}</button>
                  </div>
                ))}
              </div>}
        </div>
      )}

      <div className="mt-8">
        <Link to="/recruitment/dashboard" className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>← Back to dashboard</Link>
      </div>
    </main>
  );
}
