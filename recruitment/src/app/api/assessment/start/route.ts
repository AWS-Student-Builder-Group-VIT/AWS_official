import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { technicalAssessmentTracks } from '@/lib/assessment-track-rules.mjs';

const QUESTION_COUNT = 5;
const SECONDS_PER_SUBDOMAIN = 1500;
type TechnicalChoice = {
  subdomain_id: string;
  priority: number;
  subdomain: unknown;
  domainSlug: string;
};

export async function POST(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });

  const candidateId = authData.user.id;
  const { data: profile } = await admin.from('candidate_profiles').select('domain_id,subdomain_id,profile_complete').eq('id', candidateId).maybeSingle();
  if (!profile?.profile_complete || !profile.domain_id || !profile.subdomain_id) {
    return NextResponse.json({ error: 'Complete your profile and select a subdomain first.' }, { status: 400 });
  }

  const { data: existing } = await admin.from('assessment_attempts').select('*').eq('candidate_id', candidateId).maybeSingle();
  if (existing) return NextResponse.json({ error: 'An assessment attempt already exists.' }, { status: 409 });

  const { data: schedule } = await admin.from('recruitment_settings').select('value').eq('key', 'round_0_start_at').maybeSingle();
  const startAt = (schedule?.value as { at?: string | null } | null)?.at ?? null;
  if (!startAt) return NextResponse.json({ error: 'The Round 1 date is yet to be announced.' }, { status: 403 });
  if (Date.now() < new Date(startAt).getTime()) {
    return NextResponse.json({ error: `Round 1 opens ${new Date(startAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.` }, { status: 403 });
  }

  const { data: choices, error: choiceError } = await admin
    .from('candidate_subdomain_choices')
    .select('subdomain_id,priority,subdomain:subdomains(domain_id,name,domain:domains(slug))')
    .eq('candidate_id', candidateId)
    .order('priority');
  if (choiceError) return NextResponse.json({ error: choiceError.message }, { status: 500 });
  if (!choices?.length) return NextResponse.json({ error: 'Select at least one subdomain first.' }, { status: 400 });

  const technicalChoices = technicalAssessmentTracks(choices.map((choice) => {
    const subdomain = choice.subdomain as unknown as { domain?: { slug?: string } | null } | null;
    return { ...choice, domainSlug: subdomain?.domain?.slug ?? '' };
  })) as TechnicalChoice[];
  if (!technicalChoices.length) {
    return NextResponse.json({
      code: 'NO_TECHNICAL_ASSESSMENT_REQUIRED',
      error: 'No Technical assessment is required for your selected domains.',
    }, { status: 400 });
  }

  const questionGroups = await Promise.all(technicalChoices.map(async (choice) => {
    const { data, error } = await admin.from('assessment_questions').select('id').eq('subdomain_id', choice.subdomain_id).eq('is_active', true);
    return { choice, data, error };
  }));
  const failedGroup = questionGroups.find((group) => group.error || !group.data || group.data.length < QUESTION_COUNT);
  if (failedGroup) {
    const name = (failedGroup.choice.subdomain as unknown as { name?: string } | null)?.name ?? 'A selected subdomain';
    return NextResponse.json({ error: failedGroup.error?.message ?? `${name} needs at least ${QUESTION_COUNT} active questions.` }, { status: 400 });
  }

  const questionIds = questionGroups.flatMap((group) => [...group.data!].sort(() => Math.random() - 0.5).slice(0, QUESTION_COUNT).map((question) => question.id));
  const primary = technicalChoices[0];
  const primaryDomain = (primary.subdomain as unknown as { domain_id?: string } | null)?.domain_id ?? profile.domain_id;
  const { data: attempt, error: attemptError } = await admin.from('assessment_attempts').insert({
    candidate_id: candidateId,
    domain_id: primaryDomain,
    subdomain_id: primary.subdomain_id,
    question_ids: questionIds,
    time_limit_seconds: SECONDS_PER_SUBDOMAIN * technicalChoices.length,
  }).select('*').single();
  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 500 });

  await admin.from('candidate_profiles').update({ round_0_status: 'in_progress', status: 'round_0' }).eq('id', candidateId);
  return NextResponse.json({ attempt });
}
