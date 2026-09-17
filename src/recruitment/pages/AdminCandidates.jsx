import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase.js';
import { fetchAll } from '../lib/fetch-all.js';
import { statusLabel, statusColor, formatDate } from '../lib/utils.js';

export default function AdminCandidates() {
  const [supabase] = useState(createClient);
  const [candidates, setCandidates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll(() => supabase
      .from('candidate_profiles')
      .select('*, subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))')
      .order('created_at', { ascending: false })
      .order('id'))
      .then((data) => {
        setCandidates(data);
        setFiltered(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = candidates;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.registration_number?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    if (domainFilter) list = list.filter((c) => c.subdomain_choices?.some((ch) => ch.subdomain?.domain?.slug === domainFilter));
    if (statusFilter) list = list.filter((c) => c.status === statusFilter);
    setFiltered(list);
  }, [search, domainFilter, statusFilter, candidates]);

  // Deleting is irreversible, so it asks for the registration number first.
  const deleteCandidate = async (candidate) => {
    const typed = prompt(
      `This permanently deletes ${candidate.full_name} and every answer, attempt and choice they have.\n\nType their registration number (${candidate.registration_number}) to confirm:`,
    );
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== (candidate.registration_number ?? '').toLowerCase()) {
      setError('Registration number did not match. Nothing was deleted.');
      return;
    }
    setDeletingId(candidate.id);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Administrator session expired.'); setDeletingId(null); return; }
    const response = await fetch(`/api/recruitment/admin/candidates?id=${encodeURIComponent(candidate.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setError(result.error ?? 'Unable to delete this candidate.');
    else setCandidates((curr) => curr.filter((c) => c.id !== candidate.id));
    setDeletingId(null);
  };

  const domains = Array.from(new Map(candidates.flatMap((c) => c.subdomain_choices?.flatMap((ch) => { const d = ch.subdomain?.domain; return d ? [[d.slug, d.name]] : []; }) ?? [])).entries());
  const statuses = Array.from(new Set(candidates.map((c) => c.status)));

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>;

  return (
    <div className="p-6">
      {error && (
        <div role="alert" className="mb-4 rounded-lg border p-3 text-sm"
          style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--error)' }}>{error}</div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Candidates ({filtered.length})</h1>
        <div className="flex flex-wrap gap-3">
          {[
            { value: search, setter: setSearch, placeholder: 'Search name, reg no, email…' },
          ].map(({ value, setter, placeholder }) => (
            <input key={placeholder} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
              className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }} />
          ))}
          <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="">All Domains</option>
            {domains.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="">All Statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{statusLabel[s] ?? s}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--muted)' }}>
              {['Candidate','Choices','Status','Assessment','Project','Applied',''].map((h) => (
                <th key={h || 'actions'} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b transition" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: 'var(--text)' }}>{c.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.registration_number}</p>
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>
                  {c.subdomain_choices?.length
                    ? [...c.subdomain_choices].sort((a, b) => a.priority - b.priority).map((ch) => (
                      <span key={ch.subdomain_id} className="block text-xs" style={{ color: 'var(--accent)' }}>
                        {ch.subdomain?.domain?.selection_mode === 'whole_domain'
                          ? ch.subdomain?.domain?.name : `${ch.subdomain?.domain?.name} / ${ch.subdomain?.name}`}
                      </span>
                    ))
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${statusColor[c.status]}`}>{statusLabel[c.status] ?? c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${statusColor[c.round_0_status]}`}>{statusLabel[c.round_0_status] ?? '—'}</span>
                  {c.round_0_score != null && <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>({c.round_0_score})</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${statusColor[c.round_1_status]}`}>{statusLabel[c.round_1_status] ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.created_at ? formatDate(c.created_at) : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => deleteCandidate(c)} disabled={deletingId === c.id}
                    className="rounded-lg border px-3 py-1.5 text-xs transition hover:border-[var(--error)] hover:text-[var(--error)] disabled:opacity-40"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    {deletingId === c.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>No candidates match your filters.</div>}
      </div>
    </div>
  );
}
