import { randomUUID } from 'node:crypto';

import { calculateGamePoints, isScoredGame, SCORING_VERSION } from './gameScoring.js';

const SHOP_ITEMS = Object.freeze({
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
  { title: 'Serverless Student Portal', desc: 'Design a serverless, highly-scalable backend on AWS (Lambda, API Gateway, DynamoDB) that allows student clubs to manage events, registrations, and announcements with zero server costs.', points: 150 },
  { title: 'AWS Cost-Optimizer Dashboard', desc: 'Create a dashboard app that analyzes AWS billing reports to find idle EC2 instances, underutilized S3 buckets, and provides actionable recommendations to save costs.', points: 120 },
  { title: 'AI Study Companion', desc: 'Build a web app using Amazon Bedrock and AWS Lambda that allows students to upload syllabus docs or notes and automatically generates interactive quizzes and flashcards.', points: 180 },
  { title: 'Cloud Resume Builder with CI/CD', desc: 'Design a web app that helps students build their resume and deploys it automatically as a static website on AWS S3/CloudFront, integrated with a mock GitHub Action pipeline.', points: 100 },
  { title: 'Real-time Collaborative Whiteboard', desc: 'Develop a real-time collaborative whiteboard app using AWS AppSync or WebSockets that allows student teams to map out architectural diagrams synchronously.', points: 160 },
  { title: 'Smart Campus Navigation Engine', desc: 'Build a campus guide prototype using AWS Location Service and Amazon Lex that helps new students navigate a campus, find classrooms, and ask assistant bots for help.', points: 140 },
  { title: 'IoT Smart Energy Monitor', desc: 'Design a simulated IoT dashboard using AWS IoT Core that ingests temperature and power data from smart classrooms, visualizes it, and alerts admins when energy waste is detected.', points: 130 },
  { title: 'Automated Code Debugger Bot', desc: 'Develop an automated code reviewer tool that integrates with a Git repo, runs code analysis via Amazon CodeGuru or Bedrock, and leaves helpful debugging comments on student pull requests.', points: 170 },
  { title: 'IVS Stream Hub', desc: 'Create a low-latency streaming hub using Amazon IVS that allows developers to stream technical workshops and embed interactive live chat polls.', points: 150 },
  { title: 'Attendance via Face Recognition', desc: 'Build a fast attendance system prototype that allows event organizers to take a photo of attendees and verify their registration in real-time using Amazon Rekognition.', points: 160 },
]);

export function pickMysteryQuestion(random = Math.random) {
  const index = Math.min(MYSTERY_QUESTIONS.length - 1, Math.floor(random() * MYSTERY_QUESTIONS.length));
  return { ...MYSTERY_QUESTIONS[index] };
}

export function normalizeTeamCode(value) {
  const code = String(value || '').trim().toUpperCase();
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

export async function initializeHackathonScoring(pool) {
  await pool.query(`
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
      status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
      started_by_google_sub VARCHAR(255) NOT NULL,
      completed_by_google_sub VARCHAR(255),
      result_payload JSONB,
      awarded_points INTEGER NOT NULL DEFAULT 0,
      scoring_version INTEGER NOT NULL DEFAULT 1,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      UNIQUE(team_id, game_slug)
    );

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

const sendError = (res, error) => {
  const status = error.status || (/required|valid|official|scored|range|integer/i.test(error.message) ? 400 : 500);
  if (status >= 500) console.error('Hackathon scoring error:', error);
  res.status(status).json({ error: status >= 500 ? 'Hackathon scoring request failed' : error.message });
};

export function registerHackathonScoringRoutes(app, { pool, hackathonAuth, adminMiddleware }) {
  app.post('/api/mystery-box/games/:gameSlug/start', hackathonAuth, async (req, res) => {
    try {
      const gameSlug = req.params.gameSlug;
      if (!isScoredGame(gameSlug)) return res.status(404).json({ error: 'This game is not scored' });
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.body?.code, req.hackathonUser, { lock: true });
        const attemptId = randomUUID();
        const inserted = await client.query(
          `INSERT INTO team_game_attempts (id, team_id, game_slug, started_by_google_sub, scoring_version)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (team_id, game_slug) DO NOTHING RETURNING *`,
          [attemptId, team.id, gameSlug, req.hackathonUser.sub, SCORING_VERSION],
        );
        if (inserted.rows.length) return { created: true, attempt: inserted.rows[0] };
        const existing = await client.query('SELECT * FROM team_game_attempts WHERE team_id = $1 AND game_slug = $2', [team.id, gameSlug]);
        return { created: false, attempt: existing.rows[0] };
      });
      if (response.attempt.status === 'completed') return res.status(409).json({ error: 'This team has already completed its official attempt', attempt: response.attempt });
      res.status(response.created ? 201 : 200).json({ attemptId: response.attempt.id, status: response.attempt.status, resumed: !response.created });
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/mystery-box/games/:gameSlug/complete', hackathonAuth, async (req, res) => {
    try {
      const gameSlug = req.params.gameSlug;
      const resultPayload = validateGameCompletion(gameSlug, req.body?.result);
      const response = await transact(pool, async (client) => {
        const team = await findAuthorizedTeam(client, req.body?.code, req.hackathonUser, { lock: true });
        const attemptResult = await client.query(
          'SELECT * FROM team_game_attempts WHERE team_id = $1 AND game_slug = $2 FOR UPDATE',
          [team.id, gameSlug],
        );
        const attempt = attemptResult.rows[0];
        if (!attempt || attempt.id !== req.body?.attemptId) {
          const error = new Error('Official game attempt not found'); error.status = 404; throw error;
        }
        if (attempt.status === 'completed') return { duplicate: true, points: attempt.awarded_points, balance: Number(team.points || 0) };
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
        await client.query(
          `UPDATE team_game_attempts SET status='completed', completed_by_google_sub=$1,
             result_payload=$2, awarded_points=$3, completed_at=NOW() WHERE id=$4`,
          [req.hackathonUser.sub, JSON.stringify(resultPayload), points, attempt.id],
        );
        return { duplicate: !ledger.applied, points, balance: ledger.balance };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });

  app.get('/api/mystery-box/teams/:code/scores', hackathonAuth, async (req, res) => {
    try {
      const client = await pool.connect();
      try {
        const team = await findAuthorizedTeam(client, req.params.code, req.hackathonUser);
        const [attempts, ledger] = await Promise.all([
          client.query(`SELECT game_slug AS "gameSlug", status, awarded_points AS points, started_at AS "startedAt", completed_at AS "completedAt" FROM team_game_attempts WHERE team_id=$1 ORDER BY started_at`, [team.id]),
          client.query(`SELECT source_type AS "sourceType", source_ref AS "sourceRef", delta, balance_after AS "balanceAfter", reason, created_at AS "createdAt" FROM team_point_ledger WHERE team_id=$1 ORDER BY created_at DESC, id DESC LIMIT 200`, [team.id]),
        ]);
        res.json({ teamCode: team.code, balance: Number(team.points || 0), attempts: attempts.rows, ledger: ledger.rows });
      } finally { client.release(); }
    } catch (error) { sendError(res, error); }
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
      const adjustment = validateAdminAdjustment(req.body);
      const response = await transact(pool, async (client) => {
        const teamResult = await client.query('SELECT * FROM hackathon_teams WHERE code=$1 FOR UPDATE', [normalizeTeamCode(req.params.code)]);
        if (!teamResult.rows.length) { const error = new Error('Team not found'); error.status = 404; throw error; }
        const team = teamResult.rows[0];
        const sourceRef = randomUUID();
        const ledger = await appendLedger(client, { team, sourceType: 'admin', sourceRef, delta: adjustment.delta, reason: adjustment.reason, actor: { sub: `admin:${req.admin?.role || 'organizer'}` } });
        return { adjustmentId: sourceRef, balance: ledger.balance, delta: adjustment.delta };
      });
      res.status(201).json(response);
    } catch (error) { sendError(res, error); }
  });

  app.post('/api/admin/mystery-box/teams/:code/games/:gameSlug/reset', adminMiddleware, async (req, res) => {
    try {
      const reason = String(req.body?.reason || '').trim();
      if (reason.length < 5) return res.status(400).json({ error: 'An audit reason is required' });
      const response = await transact(pool, async (client) => {
        const teamResult = await client.query('SELECT id FROM hackathon_teams WHERE code=$1 FOR UPDATE', [normalizeTeamCode(req.params.code)]);
        if (!teamResult.rows.length) { const error = new Error('Team not found'); error.status = 404; throw error; }
        const deleted = await client.query(`DELETE FROM team_game_attempts WHERE team_id=$1 AND game_slug=$2 AND status IN ('active','abandoned') RETURNING id`, [teamResult.rows[0].id, req.params.gameSlug]);
        if (!deleted.rows.length) { const error = new Error('No resettable attempt found'); error.status = 409; throw error; }
        await client.query(
          `INSERT INTO team_point_ledger (team_id, source_type, source_ref, delta, balance_after, reason, actor_google_sub, metadata)
           SELECT id, 'admin-reset', $2, 0, points, $3, $4, $5 FROM hackathon_teams WHERE id=$1`,
          [teamResult.rows[0].id, deleted.rows[0].id, reason, `admin:${req.admin?.role || 'organizer'}`, JSON.stringify({ gameSlug: req.params.gameSlug })],
        );
        return { reset: true, attemptId: deleted.rows[0].id };
      });
      res.json(response);
    } catch (error) { sendError(res, error); }
  });
}
