import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorDescription = requestUrl.searchParams.get('error_description');

  if (!code) {
    const message = encodeURIComponent(errorDescription || 'Google did not return an authorization code.');
    return NextResponse.redirect(new URL(`/login?error=oauth_failed&message=${message}`, requestUrl));
  }

  let response = NextResponse.redirect(new URL('/profile/complete', requestUrl));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.headers.get('cookie')?.split(';').map((value) => {
          const [name, ...rest] = value.trim().split('=');
          return { name, value: rest.join('=') };
        }) ?? [],
        setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    const message = encodeURIComponent(error?.message || 'Unable to create a Supabase session.');
    return NextResponse.redirect(new URL(`/login?error=oauth_failed&message=${message}`, requestUrl));
  }

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const emailDomain = (data.user.email?.split('@')[1] || '').toLowerCase();
  if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=unauthorized_email', requestUrl));
  }

  const { data: profile } = await supabase
    .from('candidate_profiles').select('profile_complete').eq('id', data.user.id).maybeSingle();
  response.headers.set('Location', new URL(profile?.profile_complete ? '/recruitment' : '/profile/complete', requestUrl).toString());
  return response;
}
