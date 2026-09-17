// Later stages are never pulled back by a Round 1 change.
const LATER_STAGES = new Set(['round_2', 'selected', 'waitlisted']);

/**
 * Candidate-level Round 1 outcome from per-track decisions (true / false / null).
 * Qualified in any track → qualified. Rejected in every track → not qualified.
 * Anything still undecided → back to "submitted" for review.
 */
export function roundOneOutcome(decisions, currentStatus) {
  const anyQualified = decisions.some((d) => d === true);
  const allRejected = decisions.length > 0 && decisions.every((d) => d === false);
  const round_0_status = anyQualified ? 'qualified' : allRejected ? 'not_qualified' : 'submitted';
  const update = { round_0_status };
  if (!LATER_STAGES.has(currentStatus)) {
    update.status = anyQualified ? 'round_1' : allRejected ? 'rejected' : 'round_0';
    update.current_round = anyQualified ? 1 : 0;
  }
  return update;
}
