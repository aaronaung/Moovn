alter table templates add column latest_design_hash text;
create index templates_latest_design_hash_index on templates (id, latest_design_hash);