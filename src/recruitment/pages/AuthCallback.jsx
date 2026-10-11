import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import { isAllowedEmail, parseAllowedDomains } from '../lib/email-domains.js';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [supabase] = useState(createClient);
  const [status, setStatus] = useState('Processing sign-in…');

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam || !code) {
        const msg = encodeURIComponent(errorDescription || 'Google did not return an authorisation code.');
        navigate(`/recruitment/login?error=oauth_failed&message=${msg}`, { replace: true });
        return;
      }

      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.user) {
          const msg = encodeURIComponent(error?.message || 'Unable to create a Supabase session.');
          navigate(`/recruitment/login?error=oauth_failed&message=${msg}`, { replace: true });
          return;
        }

        // An account outside the allow list must not get a session at all.
        const allowedDomains = parseAllowedDomains(import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS);
        if (!isAllowedEmail(data.user.email, allowedDomains)) {
          await supabase.auth.signOut();
          navigate('/recruitment/login?error=unauthorized_email', { replace: true });
          return;
        }

        // Portal is closed — redirect all candidates to the closed notice
        navigate('/recruitment/portal-closed', { replace: true });
      } catch (err) {
        const msg = encodeURIComponent(err?.message || 'An unexpected error occurred.');
        navigate(`/recruitment/login?error=oauth_failed&message=${msg}`, { replace: true });
      }
    }

    handleCallback();
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)]">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
        <p className="mt-4 font-mono text-xs text-[var(--muted)]">{status}</p>
      </div>
    </main>
  );
}
