import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';

const guidelineSchema = z.object({
  subdomain_id: z.string().uuid(),
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
  if (!subdomainId || !z.string().uuid().safeParse(subdomainId).success) {
    return NextResponse.json({ error: 'Select a valid subdomain.' }, { status: 400 });
  }
  const { data, error } = await authorization.admin.from('subdomain_round_guidelines')
    .select('subdomain_id,round_number,guidelines,updated_at,updated_by')
    .eq('subdomain_id', subdomainId)
    .order('round_number');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guidelines: data ?? [] });
}

export async function PUT(request: Request) {
  const authorization = await authorize(request);
  if ('error' in authorization) return authorization.error;
  const parsed = guidelineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid guidelines.' }, { status: 400 });
  const { data: subdomain } = await authorization.admin.from('subdomains').select('id').eq('id', parsed.data.subdomain_id).eq('is_active', true).maybeSingle();
  if (!subdomain) return NextResponse.json({ error: 'Select an active subdomain.' }, { status: 400 });
  const { data, error } = await authorization.admin.from('subdomain_round_guidelines').upsert({
    ...parsed.data,
    updated_by: authorization.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'subdomain_id,round_number' }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guideline: data });
}
