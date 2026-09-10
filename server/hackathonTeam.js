export function formatHackathonTeam(row, members = row.members || [], { includePrivateChaos = false } = {}) {
  return {
    code: row.code,
    teamName: row.team_name,
    mysteryQuestion: row.mystery_question,
    isOpened: Boolean(row.is_opened),
    points: Number(row.points || 0),
    spinsUsed: Number(row.spins_used || 0),
    remainingSpins: 5-Number(row.spins_used || 0),
    freeChangeCards: Number(row.free_change_cards || 0),
    chaosVersion: Number(row.chaos_version || 0),
    chaosEvent: row.is_chaos_opened || includePrivateChaos ? row.chaos_event : null,
    isChaosOpened: Boolean(row.is_chaos_opened),
    isChaosResolved: Boolean(row.is_chaos_resolved),
    ownedItems: row.owned_items || [],
    members,
    hasChangedQuestion: Boolean(row.has_changed_question),
    maxGameAttempts: row.max_game_attempts ?? 5,
    registeredAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function findReturningHackathonTeamRows(db, user) {
  const googleSub = String(user?.sub || '').trim();
  const email = String(user?.email || '').trim().toLowerCase();
  if (!googleSub || !email) return [];

  const result = await db.query(
    `SELECT t.*, m.id AS actor_member_id,
            m.google_sub AS actor_google_sub
     FROM hackathon_team_members m
     JOIN hackathon_teams t ON t.id = m.team_id
     WHERE m.google_sub = $1
        OR LOWER(m.email) = $2
     ORDER BY m.joined_at ASC, m.id ASC
     LIMIT 1`,
    [googleSub, email],
  );

  for (const team of result.rows) {
    if (!team.actor_google_sub && team.actor_member_id) {
      await db.query(
        `UPDATE hackathon_team_members
         SET google_sub = $1
         WHERE id = $2 AND google_sub IS NULL`,
        [googleSub, team.actor_member_id],
      );
      team.actor_google_sub = googleSub;
    }
  }

  return result.rows.slice(0, 1);
}

const SINGLE_TEAM_CONSTRAINTS = new Set([
  'uq_hackathon_member_email_global',
  'uq_hackathon_member_google_sub_global',
]);

export function isSingleTeamMembershipConflict(error) {
  return error?.code === '23505' && SINGLE_TEAM_CONSTRAINTS.has(error?.constraint);
}

export function getTeamRegistrationConflict(memberships, { action, teamCode } = {}) {
  if (!Array.isArray(memberships) || memberships.length === 0) return null;
  const existingCode = String(memberships[0].code || '').trim().toUpperCase();
  const requestedCode = String(teamCode || '').trim().replace(/^#+/, '').toUpperCase();
  if (action === 'join' && memberships.some((team) => String(team.code || '').toUpperCase() === requestedCode)) {
    return null;
  }
  return {
    status: 409,
    error: action === 'join'
      ? 'You already belong to a different HackQuest team'
      : 'You already belong to a HackQuest team',
    teamCode: existingCode,
  };
}

export async function createReturningHackathonSession(db, user, { signToken }) {
  const rows = await findReturningHackathonTeamRows(db, user);
  const teams = await Promise.all(rows.map(async (row) => {
    const members = await db.query(
      `SELECT email, google_sub AS "googleSub", reg_no AS "regNo", is_leader AS "isLeader"
       FROM hackathon_team_members
       WHERE team_id = $1
       ORDER BY is_leader DESC, joined_at ASC`,
      [row.id],
    );
    return formatHackathonTeam(row, members.rows);
  }));

  return {
    token: signToken({ email: user.email, sub: user.sub, kind: 'hackathon' }),
    user,
    teams,
  };
}
