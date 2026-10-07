alter table public.media_assets
  add column preview_object_path text unique;

alter table public.content_jobs
  add column attempt_count integer not null default 0
    check (attempt_count between 0 and 3),
  add column last_error text
    check (last_error is null or length(last_error) <= 2000),
  add column next_attempt_at timestamptz not null default now(),
  add column locked_at timestamptz,
  add column lease_token uuid unique,
  add column derived_object_path text unique,
  add column processed_at timestamptz;

create index content_jobs_worker_queue_idx
  on public.content_jobs (next_attempt_at, created_at)
  where status = 'queued' and stage = 'waiting_for_worker';

drop policy "Uploaders can remove files without a media record" on storage.objects;

create policy "Uploaders can remove files without a media record"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'salon-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and not exists (
    select 1 from public.media_assets as asset
    where asset.object_path = storage.objects.name
       or asset.preview_object_path = storage.objects.name
  )
  and exists (
    select 1 from public.location_memberships as membership
    where membership.location_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
  )
);

create function public.claim_next_media_job()
returns table (
  job_id uuid,
  location_id uuid,
  media_asset_id uuid,
  uploaded_by uuid,
  object_path text,
  original_name text,
  declared_mime_type text,
  size_bytes bigint,
  attempt_count integer,
  worker_lease uuid
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  with exhausted_jobs as (
    update public.content_jobs as job
    set status = 'failed',
        stage = 'processing_failed',
        last_error = 'Processing lease expired after the maximum number of attempts.',
        locked_at = null,
        lease_token = null,
        processed_at = pg_catalog.now()
    where job.status = 'processing'
      and job.locked_at < pg_catalog.now() - interval '15 minutes'
      and job.attempt_count >= 3
    returning job.media_asset_id
  )
  update public.media_assets as asset
  set status = 'failed'
  where asset.id in (
    select exhausted_jobs.media_asset_id
    from exhausted_jobs
  );

  return query
  with candidate as (
    select job.id
    from public.content_jobs as job
    where job.attempt_count < 3
      and (
        (job.status = 'queued'
          and job.stage = 'waiting_for_worker'
          and job.next_attempt_at <= pg_catalog.now())
        or
        (job.status = 'processing'
          and job.locked_at < pg_catalog.now() - interval '15 minutes')
      )
    order by job.next_attempt_at, job.created_at
    for update skip locked
    limit 1
  ),
  claimed as (
    update public.content_jobs as job
    set status = 'processing',
        stage = 'validating_upload',
        attempt_count = job.attempt_count + 1,
        last_error = null,
        locked_at = pg_catalog.now(),
        lease_token = pg_catalog.gen_random_uuid(),
        processed_at = null
    from candidate
    where job.id = candidate.id
    returning job.id, job.location_id, job.media_asset_id, job.attempt_count, job.lease_token
  ),
  marked_assets as (
    update public.media_assets as asset
    set status = 'processing'
    from claimed
    where asset.id = claimed.media_asset_id
    returning asset.id
  )
  select
    claimed.id,
    claimed.location_id,
    claimed.media_asset_id,
    asset.uploaded_by,
    asset.object_path,
    asset.original_name,
    asset.mime_type,
    asset.size_bytes,
    claimed.attempt_count,
    claimed.lease_token
  from claimed
  join public.media_assets as asset on asset.id = claimed.media_asset_id
  join marked_assets on marked_assets.id = asset.id;
end;
$function$;

create function public.finish_media_job(
  p_job_id uuid,
  p_worker_lease uuid,
  p_preview_object_path text default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  claimed_job public.content_jobs;
  retry_job boolean;
begin
  if (p_error is null and p_preview_object_path is null)
    or (p_error is not null and p_preview_object_path is not null) then
    raise exception 'Provide exactly one of a preview path or a processing error.'
      using errcode = '22023';
  end if;

  select *
  into claimed_job
  from public.content_jobs as job
  where job.id = p_job_id
    and job.status = 'processing'
    and job.lease_token = p_worker_lease
  for update;

  if not found then
    return false;
  end if;

  if p_error is null and not exists (
    select 1
    from public.media_assets as asset
    where asset.id = claimed_job.media_asset_id
      and p_preview_object_path =
        asset.location_id::text || '/' || asset.uploaded_by::text ||
        '/derived/' || claimed_job.id::text || '.jpg'
  ) then
    raise exception 'Preview path does not match the job source.'
      using errcode = '22023';
  end if;

  retry_job := p_error is not null and claimed_job.attempt_count < 3;

  update public.content_jobs as job
  set status = case
        when p_error is null or retry_job then 'queued'
        else 'failed'
      end,
      stage = case
        when p_error is null then 'preview_ready'
        when retry_job then 'waiting_for_worker'
        else 'processing_failed'
      end,
      derived_object_path = p_preview_object_path,
      last_error = case when p_error is null then null else pg_catalog.left(p_error, 2000) end,
      next_attempt_at = case
        when retry_job then pg_catalog.now() + pg_catalog.make_interval(
          secs => 15 * pg_catalog.power(2::numeric, (claimed_job.attempt_count - 1)::numeric)::integer
        )
        else pg_catalog.now()
      end,
      locked_at = null,
      lease_token = null,
      processed_at = case when p_error is null or not retry_job then pg_catalog.now() else null end
  where job.id = claimed_job.id;

  update public.media_assets as asset
  set preview_object_path = case when p_error is null then p_preview_object_path else asset.preview_object_path end,
      status = case
        when p_error is null then 'ready'
        when retry_job then 'processing'
        else 'failed'
      end
  where asset.id = claimed_job.media_asset_id;

  return true;
end;
$function$;

revoke all on function public.claim_next_media_job() from public, anon, authenticated;
revoke all on function public.finish_media_job(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_next_media_job() to service_role;
grant execute on function public.finish_media_job(uuid, uuid, text, text) to service_role;