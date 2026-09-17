-- Round 2: technical project assignments.

-- 1. Project rows include evaluator-only judging criteria. This policy let anyone,
--    even without signing in, read every active project in full. Candidates now
--    receive only their own brief, and only its candidate-facing fields, through
--    the server. Admins keep access through the admin_projects policy.
DROP POLICY IF EXISTS "public_projects" ON public.projects;

-- 2. Submissions are written only through the server, which validates the GitHub
--    URL and refuses anything after the deadline. Candidates may still read theirs.
DROP POLICY IF EXISTS "candidates_own_submission" ON public.project_submissions;
DROP POLICY IF EXISTS candidates_read_own_submission ON public.project_submissions;
CREATE POLICY candidates_read_own_submission ON public.project_submissions
  FOR SELECT USING (auth.uid() = candidate_id);

-- 3. One project per candidate per Technical track. The deadline is a single
--    admin setting read live, so an assignment no longer needs its own.
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS subdomain_id uuid REFERENCES public.subdomains(id);
ALTER TABLE public.project_assignments ALTER COLUMN deadline DROP NOT NULL;
ALTER TABLE public.project_assignments DROP CONSTRAINT IF EXISTS project_assignments_candidate_id_key;
ALTER TABLE public.project_assignments DROP CONSTRAINT IF EXISTS project_assignments_candidate_id_subdomain_id_key;
ALTER TABLE public.project_assignments
  ADD CONSTRAINT project_assignments_candidate_id_subdomain_id_key UNIQUE (candidate_id, subdomain_id);

-- 4. The Round 2 submission deadline, set from the admin Settings page.
INSERT INTO public.recruitment_settings (key, value)
VALUES ('round_1_deadline_at', '{"at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
