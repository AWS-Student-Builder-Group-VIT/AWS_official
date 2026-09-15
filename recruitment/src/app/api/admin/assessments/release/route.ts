import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';
import { isAssessmentAnswerCorrect } from '@/lib/assessment-grading';

const releaseSchema = z.object({ attempt_id: z.string().uuid(), release: z.boolean() });

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
  const { data: adminUser } = await admin.from('admin_users').select('role').eq('id', authData.user.id).maybeSingle();
  if (!adminUser || !['super_admin', 'recruitment_admin', 'assessment_evaluator'].includes(adminUser.role)) {
    return NextResponse.json({ error: 'Assessment administrator access is required.' }, { status: 403 });
  }

  const parsed = releaseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid marks release request.' }, { status: 400 });
  const { attempt_id: attemptId, release } = parsed.data;

  const { data: attempt, error: attemptError } = await admin.from('assessment_attempts')
    .select('id,question_ids,status,score,total_marks')
    .eq('id', attemptId)
    .maybeSingle();
  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 500 });
  if (!attempt || attempt.status !== 'submitted') return NextResponse.json({ error: 'Only submitted assessments can have marks released.' }, { status: 400 });

  let score = attempt.score;
  let totalMarks = attempt.total_marks;
  if (release && score == null) {
    const questionIds = (attempt.question_ids as string[]) ?? [];
    const [{ data: questions, error: questionError }, { data: answers, error: answerError }] = await Promise.all([
      admin.from('assessment_questions').select('id,question_type,correct_answers,marks').in('id', questionIds),
      admin.from('assessment_answers').select('question_id,answer').eq('attempt_id', attemptId),
    ]);
    if (questionError || answerError) return NextResponse.json({ error: questionError?.message ?? answerError?.message }, { status: 500 });
    const answerMap = new Map((answers ?? []).map((row) => [row.question_id, row.answer as string | string[]]));
    totalMarks = (questions ?? []).reduce((sum, question) => sum + question.marks, 0);
    score = (questions ?? []).reduce((sum, question) => {
      const correct = (question.correct_answers as string[] | null) ?? [];
      return sum + (isAssessmentAnswerCorrect(question.question_type, answerMap.get(question.id), correct) ? question.marks : 0);
    }, 0);
  }

  const { data, error } = await admin.from('assessment_attempts').update({
    score,
    total_marks: totalMarks,
    results_released_at: release ? new Date().toISOString() : null,
    results_released_by: release ? authData.user.id : null,
  }).eq('id', attemptId).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attempt: data });
}
