import { validateWrittenCompletion } from './written-question-rules.mjs';

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
