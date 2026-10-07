alter table public.content_jobs
  add column generated_object_path text unique,
  add column reviewed_by uuid references auth.users(id),
  add column reviewed_at timestamptz,
  add column review_note text;

create table public.content_job_reviews (
  id uuid primary key default gen_random_uuid(),
  content_job_id uuid not null references public.content_jobs(id) on delete cascade,
  generated_object_path text not null,
  reviewer_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approved', 'rejected', 'changes_requested')),
  note text,
  created_at timestamptz not null default now(),
  check (
    decision = 'approved'
    or (note is not null and length(btrim(note)) > 0)
  ),
  check (note is null or length(note) <= 1000)
);

create index content_job_reviews_job_created_idx
  on public.content_job_reviews (content_job_id, created_at desc);

alter table public.content_job_reviews enable row level security;

revoke all on table public.content_job_reviews from anon, authenticated;
grant select on table public.content_job_reviews to authenticated;

create policy "Leadership can read reviews for assigned locations"
on public.content_job_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.content_jobs cj
    join public.location_memberships lm on lm.location_id = cj.location_id
    where cj.id = content_job_reviews.content_job_id
      and lm.user_id = (select auth.uid())
      and lm.role = 'leadership'
  )
);

create function public.review_content_job(
  p_job_id uuid,
  p_decision text,
  p_note text default null
)
returns public.content_jobs
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_job public.content_jobs;
  normalized_note text := nullif(pg_catalog.btrim(p_note), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to review a job.'
      using errcode = '42501';
  end if;

  if p_decision is null or p_decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'Unsupported review decision.'
      using errcode = '22023';
  end if;

  if p_decision in ('rejected', 'changes_requested') and normalized_note is null then
    raise exception 'Provide a reason when rejecting or requesting changes.'
      using errcode = '22023';
  end if;

  if normalized_note is not null and pg_catalog.length(normalized_note) > 1000 then
    raise exception 'Review notes must be 1000 characters or fewer.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.content_jobs cj
    join public.location_memberships lm on lm.location_id = cj.location_id
    where cj.id = p_job_id
      and lm.user_id = auth.uid()
      and lm.role = 'leadership'
  ) then
    raise exception 'You do not have leadership access to this job.'
      using errcode = '42501';
  end if;

  select *
  into current_job
  from public.content_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Content job was not found.'
      using errcode = 'P0002';
  end if;

  if current_job.status <> 'ready_for_review' or current_job.generated_object_path is null then
    raise exception 'This job does not have a generated video ready for review.'
      using errcode = '55000';
  end if;

  update public.content_jobs
  set status = case p_decision
        when 'approved' then 'approved'
        when 'rejected' then 'rejected'
        else 'queued'
      end,
      stage = case p_decision
        when 'approved' then 'approved_for_manual_export'
        when 'rejected' then 'rejected_by_leadership'
        else 'review_changes_requested'
      end,
      reviewed_by = auth.uid(),
      reviewed_at = pg_catalog.now(),
      review_note = normalized_note
  where id = p_job_id
  returning * into current_job;

  insert into public.content_job_reviews (content_job_id, generated_object_path, reviewer_id, decision, note)
  values (p_job_id, current_job.generated_object_path, auth.uid(), p_decision, normalized_note);

  return current_job;
end;
$function$;

revoke all on function public.review_content_job(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_content_job(uuid, text, text) to authenticated;