-- MVP schema adjustments based on live preflight (2026-11-12).
-- Preserves existing rows. Sensitive access is handled separately in 0013.
BEGIN;

-- Written detail may be omitted only when the intake flow has verified evidence.
-- The database keeps meaningful text when present; the server validates that
-- each new complaint has either meaningful detail or a verified attachment.
ALTER TABLE public.complaints
  ALTER COLUMN description DROP NOT NULL;

ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_description_min_length;

ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_description_min_length
  CHECK (description IS NULL OR char_length(btrim(description)) >= 20);

-- Keep the existing PDF/photo MIME types and add the approved short-voice types.
ALTER TABLE public.complaint_attachments
  DROP CONSTRAINT IF EXISTS attachments_allowed_mime;

ALTER TABLE public.complaint_attachments
  ADD CONSTRAINT attachments_allowed_mime
  CHECK (mime_type IN (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/ogg',
    'audio/webm',
    'audio/mp4',
    'audio/mpeg'
  ));

-- The first release is education-focused; preserve referenced rows but hide
-- the housing/dining/campus-life category from new student submissions.
UPDATE public.complaint_categories
SET is_active = false
WHERE code = 'STUD_SERV'
  AND is_active = true;

-- Record this migration here so it can also be applied from SQL Editor.
INSERT INTO public.schema_migrations (filename)
VALUES ('0012_mvp_optional_evidence.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
