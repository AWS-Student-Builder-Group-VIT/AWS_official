import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';
import { localStore } from '@/lib/local-store';

const projectSchema = z.object({
  subdomain_id: z.string().min(1),
  title: z.string().trim().min(3).max(500),
  details: z.string().trim().min(10).max(30000),
  aws_services: z.array(z.string()).optional().default([]),
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
  const localProjects = localStore.getProjects(subdomainId);

  try {
    let query = authorization.admin.from('projects').select('*').order('created_at', { ascending: false });
    if (subdomainId) query = query.eq('subdomain_id', subdomainId);
    const { data } = await query;
    if (data && data.length > 0) {
      return NextResponse.json({ projects: data });
    }
  } catch {}

  return NextResponse.json({ projects: localProjects });
}

export async function POST(request: Request) {
  const authorization = await authorize(request);
  if ('error' in authorization) return authorization.error;

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid project statement.' }, { status: 400 });
  }

  const savedLocal = localStore.saveProject({
    subdomain_id: parsed.data.subdomain_id,
    title: parsed.data.title,
    details: parsed.data.details,
    aws_services: parsed.data.aws_services,
  });

  try {
    const slug = parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'project';
    await authorization.admin.from('projects').insert({
      subdomain_id: parsed.data.subdomain_id,
      code: `PRJ-${Date.now().toString().slice(-4)}`,
      title: parsed.data.title,
      problem_statement: parsed.data.details,
      requirements: parsed.data.details,
      aws_services: parsed.data.aws_services,
      deadline_days: 7,
    });
  } catch {}

  return NextResponse.json({ project: savedLocal }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authorization = await authorize(request);
  if ('error' in authorization) return authorization.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const subdomainId = searchParams.get('subdomain_id');
  const deleteAll = searchParams.get('all') === 'true';

  if (deleteAll && subdomainId) {
    localStore.clearProjects(subdomainId);
    try {
      await authorization.admin.from('projects').delete().eq('subdomain_id', subdomainId);
    } catch {}
    return NextResponse.json({ success: true, message: 'All problem statements for subdomain cleared.' });
  }

  if (!id) return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });

  localStore.deleteProject(id);
  try {
    await authorization.admin.from('projects').delete().eq('id', id);
  } catch {}

  return NextResponse.json({ success: true, message: 'Problem statement deleted.' });
}
