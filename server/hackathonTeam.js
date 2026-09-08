export function formatHackathonTeam(row, members = row.members || [], { includePrivateChaos = false } = {}) {
  return {
    code: row.code,
    teamName: row.team_name,
    mysteryQuestion: row.mystery_question,
    isOpened: Boolean(row.is_opened),
    points: Number(row.points || 0),
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
