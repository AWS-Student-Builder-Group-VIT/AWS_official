import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdmin } from '@/lib/admin-authorization';

const guidelineSchema = z.object({
  subdomain_id: z.string(),
  round_number: z.union([z.literal(2), z.literal(3)]),
  guidelines: z.string().trim().min(10).max(20_000),
});

export async function GET(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('error' in authorization) return authorization.error;
  const subdomainId = new URL(request.url).searchParams.get('subdomain_id');
  if (!subdomainId) return NextResponse.json({ error: 'Select a valid subdomain.' }, { status: 400 });

  const { data, error } = await authorization.admin
    .from('subdomain_round_guidelines')
    .select('subdomain_id,round_number,guidelines,updated_at,updated_by')
    .eq('subdomain_id', subdomainId)
    .order('round_number');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guidelines: data ?? [] });
}

export async function PUT(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('error' in authorization) return authorization.error;
  const parsed = guidelineSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid guidelines.' }, { status: 400 });

  const { data, error } = await authorization.admin
    .from('subdomain_round_guidelines')
    .upsert({ ...parsed.data, updated_by: authorization.userId, updated_at: new Date().toISOString() }, { onConflict: 'subdomain_id,round_number' })
    .select('subdomain_id,round_number,guidelines,updated_at,updated_by')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guideline: data });
}
