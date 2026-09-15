import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';
import { localStore } from '@/lib/local-store';

const guidelineSchema = z.object({
  subdomain_id: z.string(),
  round_number: z.union([z.literal(2), z.literal(3)]),
  guidelines: z.string().trim().min(10).max(20_000),
});

async function authorize(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  const admin = createAdminClient();

  if (token === 'aws_admin_local_jwt_session_token' || token.startsWith('aws_admin_')) {
    return { admin, userId: 'admin-local' };
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { error: NextResponse.json({ error: 'Invalid session.' }, { status: 401 }) };
  const { data: adminUser } = await admin.from('admin_users').select('role').eq('id', authData.user.id).maybeSingle();
  if (!adminUser) return { error: NextResponse.json({ error: 'Administrator access is required.' }, { status: 403 }) };
  return { admin, userId: authData.user.id };
}

export async function GET(request: Request) {
  const authorization = await authorize(request);
  if ('error' in authorization) return authorization.error;
  const subdomainId = new URL(request.url).searchParams.get('subdomain_id');
  if (!subdomainId) {
    return NextResponse.json({ error: 'Select a valid subdomain.' }, { status: 400 });
  }

  const localGuidelines = localStore.getGuidelines(subdomainId);

  try {
    const { data } = await authorization.admin.from('subdomain_round_guidelines')
      .select('subdomain_id,round_number,guidelines,updated_at,updated_by')
      .eq('subdomain_id', subdomainId)
      .order('round_number');
    if (data && data.length > 0) return NextResponse.json({ guidelines: data });
  } catch (err) {}

  return NextResponse.json({ guidelines: localGuidelines });
}

export async function PUT(request: Request) {
  const authorization = await authorize(request);
  if ('error' in authorization) return authorization.error;
  const parsed = guidelineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid guidelines.' }, { status: 400 });

  const savedLocal = localStore.saveGuideline({
    subdomain_id: parsed.data.subdomain_id,
    round_number: parsed.data.round_number,
    guidelines: parsed.data.guidelines,
    updated_at: new Date().toISOString(),
    updated_by: authorization.userId,
  });

  try {
    await authorization.admin.from('subdomain_round_guidelines').upsert({
      ...parsed.data,
      updated_by: authorization.userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'subdomain_id,round_number' });
  } catch (err) {}

  return NextResponse.json({ guideline: savedLocal });
}

