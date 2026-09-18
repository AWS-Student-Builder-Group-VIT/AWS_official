function singleLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function candidateCsvRow(candidateRecord) {
  const { profile, choices = [], writtenAnswers = [] } = candidateRecord;
  return {
    registration_number: singleLine(profile.registration_number),
    full_name: singleLine(profile.full_name),
    choices: choices.map(singleLine).join(' | '),
    written_responses: writtenAnswers.map((item) => {
      const links = (item.links || []).map(singleLine).filter(Boolean);
      return `${singleLine(item.domain)} — ${singleLine(item.prompt)}: ${singleLine(item.answer)}${links.length ? ` [${links.join(' | ')}]` : ''}`;
    }).join(' || '),
  };
}
