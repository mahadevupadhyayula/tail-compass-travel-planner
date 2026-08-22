begin;

alter table public.generation_jobs
  add column if not exists html_path text;

update storage.buckets
set allowed_mime_types = array['application/pdf','text/html','image/jpeg','image/png','image/webp']
where id = 'generated-itineraries';

commit;

-- Compensating rollback: stop HTML-producing workflows, preserve existing
-- objects, then drop generation_jobs.html_path only after exporting its values.
