import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase-server';
import { verifyAdminCredentials } from '@/lib/admin-credentials.mjs';

const ADMIN_AUTH_EMAIL = 'admin-console@aws-sbg.local';

export async function POST(request: Request) {
  const configured = {
    adminId: process.env.ADMIN_ID,
    password: process.env.ADMIN_PASSWORD,
  };

  if (
    !configured.adminId ||
    !configured.password ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: 'Admin login is not configured.' }, { status: 503 });
  }

  let body: { adminId?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 });
  }

  if (!verifyAdminCredentials(body, configured)) {
    return NextResponse.json({ error: 'Invalid admin ID or password.' }, { status: 401 });
  }

  if (configured.password.length < 8) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD must contain at least 8 characters.' }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    console.error('[admin-login] Unable to list auth users:', listError.message);
    return NextResponse.json({ error: 'Unable to open the admin session.' }, { status: 500 });
  }

  let user = listed.users.find((item) => item.email === ADMIN_AUTH_EMAIL);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password: configured.password,
      email_confirm: true,
      user_metadata: { full_name: 'AWS SBG Administrator' },
    });
    if (error) {
      console.error('[admin-login] Unable to update the admin auth user:', error.message);
      return NextResponse.json({ error: 'Unable to open the admin session.' }, { status: 500 });
    }
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_AUTH_EMAIL,
      password: configured.password,
      email_confirm: true,
      user_metadata: { full_name: 'AWS SBG Administrator' },
    });
    if (error) {
      console.error('[admin-login] Unable to create the admin auth user:', error.message);
      return NextResponse.json({ error: 'Unable to open the admin session.' }, { status: 500 });
    }
    user = data.user;
  }

  const { error: adminError } = await admin.from('admin_users').upsert({
    id: user.id,
    email: ADMIN_AUTH_EMAIL,
    name: 'AWS SBG Administrator',
    role: 'super_admin',
  }, { onConflict: 'id' });
  if (adminError) {
    console.error('[admin-login] Unable to authorize the admin user:', adminError.message);
    return NextResponse.json({ error: 'Unable to authorize the admin session.' }, { status: 500 });
  }

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({
    email: ADMIN_AUTH_EMAIL,
    password: configured.password,
  });
  if (signInError || !sessionData.session) {
    console.error('[admin-login] Unable to issue the admin session:', signInError?.message ?? 'No session returned.');
    return NextResponse.json({ error: 'Unable to open the admin session.' }, { status: 500 });
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  });
}
