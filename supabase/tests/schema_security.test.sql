begin;

select plan(16);

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

select * from finish();
rollback;
