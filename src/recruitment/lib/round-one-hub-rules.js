/**
 * Round 1 hub cards: one card per selected written domain, plus one card per
 * selected Technical specialisation. Technical tracks arrive separately from the
 * written domains because they are answered in the timed assessment instead.
 */
export function roundOneCards(domains, domainStates, technical) {
  const technicalStatus = technical.complete
    ? 'submitted'
    : technical.status === 'in_progress'
      ? 'draft'
      : 'not_started';

  const technicalCards = (technical.tracks ?? []).map((track) => ({
    key: `technical:${track.subdomainId}`,
    kind: 'technical',
    title: track.name,
    subtitle: 'Timed technical assessment',
    status: technicalStatus,
    subdomainId: track.subdomainId,
  }));

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
