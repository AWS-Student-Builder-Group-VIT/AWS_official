/**
 * Recruitment API routes — mounted at /api/recruitment/* in server/index.js
 *
 * Uses the Supabase Admin client (service_role key, server-side only) to
 * bypass RLS for privileged operations.  The service_role key is NEVER sent
 * to the browser.
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { validateProfilePayload } from '../src/recruitment/lib/profile-schema.js';
import { splitVitName } from '../src/recruitment/lib/vit-identity.js';
import { isAssessmentAnswerCorrect } from '../src/recruitment/lib/assessment-grading.js';
import { isAllowedEmail, parseAllowedDomains } from '../src/recruitment/lib/email-domains.js';
import { chunk, fetchAll } from '../src/recruitment/lib/fetch-all.js';
import { normalizeGithubRepoUrl } from '../src/recruitment/lib/github-url.js';

const router = Router();

/** Constant-time credential comparison; length is compared first because
 *  timingSafeEqual throws on mismatched buffer lengths. */
export function secretMatches(provided, expected) {
  const a = Buffer.from(String(provided ?? ''), 'utf8');
  const b = Buffer.from(String(expected ?? ''), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Supabase admin client (server-side only) ──────────────────────────────
function adminSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── Helper: verify Supabase JWT and check admin_users row ─────────────────
async function requireAdmin(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Missing token' }); return null; }
  const supabase = adminSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid session' }); return null; }
  const { data: admin } = await supabase.from('admin_users').select('id,role,name,email').eq('id', user.id).maybeSingle();
  if (!admin) { res.status(403).json({ error: 'Not an admin' }); return null; }
  return { user, admin, supabase };
}

// ── Helper: verify Supabase JWT (candidate or admin) ─────────────────────
async function requireAuth(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Missing token' }); return null; }
  const supabase = adminSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid session' }); return null; }

  // Candidates must hold an institutional address when the gate is configured.
  // Administrators sign in with a derived internal account, so they are exempt.
  const allowedDomains = parseAllowedDomains(process.env.ALLOWED_EMAIL_DOMAINS);
  if (allowedDomains.length && !isAllowedEmail(user.email, allowedDomains)) {
    const { data: admin } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle();
    if (!admin) {
      res.status(403).json({ error: `Recruitment is open to ${allowedDomains.map((d) => '@' + d).join(' or ')} accounts only.` });
      return null;
    }
  }
  return { user, supabase };
}

// ═══════════════════════════════════════════════════════════════════════════
// CANDIDATE AUTH
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/recruitment/admin/login
router.post('/admin/login', async (req, res) => {
  try {
    const { adminId, password } = req.body ?? {};
    if (!adminId || !password) return res.status(400).json({ error: 'adminId and password are required' });

    const { ADMIN_ID, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_ID || !ADMIN_PASSWORD) {
      return res.status(503).json({ error: 'Admin login is not configured: set ADMIN_ID and ADMIN_PASSWORD.' });
    }
    if (!secretMatches(adminId, ADMIN_ID) || !secretMatches(password, ADMIN_PASSWORD)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // The dashboard's routes and every RLS policy key off auth.uid(), so the env
    // credentials are exchanged for a real Supabase session. The account behind it
    // is derived from ADMIN_ID and is never typed or emailed; its password is kept
    // in step with ADMIN_PASSWORD so a plain password grant is all that's needed.
    const adminEmail = `${ADMIN_ID.replace(/[^a-z0-9._-]/gi, '')}@admin.local`;
    const supabase = adminSupabase();

    // Sign in first. Creating or re-applying the password on every login would
    // revoke every other admin session, so the account is only touched when the
    // sign-in actually fails.
    let signIn = await supabase.auth.signInWithPassword({ email: adminEmail, password: ADMIN_PASSWORD });
    let adminUserId = signIn.data?.user?.id;

    if (signIn.error) {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
      adminUserId = created?.user?.id;

      if (createError) {
        // Already registered, so the stored password no longer matches
        // ADMIN_PASSWORD: re-apply it, which is also how a rotated password
        // takes effect.
        const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listError) return res.status(500).json({ error: listError.message });
        const existing = list?.users?.find((user) => user.email === adminEmail);
        if (!existing) return res.status(500).json({ error: createError.message });
        const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
          password: ADMIN_PASSWORD,
          email_confirm: true,
        });
        if (updateError) return res.status(500).json({ error: updateError.message });
        adminUserId = existing.id;
      }

      signIn = await supabase.auth.signInWithPassword({ email: adminEmail, password: ADMIN_PASSWORD });
    }

    const { data: signedIn, error: signInError } = signIn;
    if (signInError || !signedIn.session) {
      return res.status(500).json({ error: signInError?.message ?? 'Could not create an admin session' });
    }

    // Signing in attaches that user's token to this client, so its later
    // requests run as the user and RLS applies again. The admin_users write
    // needs a clean service-role client, or the first admin can never be
    // recorded: the policy only lets an existing super_admin write the table.
    const serviceClient = adminSupabase();

    // Keep admin_users in step so requireAdmin and the RLS policies accept this
    // session. Swallowing a failure here yields a confusing 403 on the next
    // request instead, so it is reported directly.
    const { error: upsertError } = await serviceClient.from('admin_users').upsert(
      { id: adminUserId ?? signedIn.user.id, email: adminEmail, name: 'Admin', role: 'super_admin' },
      { onConflict: 'id' },
    );
    if (upsertError) {
      return res.status(500).json({ error: `Admin record could not be saved: ${upsertError.message}` });
    }

    return res.json({ access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/recruitment/profile/complete
// Ported from the deleted Next.js app; without it the profile form posts to a
// 404 and the candidate never gets a candidate_profiles row.
router.post('/profile/complete', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  if (!user.email) return res.status(401).json({ error: 'Your signed-in account does not provide an email address.' });

  // VIT accounts carry the registration number in the Google name; when it is
  // there it wins over whatever was typed, so nobody can claim someone else's.
  const metadata = user.user_metadata ?? {};
  const identity = splitVitName(metadata.full_name || metadata.name || user.email.split('@')[0]);
  const body = { ...(req.body ?? {}) };
  if (identity.registrationNumber) body.registration_number = identity.registrationNumber;

  const parsed = validateProfilePayload(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid profile.' });

  const { data, error } = await supabase.from('candidate_profiles').upsert({
    id: user.id,
    full_name: identity.name,
    email: user.email,
    ...parsed.data,
    profile_complete: true,
  }, { onConflict: 'id' }).select('*').single();
  if (error) {
    // 23505: another account already claimed this registration number.
    if (error.code === '23505' && error.message.includes('registration_number')) {
      return res.status(409).json({ error: 'That registration number is already registered to another account. Sign in with that account, or contact the recruitment team.' });
    }
    return res.status(500).json({ error: error.message });
  }
  return res.json({ profile: data });
});

// ═══════════════════════════════════════════════════════════════════════════
// TECHNICAL ASSESSMENT (Round 1)
// ═══════════════════════════════════════════════════════════════════════════

const QUESTIONS_PER_TRACK = 10;
const SECONDS_PER_TRACK = 600;

/** Technical subdomain choices, ordered by priority. */
async function technicalTracks(supabase, candidateId) {
  const { data, error } = await supabase
    .from('candidate_subdomain_choices')
    .select('subdomain_id,priority,subdomain:subdomains(id,name,domain_id,domain:domains(slug))')
    .eq('candidate_id', candidateId)
    .order('priority');
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((choice) => choice.subdomain?.domain?.slug === 'technical')
    .map((choice) => ({
      subdomainId: choice.subdomain_id,
      name: choice.subdomain?.name ?? 'Technical',
      domainId: choice.subdomain?.domain_id ?? null,
    }));
}

// POST /api/recruitment/assessment/start  { subdomainId }
// One attempt per selected Technical track, so each track is started and
// submitted on its own instead of as a single combined paper.
router.post('/assessment/start', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  try {
    const { data: profile } = await supabase.from('candidate_profiles').select('profile_complete').eq('id', user.id).maybeSingle();
    if (!profile?.profile_complete) return res.status(400).json({ error: 'Complete your profile first.' });

    const tracks = await technicalTracks(supabase, user.id);
    if (!tracks.length) {
      return res.status(400).json({ code: 'NO_TECHNICAL_ASSESSMENT_REQUIRED', error: 'No Technical assessment is required for your selected domains.' });
    }
    const requested = req.body?.subdomainId;
    const track = requested ? tracks.find((t) => t.subdomainId === requested) : null;
    if (!track) return res.status(400).json({ error: 'Select one of your Technical specialisations to start.' });

    const { data: existing } = await supabase.from('assessment_attempts')
      .select('*').eq('candidate_id', user.id).eq('subdomain_id', track.subdomainId).maybeSingle();
    if (existing) return res.json({ attempt: existing, track, resumed: true });

    // A thin question bank yields a shorter paper rather than blocking the track.
    const { data: pool, error: poolError } = await supabase
      .from('assessment_questions').select('id')
      .eq('subdomain_id', track.subdomainId).eq('is_active', true);
    if (poolError) return res.status(500).json({ error: poolError.message });
    if (!pool?.length) return res.status(400).json({ error: `${track.name} has no active questions yet.` });
    const questionIds = [...pool].sort(() => Math.random() - 0.5).slice(0, QUESTIONS_PER_TRACK).map((q) => q.id);

    const { data: attempt, error: attemptError } = await supabase.from('assessment_attempts').insert({
      candidate_id: user.id,
      domain_id: track.domainId,
      subdomain_id: track.subdomainId,
      question_ids: questionIds,
      time_limit_seconds: SECONDS_PER_TRACK,
    }).select('*').single();
    if (attemptError) return res.status(500).json({ error: attemptError.message });

    await supabase.from('candidate_profiles')
      .update({ round_0_status: 'in_progress', status: 'round_0', domain_locked: true })
      .eq('id', user.id);
    return res.json({ attempt, track });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/recruitment/assessment/submit  { subdomainId, auto, answers }
// Submits only the track named by subdomainId; the other tracks are untouched.
router.post('/assessment/submit', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  try {
    const auto = Boolean(req.body?.auto);
    const answers = req.body?.answers ?? {};
    const subdomainId = req.body?.subdomainId;
    if (typeof answers !== 'object' || Array.isArray(answers)) return res.status(400).json({ error: 'Invalid assessment submission.' });
    if (!subdomainId) return res.status(400).json({ error: 'subdomainId is required.' });

    const { data: attempt, error: attemptError } = await supabase.from('assessment_attempts')
      .select('id,question_ids,status').eq('candidate_id', user.id).eq('subdomain_id', subdomainId).maybeSingle();
    if (attemptError) return res.status(500).json({ error: attemptError.message });
    if (!attempt) return res.status(404).json({ error: 'Assessment attempt not found.' });
    if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'This assessment has already been submitted.' });

    const questionIds = attempt.question_ids ?? [];
    const allowed = new Set(questionIds);
    const rows = Object.entries(answers)
      .filter(([questionId]) => allowed.has(questionId))
      .map(([questionId, answer]) => ({ attempt_id: attempt.id, question_id: questionId, answer, saved_at: new Date().toISOString() }));
    if (rows.length) {
      const { error } = await supabase.from('assessment_answers').upsert(rows, { onConflict: 'attempt_id,question_id' });
      if (error) return res.status(500).json({ error: error.message });
    }

    const { data: questions, error: questionError } = await supabase.from('assessment_questions')
      .select('id,question_type,correct_answers,marks').in('id', questionIds);
    if (questionError) return res.status(500).json({ error: questionError.message });

    const totalMarks = (questions ?? []).reduce((sum, q) => sum + (q.marks ?? 0), 0);
    const score = (questions ?? []).reduce((sum, q) => {
      const correct = q.correct_answers ?? [];
      return sum + (isAssessmentAnswerCorrect(q.question_type, answers[q.id], correct) ? (q.marks ?? 0) : 0);
    }, 0);

    const { error: updateError } = await supabase.from('assessment_attempts').update({
      submitted_at: new Date().toISOString(),
      auto_submitted: auto,
      status: 'submitted',
      total_marks: totalMarks,
      score,
    }).eq('id', attempt.id).eq('status', 'in_progress');
    if (updateError) return res.status(500).json({ error: updateError.message });

    // Round 1 counts as complete only once every technical track and every
    // written domain has been submitted.
    const tracks = await technicalTracks(supabase, user.id);
    const { data: allAttempts } = await supabase.from('assessment_attempts')
      .select('subdomain_id,status').eq('candidate_id', user.id);
    const submittedTracks = new Set((allAttempts ?? []).filter((a) => a.status === 'submitted').map((a) => a.subdomain_id));
    const technicalComplete = tracks.every((t) => submittedTracks.has(t.subdomainId));

    const { data: choices } = await supabase.from('candidate_subdomain_choices')
      .select('subdomain:subdomains(domain:domains(id,slug))').eq('candidate_id', user.id);
    const writtenDomainIds = Array.from(new Set((choices ?? []).flatMap((choice) => {
      const domain = choice.subdomain?.domain;
      return domain?.id && domain.slug !== 'technical' ? [domain.id] : [];
    })));
    let writtenComplete = writtenDomainIds.length === 0;
    if (writtenDomainIds.length) {
      const { data: finalAnswers } = await supabase.from('candidate_written_answers')
        .select('domain_id').eq('candidate_id', user.id).eq('is_final', true).in('domain_id', writtenDomainIds);
      const done = new Set((finalAnswers ?? []).map((a) => a.domain_id));
      writtenComplete = writtenDomainIds.every((id) => done.has(id));
    }
    await supabase.from('candidate_profiles').update({
      round_0_status: technicalComplete && writtenComplete ? 'submitted' : 'in_progress',
      domain_locked: true,
    }).eq('id', user.id);

    return res.json({ submitted: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUND 2 — PROJECT
// ═══════════════════════════════════════════════════════════════════════════

// Only these project fields ever reach a candidate. Judging criteria live in
// projects.evaluation_rubric and are never selected here.
const CANDIDATE_PROJECT_FIELDS = 'id,code,title,problem_statement,requirements,optional_features';

/** Round 2 open/close and submission deadline, read live from settings. */
async function roundTwoSchedule(supabase) {
  const { data } = await supabase.from('recruitment_settings').select('key,value').in('key', ['round_1_start_at', 'round_1_deadline_at']);
  const at = (key) => data?.find((row) => row.key === key)?.value?.at ?? null;
  const startsAt = at('round_1_start_at');
  const deadlineAt = at('round_1_deadline_at');
  const now = Date.now();
  return {
    startsAt,
    deadlineAt,
    open: Boolean(startsAt) && now >= new Date(startsAt).getTime(),
    // With no deadline set, submissions stay open; once set, it is enforced.
    submissionsOpen: !deadlineAt || now < new Date(deadlineAt).getTime(),
  };
}

/**
 * Mirrors project progress onto candidate_profiles.round_1_status so the
 * dashboard shows it. Admin decisions (qualified / not_qualified / under_review)
 * are never overwritten.
 */
async function syncRoundTwoStatus(supabase, userId, current) {
  if (!['not_started', 'in_progress', 'submitted', null, undefined].includes(current)) return;
  const { data: rows } = await supabase.from('project_assignments').select('status').eq('candidate_id', userId);
  if (!rows?.length) return;
  const next = rows.every((r) => r.status === 'submitted') ? 'submitted' : 'in_progress';
  if (next !== current) await supabase.from('candidate_profiles').update({ round_1_status: next }).eq('id', userId);
}

// GET /api/recruitment/round-2
// Technical tracks get a project: once Round 2 is open and the candidate is
// qualified in that track, one project is picked at random from the track's
// active pool and kept for good. Other domains go straight to interview.
router.get('/round-2', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  try {
    const schedule = await roundTwoSchedule(supabase);

    const [{ data: choices, error: choiceError }, { data: profile }] = await Promise.all([
      supabase.from('candidate_subdomain_choices')
        .select('subdomain_id,priority,subdomain:subdomains(id,name,domain:domains(name,slug,selection_mode))')
        .eq('candidate_id', user.id).order('priority'),
      supabase.from('candidate_profiles').select('round_0_status,round_1_status').eq('id', user.id).maybeSingle(),
    ]);
    if (choiceError) return res.status(500).json({ error: choiceError.message });

    const technicalIds = (choices ?? []).filter((c) => c.subdomain?.domain?.slug === 'technical').map((c) => c.subdomain_id);

    // Qualification is per track: only tracks whose attempt was qualified get a project.
    const [{ data: attempts }, { data: existingAssignments }] = technicalIds.length
      ? await Promise.all([
          supabase.from('assessment_attempts').select('subdomain_id,admin_qualified').eq('candidate_id', user.id).in('subdomain_id', technicalIds),
          supabase.from('project_assignments').select('id,subdomain_id,project_id,assigned_at,status').eq('candidate_id', user.id).in('subdomain_id', technicalIds),
        ])
      : [{ data: [] }, { data: [] }];
    const assignmentBySubdomain = new Map((existingAssignments ?? []).map((a) => [a.subdomain_id, a]));
    const roundOneQualified = profile?.round_0_status === 'qualified';

    const eligibilityFor = (subdomainId) => {
      if (!schedule.open) return 'round_closed';
      if (!roundOneQualified) return 'not_qualified';
      const attempt = (attempts ?? []).find((a) => a.subdomain_id === subdomainId);
      return attempt?.admin_qualified === true ? 'eligible' : 'not_qualified';
    };

    // Assign a random project to any eligible track that doesn't have one yet.
    // Once the deadline passes nobody new can start.
    for (const subdomainId of technicalIds) {
      if (!schedule.submissionsOpen) break;
      if (assignmentBySubdomain.has(subdomainId) || eligibilityFor(subdomainId) !== 'eligible') continue;
      const { data: pool, error: poolError } = await supabase.from('projects').select('id').eq('subdomain_id', subdomainId).eq('is_active', true);
      if (poolError) return res.status(500).json({ error: poolError.message });
      if (!pool?.length) continue;
      const pick = pool[randomInt(pool.length)];
      const { data: created, error: insertError } = await supabase.from('project_assignments')
        .insert({ candidate_id: user.id, subdomain_id: subdomainId, project_id: pick.id, status: 'assigned' })
        .select('id,subdomain_id,project_id,assigned_at,status').single();
      if (insertError) {
        // 23505: a parallel request assigned first. Keep that one, never re-roll.
        if (insertError.code !== '23505') return res.status(500).json({ error: insertError.message });
        const { data: winner } = await supabase.from('project_assignments')
          .select('id,subdomain_id,project_id,assigned_at,status').eq('candidate_id', user.id).eq('subdomain_id', subdomainId).maybeSingle();
        if (winner) assignmentBySubdomain.set(subdomainId, winner);
      } else {
        assignmentBySubdomain.set(subdomainId, created);
      }
    }

    const assignments = [...assignmentBySubdomain.values()];
    if (assignments.length) await syncRoundTwoStatus(supabase, user.id, profile?.round_1_status);
    const [{ data: projects }, { data: submissions }] = assignments.length
      ? await Promise.all([
          supabase.from('projects').select(CANDIDATE_PROJECT_FIELDS).in('id', assignments.map((a) => a.project_id)),
          supabase.from('project_submissions').select('assignment_id,github_url,notes,submitted_at').in('assignment_id', assignments.map((a) => a.id)),
        ])
      : [{ data: [] }, { data: [] }];

    const tracks = (choices ?? []).map((choice) => {
      const domain = choice.subdomain?.domain;
      const technical = domain?.slug === 'technical';
      const base = {
        subdomainId: choice.subdomain_id,
        name: choice.subdomain?.name ?? 'Track',
        domainName: domain?.name ?? '',
        displayName: domain?.selection_mode === 'whole_domain' ? (domain?.name ?? '') : `${domain?.name ?? ''} / ${choice.subdomain?.name ?? ''}`,
        kind: technical ? 'project' : 'direct_interview',
      };
      if (!technical) return base;

      const assignment = assignmentBySubdomain.get(choice.subdomain_id);
      const project = assignment ? (projects ?? []).find((p) => p.id === assignment.project_id) ?? null : null;
      const submission = assignment ? (submissions ?? []).find((s) => s.assignment_id === assignment.id) ?? null : null;
      const eligibility = eligibilityFor(choice.subdomain_id);
      // Closing Round 2 or disqualifying a candidate hides the project at once.
      // The assignment is kept, so re-enabling shows the same project again.
      const visible = eligibility === 'eligible' && project;
      return {
        ...base,
        status: eligibility !== 'eligible' ? eligibility : project ? 'assigned' : schedule.submissionsOpen ? 'no_projects' : 'deadline_passed',
        project: visible
          ? { code: project.code, title: project.title, problemStatement: project.problem_statement, requirements: project.requirements, bonus: project.optional_features, assignedAt: assignment.assigned_at }
          : null,
        submission: visible && submission
          ? { githubUrl: submission.github_url, notes: submission.notes ?? '', submittedAt: submission.submitted_at }
          : null,
      };
    });

    return res.json({
      open: schedule.open,
      startsAt: schedule.startsAt,
      deadlineAt: schedule.deadlineAt,
      submissionsOpen: schedule.submissionsOpen,
      tracks,
      hasProjectRound: tracks.some((t) => t.kind === 'project'),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/recruitment/round-2/submit  { subdomainId, githubUrl, notes? }
// Saves (or updates) the GitHub link for an assigned project. Refused once the
// admin-set deadline has passed.
router.post('/round-2/submit', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  const subdomainId = req.body?.subdomainId;
  const githubUrl = normalizeGithubRepoUrl(req.body?.githubUrl);
  const notes = String(req.body?.notes ?? '').trim().slice(0, 2000);
  if (!subdomainId) return res.status(400).json({ error: 'subdomainId is required.' });
  if (!githubUrl) {
    return res.status(400).json({ error: 'Enter a link to a GitHub repository, like https://github.com/your-name/your-project.' });
  }
  try {
    const schedule = await roundTwoSchedule(supabase);
    if (!schedule.open) return res.status(403).json({ error: 'Round 2 is not open.' });
    if (!schedule.submissionsOpen) return res.status(403).json({ error: 'The submission deadline has passed.' });

    const [{ data: profile }, { data: attempt }] = await Promise.all([
      supabase.from('candidate_profiles').select('round_0_status,round_1_status').eq('id', user.id).maybeSingle(),
      supabase.from('assessment_attempts').select('admin_qualified').eq('candidate_id', user.id).eq('subdomain_id', subdomainId).maybeSingle(),
    ]);
    if (profile?.round_0_status !== 'qualified' || attempt?.admin_qualified !== true) {
      return res.status(403).json({ error: 'You are not qualified for a Round 2 project in this track.' });
    }

    const { data: assignment, error: assignmentError } = await supabase.from('project_assignments')
      .select('id').eq('candidate_id', user.id).eq('subdomain_id', subdomainId).maybeSingle();
    if (assignmentError) return res.status(500).json({ error: assignmentError.message });
    if (!assignment) return res.status(404).json({ error: 'No project has been assigned to you for this track.' });

    const submittedAt = new Date().toISOString();
    const { error: submitError } = await supabase.from('project_submissions').upsert({
      assignment_id: assignment.id,
      candidate_id: user.id,
      github_url: githubUrl,
      notes: notes || null,
      submitted_at: submittedAt,
      is_late: false,
    }, { onConflict: 'assignment_id' });
    if (submitError) return res.status(500).json({ error: submitError.message });

    await supabase.from('project_assignments').update({ status: 'submitted' }).eq('id', assignment.id);
    await syncRoundTwoStatus(supabase, user.id, profile.round_1_status);
    return res.json({ submitted: true, githubUrl, submittedAt });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// ADMIN OPERATIONS PAYLOAD (full dashboard data)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/operations', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { admin, supabase } = ctx;
  try {
    // Built to stay complete and small at thousands of candidates:
    // - every list is paged past PostgREST's 1,000-row cap
    // - choices carry only ids, resolved client-side against subdomain_lookup
    //   instead of repeating the full subdomain and domain for every choice
    // - written answers are left out and fetched per candidate or page by page
    // Together these keep the response well under Vercel's 4.5MB limit.
    const [
      candidates, attempts, assignments, submissions, bookings, results, slots,
      { data: domains }, { data: allSubdomains }, { data: allDomains },
      { data: written_questions }, { data: written_rules },
    ] = await Promise.all([
      fetchAll(() => supabase.from('candidate_profiles').select('*, subdomain_choices:candidate_subdomain_choices(subdomain_id,priority)').order('created_at', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('assessment_attempts').select('id,candidate_id,domain_id,subdomain_id,started_at,submitted_at,time_limit_seconds,auto_submitted,score,total_marks,status,admin_qualified,admin_notes,evaluated_at,results_released_at,results_released_by').order('started_at', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('project_assignments').select('*, project:projects(*)').order('assigned_at', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('project_submissions').select('*, evaluation:project_evaluations(*)').order('submitted_at', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('interview_bookings').select('*, slot:interview_slots(slot_time, date:interview_dates(date, location, meeting_link, subdomain_id))').order('booked_at', { ascending: false }).order('id')),
      fetchAll(() => supabase.from('final_results').select('*').order('id')),
      fetchAll(() => supabase.from('interview_slots').select('id, is_booked, status').order('id')),
      supabase.from('domains').select('*, subdomains(*)').eq('is_active', true).order('sort_order'),
      supabase.from('subdomains').select('id,name,domain_id,is_active'),
      supabase.from('domains').select('id,name,slug,selection_mode'),
      supabase.from('written_application_questions').select('*').order('sort_order'),
      supabase.from('written_application_rules').select('*'),
    ]);

    const domainById = new Map((allDomains ?? []).map((d) => [d.id, d]));
    const subdomain_lookup = Object.fromEntries((allSubdomains ?? []).map((sub) => [sub.id, {
      id: sub.id, name: sub.name, domain_id: sub.domain_id, is_active: sub.is_active,
      domain: domainById.get(sub.domain_id) ?? null,
    }]));

    return res.json({
      admin: { id: admin.id, email: admin.email ?? '', name: admin.name ?? '', role: admin.role },
      candidates,
      attempts,
      assignments,
      submissions,
      bookings,
      results,
      domains: domains ?? [],
      subdomain_lookup,
      slots,
      written_questions: written_questions ?? [],
      written_rules: written_rules ?? [],
      synced_at: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/recruitment/admin/written-answers?candidate_id=…   one candidate's dossier
// GET /api/recruitment/admin/written-answers?offset=0&limit=400 every answer, a page at a time (CSV export)
// Answers are long paragraphs, so they are never bundled into the operations payload.
router.get('/admin/written-answers', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const columns = 'candidate_id,domain_id,question_id,answer_text,submission_links,is_final,question:written_application_questions(prompt),domain:domains(name,slug)';
  try {
    if (req.query.candidate_id) {
      const { data, error } = await supabase.from('candidate_written_answers').select(columns)
        .eq('candidate_id', String(req.query.candidate_id));
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ answers: data ?? [] });
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 400, 1), 1000);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const { data, error } = await supabase.from('candidate_written_answers').select(columns)
      .order('candidate_id').order('domain_id').order('question_id')
      .range(offset, offset + limit - 1);
    if (error) return res.status(500).json({ error: error.message });
    const page = data ?? [];
    return res.json({ answers: page, nextOffset: page.length === limit ? offset + limit : null });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASSESSMENTS — release marks
// ═══════════════════════════════════════════════════════════════════════════

router.post('/admin/assessments/release', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { attempt_id, attempt_ids, release } = req.body ?? {};
  const ids = Array.isArray(attempt_ids) && attempt_ids.length > 0
    ? attempt_ids
    : attempt_id ? [attempt_id] : [];
  if (!ids.length) return res.status(400).json({ error: 'attempt_id or attempt_ids required' });
  try {
    const timestamp = release ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('assessment_attempts')
      .update({ results_released_at: timestamp })
      .in('id', ids);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, count: ids.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// QUESTIONS (scored + written)
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/recruitment/admin/assessments/bulk-qualify
// Qualifies every submitted attempt scoring at or above minPercent. Optionally
// marks everyone below it as not qualified in the same pass.
router.post('/admin/assessments/bulk-qualify', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const minPercent = Number(req.body?.minPercent);
  const markOthers = Boolean(req.body?.markOthersNotQualified);
  const onlyUnreviewed = req.body?.onlyUnreviewed !== false;
  if (!Number.isFinite(minPercent) || minPercent < 0 || minPercent > 100) {
    return res.status(400).json({ error: 'minPercent must be between 0 and 100.' });
  }
  try {
    const attempts = await fetchAll(() => supabase.from('assessment_attempts')
      .select('id,candidate_id,score,total_marks,admin_qualified').eq('status', 'submitted').order('id'));
    const considered = attempts.filter((a) => !onlyUnreviewed || a.admin_qualified == null);

    // A candidate has one attempt per Technical track, so they qualify when any
    // of their tracks meets the threshold; their best score is recorded.
    let skipped = 0;
    const byCandidate = new Map();
    for (const attempt of considered) {
      // An unscored attempt has no percentage to compare against.
      if (attempt.score == null || !attempt.total_marks) { skipped += 1; continue; }
      const percent = (attempt.score / attempt.total_marks) * 100;
      const entry = byCandidate.get(attempt.candidate_id) ?? { pass: false, bestPercent: -1, bestScore: null, attempts: [] };
      entry.attempts.push({ id: attempt.id, pass: percent >= minPercent });
      if (percent >= minPercent) entry.pass = true;
      if (percent > entry.bestPercent) { entry.bestPercent = percent; entry.bestScore = attempt.score; }
      byCandidate.set(attempt.candidate_id, entry);
    }

    const passAttemptIds = [];
    const failAttemptIds = [];
    const profileGroups = new Map(); // same outcome + score share one update
    let qualified = 0;
    let notQualified = 0;
    for (const [candidateId, entry] of byCandidate) {
      if (!entry.pass && !markOthers) { skipped += entry.attempts.length; continue; }
      for (const a of entry.attempts) {
        if (a.pass) passAttemptIds.push(a.id);
        else if (markOthers) failAttemptIds.push(a.id);
      }
      const key = `${entry.pass}|${entry.bestScore}`;
      if (!profileGroups.has(key)) profileGroups.set(key, { pass: entry.pass, score: entry.bestScore, ids: [] });
      profileGroups.get(key).ids.push(candidateId);
      if (entry.pass) qualified += 1; else notQualified += 1;
    }

    const write = async (query) => { const { error } = await query; if (error) throw new Error(error.message); };
    for (const ids of chunk(passAttemptIds, 150)) {
      await write(supabase.from('assessment_attempts').update({ admin_qualified: true }).in('id', ids));
    }
    for (const ids of chunk(failAttemptIds, 150)) {
      await write(supabase.from('assessment_attempts').update({ admin_qualified: false }).in('id', ids));
    }
    for (const group of profileGroups.values()) {
      for (const ids of chunk(group.ids, 150)) {
        await write(supabase.from('candidate_profiles').update({
          round_0_status: group.pass ? 'qualified' : 'not_qualified',
          round_0_score: group.score,
          current_round: group.pass ? 1 : 0,
          status: group.pass ? 'round_1' : 'rejected',
        }).in('id', ids));
      }
    }

    return res.json({ considered: considered.length, qualified, notQualified, skipped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/recruitment/admin/candidates?id=...
// Removes a candidate and everything attached to them. Dependants are deleted
// explicitly rather than relying on cascade rules, which differ per table.
router.delete('/admin/candidates', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const candidateId = req.query.id;
  if (!candidateId) return res.status(400).json({ error: 'id required' });
  try {
    const { data: profile } = await supabase.from('candidate_profiles')
      .select('id,full_name,registration_number').eq('id', candidateId).maybeSingle();
    if (!profile) return res.status(404).json({ error: 'Candidate not found.' });

    const { data: attempts } = await supabase.from('assessment_attempts').select('id').eq('candidate_id', candidateId);
    for (const attempt of attempts ?? []) {
      await supabase.from('assessment_answers').delete().eq('attempt_id', attempt.id);
    }
    const { data: assignments } = await supabase.from('project_assignments').select('id').eq('candidate_id', candidateId);
    for (const assignment of assignments ?? []) {
      await supabase.from('project_evaluations').delete().eq('assignment_id', assignment.id);
      await supabase.from('project_submissions').delete().eq('assignment_id', assignment.id);
    }

    for (const table of [
      'assessment_attempts',
      'candidate_written_answers',
      'candidate_subdomain_choices',
      'project_assignments',
      'interview_bookings',
      'final_results',
      'notifications',
    ]) {
      const { error } = await supabase.from(table).delete().eq('candidate_id', candidateId);
      // A table that does not exist in this project is not a failure to delete.
      if (error && error.code !== 'PGRST205') return res.status(500).json({ error: `${table}: ${error.message}` });
    }

    const { error: profileError } = await supabase.from('candidate_profiles').delete().eq('id', candidateId);
    if (profileError) return res.status(500).json({ error: profileError.message });

    // Removing the auth user stops them signing back in and recreating a profile.
    const { error: authError } = await supabase.auth.admin.deleteUser(candidateId);
    if (authError) return res.status(500).json({ error: `Profile deleted, but the sign-in account remains: ${authError.message}` });

    return res.json({ deleted: true, candidate: profile.full_name ?? profile.registration_number });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/admin/questions', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { mode, subdomain_id, domain_id } = req.query;
  try {
    if (mode === 'written') {
      const query = supabase.from('written_application_questions').select('*').order('sort_order');
      if (domain_id) query.or(`domain_id.eq.${domain_id},scope.eq.common_non_technical`);
      const { data } = await query;
      return res.json({ questions: data ?? [] });
    }
    // scored (technical MCQ/short-answer)
    const { data } = await supabase.from('assessment_questions').select('*').eq('subdomain_id', subdomain_id).order('created_at', { ascending: false });
    return res.json({ questions: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/questions', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { mode, ...fields } = req.body ?? {};
  try {
    if (mode === 'written') {
      // No domain means the question is asked of every non-Technical applicant.
      const scope = fields.domain_id ? 'domain' : 'common_non_technical';
      // slug is NOT NULL UNIQUE, so admin-authored questions get a generated one.
      const slug = `admin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const { data, error } = await supabase.from('written_application_questions').insert({
        slug,
        scope,
        domain_id: scope === 'domain' ? fields.domain_id : null,
        question_group: fields.question_group || 'common',
        prompt: fields.prompt,
        instructions: fields.instructions ?? '',
        response_type: fields.response_type ?? 'long_text',
        required: fields.required ?? true,
        sort_order: fields.sort_order ?? 100,
        is_active: true,
      }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      // minimum_answers is a rule about a question group, stored on its own table.
      if (fields.minimum_answers && scope === 'domain') {
        await supabase.from('written_application_rules').upsert(
          { domain_id: fields.domain_id, question_group: data.question_group, minimum_answers: fields.minimum_answers },
          { onConflict: 'domain_id,question_group' },
        );
      }
      return res.status(201).json({ question: data });
    }
    const { data, error } = await supabase.from('assessment_questions').insert({ subdomain_id: fields.subdomain_id, question_text: fields.question_text, question_type: fields.question_type ?? 'mcq', options: fields.options ?? null, correct_answers: fields.correct_answers, marks: fields.marks ?? 1, difficulty: fields.difficulty ?? 'medium', is_active: true }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ question: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/questions', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { id, mode } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const table = mode === 'written' ? 'written_application_questions' : 'assessment_questions';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUND GUIDELINES
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/round-guidelines', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { subdomain_id } = req.query;
  try {
    const { data } = await supabase.from('subdomain_round_guidelines').select('*').eq('subdomain_id', subdomain_id);
    return res.json({ guidelines: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/admin/round-guidelines', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { subdomain_id, round_number, guidelines } = req.body ?? {};
  if (!subdomain_id || !round_number) return res.status(400).json({ error: 'subdomain_id and round_number required' });
  try {
    const { data, error } = await supabase.from('subdomain_round_guidelines').upsert({ subdomain_id, round_number, guidelines, updated_at: new Date().toISOString() }, { onConflict: 'subdomain_id,round_number' }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ guideline: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/admin/projects', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { subdomain_id } = req.query;
  try {
    const query = supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (subdomain_id) query.eq('subdomain_id', subdomain_id);
    const { data } = await query;
    return res.json({ projects: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/admin/projects', async (req, res) => {
  const ctx = await requireAdmin(req, res);
  if (!ctx) return;
  const { supabase } = ctx;
  const { subdomain_id, title, details, task_document_url } = req.body ?? {};
  if (!subdomain_id || !title) return res.status(400).json({ error: 'subdomain_id and title required' });
  try {
    const code = `P${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const { data, error } = await supabase.from('projects').insert({ subdomain_id, title, problem_statement: details, task_document_url: task_document_url || null, code, is_active: true }).select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ project: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUND 1 — WRITTEN APPLICATION (candidate)
// GET — loads domain/question/answer state for the logged-in candidate
// PUT — saves draft answers
// POST — submits (finalises) a domain's answers
// ═══════════════════════════════════════════════════════════════════════════

router.get('/round-1/written', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  try {
    const { data: profile } = await supabase.from('candidate_profiles').select('*, subdomain_choices:candidate_subdomain_choices(*, subdomain:subdomains(*, domain:domains(*)))').eq('id', user.id).single();
    if (!profile) return res.status(404).json({ error: 'Profile not found. Please complete your profile first.' });

    // Build domain list from choices, de-duplicated by domain
    const domainMap = new Map();
    for (const choice of (profile.subdomain_choices ?? [])) {
      const domain = choice.subdomain?.domain;
      if (!domain) continue;
      const existing = domainMap.get(domain.id);
      if (existing) { existing.tracks.push({ id: choice.subdomain.id, name: choice.subdomain.name }); }
      else { domainMap.set(domain.id, { id: domain.id, name: domain.name, slug: domain.slug, tracks: [{ id: choice.subdomain.id, name: choice.subdomain.name }] }); }
    }
    const domains = Array.from(domainMap.values()).filter((d) => d.slug !== 'technical');

    const domainIds = domains.map((d) => d.id);
    const questionFilter = domainIds.length
      ? `domain_id.in.(${domainIds.join(',')}),scope.eq.common_non_technical`
      : 'scope.eq.common_non_technical';
    const [{ data: questionRows }, { data: rules }, { data: answers }] = await Promise.all([
      // Common questions carry no domain_id, so an .in() filter hides them.
      supabase.from('written_application_questions').select('*').or(questionFilter).eq('is_active', true).order('sort_order'),
      supabase.from('written_application_rules').select('*').in('domain_id', domainIds),
      supabase.from('candidate_written_answers').select('*').eq('candidate_id', user.id).in('domain_id', domainIds),
    ]);

    // One entry per (domain, question): a common question is asked once per
    // selected domain, matching how answers are keyed.
    const questions = domains.flatMap((domain) => (questionRows ?? [])
      .filter((q) => q.domain_id === domain.id || q.scope === 'common_non_technical')
      .map((q) => ({ ...q, domain_id: domain.id })));

    // Build per-domain state
    const domainStates = {};
    for (const domain of domains) {
      const domainQuestions = (questions ?? []).filter((q) => q.domain_id === domain.id);
      const domainAnswers = (answers ?? []).filter((a) => a.domain_id === domain.id);
      const domainRules = (rules ?? []).filter((r) => r.domain_id === domain.id);
      const hasContent = domainAnswers.some((a) => a.answer_text?.trim() || a.submission_links?.length);
      const isFinal = domainAnswers.some((a) => a.is_final);
      let valid = true;
      const missing = [];
      for (const rule of domainRules) {
        const groupAnswers = domainAnswers.filter((a) => {
          const q = domainQuestions.find((q) => q.id === a.question_id);
          return q?.question_group === rule.group;
        }).filter((a) => a.answer_text?.trim() || a.submission_links?.length);
        if (groupAnswers.length < (rule.minimum_answers ?? 1)) { valid = false; missing.push(rule.group); }
      }
      domainStates[domain.id] = { status: isFinal ? 'submitted' : hasContent ? 'draft' : 'not_started', hasContent, valid, final: isFinal, missing };
    }

    // Technical choices are answered in the timed assessment, and each track is
    // started and submitted separately, so each carries its own status.
    const technicalChoices = (profile.subdomain_choices ?? [])
      .filter((c) => c.subdomain?.domain?.slug === 'technical')
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    const hasTechnical = technicalChoices.length > 0;
    const { data: technicalAttempts } = hasTechnical
      ? await supabase.from('assessment_attempts').select('subdomain_id,status').eq('candidate_id', user.id)
      : { data: [] };
    const statusBySubdomain = new Map((technicalAttempts ?? []).map((a) => [a.subdomain_id, a.status]));
    const technicalTrackList = technicalChoices.map((c) => {
      const status = statusBySubdomain.get(c.subdomain_id);
      return {
        subdomainId: c.subdomain_id,
        name: c.subdomain?.name ?? 'Technical',
        status: status === 'submitted' ? 'submitted' : status ? 'in_progress' : 'not_started',
        assessed: true,
      };
    });
    const technicalComplete = hasTechnical ? technicalTrackList.every((t) => t.status === 'submitted') : true;

    // Format questions with answerKey
    const formattedQuestions = questions.map((q) => ({
      ...q,
      domainId: q.domain_id,
      answerKey: `${q.domain_id}:${q.id}`,
      group: q.question_group,
      responseType: q.response_type,
    }));

    return res.json({
      domains,
      questions: formattedQuestions,
      rules: (rules ?? []).map((r) => ({ ...r, domainId: r.domain_id, minimumAnswers: r.minimum_answers })),
      answers: answers ?? [],
      domainStates,
      roundOneComplete: Object.values(domainStates).every((s) => s.final) && technicalComplete,
      technical: {
        required: hasTechnical,
        complete: technicalComplete,
        status: !hasTechnical
          ? 'not_required'
          : technicalComplete
            ? 'submitted'
            : technicalTrackList.some((t) => t.status === 'in_progress')
              ? 'in_progress'
              : 'not_started',
        tracks: technicalTrackList,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/round-1/written', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  const { domainId, answers } = req.body ?? {};
  if (!domainId || !Array.isArray(answers)) return res.status(400).json({ error: 'domainId and answers[] required' });
  try {
    // Check deadline
    const { data: setting } = await supabase.from('recruitment_settings').select('value').eq('key', 'round_0_start_at').maybeSingle();
    const startAt = setting?.value?.at;
    if (startAt && new Date() > new Date(startAt)) {
      // Allow saving after start but check if already final
    }
    const rows = answers.map(({ questionId, answerText, submissionLinks }) => ({
      candidate_id: user.id, domain_id: domainId, question_id: questionId,
      answer_text: answerText ?? '', submission_links: submissionLinks ?? [], is_final: false, updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('candidate_written_answers').upsert(rows, { onConflict: 'candidate_id,domain_id,question_id' });
      if (error) return res.status(400).json({ error: error.message });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/round-1/written', async (req, res) => {
  const ctx = await requireAuth(req, res);
  if (!ctx) return;
  const { user, supabase } = ctx;
  const { domainId, answers } = req.body ?? {};
  if (!domainId || !Array.isArray(answers)) return res.status(400).json({ error: 'domainId and answers[] required' });
  // domainId is interpolated into a filter below, so it must be a plain UUID.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domainId)) {
    return res.status(400).json({ error: 'Invalid domain.' });
  }
  try {
    // A domain can only be finalised once every required question has an answer.
    const { data: requiredQuestions, error: questionError } = await supabase.from('written_application_questions')
      .select('id').eq('is_active', true).eq('required', true)
      .or(`domain_id.eq.${domainId},scope.eq.common_non_technical`);
    if (questionError) return res.status(500).json({ error: questionError.message });
    const answeredIds = new Set(answers
      .filter((a) => String(a?.answerText ?? '').trim() || (Array.isArray(a?.submissionLinks) && a.submissionLinks.length))
      .map((a) => a.questionId));
    const missing = (requiredQuestions ?? []).filter((q) => !answeredIds.has(q.id)).map((q) => q.id);
    if (missing.length) {
      return res.status(400).json({
        error: `Please answer all questions before submitting (${missing.length} unanswered).`,
        missing,
      });
    }

    const rows = answers.map(({ questionId, answerText, submissionLinks }) => ({
      candidate_id: user.id, domain_id: domainId, question_id: questionId,
      answer_text: answerText ?? '', submission_links: submissionLinks ?? [], is_final: true, updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from('candidate_written_answers').upsert(rows, { onConflict: 'candidate_id,domain_id,question_id' });
      if (error) return res.status(400).json({ error: error.message });
      await supabase.from('candidate_profiles').update({ domain_locked: true }).eq('id', user.id);
    }
    return res.json({ ok: true, submitted: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
