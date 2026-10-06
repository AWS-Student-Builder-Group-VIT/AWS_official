export function canManageInterviewDate(interviewDate) {
  return !(interviewDate.slots ?? []).some((slot) => slot.is_booked || slot.status === 'reserved' || slot.status === 'booked');
}

export function createInterviewSlotRows(dateId, schedule) {
  const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
  const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const duration = Number(schedule.slot_duration_minutes);
  const slots = [];

  for (let minutes = start; minutes < end; minutes += duration) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    slots.push({ date_id: dateId, slot_time: `${hours}:${mins}:00` });
  }

  return slots;
}

/**
 * Creates slot rows from a manually defined list of {slot_time, duration_minutes}.
 * Allows each slot to have its own time and duration rather than being auto-generated.
 */
export function createManualSlotRows(dateId, manualSlots) {
  return manualSlots
    .filter((s) => s.slot_time && s.slot_time.trim())
    .map((s) => ({
      date_id: dateId,
      slot_time: s.slot_time.length === 5 ? `${s.slot_time}:00` : s.slot_time,
      slot_duration_minutes: Number(s.duration_minutes) || 30,
    }));
}
