begin;

select plan(26);

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

select * from finish();
rollback;
