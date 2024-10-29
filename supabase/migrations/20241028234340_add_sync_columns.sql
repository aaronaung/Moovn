alter table sources add column last_synced timestamp with time zone;
alter table sources add column sync_error text;