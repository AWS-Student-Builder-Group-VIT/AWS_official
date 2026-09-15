import { useEffect, useState } from 'react';
import { CalendarClock, Save } from 'lucide-react';
import { createClient } from '../lib/supabase.js';

const scheduleFields = [
  { key: 'application_deadline', label: 'Application deadline', help: 'Students can revise their subdomain choices until this time.' },
  { key: 'round_0_start_at', label: 'Round 1 · Assessment', help: 'The assessment Start now button appears at this time.' },
  { key: 'round_1_start_at', label: 'Round 2 · Project', help: 'Qualified students can open their project tracks at this time.' },
  { key: 'round_2_start_at', label: 'Round 3 · Interview', help: 'Qualified students can open interview booking at this time.' },
];

const emptySchedule = { application_deadline: '', round_0_start_at: '', round_1_start_at: '', round_2_start_at: '' };

function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function AdminSettings() {
  const [supabase] = useState(createClient);
  const [schedule, setSchedule] = useState(emptySchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error: loadError } = await supabase.from('recruitment_settings').select('key,value').in('key', scheduleFields.map((f) => f.key));
      if (loadError) setError(loadError.message);
      const next = { ...emptySchedule };
      data?.forEach((row) => { if (row.key in next) next[row.key] = toLocalInput(row.value?.at ?? null); });
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
    else setMessage('Recruitment schedule saved. Unset round dates will show "To be announced."');
    setSaving(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-5 sm:p-8 lg:p-10">
      <p className="eyebrow">ADMIN / SCHEDULE</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Recruitment timeline.</h1>
      <p className="mt-3 max-w-2xl" style={{ color: 'var(--muted)' }}>Publish each round independently. Candidates see the date first, and the action unlocks automatically when it arrives.</p>

      <section className="technical-panel mt-8 max-w-3xl p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center border" style={{ borderColor: 'rgba(255,153,0,.4)', background: 'rgba(255,153,0,.1)', color: 'var(--accent)' }}><CalendarClock size={20} /></span>
          <div>
            <p className="label">DATES & TIMES</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--muted)' }}>Times use your device timezone and are stored as UTC.</p>
          </div>
        </div>

        <div className="mt-7 divide-y border-y" style={{ borderColor: 'var(--border)' }}>
          {scheduleFields.map((field) => (
            <label key={field.key} className="grid gap-3 py-5 sm:grid-cols-[1fr_15rem] sm:items-center">
              <span>
                <span className="block font-mono text-sm uppercase" style={{ color: 'var(--text)' }}>{field.label}</span>
                <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--muted)' }}>{field.help}</span>
              </span>
              <span className="flex gap-2">
                <input type="datetime-local" value={schedule[field.key]} disabled={loading || saving}
                  onChange={(e) => setSchedule((curr) => ({ ...curr, [field.key]: e.target.value }))}
                  className="min-w-0 flex-1 border px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                <button type="button" onClick={() => setSchedule((curr) => ({ ...curr, [field.key]: '' }))}
                  disabled={!schedule[field.key] || saving}
                  className="border px-3 transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-30"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>×</button>
              </span>
            </label>
          ))}
        </div>

        {error && <p role="alert" className="mt-5 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {message && <p role="status" className="mt-5 text-sm" style={{ color: 'var(--success)' }}>{message}</p>}
        <button onClick={save} disabled={loading || saving} className="action mt-7 inline-flex items-center gap-2">
          <Save size={16} />{saving ? 'Saving…' : 'Save schedule'}
        </button>
      </section>
    </main>
  );
}
