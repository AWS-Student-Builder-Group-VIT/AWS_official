-- Assessment marks remain private until an administrator explicitly releases them.
ALTER TABLE public.assessment_attempts
  ADD COLUMN IF NOT EXISTS results_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS results_released_by uuid REFERENCES public.admin_users(id);

NOTIFY pgrst, 'reload schema';
