'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId, password }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'Unable to sign in.'); setLoading(false); return; }
    if (typeof window !== 'undefined' && result.access_token) {
      sessionStorage.setItem('aws_admin_token', result.access_token);
      localStorage.setItem('aws_admin_token', result.access_token);
      document.cookie = `aws_admin_session=${result.access_token}; path=/; max-age=604800; SameSite=Lax`;
    }
    // Navigate immediately without waiting on supabase network timeout
    window.location.href = '/admin/operations';
  }

  return <main className="shell grid min-h-screen place-items-center py-12"><section className="technical-panel w-full max-w-lg p-7 sm:p-9"><p className="eyebrow">ADMIN_SECURE_ACCESS</p><h1 className="mt-4 text-3xl font-bold">Admin operations console</h1><p className="mt-4 text-sm leading-6 text-muted">Sign in with the administrator credentials configured for this portal.</p>{error&&<p role="alert" className="mt-6 border border-error/40 p-3 text-sm text-error">{error}</p>}<form onSubmit={login} className="mt-7 space-y-5"><label className="block"><span className="eyebrow">ADMIN ID</span><input type="text" autoComplete="username" required value={adminId} onChange={(event)=>setAdminId(event.target.value)} className="mt-2 w-full border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent" /></label><label className="block"><span className="eyebrow">PASSWORD</span><input type="password" autoComplete="current-password" required value={password} onChange={(event)=>setPassword(event.target.value)} className="mt-2 w-full border border-border bg-bg px-4 py-3 text-text outline-none focus:border-accent" /></label><button type="submit" disabled={loading} className="action w-full"><ShieldCheck size={16}/>{loading?'Signing in…':'Sign in as admin'}<ArrowRight size={16}/></button></form></section></main>;
}
