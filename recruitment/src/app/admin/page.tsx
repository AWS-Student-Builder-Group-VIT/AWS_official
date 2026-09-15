'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_domain: Record<string, number>;
  assessments_submitted: number;
  projects_submitted: number;
  interviews_booked: number;
}

export default function AdminOverview() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: candidates }, { data: domains }] = await Promise.all([
        supabase.from('candidate_profiles').select('status, domain_id'),
        supabase.from('domains').select('id, name, slug'),
      ]);

      const [{ count: assessments }, { count: projects }, { count: interviews }] = await Promise.all([
        supabase.from('assessment_attempts').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
        supabase.from('project_submissions').select('*', { count: 'exact', head: true }),
        supabase.from('interview_bookings').select('*', { count: 'exact', head: true }),
      ]);

      const by_status: Record<string, number> = {};
      const by_domain: Record<string, number> = {};
      candidates?.forEach((c) => {
        by_status[c.status] = (by_status[c.status] ?? 0) + 1;
        if (c.domain_id) {
          const d = domains?.find((d) => d.id === c.domain_id);
          const key = d?.name ?? c.domain_id;
          by_domain[key] = (by_domain[key] ?? 0) + 1;
        }
      });

      setStats({
        total: candidates?.length ?? 0,
        by_status,
        by_domain,
        assessments_submitted: assessments ?? 0,
        projects_submitted: projects ?? 0,
        interviews_booked: interviews ?? 0,
      });
    };
    load();
  }, []);

  if (!stats) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;

  const statCards = [
    { label: 'Total Candidates', value: stats.total, icon: '👥' },
    { label: 'Assessments Submitted', value: stats.assessments_submitted, icon: '✍' },
    { label: 'Projects Submitted', value: stats.projects_submitted, icon: '🔨' },
    { label: 'Interviews Booked', value: stats.interviews_booked, icon: '💬' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold text-text">Recruitment Overview</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-2 text-2xl">{icon}</div>
            <p className="text-3xl font-bold text-text">{value}</p>
            <p className="mt-1 text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-semibold text-text">By Status</h3>
          <div className="space-y-2">
            {Object.entries(stats.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm capitalize text-muted">{status.replace('_', ' ')}</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 rounded-full bg-panel">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((count / stats.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-medium text-text">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-semibold text-text">By Domain</h3>
          <div className="space-y-2">
            {Object.entries(stats.by_domain).map(([domain, count]) => (
              <div key={domain} className="flex items-center justify-between">
                <span className="text-sm text-muted">{domain}</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 rounded-full bg-panel">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((count / stats.total) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-medium text-text">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
