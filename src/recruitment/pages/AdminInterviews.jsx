import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '../lib/supabase.js';
import { formatDate } from '../lib/utils.js';

const dateSchema = z.object({
  domain_id: z.string().min(1, 'Required'),
  subdomain_id: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  start_time: z.string().min(1, 'Required'),
  end_time: z.string().min(1, 'Required'),
  slot_duration_minutes: z.coerce.number().int().min(5).max(60),
  location: z.string().optional(),
  meeting_link: z.string().url().or(z.literal('')).optional(),
});

export default function AdminInterviews() {
  const [supabase] = useState(createClient);
  const [subdomains, setSubdomains] = useState([]);
  const [dates, setDates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const form = useForm({ resolver: zodResolver(dateSchema), defaultValues: { slot_duration_minutes: 15 } });

  const load = async () => {
    const [{ data: d }, { data: id }, { data: b }] = await Promise.all([
      supabase.from('subdomains').select('*, domain:domains(*)').eq('is_active', true),
      supabase.from('interview_dates').select('*, slots:interview_slots(*)').order('date'),
      supabase.from('interview_bookings').select('*, slot:interview_slots(slot_time, date:interview_dates(date)), candidate:candidate_profiles(full_name,registration_number)').order('booked_at', { ascending: false }),
    ]);
    setSubdomains(d ?? []);
    setDates(id ?? []);
    setBookings(b ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('interview_dates').insert({ ...data, meeting_link: data.meeting_link || null });
    if (err) { setError(err.message); setSaving(false); return; }
    form.reset();
    setShowForm(false);
    await load();
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Interviews</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg px-4 py-2.5 text-sm font-semibold transition" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>+ Add Date</button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border p-6" style={{ borderColor: 'rgba(255,153,0,.3)', background: 'var(--surface)' }}>
          <h3 className="mb-4 font-semibold" style={{ color: 'var(--text)' }}>Add Interview Date</h3>
          {error && <div className="mb-3 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>}
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>Subdomain</label>
              <select className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
                {...form.register('subdomain_id')}
                onChange={(e) => {
                  const sub = subdomains.find((s) => s.id === e.target.value);
                  form.setValue('subdomain_id', e.target.value);
                  if (sub) form.setValue('domain_id', sub.domain_id);
                }}>
                <option value="">Select subdomain…</option>
                {subdomains.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="hidden" {...form.register('domain_id')} />
            </div>
            {[
              { name: 'date', label: 'Date', type: 'date' },
              { name: 'slot_duration_minutes', label: 'Slot Duration (min)', type: 'number' },
              { name: 'start_time', label: 'Start Time', type: 'time' },
              { name: 'end_time', label: 'End Time', type: 'time' },
              { name: 'location', label: 'Location', type: 'text', placeholder: 'Room / Building (optional)' },
              { name: 'meeting_link', label: 'Meeting Link', type: 'text', placeholder: 'https://meet.google.com/… (optional)' },
            ].map(({ name, label, type, placeholder }) => (
              <div key={name}>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>{label}</label>
                <input type={type} placeholder={placeholder} className="w-full rounded border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
                  {...form.register(name, type === 'number' ? { valueAsNumber: true } : {})} />
              </div>
            ))}
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                {saving ? 'Creating…' : 'Create & Generate Slots'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-2.5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--text)' }}>Interview Dates</h2>
          {dates.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>No interview dates added yet.</p>}
          {dates.map((d) => {
            const booked = d.slots?.filter((s) => s.is_booked).length ?? 0;
            const total = d.slots?.length ?? 0;
            return (
              <div key={d.id} className="mb-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(d.date)}</p>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{booked}/{total} booked</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.start_time} – {d.end_time} · {d.slot_duration_minutes} min slots</p>
                {d.location && <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.location}</p>}
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--text)' }}>Booked Interviews ({bookings.length})</h2>
          {bookings.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>No bookings yet.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="mb-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{b.candidate?.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.candidate?.registration_number}</p>
                </div>
                <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{b.booking_ref}</p>
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                {b.slot?.date ? formatDate(b.slot.date.date) : '—'} at {b.slot?.slot_time?.slice(0, 5) ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
