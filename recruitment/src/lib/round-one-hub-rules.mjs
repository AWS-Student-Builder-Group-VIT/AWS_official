export function roundOneCards(domains, domainStates, technical) {
  const technicalStatus = technical.complete
    ? 'submitted'
    : technical.status === 'in_progress'
      ? 'draft'
      : 'not_started';

  return domains.flatMap((domain) => domain.slug === 'technical'
    ? domain.tracks.map((track) => ({
      key: `technical:${track.id}`,
      kind: 'technical',
      title: track.name,
      subtitle: 'Technical assessment',
      status: technicalStatus,
      subdomainId: track.id,
    }))
    : [{
      key: `written:${domain.id}`,
      kind: 'written',
      title: domain.name,
      subtitle: domain.tracks.map((track) => track.name).join(' · ') || 'Whole-domain application',
      status: domainStates[domain.id]?.status || 'not_started',
      domainId: domain.id,
    }]);
}
