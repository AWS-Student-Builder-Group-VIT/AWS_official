'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { profileSchema } from '@/lib/profile-schema.mjs';

type Form = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [identity, setIdentity] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setIdentity({
        name: user.user_metadata.full_name || user.user_metadata.name || '',
        email: user.email || '',
      });
    });
  }, [router, supabase]);

  async function save(values: Form) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    setError('');
    const response = await fetch('/api/profile/complete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? 'Unable to complete profile.');
      return;
    }

    router.push('/dashboard/domain');
    router.refresh();
  }

  async function logout() {
    setLoggingOut(true);
    setError('');
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      setError(logoutError.message);
      setLoggingOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  const field = (name: keyof Form, label: string) => (
    <label>
      <span className="label">{label}</span>
      <input className="field" {...register(name)} aria-invalid={Boolean(errors[name])} />
      {errors[name] && (
        <span className="mt-1 block text-xs text-error">{errors[name]?.message}</span>
      )}
    </label>
  );

  return (
    <main className="shell py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
        <p className="eyebrow">PROFILE / COMPLETION</p>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="action-secondary !min-h-10 !px-4 disabled:cursor-wait disabled:opacity-60"
        >
          <LogOut size={14} aria-hidden="true" />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
        <aside>
          <h1 className="text-3xl font-bold sm:text-5xl">
            IDENTITY<br /><span className="text-accent">RECORD.</span>
          </h1>
          <div className="mt-8 border-l border-accent pl-5">
            <p className="font-mono text-sm">{identity.name || 'GOOGLE USER'}</p>
            <p className="mt-1 text-sm text-muted">{identity.email}</p>
            <p className="mt-4 text-xs leading-5 text-dim">
              Google identity fields are locked. Complete the academic record to enter recruitment.
            </p>
          </div>
        </aside>

        <form onSubmit={handleSubmit(save)} className="technical-panel p-6 sm:p-8">
          <section>
            <h2 className="eyebrow mb-5">01 / ACADEMIC_PROFILE</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {field('registration_number', 'Registration number')}
              {field('phone', 'Phone number')}
              <label>
                <span className="label">Year</span>
                <select className="field" {...register('year')}>
                  <option value="">Select year</option>
                  {[1, 2, 3, 4, 5].map((year) => <option key={year}>{year}</option>)}
                </select>
                {errors.year && (
                  <span className="mt-1 block text-xs text-error">{errors.year.message}</span>
                )}
              </label>
              {field('branch', 'Branch / School')}
            </div>
          </section>

          {error && <p role="alert" className="mt-5 text-sm text-error">{error}</p>}
          <button disabled={isSubmitting} className="action mt-8 w-full sm:w-auto">
            {isSubmitting ? 'Saving…' : 'Complete profile →'}
          </button>
        </form>
      </div>
    </main>
  );
}
