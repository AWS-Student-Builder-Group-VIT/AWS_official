import { useCallback, useEffect, useState } from 'react';
import { Plus, Power, Layers3 } from 'lucide-react';
import { createClient } from '../lib/supabase.js';

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function AdminDomains() {
  const [supabase] = useState(createClient);
  const [domains, setDomains] = useState([]);
  const [error, setError] = useState('');
  const [domainName, setDomainName] = useState('');
  const [subdomainNames, setSubdomainNames] = useState({});

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('domains').select('*, subdomains(*)').order('sort_order').order('sort_order', { referencedTable: 'subdomains' });
    if (e) setError(e.message);
    else setDomains(data || []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function addDomain() {
    if (!domainName.trim()) return;
    const { error: e } = await supabase.from('domains').insert({ name: domainName.trim(), slug: slugify(domainName), description: `${domainName.trim()} recruitment domain`, sort_order: domains.length });
    if (e) setError(e.message);
    else { setDomainName(''); load(); }
  }

  async function addSubdomain(domainId) {
    const name = subdomainNames[domainId]?.trim();
    if (!name) return;
    const { error: e } = await supabase.from('subdomains').insert({ domain_id: domainId, name, slug: slugify(name), description: `${name} specialization`, sort_order: domains.find((d) => d.id === domainId)?.subdomains?.length || 0 });
    if (e) setError(e.message);
    else { setSubdomainNames((p) => ({ ...p, [domainId]: '' })); load(); }
  }

  async function toggle(table, id, current) {
    const { error: e } = await supabase.from(table).update({ is_active: !current }).eq('id', id);
    if (e) setError(e.message);
    else load();
  }

  return (
    <main className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-5 border-b pb-7 sm:flex-row sm:items-end" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="eyebrow">ADMIN / TAXONOMY</p>
          <h1 className="mt-3 text-3xl">Domains & subdomains</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Create the recruitment structure without changing application code.</p>
        </div>
        <div className="flex">
          <input value={domainName} onChange={(e) => setDomainName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addDomain()} className="field min-w-64" placeholder="New domain name" />
          <button onClick={addDomain} className="action !px-4"><Plus size={16} /> Add</button>
        </div>
      </div>

      {error && <p role="alert" className="mt-5 border p-3 text-sm" style={{ borderColor: 'rgba(239,68,68,.4)', color: 'var(--error)' }}>{error}</p>}

      <div className="mt-7 space-y-4">
        {domains.map((domain, index) => (
          <section key={domain.id} className={`technical-panel p-5 sm:p-6 ${!domain.is_active ? 'opacity-55' : ''}`}>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-4">
                <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2 className="text-lg uppercase">{domain.name}</h2>
                  <p className="mt-1 font-mono text-[10px]" style={{ color: 'var(--dim)' }}>/{domain.slug} · {domain.selection_mode === 'whole_domain' ? 'WHOLE DOMAIN' : `${domain.subdomains?.length || 0} SUBDOMAINS`}</p>
                </div>
              </div>
              <button onClick={() => toggle('domains', domain.id, domain.is_active)} className="action-secondary !min-h-9 !px-3">
                <Power size={13} />{domain.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </header>

            {domain.selection_mode === 'whole_domain'
              ? <div className="mt-6 border p-4" style={{ borderColor: 'rgba(255,153,0,.3)', background: 'rgba(255,153,0,.05)' }}>
                  <p className="font-mono text-xs" style={{ color: 'var(--accent)' }}>WHOLE-DOMAIN SELECTION</p>
                  <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Candidates select {domain.name} directly. Its internal track is hidden from the candidate interface.</p>
                </div>
              : <>
                  <div className="mt-6 grid gap-2 md:grid-cols-2">
                    {domain.subdomains?.map((sub) => (
                      <div key={sub.id} className={`flex items-center gap-3 border p-4 ${!sub.is_active ? 'opacity-50' : ''}`} style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,.3)' }}>
                        <Layers3 size={15} style={{ color: 'var(--accent)' }} />
                        <div className="flex-1">
                          <p className="font-mono text-xs uppercase">{sub.name}</p>
                          <p className="mt-1 text-[11px]" style={{ color: 'var(--dim)' }}>/{sub.slug}</p>
                        </div>
                        <button onClick={() => toggle('subdomains', sub.id, sub.is_active)} className="font-mono text-[10px] uppercase transition" style={{ color: 'var(--muted)' }}>
                          {sub.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex max-w-lg">
                    <input value={subdomainNames[domain.id] || ''} onChange={(e) => setSubdomainNames((p) => ({ ...p, [domain.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addSubdomain(domain.id)} className="field" placeholder="Add a subdomain" />
                    <button onClick={() => addSubdomain(domain.id)} className="action !min-h-10 !px-4"><Plus size={14} /></button>
                  </div>
                </>}
          </section>
        ))}
      </div>
    </main>
  );
}
