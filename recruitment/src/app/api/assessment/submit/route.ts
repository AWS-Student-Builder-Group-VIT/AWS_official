import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';
import { isAssessmentAnswerCorrect } from '@/lib/assessment-grading';

const submissionSchema = z.object({
  auto: z.boolean().default(false),
  answers: z.record(z.union([z.string(), z.array(z.string())])),
});

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });

  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid assessment submission.' }, { status: 400 });

  const candidateId = authData.user.id;
  const { data: attempt, error: attemptError } = await admin.from('assessment_attempts')
    .select('id,question_ids,status')
    .eq('candidate_id', candidateId)
    .maybeSingle();
  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 500 });
  if (!attempt) return NextResponse.json({ error: 'Assessment attempt not found.' }, { status: 404 });
  if (attempt.status !== 'in_progress') return NextResponse.json({ error: 'This assessment has already been submitted.' }, { status: 409 });

  const questionIds = (attempt.question_ids as string[]) ?? [];
  const allowedIds = new Set(questionIds);
  const answerRows = Object.entries(parsed.data.answers)
    .filter(([questionId]) => allowedIds.has(questionId))
    .map(([questionId, answer]) => ({ attempt_id: attempt.id, question_id: questionId, answer, saved_at: new Date().toISOString() }));
  if (answerRows.length) {
    const { error } = await admin.from('assessment_answers').upsert(answerRows, { onConflict: 'attempt_id,question_id' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: questions, error: questionError } = await admin.from('assessment_questions')
    .select('id,question_type,correct_answers,marks')
    .in('id', questionIds);
  if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 });

  const totalMarks = (questions ?? []).reduce((sum, question) => sum + question.marks, 0);
  const score = (questions ?? []).reduce((sum, question) => {
    const correct = (question.correct_answers as string[] | null) ?? [];
    return sum + (isAssessmentAnswerCorrect(question.question_type, parsed.data.answers[question.id], correct) ? question.marks : 0);
  }, 0);
  const submittedAt = new Date().toISOString();
  const { error: updateError } = await admin.from('assessment_attempts').update({
    submitted_at: submittedAt,
    auto_submitted: parsed.data.auto,
    status: 'submitted',
    total_marks: totalMarks,
    score,
  }).eq('id', attempt.id).eq('status', 'in_progress');
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { data: choices } = await admin
    .from('candidate_subdomain_choices')
    .select('subdomain:subdomains(domain:domains(id,slug))')
    .eq('candidate_id', candidateId);
  const nonTechnicalDomainIds = Array.from(new Set((choices || []).flatMap((choice) => {
    const subdomain = choice.subdomain as unknown as { domain?: { id?: string; slug?: string } | null } | null;
    return subdomain?.domain?.id && subdomain.domain.slug !== 'technical' ? [subdomain.domain.id] : [];
  })));
  let writtenComplete = nonTechnicalDomainIds.length === 0;
  if (nonTechnicalDomainIds.length) {
    const { data: finalAnswers } = await admin
      .from('candidate_written_answers')
      .select('domain_id')
      .eq('candidate_id', candidateId)
      .eq('is_final', true)
      .in('domain_id', nonTechnicalDomainIds);
    const finalizedDomains = new Set((finalAnswers || []).map((answer) => answer.domain_id));
    writtenComplete = nonTechnicalDomainIds.every((domainId) => finalizedDomains.has(domainId));
  }
  if (writtenComplete) {
    await admin.from('candidate_profiles').update({ round_0_status: 'submitted' }).eq('id', candidateId);
  }
  return NextResponse.json({ submitted: true });
}
