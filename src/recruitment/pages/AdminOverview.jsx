import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase.js';
import { fetchAll } from '../lib/fetch-all.js';

export default function AdminOverview() {
  const [supabase] = useState(createClient);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [candidates, { data: domains }] = await Promise.all([
        fetchAll(() => supabase.from('candidate_profiles').select('id, status, domain_id').order('id')),
        supabase.from('domains').select('id, name, slug'),
      ]);
      const [{ count: assessments }, { count: projects }, { count: interviews }] = await Promise.all([
        supabase.from('assessment_attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('project_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('interview_bookings').select('*', { count: 'exact', head: true }),
      ]);
      const by_status = {};
      const by_domain = {};
      candidates?.forEach((c) => {
        by_status[c.status] = (by_status[c.status] ?? 0) + 1;
        if (c.domain_id) {
          const d = domains?.find((domain) => domain.id === c.domain_id);
          const key = d?.name ?? c.domain_id;
          by_domain[key] = (by_domain[key] ?? 0) + 1;
        }
      });
      setStats({ total: candidates?.length ?? 0, by_status, by_domain, assessments_submitted: assessments ?? 0, projects_submitted: projects ?? 0, interviews_booked: interviews ?? 0 });
    };
    load();
  }, []);

  if (!stats) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  const statCards = [
    { label: 'Total Candidates', value: stats.total, icon: '👥' },
    { label: 'Assessments Submitted', value: stats.assessments_submitted, icon: '✍' },
    { label: 'Projects Submitted', value: stats.projects_submitted, icon: '🔨' },
    { label: 'Interviews Booked', value: stats.interviews_booked, icon: '💬' },
  ];

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold" style={{ color: 'var(--text)' }}>Recruitment Overview</h1>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-2 text-2xl">{icon}</div>
            <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[['By Status', stats.by_status], ['By Domain', stats.by_domain]].map(([title, data]) => (
          <div key={title} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h3 className="mb-4 font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
            <div className="space-y-2">
              {Object.entries(data).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm capitalize" style={{ color: 'var(--muted)' }}>{key.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 rounded-full" style={{ background: 'var(--panel)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((count / stats.total) * 100)}%`, background: 'var(--accent)' }} />
                    </div>
                    <span className="w-6 text-right text-sm font-medium" style={{ color: 'var(--text)' }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
