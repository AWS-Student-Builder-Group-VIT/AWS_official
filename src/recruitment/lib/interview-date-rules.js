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
