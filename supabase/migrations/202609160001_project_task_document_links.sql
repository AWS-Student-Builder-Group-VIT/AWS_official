ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS task_document_url TEXT;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_task_document_url_http_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_task_document_url_http_check
  CHECK (task_document_url IS NULL OR task_document_url ~ '^https?://');

COMMENT ON COLUMN public.projects.task_document_url IS
  'Optional public or organization-accessible Word/Drive/SharePoint document containing the full project task.';
