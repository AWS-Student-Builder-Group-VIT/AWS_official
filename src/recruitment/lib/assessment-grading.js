export function isAssessmentAnswerCorrect(type, answer, correctAnswers) {
  if (answer == null) return false;
  const normalize = (value) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  if (type === 'short_answer') {
    const response = normalize(Array.isArray(answer) ? answer.join(' ') : answer);
    return correctAnswers.some((accepted) => response.includes(normalize(accepted)));
  }
  const submitted = (Array.isArray(answer) ? answer : [answer]).map(normalize).sort();
  const expected = correctAnswers.map(normalize).sort();
  return submitted.length === expected.length && submitted.every((value, index) => value === expected[index]);
}
