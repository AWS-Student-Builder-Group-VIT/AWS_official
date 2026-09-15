import { NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/admin-authorization';

export async function GET(request: Request) {
  const authorization = await authorizeAdmin(request);
  if ('error' in authorization) return authorization.error;

  const { admin, adminUser } = authorization;
  const [candidateResult, attemptResult, assignmentResult, submissionResult, bookingResult, resultResult, domainResult, slotResult, writtenQuestionResult, writtenRuleResult, writtenAnswerResult] = await Promise.all([
    admin.from('candidate_profiles').select('*, subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').order('created_at', { ascending: false }).limit(2000),
    admin.from('assessment_attempts').select('*').order('started_at', { ascending: false }).limit(2000),
    admin.from('project_assignments').select('*, project:projects(*)').order('assigned_at', { ascending: false }).limit(4000),
    admin.from('project_submissions').select('*, evaluation:project_evaluations(*)').order('submitted_at', { ascending: false }).limit(4000),
    admin.from('interview_bookings').select('*, slot:interview_slots(*, date:interview_dates(*))').order('booked_at', { ascending: false }).limit(4000),
    admin.from('final_results').select('*').order('announced_at', { ascending: false }).limit(2000),
    admin.from('domains').select('*, subdomains(*)').order('sort_order').order('sort_order', { referencedTable: 'subdomains' }),
    admin.from('interview_slots').select('id,is_booked,status'),
    admin.from('written_application_questions').select('*').order('sort_order'),
    admin.from('written_application_rules').select('*'),
    admin.from('candidate_written_answers').select('*, question:written_application_questions(*), domain:domains(id,name,slug)').order('updated_at', { ascending: false }).limit(10000),
  ]);

  const errors = [candidateResult.error, attemptResult.error, assignmentResult.error, submissionResult.error, bookingResult.error, resultResult.error, domainResult.error, slotResult.error, writtenQuestionResult.error, writtenRuleResult.error, writtenAnswerResult.error].filter(Boolean);
  if (errors.length) return NextResponse.json({ error: errors[0]!.message }, { status: 500 });

  return NextResponse.json({
    admin: adminUser,
    candidates: candidateResult.data ?? [],
    attempts: attemptResult.data ?? [],
    assignments: assignmentResult.data ?? [],
    submissions: submissionResult.data ?? [],
    bookings: bookingResult.data ?? [],
    results: resultResult.data ?? [],
    domains: domainResult.data ?? [],
    slots: slotResult.data ?? [],
    written_questions: writtenQuestionResult.data ?? [],
    written_rules: writtenRuleResult.data ?? [],
    written_answers: writtenAnswerResult.data ?? [],
    synced_at: new Date().toISOString(),
  });
}
