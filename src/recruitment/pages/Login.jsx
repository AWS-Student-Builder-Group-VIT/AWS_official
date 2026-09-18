import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import { parseAllowedDomains, allowedDomainsMessage } from '../lib/email-domains.js';
import awsIcon from '../../assets/aws_icon.jpeg';

export default function Login() {
  const navigate = useNavigate();
  const [supabase] = useState(createClient);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const allowedDomains = parseAllowedDomains(import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS);

  async function signInWithGoogle() {
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/recruitment/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
          // Google's hosted-domain hint: the account chooser only offers
          // institutional accounts. The callback still verifies the address.
          ...(allowedDomains.length === 1 ? { hd: allowedDomains[0] } : {}),
        },
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  const errorMessages = {
    oauth_failed: 'Google sign-in failed. Please try again.',
    unauthorized_email: 'Your email domain is not allowed for this recruitment portal.',
    session_expired: 'Your session expired. Please sign in again.',
  };

  const params = new URLSearchParams(window.location.search);
  const errorCode = params.get('error');
  const errorMsg = params.get('message');
  const displayError = error || (errorCode ? (errorMessages[errorCode] || decodeURIComponent(errorMsg || '')) : '');

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-5">
          <img
            src={awsIcon}
            alt="AWS Logo"
            className="h-12 w-12 rounded-lg object-contain border border-[var(--border)] p-1.5 bg-black/40"
          />
        </div>
        <p className="eyebrow text-center">AWS SBG // RECRUITMENT</p>
        <h1 className="mt-6 text-center text-3xl font-bold sm:text-4xl">
          SIGN IN<br /><span className="text-[var(--accent)]">TO APPLY.</span>
        </h1>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Use your institutional Google account to continue.
        </p>

        {displayError && (
          <p role="alert" className="mt-6 border border-[var(--error)]/50 bg-[var(--error)]/10 p-4 text-center text-sm text-[var(--error)]">
            {displayError}
          </p>
        )}

        <div className="technical-panel mt-8 p-6">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="action w-full justify-center"
          >
            {loading ? 'Redirecting…' : '→ Continue with Google'}
          </button>
          <p className="mt-5 text-center text-xs text-[var(--dim)]">
            {allowedDomainsMessage(allowedDomains) || 'Only authorised institutional email domains are accepted.'}
          </p>
        </div>
      </div>
    </main>
  );
}
