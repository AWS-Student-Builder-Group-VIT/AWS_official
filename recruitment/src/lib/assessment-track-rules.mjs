export function technicalAssessmentTracks(choices) {
  return choices.filter((choice) => choice.domainSlug === 'technical');
}
