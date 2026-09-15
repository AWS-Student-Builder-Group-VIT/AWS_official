import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { validateProfilePayload } from '@/lib/profile-schema.mjs';

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user?.email) return NextResponse.json({ error: 'Your signed-in account does not provide an email address.' }, { status: 401 });
  const parsed = validateProfilePayload(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid profile.' }, { status: 400 });
  const metadata = authData.user.user_metadata;
  const fullName = String(metadata.full_name || metadata.name || authData.user.email.split('@')[0]);
  const { data, error } = await admin.from('candidate_profiles').upsert({
    id: authData.user.id,
    full_name: fullName,
    email: authData.user.email,
    ...parsed.data,
    profile_complete: true,
  }, { onConflict: 'id' }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
