import { describe, expect, test } from 'vitest';
import data from '../wordList.json';
import { createAttempt, evaluateGuess, finalizeCompletedState, normalizeWordData, scoreForAttempt, submitGuess } from './wordleCore.js';

describe('wordle core', () => {
  test('scores rows and losses', () => expect([1,2,3,4,5,6].map(n => scoreForAttempt(n, true))).toEqual([100,90,80,70,60,50]));
  test('handles repeated letters', () => expect(evaluateGuess('PEEPS', 'SHEEP')).toEqual(['present','present','correct','absent','present']));
  test('rejects invalid guesses without consuming a row', () => expect(submitGuess({answer:'CLOUD',guesses:[],status:'active',score:null}, 'CLO', new Set(['CLOUD'])).error).toBe('Not enough letters'));
  test('locks solved attempts', () => { const r=submitGuess({answer:'CLOUD',guesses:['STORM'],status:'active',score:null},'CLOUD',new Set(['CLOUD','STORM'])); expect(r.state.score).toBe(90); expect(submitGuess(r.state,'CLOUD',new Set(['CLOUD'])).error).toBe('Attempt already completed'); });
  test('retains persisted metadata and word corpus', () => { const state=createAttempt(['CLOUD'],()=>0,()=> 'start','id'); expect(finalizeCompletedState({...state,status:'won'},()=> 'end').completedAt).toBe('end'); const words=normalizeWordData(data); expect(words.solutions).toHaveLength(2309); expect(words.validWords.size).toBe(12947); });
});
