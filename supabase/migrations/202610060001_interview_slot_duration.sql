-- Migration: add slot_duration_minutes to interview_slots
-- Allows each interview slot to carry its own duration (set by admin manually).
-- Existing slots default to 30 minutes.

ALTER TABLE interview_slots
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30;
