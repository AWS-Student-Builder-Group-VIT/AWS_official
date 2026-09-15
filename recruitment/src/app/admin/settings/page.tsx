'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const scheduleFields = [
  { key: 'application_deadline', label: 'Application deadline', help: 'Students can revise their subdomain choices until this time.' },
  { key: 'round_0_start_at', label: 'Round 1 · Assessment', help: 'The assessment Start now button appears at this time.' },
  { key: 'round_1_start_at', label: 'Round 2 · Project', help: 'Qualified students can open their project tracks at this time.' },
  { key: 'round_2_start_at', label: 'Round 3 · Interview', help: 'Qualified students can open interview booking at this time.' },
] as const;

type ScheduleKey = typeof scheduleFields[number]['key'];
type ScheduleValues = Record<ScheduleKey, string>;
const emptySchedule: ScheduleValues = { application_deadline: '', round_0_start_at: '', round_1_start_at: '', round_2_start_at: '' };

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [schedule, setSchedule] = useState<ScheduleValues>(emptySchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: loadError } = await supabase.from('recruitment_settings').select('key,value').in('key', scheduleFields.map((field) => field.key));
      if (loadError) setError(loadError.message);
      const next = { ...emptySchedule };
      data?.forEach((row) => {
        const key = row.key as ScheduleKey;
        const value = row.value as { at?: string | null };
        if (key in next) next[key] = toLocalInput(value?.at ?? null);
      });
      setSchedule(next);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    const rows = scheduleFields.map(({ key }) => ({ key, value: { at: schedule[key] ? new Date(schedule[key]).toISOString() : null }, updated_at: new Date().toISOString() }));
    const { error: saveError } = await supabase.from('recruitment_settings').upsert(rows, { onConflict: 'key' });
    if (saveError) setError(saveError.message);
    else setMessage('Recruitment schedule saved. Unset round dates will show “To be announced.”');
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-5 sm:p-8 lg:p-10">
      <p className="eyebrow">ADMIN / SCHEDULE</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Recruitment timeline.</h1>
      <p className="mt-3 max-w-2xl text-muted">Publish each round independently. Candidates see the date first, and the action unlocks automatically when it arrives.</p>

      <section className="technical-panel mt-8 max-w-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center border border-accent/40 bg-accent/10 text-accent"><CalendarClock size={20} /></span>
          <div><p className="label">DATES &amp; TIMES</p><p className="mt-2 text-sm leading-6 text-muted">Times use your device timezone and are stored as UTC.</p></div>
        </div>

        <div className="mt-7 divide-y divide-border border-y border-border">
          {scheduleFields.map((field) => <label key={field.key} className="grid gap-3 py-5 sm:grid-cols-[1fr_15rem] sm:items-center">
            <span><span className="block font-mono text-sm uppercase text-text">{field.label}</span><span className="mt-1 block text-xs leading-5 text-muted">{field.help}</span></span>
            <span className="flex gap-2"><input type="datetime-local" value={schedule[field.key]} disabled={loading || saving} onChange={(event) => setSchedule((current) => ({ ...current, [field.key]: event.target.value }))} className="min-w-0 flex-1 border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent" /><button type="button" onClick={() => setSchedule((current) => ({ ...current, [field.key]: '' }))} disabled={!schedule[field.key] || saving} className="border border-border px-3 text-muted hover:border-accent hover:text-accent disabled:opacity-30" aria-label={`Clear ${field.label}`}>×</button></span>
          </label>)}
        </div>

        {error && <p role="alert" className="mt-5 text-sm text-error">{error}</p>}
        {message && <p role="status" className="mt-5 text-sm text-success">{message}</p>}
        <button onClick={save} disabled={loading || saving} className="action mt-7 inline-flex items-center gap-2"><Save size={16} />{saving ? 'Saving…' : 'Save schedule'}</button>
      </section>
    </main>
  );
}
