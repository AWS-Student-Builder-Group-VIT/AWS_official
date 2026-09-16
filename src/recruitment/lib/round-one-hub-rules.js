/**
 * Round 1 hub cards: one card per selected written domain, plus one card per
 * selected Technical specialisation. Each Technical track is its own timed
 * assessment, so each carries its own status rather than a shared one.
 */
export function roundOneCards(domains, domainStates, technical) {
  const technicalCards = (technical.tracks ?? []).map((track) => ({
    key: `technical:${track.subdomainId}`,
    kind: 'technical',
    title: track.name,
    subtitle: 'Timed technical assessment',
    status: track.status === 'submitted' ? 'submitted' : track.status === 'in_progress' ? 'draft' : 'not_started',
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
