import { validateWrittenCompletion } from './written-question-rules.js';

function answerContent(answer) {
  return answer?.answer_text?.trim()
    || answer?.submission_links?.filter(Boolean).join('\n')
    || '';
}

export function domainSubmissionState(domainId, questions, rules, answers) {
  const domainQuestions = questions.filter((question) => question.domainId === domainId);
  const domainRules = rules.filter((rule) => rule.domainId === domainId);
  const domainAnswers = answers.filter((answer) => answer.domain_id === domainId);
  const answerMap = Object.fromEntries(domainAnswers.map((answer) => [
    `${answer.domain_id}:${answer.question_id}`,
    answerContent(answer),
  ]));
  const completion = validateWrittenCompletion(domainQuestions, domainRules, answerMap);
  const hasContent = domainAnswers.some((answer) => Boolean(answerContent(answer)));
  const final = completion.valid && domainQuestions.every((question) =>
    domainAnswers.some((answer) => answer.question_id === question.id && answer.is_final),
  );

  return {
    status: final ? 'submitted' : hasContent ? 'draft' : 'not_started',
    hasContent,
    valid: completion.valid,
    final,
    missing: completion.missing,
  };
}

export function overallRoundOneComplete(domainStates, technicalComplete) {
  return domainStates.every((state) => state.final) && technicalComplete;
}

export function validateDomainWriteTarget({ domainId, domains, questions, answers, domainFinal }) {
  const domain = domains.find((item) => item.id === domainId);
  if (!domain) return { valid: false, code: 'DOMAIN_NOT_SELECTED' };
  if (domain.slug === 'technical') return { valid: false, code: 'TECHNICAL_DOMAIN_NOT_WRITABLE' };
  if (domainFinal) return { valid: false, code: 'DOMAIN_ALREADY_SUBMITTED' };
  if (answers.some((answer) => answer.domainId !== domainId)) return { valid: false, code: 'CROSS_DOMAIN_ANSWER' };
  const questionIds = new Set(
    questions.filter((question) => question.domainId === domainId).map((question) => question.id),
  );
  if (answers.some((answer) => !questionIds.has(answer.questionId))) {
    return { valid: false, code: 'QUESTION_NOT_APPLICABLE' };
  }
  return { valid: true };
}
