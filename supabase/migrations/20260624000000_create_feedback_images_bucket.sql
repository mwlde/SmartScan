-- Creates the feedback-images Storage bucket and sets access policies.
-- Bucket is public (public URLs work for reads without auth).
-- Both anon and authenticated users can upload (guests submit feedback too).

insert into storage.buckets (id, name, public)
values ('feedback-images', 'feedback-images', true)
on conflict (id) do nothing;

-- Public read: anyone can download / fetch public URLs
create policy "public read feedback images"
  on storage.objects for select
  to public
  using (bucket_id = 'feedback-images');

-- Anon + authenticated upload (no delete/update — write-once)
create policy "anyone can upload feedback images"
  on storage.objects for insert
  to public
  with check (bucket_id = 'feedback-images');
