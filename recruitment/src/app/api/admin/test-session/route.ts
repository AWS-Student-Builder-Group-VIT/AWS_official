import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase-server';

const TEST_ADMIN_EMAIL = 'local-admin@aws-sbg.test';

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Local admin login is disabled outside development.' }, { status: 404 });
  }

  const admin = createAdminClient();
  const password = randomBytes(24).toString('base64url');
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  let user = listed.users.find((item) => item.email === TEST_ADMIN_EMAIL);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Local Test Admin' },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Local Test Admin' },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    user = data.user;
  }

  const { error: adminError } = await admin.from('admin_users').upsert({
    id: user.id,
    email: TEST_ADMIN_EMAIL,
    name: 'Local Test Admin',
    role: 'super_admin',
  }, { onConflict: 'id' });
  if (adminError) return NextResponse.json({ error: adminError.message }, { status: 500 });

  const { error: profileError } = await admin.from('candidate_profiles').upsert({
    id: user.id,
    full_name: 'Local Test Admin',
    registration_number: `TEST-${user.id.slice(0, 8).toUpperCase()}`,
    email: TEST_ADMIN_EMAIL,
    phone: '0000000000',
    year: 1,
    branch: 'Local Testing',
    profile_complete: true,
  }, { onConflict: 'id' });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: sessionData, error: signInError } = await client.auth.signInWithPassword({
    email: TEST_ADMIN_EMAIL,
    password,
  });
  if (signInError || !sessionData.session) {
    return NextResponse.json({ error: signInError?.message ?? 'Unable to create the test session.' }, { status: 500 });
  }

  return NextResponse.json({
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  });
}
