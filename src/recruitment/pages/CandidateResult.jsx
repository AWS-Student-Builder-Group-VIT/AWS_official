import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '../lib/supabase.js';
import { statusLabel, statusColor } from '../lib/utils.js';

export default function CandidateResult() {
  const [supabase] = useState(createClient);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: profile } = await supabase.from('candidate_profiles').select('*, final_result:final_results(result,feedback)').eq('id', user.id).single();
      setData(profile);
      setLoading(false);
    })();
  }, []);

  if (loading) return <main className="grid min-h-[60vh] place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></main>;

  const result = data?.final_result?.result;
  const resultColor = result === 'selected' ? 'var(--success)' : result === 'waitlisted' ? 'var(--warning)' : 'var(--error)';

  return (
    <main className="mx-auto max-w-2xl p-5 sm:p-8">
      <p className="eyebrow">06 / FINAL_RESULT</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Your result.</h1>
      <div className="technical-panel mt-8 p-6 sm:p-10">
        {!result ? (
          <div className="text-center">
            <p className="text-4xl">⏳</p>
            <h2 className="mt-4 text-xl font-bold" style={{ color: 'var(--text)' }}>Results will be released shortly.</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>The recruitment committee is reviewing all interview feedback. Please check back soon.</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-4xl">{result === 'selected' ? '🎉' : result === 'waitlisted' ? '⏳' : '🙏'}</p>
            <h2 className="mt-4 text-3xl font-bold" style={{ color: resultColor }}>
              {result === 'selected' ? 'Congratulations! You\'re in.' : result === 'waitlisted' ? 'Waitlisted' : 'Thank you for applying.'}
            </h2>
            <p className="mt-3 leading-6" style={{ color: 'var(--muted)' }}>
              {result === 'selected'
                ? 'Welcome to AWS Student Builder Group. You will receive further onboarding instructions via email.'
                : result === 'waitlisted'
                  ? 'You are on the waitlist. We will reach out if a spot opens up.'
                  : 'We appreciate your interest and effort. We hope to see you apply again next year.'}
            </p>
            {data?.final_result?.feedback && (
              <div className="mt-6 border-t pt-6 text-left" style={{ borderColor: 'var(--border)' }}>
                <p className="eyebrow mb-2">FEEDBACK FROM THE COMMITTEE</p>
                <p className="text-sm leading-6" style={{ color: 'var(--text)' }}>{data.final_result.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-6">
        <Link to="/recruitment/dashboard" className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>← Back to dashboard</Link>
      </div>
    </main>
  );
}
