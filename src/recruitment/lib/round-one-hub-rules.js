/**
 * Round 1 hub cards: one card per selected written domain, plus one card per
 * selected Technical specialisation. Each Technical track is its own timed
 * assessment, so each carries its own status rather than a shared one.
 *
 * 'not_assessed' covers tracks left out of an older combined attempt, which
 * existed before assessments were split per track.
 */
export function roundOneCards(domains, domainStates, technical) {
  const technicalCards = (technical.tracks ?? []).map((track) => {
    const status = track.status === 'submitted'
      ? 'submitted'
      : track.status === 'in_progress'
        ? 'draft'
        : track.status === 'not_assessed'
          ? 'not_assessed'
          : 'not_started';
    return {
      key: `technical:${track.subdomainId}`,
      kind: 'technical',
      title: track.name,
      subtitle: status === 'not_assessed'
        ? 'Not included in your submitted assessment'
        : 'Timed technical assessment',
      status,
      subdomainId: track.subdomainId,
      assessed: track.assessed !== false,
    };
  });

  const writtenCards = domains.map((domain) => ({
    key: `written:${domain.id}`,
    kind: 'written',
    title: domain.name,
    subtitle: domain.tracks.map((track) => track.name).join(' · ') || 'Whole-domain application',
    status: domainStates[domain.id]?.status || 'not_started',
    domainId: domain.id,
  }));

  return [...technicalCards, ...writtenCards];
}
