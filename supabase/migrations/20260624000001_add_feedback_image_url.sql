-- Adds image_url to the feedback table.
-- Nullable: older rows and submissions where the upload failed carry NULL.
alter table feedback
  add column if not exists image_url text;
