import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '../lib/supabase.js';
import { formatDate } from '../lib/utils.js';
import { canManageInterviewDate, createInterviewSlotRows } from '../lib/interview-date-rules.js';

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
  const [editingDate, setEditingDate] = useState(null);
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
    const payload = { ...data, meeting_link: data.meeting_link || null };

    if (editingDate) {
      if (!canManageInterviewDate(editingDate)) {
        setError('This date has booked or reserved slots and cannot be changed.');
        setSaving(false);
        return;
      }
      const { error: updateError } = await supabase.from('interview_dates').update(payload).eq('id', editingDate.id);
      if (updateError) { setError(updateError.message); setSaving(false); return; }

      const { error: clearSlotsError } = await supabase.from('interview_slots').delete().eq('date_id', editingDate.id);
      if (clearSlotsError) { setError(clearSlotsError.message); setSaving(false); return; }

      const rows = createInterviewSlotRows(editingDate.id, payload);
      const { error: slotError } = await supabase.from('interview_slots').insert(rows);
      if (slotError) { setError(slotError.message); setSaving(false); return; }
    } else {
      const { error: createError } = await supabase.from('interview_dates').insert(payload);
      if (createError) { setError(createError.message); setSaving(false); return; }
    }
    form.reset();
    setEditingDate(null);
    setShowForm(false);
    await load();
    setSaving(false);
  };

  const openCreateForm = () => {
    form.reset({ domain_id: '', subdomain_id: '', date: '', start_time: '', end_time: '', slot_duration_minutes: 15, location: '', meeting_link: '' });
    setEditingDate(null);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (interviewDate) => {
    if (!canManageInterviewDate(interviewDate)) return;
    form.reset({
      domain_id: interviewDate.domain_id ?? '',
      subdomain_id: interviewDate.subdomain_id ?? '',
      date: interviewDate.date ?? '',
      start_time: interviewDate.start_time?.slice(0, 5) ?? '',
      end_time: interviewDate.end_time?.slice(0, 5) ?? '',
      slot_duration_minutes: interviewDate.slot_duration_minutes ?? 15,
      location: interviewDate.location ?? '',
      meeting_link: interviewDate.meeting_link ?? '',
    });
    setEditingDate(interviewDate);
    setError('');
    setShowForm(true);
  };

  const removeDate = async (interviewDate) => {
    if (!canManageInterviewDate(interviewDate)) {
      setError('This date has booked or reserved slots and cannot be removed.');
      return;
    }
    if (!window.confirm(`Remove the interview date on ${formatDate(interviewDate.date)}? This cannot be undone.`)) return;
    setSaving(true);
    setError('');
    const { error: deleteError } = await supabase.from('interview_dates').delete().eq('id', interviewDate.id);
    if (deleteError) { setError(deleteError.message); setSaving(false); return; }
    await load();
    setSaving(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Interviews</h1>
        <button onClick={openCreateForm} className="rounded-lg px-4 py-2.5 text-sm font-semibold transition" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>+ Add Date</button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border p-6" style={{ borderColor: 'rgba(255,153,0,.3)', background: 'var(--surface)' }}>
          <h3 className="mb-4 font-semibold" style={{ color: 'var(--text)' }}>{editingDate ? 'Edit Interview Date' : 'Add Interview Date'}</h3>
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
                {saving ? 'Saving…' : editingDate ? 'Save & Regenerate Slots' : 'Create & Generate Slots'}
              </button>
              <button type="button" onClick={() => { form.reset(); setEditingDate(null); setShowForm(false); }} className="rounded-lg border px-5 py-2.5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
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
            const manageable = canManageInterviewDate(d);
            return (
              <div key={d.id} className="mb-3 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between">
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(d.date)}</p>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{booked}/{total} booked</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.start_time} – {d.end_time} · {d.slot_duration_minutes} min slots</p>
                {d.location && <p className="text-xs" style={{ color: 'var(--muted)' }}>{d.location}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => openEditForm(d)} disabled={!manageable || saving} className="rounded border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Edit</button>
                  <button type="button" onClick={() => removeDate(d)} disabled={!manageable || saving} className="rounded border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40" style={{ borderColor: 'rgba(239,68,68,.45)', color: 'var(--error)' }}>Remove</button>
                  {!manageable && <span className="text-xs" style={{ color: 'var(--muted)' }}>Booked slots are locked</span>}
                </div>
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
