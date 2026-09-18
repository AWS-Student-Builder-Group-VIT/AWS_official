-- Per-domain Round 1 decision for domains without a Technical assessment
-- (Events, Design, Publicity, ...). Technical tracks keep using
-- assessment_attempts.admin_qualified. Candidates can only read this table,
-- so they cannot set their own decision.
ALTER TABLE public.candidate_subdomain_choices
  ADD COLUMN IF NOT EXISTS admin_qualified boolean;

NOTIFY pgrst, 'reload schema';
