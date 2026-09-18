-- Candidates could write straight to these tables with their own login,
-- bypassing the API: give themselves marks, mark themselves qualified or
-- selected, extend their test timer, or submit answers after the deadline.
-- All Round 1 writes go through the server (service role, not affected by
-- RLS), so candidates only need to READ their own rows, plus autosave answers
-- while their own test is running.

-- 1. Remove every candidate policy on these tables. Admin policies (the ones
--    calling is_recruitment_admin) are left untouched.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('candidate_profiles', 'assessment_attempts', 'assessment_answers', 'candidate_written_answers')
      AND coalesce(qual, '') NOT ILIKE '%is_recruitment_admin%'
      AND coalesce(with_check, '') NOT ILIKE '%is_recruitment_admin%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2. Candidates read their own data.
CREATE POLICY candidates_read_own_profile ON public.candidate_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY candidates_read_own_attempts ON public.assessment_attempts
  FOR SELECT TO authenticated USING (candidate_id = auth.uid());

CREATE POLICY candidates_read_own_written_answers ON public.candidate_written_answers
  FOR SELECT TO authenticated USING (candidate_id = auth.uid());

CREATE POLICY candidates_read_own_test_answers ON public.assessment_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assessment_attempts a WHERE a.id = attempt_id AND a.candidate_id = auth.uid()));

-- 3. Autosave: only into their own test, only while it is running and its
--    timer (plus one minute) has not run out. Grading uses what is sent on
--    submit, so these rows cannot change a score.
CREATE POLICY candidates_autosave_test_answers ON public.assessment_answers
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessment_attempts a
    WHERE a.id = attempt_id AND a.candidate_id = auth.uid() AND a.status = 'in_progress'
      AND now() <= a.started_at + make_interval(secs => a.time_limit_seconds + 60)
  ));

CREATE POLICY candidates_autosave_update_test_answers ON public.assessment_answers
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_attempts a
    WHERE a.id = attempt_id AND a.candidate_id = auth.uid() AND a.status = 'in_progress'
      AND now() <= a.started_at + make_interval(secs => a.time_limit_seconds + 60)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessment_attempts a
    WHERE a.id = attempt_id AND a.candidate_id = auth.uid() AND a.status = 'in_progress'
      AND now() <= a.started_at + make_interval(secs => a.time_limit_seconds + 60)
  ));

NOTIFY pgrst, 'reload schema';
