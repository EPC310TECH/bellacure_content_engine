create table public.content_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  cycle_number integer not null check (cycle_number between 1 and 18),
  scheduled_for date not null,
  season text not null check (season in ('Fall', 'Winter', 'Spring', 'Summer')),
  style_name text not null,
  technique_and_finish text not null,
  color_palette text not null,
  created_at timestamptz not null default now(),
  unique (location_id, cycle_number)
);

create index content_schedule_location_date_idx
  on public.content_schedule_entries (location_id, scheduled_for);

alter table public.content_schedule_entries enable row level security;

revoke all on table public.content_schedule_entries from anon, authenticated;
grant select on table public.content_schedule_entries to authenticated;

create policy "Location members can read content schedules"
on public.content_schedule_entries for select
to authenticated
using (
  exists (
    select 1
    from public.location_memberships lm
    where lm.location_id = content_schedule_entries.location_id
      and lm.user_id = (select auth.uid())
  )
);