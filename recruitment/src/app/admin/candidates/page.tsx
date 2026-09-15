'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { statusLabel, statusColor, formatDate } from '@/lib/utils';
import type { CandidateProfile } from '@/types';

export default function AdminCandidates() {
  const supabase = createClient();
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [filtered, setFiltered] = useState<CandidateProfile[]>([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('candidate_profiles')
      .select('*, domain:domains(*), subdomain:subdomains(*), subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCandidates(data ?? []);
        setFiltered(data ?? []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let list = candidates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.registration_number.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    if (domainFilter) list = list.filter((c) => c.subdomain_choices?.some((choice) => choice.subdomain?.domain?.slug === domainFilter));
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    setFiltered(list);
  }, [search, domainFilter, statusFilter, candidates]);

  const domains = Array.from(new Map(candidates.flatMap((candidate) => candidate.subdomain_choices?.flatMap((choice) => {
    const domain = choice.subdomain?.domain;
    return domain ? [[domain.slug, domain.name] as const] : [];
  }) ?? [])).entries());
  const statuses = Array.from(new Set(candidates.map((c) => c.status)));

  if (loading) return <Spinner />;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Candidates ({filtered.length})</h1>
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, reg no, email…"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder-dim focus:border-accent"
          />
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent">
            <option value="">All Domains</option>
            {domains.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent">
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-panel text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Candidate</th>
              <th className="px-4 py-3">Choices</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Applied</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border bg-surface hover:bg-panel transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-text">{c.full_name}</p>
                  <p className="text-xs text-muted">{c.registration_number}</p>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{c.subdomain_choices?.length ? [...c.subdomain_choices].sort((a, b) => a.priority - b.priority).map((choice) => <span key={choice.subdomain_id} className="block text-xs text-accent">{choice.subdomain?.domain?.slug === 'finance' || choice.subdomain?.domain?.slug === 'outreach' ? choice.subdomain?.domain?.name : `${choice.subdomain?.domain?.name} / ${choice.subdomain?.name}`}</span>) : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${statusColor[c.status]}`}>{statusLabel[c.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${statusColor[c.round_0_status]}`}>{statusLabel[c.round_0_status]}</span>
                  {c.round_0_score != null && <span className="ml-1 text-xs text-muted">({c.round_0_score})</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${statusColor[c.round_1_status]}`}>{statusLabel[c.round_1_status]}</span>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">No candidates match your filters.</div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
}
