import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeAdmin } from '@/lib/admin-authorization';
import { parseProjectDocumentLink } from '@/lib/project-document-link.mjs';

const projectSchema = z.object({
  subdomain_id: z.string().min(1),
  title: z.string().trim().min(3).max(500),
  details: z.string().trim().min(10).max(30000),
  aws_services: z.array(z.string()).optional().default([]),
  task_document_url: z.unknown().optional(),
});

export async function GET(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('error' in authorization) return authorization.error;
  const subdomainId = new URL(request.url).searchParams.get('subdomain_id');
  let query = authorization.admin.from('projects').select('*').order('created_at', { ascending: false });
  if (subdomainId) query = query.eq('subdomain_id', subdomainId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('error' in authorization) return authorization.error;
  const parsed = projectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid project statement.' }, { status: 400 });

  let taskDocumentUrl: string | null;
  try {
    taskDocumentUrl = parseProjectDocumentLink(parsed.data.task_document_url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid document link.' }, { status: 400 });
  }

  const { data, error } = await authorization.admin.from('projects').insert({
    subdomain_id: parsed.data.subdomain_id,
    code: `PRJ-${Date.now().toString().slice(-6)}`,
    title: parsed.data.title,
    problem_statement: parsed.data.details,
    requirements: parsed.data.details,
    aws_services: parsed.data.aws_services,
    task_document_url: taskDocumentUrl,
    deadline_days: 7,
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('error' in authorization) return authorization.error;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const subdomainId = searchParams.get('subdomain_id');
  const deleteAll = searchParams.get('all') === 'true';

  if (deleteAll && subdomainId) {
    const { error } = await authorization.admin.from('projects').delete().eq('subdomain_id', subdomainId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: 'All problem statements for subdomain cleared.' });
  }
  if (!id) return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 });

  const { error } = await authorization.admin.from('projects').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, message: 'Problem statement deleted.' });
}
