function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function isAssessmentAnswerCorrect(type: string, answer: string | string[] | undefined, correctAnswers: string[]) {
  if (answer == null) return false;
  if (type === 'short_answer') {
    const response = normalize(Array.isArray(answer) ? answer.join(' ') : answer);
    return correctAnswers.some((accepted) => response.includes(normalize(accepted)));
  }
  const submitted = (Array.isArray(answer) ? answer : [answer]).map(normalize).sort();
  const expected = correctAnswers.map(normalize).sort();
  return submitted.length === expected.length && submitted.every((value, index) => value === expected[index]);
}
