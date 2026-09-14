function isAnswered(value) {
  if (Array.isArray(value)) return value.some((item) => String(item).trim().length > 0);
  return typeof value === 'string' && value.trim().length > 0;
}

function answerFor(question, answers) {
  const scopedId = `${question.domainId}:${question.id}`;
  return Object.hasOwn(answers, scopedId) ? answers[scopedId] : answers[question.id];
}

export function questionsForSelections(questions, selectedDomainIds) {
  const uniqueDomainIds = [...new Set(selectedDomainIds)].filter((domainId) => domainId !== 'technical');
  const commonQuestions = questions.filter((question) => question.scope === 'common_non_technical');
  const domainQuestions = questions.filter((question) => question.scope === 'domain');

  return uniqueDomainIds.flatMap((domainId) => [
    ...commonQuestions.map((question) => ({ ...question, domainId })),
    ...domainQuestions.filter((question) => question.domainId === domainId),
  ]);
}

export function validateWrittenCompletion(questions, rules, answers) {
  const missing = questions
    .filter((question) => question.required && !isAnswered(answerFor(question, answers)))
    .map((question) => question.id);

  for (const rule of rules) {
    const answeredCount = questions.filter(
      (question) =>
        question.domainId === rule.domainId &&
        question.group === rule.group &&
        isAnswered(answerFor(question, answers)),
    ).length;

    if (answeredCount < rule.minimumAnswers) {
      missing.push(`${rule.domainId}:${rule.group}`);
    }
  }

  return { valid: missing.length === 0, missing };
}
