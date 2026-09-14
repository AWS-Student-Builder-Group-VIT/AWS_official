import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase-server';
import {
  questionsForSelections,
  validateWrittenCompletion,
} from '@/lib/written-question-rules.mjs';

const answerSchema = z.object({
  domainId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerText: z.string().max(20_000).default(''),
  submissionLinks: z.array(z.string().url()).max(10).default([]),
});

const payloadSchema = z.object({ answers: z.array(answerSchema).default([]) });

type AdminClient = ReturnType<typeof createAdminClient>;

function migrationRequired(error: { code?: string; message?: string } | null) {
  return Boolean(error && (
    error.code === '42P01'
    || error.code === '42703'
    || error.message?.includes('written_application_')
    || error.message?.includes('candidate_written_answers')
  ));
}

async function authenticate(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required.' }, { status: 401 }) };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ code: 'INVALID_SESSION', error: 'Invalid session.' }, { status: 401 }) };
  return { admin, candidateId: data.user.id };
}

async function loadRoundOne(admin: AdminClient, candidateId: string) {
  const { data: choices, error: choiceError } = await admin
    .from('candidate_subdomain_choices')
    .select('subdomain_id,priority,subdomain:subdomains(id,name,domain:domains(id,name,slug))')
    .eq('candidate_id', candidateId)
    .order('priority');
  if (choiceError) return { error: choiceError };

  const normalizedChoices = (choices || []).map((choice) => {
    const subdomain = choice.subdomain as unknown as {
      id: string;
      name: string;
      domain: { id: string; name: string; slug: string } | null;
    } | null;
    return {
      subdomainId: choice.subdomain_id,
      subdomainName: subdomain?.name ?? '',
      priority: choice.priority,
      domainId: subdomain?.domain?.id ?? '',
      domainName: subdomain?.domain?.name ?? '',
      domainSlug: subdomain?.domain?.slug ?? '',
    };
  }).filter((choice) => choice.domainId);

  const domains = Array.from(new Map(normalizedChoices.map((choice) => [choice.domainId, {
    id: choice.domainId,
    name: choice.domainName,
    slug: choice.domainSlug,
    tracks: normalizedChoices
      .filter((track) => track.domainId === choice.domainId)
      .map((track) => ({ id: track.subdomainId, name: track.subdomainName })),
  }])).values());

  const { data: questionRows, error: questionError } = await admin
    .from('written_application_questions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (questionError) return { error: questionError };

  const baseQuestions = (questionRows || []).map((question) => ({
    id: question.id,
    slug: question.slug,
    scope: question.scope,
    domainId: question.domain_id,
    group: question.question_group,
    prompt: question.prompt,
    instructions: question.instructions,
    responseType: question.response_type,
    required: question.required,
    sortOrder: question.sort_order,
  }));
  const questions = questionsForSelections(baseQuestions, domains.map((domain) => domain.slug));

  const domainIdBySlug = new Map(domains.map((domain) => [domain.slug, domain.id]));
  const applicableQuestions = questions.map((question: typeof baseQuestions[number] & { answerKey: string }) => ({
    ...question,
    domainId: domainIdBySlug.get(question.domainId) ?? question.domainId,
    domainSlug: question.domainId,
    answerKey: `${domainIdBySlug.get(question.domainId) ?? question.domainId}:${question.id}`,
  }));
  const nonTechnicalDomainIds = domains.filter((domain) => domain.slug !== 'technical').map((domain) => domain.id);

  const [{ data: ruleRows, error: ruleError }, { data: answers, error: answerError }, { data: attempt }] = await Promise.all([
    nonTechnicalDomainIds.length
      ? admin.from('written_application_rules').select('*').in('domain_id', nonTechnicalDomainIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from('candidate_written_answers').select('*').eq('candidate_id', candidateId),
    admin.from('assessment_attempts').select('status').eq('candidate_id', candidateId).maybeSingle(),
  ]);
  if (ruleError) return { error: ruleError };
  if (answerError) return { error: answerError };

  const rules = (ruleRows || []).map((rule) => ({
    domainId: rule.domain_id,
    group: rule.question_group,
    minimumAnswers: rule.minimum_answers,
  }));
  const answerMap = Object.fromEntries((answers || []).map((answer) => [
    `${answer.domain_id}:${answer.question_id}`,
    answer.answer_text?.trim() || ((answer.submission_links as string[] | null) || []).join('\n'),
  ]));
  const completion = validateWrittenCompletion(applicableQuestions, rules, answerMap);
  const finalAnswerMap = Object.fromEntries((answers || []).filter((answer) => answer.is_final).map((answer) => [
    `${answer.domain_id}:${answer.question_id}`,
    answer.answer_text?.trim() || ((answer.submission_links as string[] | null) || []).join('\n'),
  ]));
  const finalCompletion = validateWrittenCompletion(applicableQuestions, rules, finalAnswerMap);
  const technicalRequired = domains.some((domain) => domain.slug === 'technical');

  return {
    data: {
      domains,
      questions: applicableQuestions,
      rules,
      answers: answers || [],
      completion,
      writtenFinal: finalCompletion.valid,
      technical: {
        required: technicalRequired,
        complete: !technicalRequired || attempt?.status === 'submitted',
      },
    },
  };
}

async function deadlinePassed(admin: AdminClient) {
  const { data } = await admin.from('recruitment_settings').select('value').eq('key', 'application_deadline').maybeSingle();
  const deadline = (data?.value as { at?: string | null } | null)?.at;
  return Boolean(deadline && Date.now() >= new Date(deadline).getTime());
}

async function handleWrite(request: Request, finalize: boolean) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_WRITTEN_ANSWERS', error: 'Invalid written-answer payload.' }, { status: 400 });
  if (await deadlinePassed(auth.admin)) {
    return NextResponse.json({ code: 'APPLICATION_DEADLINE_PASSED', error: 'The application deadline has passed.' }, { status: 403 });
  }

  const loaded = await loadRoundOne(auth.admin, auth.candidateId);
  if ('error' in loaded) {
    const needsMigration = migrationRequired(loaded.error ?? null);
    return NextResponse.json({
      code: needsMigration ? 'MIGRATION_REQUIRED' : 'ROUND_ONE_LOAD_FAILED',
      error: needsMigration ? 'Apply the latest recruitment database migration first.' : loaded.error?.message ?? 'Unable to load Round 1.',
    }, { status: needsMigration ? 503 : 500 });
  }

  const allowed = new Set(loaded.data.questions.map((question) => question.answerKey));
  if (parsed.data.answers.some((answer) => !allowed.has(`${answer.domainId}:${answer.questionId}`))) {
    return NextResponse.json({ code: 'QUESTION_NOT_APPLICABLE', error: 'One or more answers do not belong to your selected domains.' }, { status: 400 });
  }

  if (parsed.data.answers.length) {
    const rows = parsed.data.answers.map((answer) => ({
      candidate_id: auth.candidateId,
      domain_id: answer.domainId,
      question_id: answer.questionId,
      answer_text: answer.answerText,
      submission_links: answer.submissionLinks,
      is_final: false,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await auth.admin.from('candidate_written_answers').upsert(rows, {
      onConflict: 'candidate_id,domain_id,question_id',
    });
    if (error) return NextResponse.json({ code: 'WRITTEN_SAVE_FAILED', error: error.message }, { status: 500 });
  }

  if (!finalize) return NextResponse.json({ saved: true });

  const refreshed = await loadRoundOne(auth.admin, auth.candidateId);
  if ('error' in refreshed) return NextResponse.json({ code: 'ROUND_ONE_LOAD_FAILED', error: refreshed.error?.message ?? 'Unable to load Round 1.' }, { status: 500 });
  if (!refreshed.data.completion.valid) {
    return NextResponse.json({
      code: 'WRITTEN_ANSWERS_INCOMPLETE',
      error: 'Complete all required written responses before submitting.',
      missing: refreshed.data.completion.missing,
    }, { status: 400 });
  }

  const domainIds = refreshed.data.domains.filter((domain) => domain.slug !== 'technical').map((domain) => domain.id);
  if (domainIds.length) {
    const { error } = await auth.admin.from('candidate_written_answers')
      .update({ is_final: true, updated_at: new Date().toISOString() })
      .eq('candidate_id', auth.candidateId)
      .in('domain_id', domainIds);
    if (error) return NextResponse.json({ code: 'WRITTEN_SUBMIT_FAILED', error: error.message }, { status: 500 });
  }

  if (refreshed.data.technical.complete) {
    await auth.admin.from('candidate_profiles').update({ round_0_status: 'submitted' }).eq('id', auth.candidateId);
  }

  return NextResponse.json({ submitted: true, roundOneComplete: refreshed.data.technical.complete });
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ('error' in auth) return auth.error;
  const loaded = await loadRoundOne(auth.admin, auth.candidateId);
  if ('error' in loaded) {
    const needsMigration = migrationRequired(loaded.error ?? null);
    return NextResponse.json({
      code: needsMigration ? 'MIGRATION_REQUIRED' : 'ROUND_ONE_LOAD_FAILED',
      error: needsMigration ? 'Apply the latest recruitment database migration first.' : loaded.error?.message ?? 'Unable to load Round 1.',
    }, { status: needsMigration ? 503 : 500 });
  }
  return NextResponse.json(loaded.data);
}

export async function PUT(request: Request) {
  return handleWrite(request, false);
}

export async function POST(request: Request) {
  return handleWrite(request, true);
}
