import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateCsvRow } from './admin-export.mjs';

test('exports unlimited choices and written answers', () => {
  const row = candidateCsvRow({
    profile: { registration_number: '22BCE1234', full_name: 'Candidate' },
    choices: ['Technical / Web', 'Events / Operations & Execution', 'Finance'],
    writtenAnswers: [
      {
        domain: 'Finance',
        prompt: 'Why do you want to join this club?',
        answer: 'I enjoy budgeting.',
        links: [],
      },
    ],
  });

  assert.match(row.choices, /Technical \/ Web \| Events \/ Operations & Execution \| Finance/);
  assert.match(row.written_responses, /Finance.*I enjoy budgeting/);
});

test('keeps links and multiline responses in one export field', () => {
  const row = candidateCsvRow({
    profile: { registration_number: '22BCE1234', full_name: 'Candidate' },
    choices: ['Design / UI/UX Design'],
    writtenAnswers: [{
      domain: 'Design',
      prompt: 'HackQuest landing page',
      answer: 'First line\nSecond line',
      links: ['https://example.com/design'],
    }],
  });

  assert.equal(row.written_responses, 'Design — HackQuest landing page: First line Second line [https://example.com/design]');
});
