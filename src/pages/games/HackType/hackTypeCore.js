export const GAME_TIME_MS = 60000;
export const TOTAL_ATTEMPTS = 5;
export const STORAGE_KEY = 'aws-hack-type:v1';
export const WORD_SETS = [
  ['aws','cloud','server','storage','compute','network','region','bucket','instance','lambda','backup','security','database','serverless'],
  ['ec2','s3','iam','vpc','cloudfront','dynamodb','route53','cloudwatch','elasticache','fargate'],
  ['architecture','availability','scalability','encryption','observability','containerization'],
  ['orchestration','infrastructure','microservices','authentication','optimization','resilience'],
  ['distributed','serverless','sustainability','transformation','machinelearning','cybersecurity'],
];
export function calculateStats({ correctCharacters, incorrectCharacters, elapsedMs }) {
  const minutes = Math.max(elapsedMs / 60000, 0.001);
  const wpm = Math.round((correctCharacters / 5) / minutes);
  const accuracy = correctCharacters + incorrectCharacters === 0 ? 100 : Math.round((correctCharacters / (correctCharacters + incorrectCharacters)) * 1000) / 10;
  return { wpm, accuracy, score: Math.round(wpm * (accuracy / 100) * 10) / 10 };
}
export function createAttempt(attempt = 1) { return { version: 1, attempt, results: [], completed: false }; }
export function restoreState(raw) { try { const state = JSON.parse(raw); return state?.version === 1 && state.attempt >= 1 && state.attempt <= TOTAL_ATTEMPTS ? state : createAttempt(); } catch { return createAttempt(); } }
