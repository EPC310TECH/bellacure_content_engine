begin;

select plan(57);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.salon_accounts'::regclass),
  'salon_accounts has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.locations'::regclass),
  'locations has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.location_memberships'::regclass),
  'location_memberships has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.media_assets'::regclass),
  'media_assets has row-level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.content_jobs'::regclass),
  'content_jobs has row-level security enabled'
);
select ok(
  not has_table_privilege('anon', 'public.media_assets', 'SELECT'),
  'anonymous users cannot read media metadata'
);
select ok(
  not has_table_privilege('anon', 'public.media_assets', 'INSERT'),
  'anonymous users cannot insert media metadata'
);
select ok(
  has_table_privilege('authenticated', 'public.media_assets', 'SELECT'),
  'authenticated users can select media subject to RLS'
);
select ok(
  has_column_privilege('authenticated', 'public.media_assets', 'object_path', 'INSERT'),
  'authenticated users can insert approved media columns'
);
select ok(
  not has_column_privilege('authenticated', 'public.media_assets', 'status', 'INSERT'),
  'authenticated users cannot set media processing state'
);
select ok(
  not has_table_privilege('authenticated', 'public.media_assets', 'UPDATE'),
  'authenticated users cannot update media metadata'
);
select ok(
  not has_table_privilege('authenticated', 'public.media_assets', 'DELETE'),
  'authenticated users cannot delete media metadata'
);
select ok(
  has_column_privilege('authenticated', 'public.content_jobs', 'created_by', 'INSERT'),
  'authenticated users can create a queue record'
);
select ok(
  not has_column_privilege('authenticated', 'public.content_jobs', 'status', 'INSERT'),
  'authenticated users cannot set queue state'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_jobs', 'UPDATE'),
  'authenticated users cannot change queue state'
);
select ok(
  not (select public from storage.buckets where id = 'salon-media'),
  'salon media bucket is private'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.content_job_reviews'::regclass),
  'content_job_reviews has row-level security enabled'
);
select ok(
  not has_table_privilege('anon', 'public.content_job_reviews', 'SELECT'),
  'anonymous users cannot read review history'
);
select ok(
  has_table_privilege('authenticated', 'public.content_job_reviews', 'SELECT'),
  'authenticated users can read review history subject to RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_job_reviews', 'INSERT'),
  'clients cannot write review history directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_job_reviews', 'UPDATE'),
  'clients cannot change review history'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_job_reviews', 'DELETE'),
  'clients cannot delete review history'
);
select ok(
  has_function_privilege('authenticated', 'public.review_content_job(uuid,text,text)', 'EXECUTE'),
  'authenticated users can submit review decisions through the guarded function'
);
select ok(
  not has_function_privilege('anon', 'public.review_content_job(uuid,text,text)', 'EXECUTE'),
  'anonymous users cannot submit review decisions'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.review_content_job(uuid,text,text)'::regprocedure),
  'review function runs with its owner privileges for an atomic audit write'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_jobs', 'UPDATE'),
  'clients cannot change job state outside the guarded review function'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.content_schedule_entries'::regclass),
  'content_schedule_entries has row-level security enabled'
);
select ok(
  not has_table_privilege('anon', 'public.content_schedule_entries', 'SELECT'),
  'anonymous users cannot read content schedules'
);
select ok(
  has_table_privilege('authenticated', 'public.content_schedule_entries', 'SELECT'),
  'authenticated users can read schedules subject to location RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.content_schedule_entries', 'INSERT'),
  'clients cannot insert schedule entries directly'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.add_shared_content_schedule_entry(uuid,date,text,text,text,text,date,text,text,text,text[],text,text[],text)',
    'EXECUTE'
  ),
  'authenticated users can add shared themes through the guarded function'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.add_shared_content_schedule_entry(uuid,date,text,text,text,text,date,text,text,text,text[],text,text[],text)',
    'EXECUTE'
  ),
  'anonymous users cannot add shared themes'
);
select ok(
  not exists (
    select 1
    from pg_proc as proc
    cross join lateral pg_catalog.aclexplode(coalesce(
      proc.proacl,
      pg_catalog.acldefault('f', proc.proowner)
    )) as privilege
    where proc.oid = 'public.add_shared_content_schedule_entry(uuid,date,text,text,text,text,date,text,text,text,text[],text,text[],text)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'the shared-theme function is not executable by PUBLIC'
);
select ok(
  (select prosecdef
   from pg_proc
   where oid = 'public.add_shared_content_schedule_entry(uuid,date,text,text,text,text,date,text,text,text,text[],text,text[],text)'::regprocedure),
  'the shared-theme function inserts the seven-location schedule atomically'
);
select ok(
  (select exists (
     select 1
     from pg_catalog.unnest(proconfig) as setting(value)
     where setting.value in ('search_path=', 'search_path=""')
   )
   from pg_proc
   where oid = 'public.add_shared_content_schedule_entry(uuid,date,text,text,text,text,date,text,text,text,text[],text,text[],text)'::regprocedure),
  'the shared-theme function uses an empty search path'
);
select has_column('public', 'content_schedule_entries', 'approx_date', 'schedule stores an approximate cultural date');
select has_column('public', 'content_schedule_entries', 'theme_name', 'schedule stores its editorial theme');
select has_column('public', 'content_schedule_entries', 'content_style_name', 'schedule stores its content style');
select has_column('public', 'content_schedule_entries', 'content_hook', 'schedule stores its content hook');
select has_column('public', 'content_schedule_entries', 'event_anchors', 'schedule stores event anchors');
select has_column('public', 'content_schedule_entries', 'research_window', 'schedule stores a research window');
select has_column('public', 'content_schedule_entries', 'research_prompts', 'schedule stores research prompts');
select has_column('public', 'content_schedule_entries', 'timing_note', 'schedule stores optional timing notes');
select has_column('public', 'media_assets', 'preview_object_path', 'processed previews have a separate private object path');
select has_column('public', 'content_jobs', 'attempt_count', 'processing jobs track retry attempts');
select has_column('public', 'content_jobs', 'last_error', 'processing jobs retain their latest error');
select has_column('public', 'content_jobs', 'next_attempt_at', 'processing retries can be delayed');
select has_column('public', 'content_jobs', 'locked_at', 'processing jobs track lease time');
select has_column('public', 'content_jobs', 'lease_token', 'processing jobs are protected by lease tokens');
select has_column('public', 'content_jobs', 'derived_object_path', 'processing jobs track preview output separately from generated video');
select has_column('public', 'content_jobs', 'processed_at', 'processing completion time is recorded');
select ok(
  has_function_privilege('service_role', 'public.claim_next_media_job()', 'EXECUTE'),
  'only the worker service role can claim media jobs'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_next_media_job()', 'EXECUTE'),
  'authenticated users cannot claim media jobs'
);
select ok(
  has_function_privilege('service_role', 'public.finish_media_job(uuid,uuid,text,text)', 'EXECUTE'),
  'the worker service role can finalize media jobs'
);
select ok(
  not has_function_privilege('anon', 'public.finish_media_job(uuid,uuid,text,text)', 'EXECUTE'),
  'anonymous users cannot finalize media jobs'
);
select ok(
  not has_function_privilege('authenticated', 'public.finish_media_job(uuid,uuid,text,text)', 'EXECUTE'),
  'authenticated users cannot finalize media jobs'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Uploaders can remove files without a media record'
      and cmd = 'DELETE'
      and qual ilike '%preview_object_path%'
  ),
  'users cannot delete a preview linked to a media asset'
);
select * from finish();
rollback;
