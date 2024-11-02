alter table content_schedules 
  add column status text,
  add column published_at timestamp with time zone,
  add column result jsonb;

drop table published_content;