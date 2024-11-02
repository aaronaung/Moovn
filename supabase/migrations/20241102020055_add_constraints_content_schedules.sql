alter table content_schedules drop constraint content_schedules_content_id_fkey;
alter table content_schedules add constraint content_schedules_content_id_fkey foreign key (content_id) references content(id) on delete cascade;

-- content_schedules and content are 1 to 1 relationship; no one content can have multiple schedules.
create unique index if not exists content_schedules_content_id_index on content_schedules (content_id);