-- Per-subdomain instructions for project and interview rounds.
CREATE TABLE IF NOT EXISTS public.subdomain_round_guidelines (
  subdomain_id uuid NOT NULL REFERENCES public.subdomains(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number IN (2, 3)),
  guidelines text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.admin_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subdomain_id, round_number)
);

ALTER TABLE public.subdomain_round_guidelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_manage_round_guidelines ON public.subdomain_round_guidelines;
CREATE POLICY admin_manage_round_guidelines
ON public.subdomain_round_guidelines FOR ALL TO authenticated
USING (public.is_recruitment_admin())
WITH CHECK (public.is_recruitment_admin());

DROP POLICY IF EXISTS candidates_read_selected_round_guidelines ON public.subdomain_round_guidelines;
CREATE POLICY candidates_read_selected_round_guidelines
ON public.subdomain_round_guidelines FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.candidate_subdomain_choices c
    WHERE c.candidate_id = auth.uid()
      AND c.subdomain_id = subdomain_round_guidelines.subdomain_id
  )
);

-- A candidate profile always keeps the email belonging to its signed-in account.
CREATE OR REPLACE FUNCTION public.enforce_candidate_auth_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id THEN
    NEW.email := COALESCE(auth.jwt()->>'email', NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_candidate_auth_email ON public.candidate_profiles;
CREATE TRIGGER trg_candidate_auth_email
BEFORE INSERT OR UPDATE OF email ON public.candidate_profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_candidate_auth_email();

NOTIFY pgrst, 'reload schema';
