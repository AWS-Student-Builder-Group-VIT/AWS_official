'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import type { Subdomain, InterviewDate } from '@/types';

const dateSchema = z.object({
  domain_id: z.string().min(1, 'Required'),
  subdomain_id: z.string().min(1, 'Required'),
  date: z.string().min(1, 'Required'),
  start_time: z.string().min(1, 'Required'),
  end_time: z.string().min(1, 'Required'),
  slot_duration_minutes: z.number({ coerce: true }).int().min(5).max(60),
  location: z.string().optional(),
  meeting_link: z.string().url().or(z.literal('')).optional(),
});

type DateFormData = z.infer<typeof dateSchema>;

export default function AdminInterviews() {
  const supabase = createClient();
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [dates, setDates] = useState<InterviewDate[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<DateFormData>({
    resolver: zodResolver(dateSchema),
    defaultValues: { slot_duration_minutes: 15 },
  });

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

  const onSubmit = async (data: DateFormData) => {
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('interview_dates').insert({
      ...data,
      meeting_link: data.meeting_link || null,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    form.reset();
    setShowForm(false);
    await load();
    setSaving(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Interviews</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg hover:bg-accent-muted transition"
        >
          + Add Date
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-surface p-6">
          <h3 className="mb-4 font-semibold text-text">Add Interview Date</h3>
          {error && <div className="mb-3 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div>}
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm text-muted">Subdomain</label>
              <select className="input-field" {...form.register('subdomain_id')} onChange={(event)=>{const sub=subdomains.find(item=>item.id===event.target.value);form.setValue('subdomain_id',event.target.value);if(sub)form.setValue('domain_id',sub.domain_id)}}>
                <option value="">Select subdomain…</option>
                {subdomains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="hidden" {...form.register('domain_id')} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Date</label>
              <input type="date" className="input-field" {...form.register('date')} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Slot Duration (min)</label>
              <input type="number" className="input-field" {...form.register('slot_duration_minutes', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Start Time</label>
              <input type="time" className="input-field" {...form.register('start_time')} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">End Time</label>
              <input type="time" className="input-field" {...form.register('end_time')} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Location</label>
              <input className="input-field" placeholder="Room / Building (optional)" {...form.register('location')} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Meeting Link</label>
              <input className="input-field" placeholder="https://meet.google.com/… (optional)" {...form.register('meeting_link')} />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg disabled:opacity-50">
                {saving ? 'Creating…' : 'Create & Generate Slots'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm text-muted">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-text">Interview Dates</h2>
          {dates.length === 0 && <p className="text-sm text-muted">No interview dates added yet.</p>}
          {dates.map((d) => {
            const booked = d.slots?.filter((s) => s.is_booked).length ?? 0;
            const total = d.slots?.length ?? 0;
            return (
              <div key={d.id} className="mb-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text">{formatDate(d.date)}</p>
                  <span className="text-xs text-muted">{booked}/{total} booked</span>
                </div>
                <p className="text-xs text-muted">{d.start_time} – {d.end_time} · {d.slot_duration_minutes} min slots</p>
                {d.location && <p className="text-xs text-muted">{d.location}</p>}
              </div>
            );
          })}
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-text">Booked Interviews ({bookings.length})</h2>
          {bookings.length === 0 && <p className="text-sm text-muted">No bookings yet.</p>}
          {bookings.map((b) => (
            <div key={b.id} className="mb-3 rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text">{b.candidate?.full_name}</p>
                  <p className="text-xs text-muted">{b.candidate?.registration_number}</p>
                </div>
                <p className="font-mono text-xs text-accent">{b.booking_ref}</p>
              </div>
              <p className="mt-1 text-xs text-muted">
                {b.slot?.date ? formatDate(b.slot.date.date) : '—'} at {b.slot?.slot_time?.slice(0, 5) ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .input-field { width:100%; background:var(--panel); border:1px solid var(--border); border-radius:0.5rem; color:var(--text); padding:0.625rem 0.875rem; font-size:0.875rem; outline:none; }
        .input-field:focus { border-color:var(--accent); }
      `}</style>
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
