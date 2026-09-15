import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isAuthPage = path === '/login';
  const isAdminLoginPage = path === '/admin/login';
  const isAdminPage = path.startsWith('/admin');
  const isProtected = path.startsWith('/recruitment') ||
    path.startsWith('/profile') ||
    path.startsWith('/dashboard') ||
    (isAdminPage && !isAdminLoginPage);

  const adminCookie = request.cookies.get('aws_admin_session')?.value;
  if (isAdminPage && !isAdminLoginPage && (adminCookie === 'aws_admin_local_jwt_session_token' || adminCookie?.startsWith('aws_admin_'))) {
    return response;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isAdminPage && !isAdminLoginPage && !adminCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isProtected) {
    if (isAdminPage && adminCookie) return response;
    return NextResponse.redirect(new URL(isAdminPage ? '/admin/login' : '/login', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/recruitment', request.url));
  }

  if (user && isAdminPage && !isAdminLoginPage) {
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single();
    if (!adminUser && !adminCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/login', '/profile/:path*', '/recruitment/:path*', '/dashboard/:path*', '/admin/:path*'],
};
