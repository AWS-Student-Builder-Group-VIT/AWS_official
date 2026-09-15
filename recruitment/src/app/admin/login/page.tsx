'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login() {
    setLoading(true);
    setError('');
    const response = await fetch('/api/admin/test-session', { method: 'POST' });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'Unable to start the admin session.'); setLoading(false); return; }
    const { error: sessionError } = await createClient().auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
    if (sessionError) { setError(sessionError.message); setLoading(false); return; }
    router.replace('/admin/operations');
    router.refresh();
  }

  return <main className="shell grid min-h-screen place-items-center py-12"><section className="technical-panel w-full max-w-lg p-7 sm:p-9"><p className="eyebrow">LOCAL_ADMIN_ACCESS</p><h1 className="mt-4 text-3xl font-bold">Admin operations console</h1><p className="mt-4 text-sm leading-6 text-muted">Open the local administrator session and review live recruitment operations data. This shortcut is automatically disabled in production.</p>{error&&<p role="alert" className="mt-6 border border-error/40 p-3 text-sm text-error">{error}</p>}<button onClick={login} disabled={loading} className="action mt-7 w-full"><ShieldCheck size={16}/>{loading?'Creating admin session…':'Enter local admin'}<ArrowRight size={16}/></button><Link href="/login" className="action-secondary mt-3 w-full">Candidate Google login</Link></section></main>;
}
