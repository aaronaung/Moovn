--- schedule job
CREATE OR REPLACE FUNCTION schedule_content_publish(
  content_id UUID, 
  publish_content_function_url TEXT,
  api_key TEXT,
  cron_schedule TEXT
) RETURNS INT AS $$
DECLARE
  job_id INT;
  job_sql TEXT;
BEGIN
  job_sql := format(
    'SELECT net.http_post(
      %L::text,
      json_build_object(''content_id'', ''%s'')::jsonb,
      ''{
        "Content-Type": "application/json",
        "Authorization": "Bearer %s"
      }''::jsonb
    )',
    publish_content_function_url,
    api_key,
    content_id
  );

  -- Schedule the job with the provided cron schedule
  SELECT cron.schedule(cron_schedule, job_sql) INTO job_id;

  -- Insert the job_id and content_id into the publish_content_jobs table
  INSERT INTO public."publish_content_jobs" (content_id, job_id) VALUES (content_id, job_id);

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;


--- unschedule job
CREATE OR REPLACE FUNCTION unschedule_job(job_id INT) RETURNS VOID AS $$
BEGIN
  PERFORM cron.unschedule(job_id);
END;
$$ LANGUAGE plpgsql;

create table public."publish_content_jobs"(
  "content_id" uuid not null references "public"."content" ("id") on delete cascade,
  "job_id" int not null references "cron"."jobs" ("id") on delete cascade
)

--- schedule job to run once
CREATE OR REPLACE FUNCTION schedule_content_publish_run_once(
  content_id UUID, 
  publish_content_function_url TEXT,
  api_key TEXT,
  date_time TEXT
) RETURNS INT AS $$
DECLARE
  job_id INT;
  job_sql TEXT;
  job_name TEXT;
BEGIN
  job_name := format('one_timepublish%s_%s', content_id, date_time);

  job_sql := format(
    'SELECT net.http_post(
      %L::text,
      json_build_object(''content_id'', ''%s'')::jsonb,
      ''{
        "Content-Type": "application/json",
        "Authorization": "Bearer %s"
      }''::jsonb
    );

    SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = ''%s'';
    ',
    publish_content_function_url,
    content_id,
    api_key,
    job_name
  );

  -- Schedule the job with the provided cron schedule
  SELECT cron.schedule(job_name, date_time, job_sql) INTO job_id;


  -- Insert the job_id and content_id into the publish_content_jobs table
  INSERT INTO public."publish_content_jobs" (content_id, job_id) VALUES (content_id::uuid, job_id);

  RETURN job_id;
END;
$$ LANGUAGE plpgsql;

select schedule_content_publish_run_once('52e5f28c-556a-4f77-aef9-9452ebe0ca90', 'http://kong:8000/functions/v1/publish-content', 'apikey', '* * * * *');

select * from cron.job_run_details where jobid = 38;