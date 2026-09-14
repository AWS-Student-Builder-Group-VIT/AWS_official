export function validateTrackSelection(selectedTracks) {
  if (selectedTracks.length === 0) {
    return { valid: false, code: 'SELECTION_REQUIRED' };
  }

  if (new Set(selectedTracks.map((track) => track.id)).size !== selectedTracks.length) {
    return { valid: false, code: 'DUPLICATE_SELECTION' };
  }

  if (selectedTracks.filter((track) => track.domainSlug === 'technical').length > 2) {
    return { valid: false, code: 'TECHNICAL_SELECTION_LIMIT' };
  }

  return { valid: true };
}

export function groupSelectionsByDomain(selectedTracks) {
  return selectedTracks.reduce((groups, track) => {
    groups.set(track.domainId, [...(groups.get(track.domainId) ?? []), track]);
    return groups;
  }, new Map());
}
