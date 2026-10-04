import assert from 'node:assert/strict';
import test from 'node:test';

import { canManageInterviewDate, createInterviewSlotRows } from './interview-date-rules.js';

test('allows editing and removal only when an interview date has no booked slots', () => {
  assert.equal(canManageInterviewDate({ slots: [] }), true);
  assert.equal(canManageInterviewDate({ slots: [{ is_booked: false, status: 'available' }] }), true);
  assert.equal(canManageInterviewDate({ slots: [{ is_booked: true, status: 'booked' }] }), false);
  assert.equal(canManageInterviewDate({ slots: [{ is_booked: false, status: 'reserved' }] }), false);
});

test('builds replacement slot rows from the edited schedule', () => {
  assert.deepEqual(
    createInterviewSlotRows('date-1', { start_time: '10:00', end_time: '10:45', slot_duration_minutes: 15 }),
    [
      { date_id: 'date-1', slot_time: '10:00:00' },
      { date_id: 'date-1', slot_time: '10:15:00' },
      { date_id: 'date-1', slot_time: '10:30:00' },
    ],
  );
});
