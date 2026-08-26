import { describe, expect, test } from 'vitest';
import { buildCompletionPayload, buildQuestionSet, closeChart, createState, encodeMorse, openChart, pointsForRemaining, restoreState, serializeState, submitAnswer, syncState } from './morseCore.js';

const create=(options={})=>createState({random:()=>0,attemptId:'id',...options});
describe('morse core', () => {
  test('encodes and builds progressive questions', () => { expect(encodeMorse('AWS')).toBe('.- .-- ...'); expect(buildQuestionSet(()=>0).map(q=>q.answer)).toEqual(['E','A','AWS','API','CODE']); });
  test('scores absolute timer boundaries', () => expect([15000,11249,7499,3749,0].map(pointsForRemaining)).toEqual([10,9,8,7,0]));
  test('retries wrong answers and times out', () => { expect(submitAnswer(create({now:1000}),'T',2000).state.questionIndex).toBe(0); expect(syncState(create({now:1000}),16000).questionIndex).toBe(1); });
  test('limits reference opens to two', () => { let s=create({now:1000}); s=closeChart(openChart(s,2000),3000); s=closeChart(openChart(s,4000),5000); expect(openChart(s,6000).chartOpenedAt).toBeNull(); });
  test('restores valid state and completes five answers', () => { let s=create({now:0}); expect(restoreState(serializeState(s),1).attemptId).toBe('id'); for(const q of s.questions)s=submitAnswer(s,q.answer,(s.questionStartedAt||0)+1000).state; expect(buildCompletionPayload(s).score).toBe(50); });
});
