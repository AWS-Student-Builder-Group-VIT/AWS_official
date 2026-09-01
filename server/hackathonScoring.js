import { randomUUID } from 'node:crypto';

import { calculateGamePoints, isScoredGame, SCORING_VERSION } from './gameScoring.js';
import { getTopicSwapCost, TOPIC_SWAP_PRICING } from '../shared/topicSwapPricing.js';

const SHOP_ITEMS = Object.freeze({
  'change-topic': { title: 'Change Challenge Topic', price: 100 },
  'mentor-help': { title: 'Mentor Help', price: 150 },
  'hint-card': { title: 'Hint Card', price: 80 },
  'technical-review': { title: 'Technical Review', price: 100 },
  'extra-pitch-time': { title: 'Extra Pitch Time', price: 120 },
  'second-chance-token': { title: 'Second Chance Token', price: 200 },
  'reveal-judging-criteria': { title: 'Reveal Judging Criteria', price: 180 },
  'recruit-a-friend': { title: 'Recruit a Friend', price: 250 },
});

const CHAOS_EVENTS = Object.freeze([
  { icon: '🌐', title: 'Market Shift', desc: 'Your target user persona has changed completely. Rethink your value proposition.' },
  { icon: '💸', title: 'Investor Pitch', desc: 'An investor arrives in 15 minutes. You must pitch your MVP immediately.' },
  { icon: '🔐', title: 'Security Alert', desc: 'A critical vulnerability has been found in your stack. Patch it now.' },
  { icon: '✂️', title: 'Budget Cut', desc: 'Your cloud budget has been slashed by 60%. Optimize your architecture.' },
  { icon: '📈', title: 'Viral Growth', desc: 'Your app went viral. Handle 100 times the expected load.' },
  { icon: '🔄', title: 'Client Revision', desc: 'The client changed their mind. A major feature redesign is required.' },
]);

const MYSTERY_QUESTIONS = Object.freeze([
  { id: 'easy-1', title: 'Cloud Resume Builder with CI/CD', difficulty: 'Easy', points: 100, desc: 'Design a web app that helps students build their resume and deploys it automatically as a static website on AWS S3/CloudFront, integrated with a mock GitHub Action pipeline.', tags: ['S3', 'CloudFront', 'GitHub Actions'] },
  { id: 'easy-2', title: 'Lost & Found Intelligent Matcher', difficulty: 'Easy', points: 100, desc: 'Build a campus lost & found portal using DynamoDB and S3 for photo uploads with keyword tag searching and verification claims.', tags: ['DynamoDB', 'S3', 'API Gateway'] },
  { id: 'easy-3', title: 'Static Portfolio with Serverless Contact Form', difficulty: 'Easy', points: 100, desc: 'Create a responsive developer portfolio hosted on S3 and CloudFront with an API Gateway + SES/Lambda backend to process and email incoming contact inquiries.', tags: ['S3', 'Lambda', 'SES'] },
  { id: 'easy-4', title: 'AWS Cost-Optimizer Dashboard', difficulty: 'Easy', points: 100, desc: 'Create a dashboard app that analyzes mock AWS billing reports to find idle EC2 instances, underutilized S3 buckets, and provides actionable recommendations to save costs.', tags: ['CloudWatch', 'Cost Explorer', 'React'] },
  { id: 'easy-5', title: 'Serverless URL Shortener & Analytics', difficulty: 'Easy', points: 100, desc: 'Build a high-performance URL shortener with click analytics and geolocation counters using AWS Lambda, DynamoDB, and CloudFront edge routing.', tags: ['Lambda', 'DynamoDB', 'CloudFront'] },
  { id: 'med-1', title: 'Smart Campus Navigation Engine', difficulty: 'Medium', points: 140, desc: 'Build a campus guide prototype using AWS Location Service and Amazon Lex that helps new students navigate a campus, find classrooms, and ask assistant bots for directions.', tags: ['Location Service', 'Amazon Lex', 'Lambda'] },
  { id: 'med-2', title: 'Serverless Student Club Portal', difficulty: 'Medium', points: 140, desc: 'Design a serverless, highly-scalable backend on AWS (Lambda, API Gateway, DynamoDB) that allows student clubs to manage events, registrations, and announcements with zero server costs.', tags: ['Lambda', 'DynamoDB', 'API Gateway', 'Cognito'] },
  { id: 'med-3', title: 'IVS Live Stream Hub with Interactive Chat', difficulty: 'Medium', points: 140, desc: 'Create a low-latency streaming hub using Amazon IVS (Interactive Video Service) that allows developers to stream technical workshops and embed interactive live chat polls.', tags: ['Amazon IVS', 'WebSockets', 'Lambda'] },
  { id: 'med-4', title: 'IoT Smart Energy Classroom Monitor', difficulty: 'Medium', points: 140, desc: 'Design a simulated IoT dashboard using AWS IoT Core that ingests temperature and power data from smart classrooms, visualizes it, and alerts admins when energy waste is detected.', tags: ['IoT Core', 'DynamoDB', 'SNS'] },
  { id: 'med-5', title: 'Event Ticketing with Dynamic Queue', difficulty: 'Medium', points: 140, desc: 'Build an event ticketing portal with surge seat reservation and queue management using SQS, Lambda, and DynamoDB transactions to prevent double-booking.', tags: ['SQS', 'Lambda', 'DynamoDB'] },
  { id: 'hard-1', title: 'AI Study Companion with Bedrock', difficulty: 'Hard', points: 180, desc: 'Build a web app using Amazon Bedrock and AWS Lambda that allows students to upload syllabus docs or notes and automatically generates interactive quizzes, mind maps, and flashcards.', tags: ['Amazon Bedrock', 'Lambda', 'S3', 'Vector DB'] },
  { id: 'hard-2', title: 'Automated Code Reviewer & Debugger Bot', difficulty: 'Hard', points: 180, desc: 'Develop an automated code reviewer tool that integrates with a Git repo, runs code analysis via Amazon CodeGuru or Bedrock, and leaves helpful debugging comments on pull requests.', tags: ['Amazon Bedrock', 'CodeGuru', 'Lambda', 'GitHub API'] },
  { id: 'hard-3', title: 'Biometric Attendance via Face Recognition', difficulty: 'Hard', points: 180, desc: 'Build a fast attendance system prototype that allows event organizers to take a photo of attendees and verify their registration in real-time using Amazon Rekognition.', tags: ['Rekognition', 'S3', 'Lambda', 'DynamoDB'] },
  { id: 'hard-4', title: 'Real-time Collaborative Architecture Whiteboard', difficulty: 'Hard', points: 180, desc: 'Develop a real-time collaborative whiteboard app using AWS AppSync or WebSockets that allows student teams to map out architectural diagrams synchronously with live cursor tracking.', tags: ['AppSync', 'GraphQL', 'WebSockets', 'DynamoDB'] },
  { id: 'hard-5', title: 'Autonomous Cloud Security Incident Responder', difficulty: 'Hard', points: 180, desc: 'Design an AI-driven SecOps bot that monitors CloudTrail & GuardDuty events, diagnoses threats via Bedrock, and automatically generates mitigation Lambda triggers to isolate compromised resources.', tags: ['GuardDuty', 'CloudTrail', 'Bedrock', 'Step Functions'] },
]);

const DEFAULT_MAX_GAME_ATTEMPTS = 5;

export function pickMysteryQuestion(random = Math.random) {
  const index = Math.min(MYSTERY_QUESTIONS.length - 1, Math.floor(random() * MYSTERY_QUESTIONS.length));
  return { ...MYSTERY_QUESTIONS[index] };
}

export function listMysteryQuestions() {
  return MYSTERY_QUESTIONS.map((question) => ({ ...question, tags: [...(question.tags || [])] }));
}

export function normalizeTeamCode(value) {
  const code = String(value || '').trim().replace(/^#+/, '').toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(code)) throw new Error('A valid team code is required');
  return code;
}

export function validateGameCompletion(gameSlug, result) {
  if (!isScoredGame(gameSlug)) throw new Error('This game is not scored');
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('A game result is required');
  if (result.official !== true) throw new Error('Only an official result can be submitted');
  return result;
}

export function validateAdminAdjustment(input = {}) {
  const delta = Number(input.delta);
  const reason = String(input.reason || '').trim();
  if (!Number.isInteger(delta) || delta === 0) throw new Error('Adjustment must be a non-zero integer');
  if (Math.abs(delta) > 10000) throw new Error('Adjustment is outside the allowed range');
  if (reason.length < 5 || reason.length > 500) throw new Error('A clear audit reason is required');
  return { delta, reason };
}

export function validateGameMode(input = {}) {
  if (typeof input.enabled !== 'boolean') throw new Error('Game mode enabled must be a boolean');
  return input.enabled;
}

export function validateAdminGameLimit(value) {
  const maxAttempts = Number(value);
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0 || maxAttempts > 12) {
    throw new Error('Max game attempts must be an integer from 0 to 12');
  }
  return maxAttempts;
}

export function validateAttemptResetReason(value) {
  const reason = String(value || '').trim();
  if (reason.length < 5 || reason.length > 500) throw new Error('A clear audit reason is required');
  return reason;
}

export function buildGameErrorPayload(error) {
  const payload = { error: error.message };
  if (error.reason) payload.reason = error.reason;
  if (error.attempt) payload.attempt = error.attempt;
  if (error.usage) payload.usage = error.usage;
  if (Number.isFinite(Number(error.balance))) payload.balance = Number(error.balance);
  return payload;
}

export function summarizeTeamGameUsage({ attempts = [], maxAttempts = DEFAULT_MAX_GAME_ATTEMPTS } = {}) {
  const parsedMax = Number(maxAttempts);
  const normalizedMax = Math.min(12, Math.max(0, Math.trunc(Number.isFinite(parsedMax) ? parsedMax : DEFAULT_MAX_GAME_ATTEMPTS)));
  const countedAttempts = attempts.filter((attempt) => !attempt.voided_at && !attempt.voidedAt);
  const usedAttempts = countedAttempts.length;
  const completedAttempts = countedAttempts.filter((attempt) => attempt.status === 'completed').length;
  return {
    maxAttempts: normalizedMax,
    usedAttempts,
    remainingAttempts: Math.max(0, normalizedMax - usedAttempts),
    completedAttempts,
    playedGameSlugs: [...new Set(countedAttempts.map((attempt) => attempt.game_slug || attempt.gameSlug).filter(Boolean))],
    activeAttempt: countedAttempts.find((attempt) => attempt.status === 'active') || null,
  };
}

export function canStartOfficialGame({ attempts = [], maxAttempts = DEFAULT_MAX_GAME_ATTEMPTS, gamesEnabled = false, gameSlug } = {}) {
  if (!gamesEnabled) return { allowed: false, reason: 'game-mode-disabled' };
  const usage = summarizeTeamGameUsage({ attempts, maxAttempts });
  const requestedGame = String(gameSlug || '');
  if (requestedGame && usage.playedGameSlugs.includes(requestedGame)) {
    const existingAttempt = attempts.find((attempt) => !attempt.voided_at && !attempt.voidedAt && (attempt.game_slug || attempt.gameSlug) === requestedGame);
    if (existingAttempt?.status === 'active') {
      return { allowed: true, resumed: true, attempt: usage.activeAttempt };
    }
    return { allowed: false, reason: 'game-already-played', attempt: existingAttempt };
  }
  if (usage.activeAttempt) return { allowed: false, reason: 'active-attempt-exists', attempt: usage.activeAttempt };
  if (usage.usedAttempts >= usage.maxAttempts) return { allowed: false, reason: 'game-limit-reached' };
  return { allowed: true };
}

export function findLowestAvailableSlot(attempts = [], maxAttempts = DEFAULT_MAX_GAME_ATTEMPTS) {
  const usage = summarizeTeamGameUsage({ attempts, maxAttempts });
  const occupied = new Set(
    attempts
      .filter((attempt) => !attempt.voided_at && !attempt.voidedAt)
      .map((attempt) => Number(attempt.slot_number ?? attempt.slotNumber))
      .filter(Number.isInteger),
  );
  for (let slot = 1; slot <= usage.maxAttempts; slot += 1) {
    if (!occupied.has(slot)) return slot;
  }
  return null;
}

export function getTopicSwapQuote({ currentTopic, targetTopic, teamPoints = 0, hasChangedQuestion = false } = {}) {
  const cost = getTopicSwapCost(currentTopic?.difficulty, targetTopic?.difficulty) ?? TOPIC_SWAP_PRICING.sameTier;
  if (hasChangedQuestion) return { cost, allowed: false, reason: 'topic-swap-used' };
  if (!currentTopic?.id || !targetTopic?.id) return { cost, allowed: false, reason: 'topic-required' };
  if (currentTopic.id === targetTopic.id) return { cost, allowed: false, reason: 'same-topic' };
  if (getTopicSwapCost(currentTopic.difficulty, targetTopic.difficulty) === null) return { cost, allowed: false, reason: 'topic-required' };
  if (Number(teamPoints || 0) < cost) return { cost, allowed: false, reason: 'insufficient-points' };
  return { cost, allowed: true };
}

export async function initializeHackathonScoring(pool) {
  await pool.query(`
    ALTER TABLE hackathon_teams ADD COLUMN IF NOT EXISTS max_game_attempts INTEGER NOT NULL DEFAULT 5;

    CREATE TABLE IF NOT EXISTS hackathon_team_members (
      id BIGSERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
      email VARCHAR(320) NOT NULL,
      google_sub VARCHAR(255),
      reg_no VARCHAR(64),
      is_leader BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(team_id, email)
    );
    CREATE INDEX IF NOT EXISTS idx_hackathon_members_google_sub ON hackathon_team_members(google_sub);

    CREATE TABLE IF NOT EXISTS team_game_attempts (
      id VARCHAR(64) PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
      game_slug VARCHAR(64) NOT NULL,
      slot_number INTEGER,
      status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
      started_by_google_sub VARCHAR(255) NOT NULL,
      completed_by_google_sub VARCHAR(255),
      result_payload JSONB,
      awarded_points INTEGER NOT NULL DEFAULT 0,
      scoring_version INTEGER NOT NULL DEFAULT 1,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
    ALTER TABLE team_game_attempts ADD COLUMN IF NOT EXISTS slot_number INTEGER;
    ALTER TABLE team_game_attempts ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
    ALTER TABLE team_game_attempts ADD COLUMN IF NOT EXISTS void_reason TEXT;
    ALTER TABLE team_game_attempts ADD COLUMN IF NOT EXISTS voided_by VARCHAR(255);
    ALTER TABLE team_game_attempts DROP CONSTRAINT IF EXISTS team_game_attempts_team_id_game_slug_key;
    CREATE INDEX IF NOT EXISTS idx_team_game_attempts_team_time ON team_game_attempts(team_id, started_at DESC);
    DROP INDEX IF EXISTS idx_team_game_attempts_team_slot;
    DROP INDEX IF EXISTS idx_team_game_attempts_one_active;
    DROP INDEX IF EXISTS idx_team_game_attempts_team_game;
    CREATE UNIQUE INDEX idx_team_game_attempts_team_slot ON team_game_attempts(team_id, slot_number)
      WHERE slot_number IS NOT NULL AND voided_at IS NULL;
    CREATE UNIQUE INDEX idx_team_game_attempts_one_active ON team_game_attempts(team_id)
      WHERE status = 'active' AND voided_at IS NULL;
    CREATE UNIQUE INDEX idx_team_game_attempts_team_game ON team_game_attempts(team_id, game_slug)
      WHERE voided_at IS NULL;

    CREATE TABLE IF NOT EXISTS team_point_ledger (
      id BIGSERIAL PRIMARY KEY,
      team_id INTEGER NOT NULL REFERENCES hackathon_teams(id) ON DELETE CASCADE,
      source_type VARCHAR(32) NOT NULL,
      source_ref VARCHAR(128) NOT NULL,
      delta INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reason TEXT NOT NULL,
      actor_google_sub VARCHAR(255),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(team_id, source_type, source_ref)
    );
    CREATE INDEX IF NOT EXISTS idx_team_point_ledger_team_time ON team_point_ledger(team_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS hackathon_scoring_migrations (
      key VARCHAR(128) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hackathon_event_settings (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO hackathon_event_settings (key, value)
    VALUES ('games_enabled', 'false'::jsonb)
    ON CONFLICT (key) DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO hackathon_team_members (team_id, email, google_sub, reg_no, is_leader)
    SELECT t.id,
           LOWER(member->>'email'),
           NULLIF(member->>'googleSub', ''),
           NULLIF(member->>'regNo', ''),
           COALESCE((member->>'isLeader')::boolean, FALSE)
    FROM hackathon_teams t
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.members, '[]'::jsonb)) AS member
    WHERE NULLIF(member->>'email', '') IS NOT NULL
    ON CONFLICT (team_id, email) DO UPDATE SET
      google_sub = COALESCE(EXCLUDED.google_sub, hackathon_team_members.google_sub),
      reg_no = COALESCE(EXCLUDED.reg_no, hackathon_team_members.reg_no),
      is_leader = EXCLUDED.is_leader OR hackathon_team_members.is_leader;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM hackathon_scoring_migrations WHERE key='v1-opening-balances') THEN
        INSERT INTO team_point_ledger (team_id, source_type, source_ref, delta, balance_after, reason, metadata)
        SELECT id, 'legacy', 'opening-balance', COALESCE(points, 0), COALESCE(points, 0),
               'Opening balance migrated from hackathon_teams', '{}'::jsonb
        FROM hackathon_teams
        WHERE COALESCE(points, 0) <> 0
        ON CONFLICT (team_id, source_type, source_ref) DO NOTHING;
        INSERT INTO hackathon_scoring_migrations (key) VALUES ('v1-opening-balances');
      END IF;
    END $$;
  `);

  await pool.query(`
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY started_at, id) AS rn
      FROM team_game_attempts
      WHERE slot_number IS NULL
    )
    UPDATE team_game_attempts a
    SET slot_number = numbered.rn
    FROM numbered
    WHERE a.id = numbered.id;
  `);

  await applyPrelaunchOfficialGameMigration(pool);
}

export async function applyPrelaunchOfficialGameMigration(pool) {
  const migrationKey = 'v2-distinct-official-games-prelaunch-reset';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const marker = await client.query(
      `INSERT INTO hackathon_scoring_migrations (key) VALUES ($1)
       ON CONFLICT (key) DO NOTHING RETURNING key`,
      [migrationKey],
    );
    if (!marker.rows.length) {
      await client.query('COMMIT');
      return { applied: false };
    }

    const team12Result = await client.query('SELECT * FROM hackathon_teams WHERE id=12 FOR UPDATE');
    if (team12Result.rows.length) {
      const team12 = team12Result.rows[0];
      const latest = await client.query(
        'SELECT balance_after FROM team_point_ledger WHERE team_id=12 ORDER BY created_at DESC, id DESC LIMIT 1',
      );
      const cachedBalance = Number(team12.points || 0);
      const ledgerBalance = Number(latest.rows[0]?.balance_after || 0);
      if (cachedBalance === 110 && ledgerBalance === 160) {
        await client.query(
          `INSERT INTO team_point_ledger
             (team_id, source_type, source_ref, delta, balance_after, reason, actor_google_sub, metadata)
           VALUES (12, 'reconciliation', $1, -50, 110, $2, 'system:migration-v2', $3)
           ON CONFLICT (team_id, source_type, source_ref) DO NOTHING`,
          [migrationKey, 'Pre-launch reconciliation to authoritative displayed balance', JSON.stringify({ previousLedgerBalance: 160, authoritativeBalance: 110 })],
        );
      } else if (cachedBalance !== ledgerBalance) {
        throw new Error(`Team 12 balance changed before ${migrationKey}; refusing unsafe reconciliation`);
      }
    }

    const team13Result = await client.query('SELECT * FROM hackathon_teams WHERE id=13 FOR UPDATE');
    if (team13Result.rows.length) {
      const team13 = team13Result.rows[0];
      const approved = [
        { id: '7a9956d4-b4ff-41a1-a180-b57923a3e666', gameSlug: 'flappy-bird', points: 2 },
        { id: '74397831-0719-489a-bad0-7575c1aee18f', gameSlug: 'fruit-ninja', points: 30 },
      ];
      if (Number(team13.points || 0) !== 82) {
        throw new Error(`Team 13 balance changed before ${migrationKey}; refusing unsafe reset`);
      }
      for (const approvedAttempt of approved) {
        const attemptResult = await client.query(
          'SELECT * FROM team_game_attempts WHERE id=$1 AND team_id=13 FOR UPDATE',
          [approvedAttempt.id],
        );
        const attempt = attemptResult.rows[0];
        if (!attempt || attempt.game_slug !== approvedAttempt.gameSlug || Number(attempt.awarded_points || 0) !== approvedAttempt.points) {
          throw new Error(`Approved pre-launch attempt ${approvedAttempt.id} no longer matches the audited record`);
        }
        const ledger = await appendLedger(client, {
          team: team13,
          sourceType: 'game-reversal',
          sourceRef: approvedAttempt.id,
          delta: -approvedAttempt.points,
          reason: `Pre-launch reversal for ${approvedAttempt.gameSlug}`,
          actor: { sub: 'system:migration-v2' },
          metadata: { attemptId: approvedAttempt.id, migrationKey },
        });
        if (!ledger.applied) throw new Error(`Pre-launch reversal already exists without migration marker for ${approvedAttempt.id}`);
        await client.query(
          `UPDATE team_game_attempts
           SET voided_at=NOW(), void_reason=$1, voided_by='system:migration-v2'
           WHERE id=$2`,
          ['Approved pre-launch official-game reset', approvedAttempt.id],
        );
      }
      if (Number(team13.points || 0) !== 50) throw new Error('Team 13 pre-launch reset did not finish at 50 points');
    }

    await client.query('COMMIT');
    return { applied: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertHackathonMember(client, { teamId, email, googleSub, regNo, isLeader }) {
  await client.query(
    `INSERT INTO hackathon_team_members (team_id, email, google_sub, reg_no, is_leader)
     VALUES ($1, LOWER($2), $3, $4, $5)
     ON CONFLICT (team_id, email) DO UPDATE SET
       google_sub = COALESCE(EXCLUDED.google_sub, hackathon_team_members.google_sub),
       reg_no = EXCLUDED.reg_no,
       is_leader = EXCLUDED.is_leader OR hackathon_team_members.is_leader`,
    [teamId, email, googleSub || null, regNo || null, Boolean(isLeader)],
  );
}

export async function listHackathonMembers(client, teamId) {
  const result = await client.query(
    `SELECT email, google_sub AS "googleSub", reg_no AS "regNo", is_leader AS "isLeader"
     FROM hackathon_team_members WHERE team_id = $1 ORDER BY is_leader DESC, joined_at ASC`,
    [teamId],
  );
  return result.rows;
}

async function findAuthorizedTeam(client, code, user, { leader = false, lock = false } = {}) {
  const result = await client.query(
    `SELECT t.*, m.id AS actor_member_id, m.google_sub AS actor_google_sub,
            m.is_leader AS actor_is_leader
     FROM hackathon_teams t
     JOIN hackathon_team_members m ON m.team_id = t.id
     WHERE t.code = $1
       AND (m.google_sub = $2 OR (m.google_sub IS NULL AND LOWER(m.email) = $3))
     ${leader ? 'AND m.is_leader = TRUE' : ''}
     ${lock ? 'FOR UPDATE OF t' : ''}`,
    [normalizeTeamCode(code), user.sub, String(user.email || '').toLowerCase()],
  );
  if (!result.rows.length) {
    const error = new Error(leader ? 'Only the verified team leader can perform this action' : 'Not a member of this team');
    error.status = 403;
    throw error;
  }
  const team = result.rows[0];
  if (!team.actor_google_sub) {
    await client.query(
      'UPDATE hackathon_team_members SET google_sub=$1 WHERE id=$2 AND google_sub IS NULL',
      [user.sub, team.actor_member_id],
    );
    team.actor_google_sub = user.sub;
  }
  return team;
}

async function transact(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function appendLedger(client, { team, sourceType, sourceRef, delta, reason, actor, metadata = {} }) {
  const balance = Number(team.points || 0) + delta;
  if (balance < 0) {
    const error = new Error('Team does not have enough points');
    error.status = 409;
    throw error;
  }
  const inserted = await client.query(
    `INSERT INTO team_point_ledger
       (team_id, source_type, source_ref, delta, balance_after, reason, actor_google_sub, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (team_id, source_type, source_ref) DO NOTHING
     RETURNING *`,
    [team.id, sourceType, sourceRef, delta, balance, reason, actor?.sub || null, JSON.stringify(metadata)],
  );
  if (!inserted.rows.length) return { applied: false, balance: Number(team.points || 0) };
  await client.query('UPDATE hackathon_teams SET points = $1, updated_at = NOW() WHERE id = $2', [balance, team.id]);
  team.points = balance;
  return { applied: true, balance, entry: inserted.rows[0] };
}

async function getGamesEnabled(client) {
  const result = await client.query("SELECT value FROM hackathon_event_settings WHERE key='games_enabled'");
  return result.rows[0]?.value === true;
}

async function listTeamAttempts(client, teamId) {
  const result = await client.query(
    `SELECT id, game_slug, slot_number, status, started_by_google_sub, completed_by_google_sub,
            awarded_points, scoring_version, result_payload, started_at, completed_at,
            voided_at, void_reason, voided_by
     FROM team_game_attempts
     WHERE team_id=$1
     ORDER BY slot_number ASC, started_at ASC`,
    [teamId],
  );
  return result.rows;
}

function formatAttempt(row) {
  if (!row) return null;
  return {
    attemptId: row.id,
    gameSlug: row.game_slug,
    slotNumber: row.slot_number,
    status: row.status,
    startedByGoogleSub: row.started_by_google_sub,
    completedByGoogleSub: row.completed_by_google_sub,
    points: Number(row.awarded_points || 0),
    scoringVersion: row.scoring_version,
    result: row.result_payload,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    voidedAt: row.voided_at,
    voidReason: row.void_reason,
    voidedBy: row.voided_by,
  };
}

export async function applyAdminAdjustment(pool, { code, delta, reason, actor }) {
  const adjustment = validateAdminAdjustment({ delta, reason });
  return transact(pool, async (client) => {
    const teamResult = await client.query('SELECT * FROM hackathon_teams WHERE code=$1 FOR UPDATE', [normalizeTeamCode(code)]);
    if (!teamResult.rows.length) { const error = new Error('Team not found'); error.status = 404; throw error; }
    const team = teamResult.rows[0];
    const sourceRef = randomUUID();
    const ledger = await appendLedger(client, {
      team,
      sourceType: 'admin',
      sourceRef,
      delta: adjustment.delta,
      reason: adjustment.reason,
      actor: actor || { sub: 'admin:organizer' },
    });
    return { adjustmentId: sourceRef, balance: ledger.balance, delta: adjustment.delta };
  });
}

async function getTeamGameSummary(client, team) {
  const attempts = await listTeamAttempts(client, team.id);
  const usage = summarizeTeamGameUsage({ attempts, maxAttempts: team.max_game_attempts });
  return {
    gamesEnabled: await getGamesEnabled(client),
    maxAttempts: usage.maxAttempts,
    usedAttempts: usage.usedAttempts,
    remainingAttempts: usage.remainingAttempts,
    completedAttempts: usage.completedAttempts,
    playedGameSlugs: usage.playedGameSlugs,
    activeAttempt: formatAttempt(usage.activeAttempt),
    attempts: attempts.map(formatAttempt),
  };
}

function findMysteryQuestionById(id) {
  return MYSTERY_QUESTIONS.find((question) => question.id === id);
}

const sendError = (res, error) => {
  const status = error.status || (/required|valid|official|scored|range|integer/i.test(error.message) ? 400 : 500);
  if (status >= 500) console.error('Hackathon scoring error:', error);
  const payload = buildGameErrorPayload(error);
  if (status >= 500) payload.error = 'Hackathon scoring request failed';
  res.status(status).json(payload);
};

export function registerHackathonScoringRoutes(app, { pool, hackathonAuth, adminMiddleware }) {
  app.post('/api/mystery-box/games/:gameSlug/start', hackathonAuth, async (req, res) => {
    try {
      const gameSlug = req.params.gameSlug;
      if (!isScoredGame(gameSlug)) return res.status(404).json({ error: 'This game is not scored' });
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.body?.code, req.hackathonUser, { lock: true });
        const attempts = await listTeamAttempts(client, team.id);
        const gamesEnabled = await getGamesEnabled(client);
        const usage = summarizeTeamGameUsage({ attempts, maxAttempts: team.max_game_attempts });
        const activeAttempt = usage.activeAttempt;
        if (activeAttempt?.game_slug === gameSlug) return { created: false, attempt: activeAttempt, usage: summarizeTeamGameUsage({ attempts, maxAttempts: team.max_game_attempts }) };
        const decision = canStartOfficialGame({ attempts, maxAttempts: team.max_game_attempts, gamesEnabled, gameSlug });
        if (!decision.allowed) {
          const messages = {
            'active-attempt-exists': `Resume ${decision.attempt?.game_slug || 'the active game'} before starting another official game`,
            'game-already-played': 'This team has already completed this official game',
            'game-mode-disabled': 'Official game mode is disabled',
            'game-limit-reached': 'This team has used all official game plays',
          };
          const error = new Error(messages[decision.reason] || 'Official game cannot be started');
          error.status = 409;
          error.reason = decision.reason;
          error.attempt = formatAttempt(decision.attempt);
          error.usage = usage;
          error.balance = Number(team.points || 0);
          throw error;
        }
        const attemptId = randomUUID();
        const slotNumber = findLowestAvailableSlot(attempts, team.max_game_attempts);
        if (slotNumber === null) {
          const error = new Error('This team has used all official game plays');
          error.status = 409;
          error.reason = 'game-limit-reached';
          error.usage = usage;
          error.balance = Number(team.points || 0);
          throw error;
        }
        const inserted = await client.query(
          `INSERT INTO team_game_attempts (id, team_id, game_slug, slot_number, started_by_google_sub, scoring_version)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING *`,
          [attemptId, team.id, gameSlug, slotNumber, req.hackathonUser.sub, SCORING_VERSION],
        );
        return { created: true, attempt: inserted.rows[0], usage: summarizeTeamGameUsage({ attempts: [...attempts, inserted.rows[0]], maxAttempts: team.max_game_attempts }) };
      });
      res.status(response.created ? 201 : 200).json({
        ...formatAttempt(response.attempt),
        resumed: !response.created,
        usage: response.usage,
      });
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/games/:gameSlug/complete', hackathonAuth, async (req, res) => {
    try {
      const gameSlug = req.params.gameSlug;
      const resultPayload = validateGameCompletion(gameSlug, req.body?.result);
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.body?.code, req.hackathonUser, { lock: true });
        const attemptResult = await client.query(
          'SELECT * FROM team_game_attempts WHERE team_id = $1 AND id = $2 AND game_slug = $3 AND voided_at IS NULL FOR UPDATE',
          [team.id, req.body?.attemptId, gameSlug],
        );
        const attempt = attemptResult.rows[0];
        if (!attempt) {
          const error = new Error('Official game attempt not found'); error.status = 404; throw error;
        }
        if (attempt.status === 'completed') {
          const attempts = await listTeamAttempts(client, team.id);
          return {
            duplicate: true,
            points: Number(attempt.awarded_points || 0),
            balance: Number(team.points || 0),
            attempt: formatAttempt(attempt),
            usage: summarizeTeamGameUsage({ attempts, maxAttempts: team.max_game_attempts }),
          };
        }
        if (attempt.status !== 'active') { const error = new Error('Official attempt is no longer active'); error.status = 409; throw error; }

        const points = calculateGamePoints(gameSlug, resultPayload);
        const ledger = await appendLedger(client, {
          team,
          sourceType: 'game',
          sourceRef: attempt.id,
          delta: points,
          reason: `${gameSlug} official attempt`,
          actor: req.hackathonUser,
          metadata: { gameSlug, scoringVersion: SCORING_VERSION },
        });
        const completed = await client.query(
          `UPDATE team_game_attempts SET status='completed', completed_by_google_sub=$1,
             result_payload=$2, awarded_points=$3, completed_at=NOW() WHERE id=$4 RETURNING *`,
          [req.hackathonUser.sub, JSON.stringify(resultPayload), points, attempt.id],
        );
        const attempts = await listTeamAttempts(client, team.id);
        return {
          duplicate: !ledger.applied,
          points,
          balance: ledger.balance,
          attempt: formatAttempt(completed.rows[0]),
          usage: summarizeTeamGameUsage({ attempts, maxAttempts: team.max_game_attempts }),
        };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/mystery-box/teams/:code/scores', hackathonAuth, async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser);
        const [ledger, gameSummary] = await Promise.all([
          client.query(`SELECT source_type AS "sourceType", source_ref AS "sourceRef", delta, balance_after AS "balanceAfter", reason, created_at AS "createdAt" FROM team_point_ledger WHERE team_id=$1 ORDER BY created_at DESC, id DESC LIMIT 200`, [team.id]),
          getTeamGameSummary(client, team),
        ]);
        res.json({ teamCode: team.code, balance: Number(team.points || 0), ...gameSummary, ledger: ledger.rows });
      } finally { client.release(); }
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/mystery-box/topics', hackathonAuth, async (req, res) => {
    res.json({ topics: listMysteryQuestions(), topicSwapPricing: TOPIC_SWAP_PRICING });
  });

  app.post('/api/mystery-box/teams/:code/leave', hackathonAuth, async (req, res) => {
    try {
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser, { lock: true });
        if (team.actor_is_leader) {
          const error = new Error('The team leader cannot leave without transferring leadership');
          error.status = 409;
          throw error;
        }
        await client.query('DELETE FROM hackathon_team_members WHERE id=$1', [team.actor_member_id]);
        await client.query(
          `UPDATE hackathon_teams t
           SET members=(SELECT COALESCE(jsonb_agg(member), '[]'::jsonb)
                        FROM jsonb_array_elements(COALESCE(t.members, '[]'::jsonb)) member
                        WHERE LOWER(member->>'email') <> $1), updated_at=NOW()
           WHERE t.id=$2`,
          [String(req.hackathonUser.email || '').toLowerCase(), team.id],
        );
        return { left: true };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/teams/:code/reveal', hackathonAuth, async (req, res) => {
    try {
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser, { leader: true, lock: true });
        if (team.is_opened) return { balance: Number(team.points || 0), alreadyOpened: true };
        const award = Math.max(0, Math.trunc(Number(team.mystery_question?.points || 0)));
        const ledger = await appendLedger(client, { team, sourceType: 'mystery', sourceRef: 'primary-reveal', delta: award, reason: 'Primary mystery box revealed', actor: req.hackathonUser });
        await client.query('UPDATE hackathon_teams SET is_opened=TRUE, updated_at=NOW() WHERE id=$1', [team.id]);
        return { balance: ledger.balance, awardedPoints: award, isOpened: true };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/teams/:code/purchases', hackathonAuth, async (req, res) => {
    try {
      if (req.body?.itemId === 'change-topic') return res.status(400).json({ error: 'Use the topic swap endpoint to change challenge topic' });
      const item = SHOP_ITEMS[req.body?.itemId];
      if (!item) return res.status(400).json({ error: 'Unknown shop item' });
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser, { leader: true, lock: true });
        const owned = Array.isArray(team.owned_items) ? team.owned_items : [];
        if (owned.includes(item.title)) { const error = new Error('This item is already owned'); error.status = 409; throw error; }
        const ledger = await appendLedger(client, { team, sourceType: 'shop', sourceRef: req.body.itemId, delta: -item.price, reason: `Purchased ${item.title}`, actor: req.hackathonUser, metadata: { itemId: req.body.itemId } });
        const nextOwned = [...owned, item.title];
        await client.query('UPDATE hackathon_teams SET owned_items=$1, updated_at=NOW() WHERE id=$2', [JSON.stringify(nextOwned), team.id]);
        return { balance: ledger.balance, ownedItems: nextOwned };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/teams/:code/topic-swap', hackathonAuth, async (req, res) => {
    try {
      const targetTopic = findMysteryQuestionById(req.body?.topicId);
      if (!targetTopic) return res.status(400).json({ error: 'Unknown topic selected' });
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser, { leader: true, lock: true });
        const quote = getTopicSwapQuote({
          currentTopic: team.mystery_question,
          targetTopic,
          teamPoints: team.points,
          hasChangedQuestion: team.has_changed_question,
        });
        if (!quote.allowed) {
          const error = new Error({
            'topic-swap-used': 'This team has already used its topic swap',
            'topic-required': 'Current topic is not ready for swapping',
            'same-topic': 'Choose a different topic',
            'insufficient-points': 'Team does not have enough points',
          }[quote.reason] || 'Topic swap is not allowed');
          error.status = quote.reason === 'insufficient-points' ? 409 : 400;
          throw error;
        }
        const ledger = await appendLedger(client, {
          team,
          sourceType: 'topic-swap',
          sourceRef: randomUUID(),
          delta: -quote.cost,
          reason: `Changed challenge topic to ${targetTopic.title}`,
          actor: req.hackathonUser,
          metadata: { fromTopicId: team.mystery_question?.id, toTopicId: targetTopic.id, cost: quote.cost },
        });
        await client.query(
          `UPDATE hackathon_teams
           SET mystery_question=$1, has_changed_question=TRUE, updated_at=NOW()
           WHERE id=$2`,
          [JSON.stringify(targetTopic), team.id],
        );
        return { balance: ledger.balance, topic: targetTopic, cost: quote.cost, hasChangedQuestion: true };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/teams/:code/chaos/open', hackathonAuth, async (req, res) => {
    try {
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser, { leader: true, lock: true });
        if (team.is_chaos_opened) return { chaosEvent: team.chaos_event, alreadyOpened: true };
        const event = team.chaos_event || CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
        await client.query('UPDATE hackathon_teams SET chaos_event=$1, is_chaos_opened=TRUE, is_chaos_resolved=FALSE, updated_at=NOW() WHERE id=$2', [JSON.stringify(event), team.id]);
        return { chaosEvent: event, isChaosOpened: true };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/teams/:code/chaos/resolve', hackathonAuth, async (req, res) => {
    try {
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser, { leader: true, lock: true });
        if (!team.is_chaos_opened) { const error = new Error('Chaos event has not been opened'); error.status = 409; throw error; }
        if (team.is_chaos_resolved) return { balance: Number(team.points || 0), alreadyResolved: true };
        const ledger = await appendLedger(client, { team, sourceType: 'chaos', sourceRef: 'resolution', delta: 120, reason: 'Chaos event resolved', actor: req.hackathonUser });
        await client.query('UPDATE hackathon_teams SET is_chaos_resolved=TRUE, updated_at=NOW() WHERE id=$1', [team.id]);
        return { balance: ledger.balance, awardedPoints: 120, isChaosResolved: true };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/mystery-box/teams/:code/adjustments', adminMiddleware, async (req, res) => {
    try {
      const response = await applyAdminAdjustment(pool, {
        code: req.params.code,
        delta: req.body?.delta,
        reason: req.body?.reason,
        actor: { sub: `admin:${req.admin?.role || 'organizer'}` },
      });
      res.status(201).json(response);
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/admin/mystery-box/games-mode', adminMiddleware, async (req, res) => {
    try {
      const client = await pool.connect();
      try { res.json({ enabled: await getGamesEnabled(client) }); }
      finally { client.release(); }
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/mystery-box/games-mode', adminMiddleware, async (req, res) => {
    try {
      const enabled = validateGameMode(req.body);
      await pool.query(
        `INSERT INTO hackathon_event_settings (key, value, updated_at)
         VALUES ('games_enabled', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [JSON.stringify(enabled)],
      );
      res.json({ enabled });
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/mystery-box/teams/:code/games-limit', adminMiddleware, async (req, res) => {
    try {
      const maxAttempts = validateAdminGameLimit(req.body?.maxAttempts);
      const result = await pool.query(
        `UPDATE hackathon_teams SET max_game_attempts=$1, updated_at=NOW() WHERE code=$2 RETURNING code, max_game_attempts`,
        [maxAttempts, normalizeTeamCode(req.params.code)],
      );
      if (!result.rows.length) return res.status(404).json({ error: 'Team not found' });
      res.json({ code: result.rows[0].code, maxAttempts: result.rows[0].max_game_attempts });
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/mystery-box/teams/:code/games/:gameSlug/reset', adminMiddleware, async (req, res) => {
    try {
      const reason = validateAttemptResetReason(req.body?.reason);
      const response = await transact(pool, async (client) => {
        const teamResult = await client.query('SELECT * FROM hackathon_teams WHERE code=$1 FOR UPDATE', [normalizeTeamCode(req.params.code)]);
        if (!teamResult.rows.length) { const error = new Error('Team not found'); error.status = 404; throw error; }
        const team = teamResult.rows[0];
        const attemptResult = await client.query(
          `SELECT * FROM team_game_attempts
           WHERE team_id=$1 AND game_slug=$2 AND voided_at IS NULL
           ORDER BY started_at DESC LIMIT 1 FOR UPDATE`,
          [team.id, req.params.gameSlug],
        );
        const attempt = attemptResult.rows[0];
        if (!attempt) { const error = new Error('No resettable attempt found'); error.status = 409; throw error; }
        const reversal = attempt.status === 'completed' ? -Number(attempt.awarded_points || 0) : 0;
        const actor = { sub: `admin:${req.admin?.role || 'organizer'}` };
        const ledger = await appendLedger(client, {
          team,
          sourceType: 'game-reset',
          sourceRef: attempt.id,
          delta: reversal,
          reason,
          actor,
          metadata: { gameSlug: req.params.gameSlug, previousStatus: attempt.status, awardedPoints: Number(attempt.awarded_points || 0) },
        });
        await client.query(
          `UPDATE team_game_attempts
           SET status=CASE WHEN status='active' THEN 'abandoned' ELSE status END,
               voided_at=NOW(), void_reason=$1, voided_by=$2
           WHERE id=$3`,
          [reason, actor.sub, attempt.id],
        );
        const attempts = await listTeamAttempts(client, team.id);
        return {
          reset: true,
          attemptId: attempt.id,
          reversedPoints: Math.abs(reversal),
          balance: ledger.balance,
          usage: summarizeTeamGameUsage({ attempts, maxAttempts: team.max_game_attempts }),
        };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });
}
