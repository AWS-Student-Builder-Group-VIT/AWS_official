const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);

export function normalizeChallengeDetails(challenge = {}) {
  return {
    description: typeof challenge.desc === 'string' && challenge.desc.trim()
      ? challenge.desc
      : 'Build your serverless or cloud hackathon solution as assigned.',
    technicalScope: strings(challenge.technicalScope),
    deliverables: strings(challenge.deliverables),
    awsServices: strings(challenge.tags),
  };
}
