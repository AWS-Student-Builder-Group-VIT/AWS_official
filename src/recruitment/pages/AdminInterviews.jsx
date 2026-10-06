import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase.js';
import { formatDate } from '../lib/utils.js';
import { canManageInterviewDate, createManualSlotRows } from '../lib/interview-date-rules.js';

const EMPTY_SLOT = { slot_time: '', duration_minutes: 30 };

function SlotBuilder({ slots, onChange }) {
  const add = () => onChange([...slots, { ...EMPTY_SLOT }]);
  const remove = (i) => onChange(slots.filter((_, idx) => idx !== i));
  const update = (i, field, value) =>
    onChange(slots.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          Interview Slots
        </label>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
          style={{ background: 'rgba(255,153,0,.15)', color: 'var(--accent)', border: '1px solid rgba(255,153,0,.35)' }}
        >
          + Add Slot
        </button>
      </div>

      {slots.length === 0 && (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
          No slots added yet. Click <strong>+ Add Slot</strong> to begin.
        </p>
      )}

      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          >
            <span className="w-6 text-center text-xs font-bold" style={{ color: 'var(--muted)' }}>
              {i + 1}
            </span>

            <div className="flex flex-1 flex-wrap gap-3">
              <div className="flex-1 min-w-[130px]">
                <label className="mb-1 block text-xs" style={{ color: 'var(--muted)' }}>Time</label>
                <input
                  type="time"
                  value={slot.slot_time}
                  onChange={(e) => update(i, 'slot_time', e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>
              <div className="w-[150px]">
                <label className="mb-1 block text-xs" style={{ color: 'var(--muted)' }}>Duration (min)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={slot.duration_minutes}
                  onChange={(e) => update(i, 'duration_minutes', e.target.value)}
                  className="w-full rounded border px-3 py-1.5 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 rounded px-2 py-1 text-xs transition hover:opacity-80"
              style={{ color: 'var(--error)', background: 'rgba(239,68,68,.1)' }}
              title="Remove slot"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  // Expanded slot detail view per date
  const [expandedDateId, setExpandedDateId] = useState(null);

  // Form state
  const [formSubdomainId, setFormSubdomainId] = useState('');
  const [formDomainId, setFormDomainId] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formMeetingLink, setFormMeetingLink] = useState('');
  const [formSlots, setFormSlots] = useState([{ ...EMPTY_SLOT }]);

  const load = async () => {
    const [{ data: d }, { data: id }, { data: b }] = await Promise.all([
      supabase.from('subdomains').select('*, domain:domains(*)').eq('is_active', true),
      supabase
        .from('interview_dates')
        .select('*, slots:interview_slots(*)')
        .order('date'),
      supabase
        .from('interview_bookings')
        .select('*, slot:interview_slots(slot_time, slot_duration_minutes, date:interview_dates(date, location, meeting_link)), candidate:candidate_profiles(full_name,registration_number)')
        .order('booked_at', { ascending: false }),
    ]);
    setSubdomains(d ?? []);
    setDates(id ?? []);
    setBookings(b ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Count bookings per slot_id
  const bookingCountBySlot = bookings.reduce((acc, b) => {
    if (!b.slot_id) return acc;
    acc[b.slot_id] = (acc[b.slot_id] ?? 0) + 1;
    return acc;
  }, {});

  // Candidates per slot (for expanded view)
  const candidatesBySlot = bookings.reduce((acc, b) => {
    if (!b.slot_id) return acc;
    if (!acc[b.slot_id]) acc[b.slot_id] = [];
    acc[b.slot_id].push(b.candidate);
    return acc;
  }, {});

  const resetForm = () => {
    setFormSubdomainId('');
    setFormDomainId('');
    setFormDate('');
    setFormLocation('');
    setFormMeetingLink('');
    setFormSlots([{ ...EMPTY_SLOT }]);
    setEditingDate(null);
    setError('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (interviewDate) => {
    if (!canManageInterviewDate(interviewDate)) return;
    const sub = subdomains.find((s) => s.id === interviewDate.subdomain_id);
    setFormSubdomainId(interviewDate.subdomain_id ?? '');
    setFormDomainId(interviewDate.domain_id ?? sub?.domain_id ?? '');
    setFormDate(interviewDate.date ?? '');
    setFormLocation(interviewDate.location ?? '');
    setFormMeetingLink(interviewDate.meeting_link ?? '');
    // Rebuild slots from existing slot rows
    const existingSlots = (interviewDate.slots ?? [])
      .sort((a, b) => a.slot_time.localeCompare(b.slot_time))
      .map((s) => ({
        slot_time: s.slot_time?.slice(0, 5) ?? '',
        duration_minutes: s.slot_duration_minutes ?? 30,
      }));
    setFormSlots(existingSlots.length ? existingSlots : [{ ...EMPTY_SLOT }]);
    setEditingDate(interviewDate);
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formSubdomainId) { setError('Please select a subdomain.'); return; }
    if (!formDate) { setError('Please pick a date.'); return; }
    const validSlots = formSlots.filter((s) => s.slot_time?.trim());
    if (!validSlots.length) { setError('Add at least one slot with a time.'); return; }

    setSaving(true);

    const payload = {
      subdomain_id: formSubdomainId,
      domain_id: formDomainId || null,
      date: formDate,
      location: formLocation || null,
      meeting_link: formMeetingLink || null,
    };

    try {
      let dateId;

      if (editingDate) {
        if (!canManageInterviewDate(editingDate)) {
          setError('This date has booked slots and cannot be changed.');
          setSaving(false);
          return;
        }
        const { error: updateError } = await supabase.from('interview_dates').update(payload).eq('id', editingDate.id);
        if (updateError) { setError(updateError.message); setSaving(false); return; }
        const { error: clearError } = await supabase.from('interview_slots').delete().eq('date_id', editingDate.id);
        if (clearError) { setError(clearError.message); setSaving(false); return; }
        dateId = editingDate.id;
      } else {
        const { data: created, error: createError } = await supabase.from('interview_dates').insert(payload).select('id').single();
        if (createError) { setError(createError.message); setSaving(false); return; }
        dateId = created.id;
      }

      const rows = createManualSlotRows(dateId, validSlots);
      const { error: slotError } = await supabase.from('interview_slots').insert(rows);
      if (slotError) { setError(slotError.message); setSaving(false); return; }

      resetForm();
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeDate = async (interviewDate) => {
    if (!canManageInterviewDate(interviewDate)) {
      setError('This date has booked slots and cannot be removed.');
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Interviews</h1>
        <button
          onClick={openCreateForm}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold transition"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          + Add Date
        </button>
      </div>

      {/* Global error */}
      {error && !showForm && (
        <div className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="mb-8 rounded-xl border p-6" style={{ borderColor: 'rgba(255,153,0,.3)', background: 'var(--surface)' }}>
          <h3 className="mb-5 font-semibold text-lg" style={{ color: 'var(--text)' }}>
            {editingDate ? 'Edit Interview Date' : 'Add Interview Date'}
          </h3>

          {error && (
            <div className="mb-4 rounded-lg border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Subdomain + Date row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>Subdomain *</label>
                <select
                  value={formSubdomainId}
                  onChange={(e) => {
                    setFormSubdomainId(e.target.value);
                    const sub = subdomains.find((s) => s.id === e.target.value);
                    setFormDomainId(sub?.domain_id ?? '');
                  }}
                  className="w-full rounded border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
                >
                  <option value="">Select subdomain…</option>
                  {subdomains.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.domain?.name ? `${s.domain.name} / ` : ''}{s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>Date *</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* Location + Meeting link row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>Location</label>
                <input
                  type="text"
                  placeholder="Room / Building (optional)"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm" style={{ color: 'var(--muted)' }}>Meeting Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/… (optional)"
                  value={formMeetingLink}
                  onChange={(e) => setFormMeetingLink(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* Manual slot builder */}
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
              <SlotBuilder slots={formSlots} onChange={setFormSlots} />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                {saving ? 'Saving…' : editingDate ? 'Save Changes' : 'Create Date & Slots'}
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(false); }}
                className="rounded-lg border px-5 py-2.5 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Interview dates with per-slot booking counts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Left: Dates + slot breakdown ── */}
        <div>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--text)' }}>
            Interview Dates ({dates.length})
          </h2>
          {dates.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No interview dates added yet.</p>
          )}
          {dates.map((d) => {
            const slots = [...(d.slots ?? [])].sort((a, b) => a.slot_time.localeCompare(b.slot_time));
            const totalBookings = slots.reduce((sum, s) => sum + (bookingCountBySlot[s.id] ?? 0), 0);
            const manageable = canManageInterviewDate(d);
            const isExpanded = expandedDateId === d.id;

            return (
              <div
                key={d.id}
                className="mb-4 rounded-xl border overflow-hidden"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                {/* Date header */}
                <div className="flex items-start justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium" style={{ color: 'var(--text)' }}>{formatDate(d.date)}</p>
                    {d.location && <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>📍 {d.location}</p>}
                    {d.meeting_link && (
                      <a href={d.meeting_link} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs hover:underline" style={{ color: 'var(--accent)' }}>
                        🔗 Online meeting
                      </a>
                    )}
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: 'rgba(255,153,0,.15)', color: 'var(--accent)' }}
                    >
                      {slots.length} slots · {totalBookings} booked
                    </span>
                  </div>
                </div>

                {/* Per-slot breakdown */}
                {slots.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedDateId(isExpanded ? null : d.id)}
                      className="w-full px-4 py-2 text-left text-xs font-medium transition hover:opacity-70"
                      style={{ color: 'var(--muted)', background: 'var(--panel)' }}
                    >
                      {isExpanded ? '▲ Hide slots' : `▼ View ${slots.length} slot${slots.length !== 1 ? 's' : ''}`}
                    </button>

                    {isExpanded && (
                      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {slots.map((slot) => {
                          const count = bookingCountBySlot[slot.id] ?? 0;
                          const candidates = candidatesBySlot[slot.id] ?? [];
                          return (
                            <div key={slot.id} className="px-4 py-3" style={{ background: 'var(--surface)' }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text)' }}>
                                    {slot.slot_time?.slice(0, 5)}
                                  </span>
                                  {slot.slot_duration_minutes && (
                                    <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: 'var(--panel)', color: 'var(--muted)' }}>
                                      {slot.slot_duration_minutes} min
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                                  style={{
                                    background: count > 0 ? 'rgba(34,197,94,.15)' : 'var(--panel)',
                                    color: count > 0 ? 'var(--success)' : 'var(--muted)',
                                  }}
                                >
                                  {count === 0 ? 'No bookings' : `${count} candidate${count !== 1 ? 's' : ''}`}
                                </span>
                              </div>

                              {/* Candidate list for this slot */}
                              {candidates.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {candidates.map((c, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                                      <span style={{ color: 'var(--accent)' }}>›</span>
                                      <span style={{ color: 'var(--text)' }}>{c?.full_name ?? '—'}</span>
                                      {c?.registration_number && (
                                        <span className="font-mono">{c.registration_number}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--panel)' }}>
                  <button
                    type="button"
                    onClick={() => openEditForm(d)}
                    disabled={!manageable || saving}
                    className="rounded border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 transition"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDate(d)}
                    disabled={!manageable || saving}
                    className="rounded border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 transition"
                    style={{ borderColor: 'rgba(239,68,68,.45)', color: 'var(--error)' }}
                  >
                    Remove
                  </button>
                  {!manageable && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Booked slots are locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right: All bookings list ── */}
        <div>
          <h2 className="mb-3 font-semibold" style={{ color: 'var(--text)' }}>
            All Bookings ({bookings.length})
          </h2>
          {bookings.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No bookings yet.</p>
          )}
          {bookings.map((b) => (
            <div
              key={b.id}
              className="mb-3 rounded-xl border p-4"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{b.candidate?.full_name ?? '—'}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.candidate?.registration_number ?? ''}</p>
                </div>
                <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{b.booking_ref}</p>
              </div>
              <p className="mt-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                {b.slot?.date ? formatDate(b.slot.date.date) : '—'} at {b.slot?.slot_time?.slice(0, 5) ?? '—'}
                {b.slot?.slot_duration_minutes ? ` · ${b.slot.slot_duration_minutes} min` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
