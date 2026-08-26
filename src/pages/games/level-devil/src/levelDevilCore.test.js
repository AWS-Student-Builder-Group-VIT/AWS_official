import { describe, expect, test } from 'vitest';
import { buildCompletionPayload, completeLevel, consumeAttempt, createState, enterLevel, pointsForAttempt, restoreState, serializeState } from './levelDevilCore.js';

const create=(options={})=>createState({now:1000,attemptId:'id',...options});
describe('level devil core', () => {
  test('scores seven attempts', () => expect([1,2,3,4,5,6,7].map(pointsForAttempt)).toEqual([10,10,10,9,8,7,6]));
  test('death and restart consume attempts', () => { let s=consumeAttempt(enterLevel(create()),'death',2000); expect(s.currentAttempt).toBe(2); s=consumeAttempt(enterLevel(s),'restart',3000); expect(s.currentAttempt).toBe(3); });
  test('seventh failure locks the official run', () => { let s=enterLevel(create()); for(let i=0;i<7;i++)s=consumeAttempt(s,'death',2000+i); expect(s.status).toBe('failed'); expect(s.failedLevel).toBe(1); });
  test('five first-attempt clears score fifty', () => { let s=create(); for(let i=0;i<5;i++)s=completeLevel(enterLevel(s),2000+i); expect(buildCompletionPayload(s).score).toBe(50); });
  test('reload consumes an active attempt while practice never locks', () => { expect(restoreState(serializeState(enterLevel(create())),9000).currentAttempt).toBe(2); let s=create({official:false,level:4}); for(let i=0;i<9;i++)s=consumeAttempt(enterLevel(s),'death',2000+i); expect(s.status).toBe('active'); });
});
