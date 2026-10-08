alter table public.content_schedule_entries
  drop constraint content_schedule_entries_cycle_number_check,
  add constraint content_schedule_entries_cycle_number_check
    check (cycle_number > 0);

create function public.add_shared_content_schedule_entry(
  p_location_id uuid,
  p_scheduled_for date,
  p_season text,
  p_style_name text,
  p_technique_and_finish text,
  p_color_palette text,
  p_approx_date date default null,
  p_theme_name text default null,
  p_content_style_name text default null,
  p_content_hook text default null,
  p_event_anchors text[] default null,
  p_research_window text default null,
  p_research_prompts text[] default null,
  p_timing_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_account_id uuid;
  v_cycle_number integer;
  v_inserted_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to add a content theme.'
      using errcode = '42501';
  end if;

  if p_season is null or p_season not in ('Fall', 'Winter', 'Spring', 'Summer') then
    raise exception 'Choose a valid season.'
      using errcode = '22023';
  end if;

  if p_scheduled_for is null
    or nullif(pg_catalog.btrim(p_theme_name), '') is null
    or nullif(pg_catalog.btrim(p_style_name), '') is null
    or nullif(pg_catalog.btrim(p_technique_and_finish), '') is null
    or nullif(pg_catalog.btrim(p_color_palette), '') is null then
    raise exception 'Date, theme name, nail style, technique, and color palette are required.'
      using errcode = '22023';
  end if;

  if pg_catalog.length(p_theme_name) > 120
    or pg_catalog.length(p_style_name) > 160
    or pg_catalog.length(p_technique_and_finish) > 300
    or pg_catalog.length(p_color_palette) > 200
    or pg_catalog.length(coalesce(p_content_style_name, '')) > 160
    or pg_catalog.length(coalesce(p_content_hook, '')) > 500
    or pg_catalog.length(coalesce(p_research_window, '')) > 120
    or pg_catalog.length(coalesce(p_timing_note, '')) > 1000 then
    raise exception 'One or more theme fields exceed their allowed length.'
      using errcode = '22023';
  end if;

  if coalesce(pg_catalog.cardinality(p_event_anchors), 0) > 10
    or exists (
      select 1
      from pg_catalog.unnest(coalesce(p_event_anchors, array[]::text[])) as anchors(value)
      where nullif(pg_catalog.btrim(anchors.value), '') is null or pg_catalog.length(anchors.value) > 160
    )
    or coalesce(pg_catalog.cardinality(p_research_prompts), 0) > 10
    or exists (
      select 1
      from pg_catalog.unnest(coalesce(p_research_prompts, array[]::text[])) as prompts(value)
      where nullif(pg_catalog.btrim(prompts.value), '') is null or pg_catalog.length(prompts.value) > 600
    ) then
    raise exception 'Event anchors and research prompts must be non-empty and within the supported limits.'
      using errcode = '22023';
  end if;

  select location.salon_account_id
  into v_account_id
  from public.locations as location
  join public.location_memberships as membership
    on membership.location_id = location.id
  where location.id = p_location_id
    and membership.user_id = v_user_id
    and membership.role = 'leadership';

  if v_account_id is null then
    raise exception 'Leadership access to the selected location is required.'
      using errcode = '42501';
  end if;

  perform 1
  from public.salon_accounts as account
  where account.id = v_account_id
  for update;

  if exists (
    select 1
    from public.content_schedule_entries as entry
    join public.locations as location on location.id = entry.location_id
    where location.salon_account_id = v_account_id
      and entry.scheduled_for = p_scheduled_for
  ) then
    raise exception 'A shared content theme already exists on that date.'
      using errcode = '23505';
  end if;

  select coalesce(pg_catalog.max(entry.cycle_number), 0) + 1
  into v_cycle_number
  from public.content_schedule_entries as entry
  join public.locations as location on location.id = entry.location_id
  where location.salon_account_id = v_account_id;

  insert into public.content_schedule_entries (
    location_id,
    cycle_number,
    scheduled_for,
    season,
    style_name,
    technique_and_finish,
    color_palette,
    approx_date,
    theme_name,
    content_style_name,
    content_hook,
    event_anchors,
    research_window,
    research_prompts,
    timing_note
  )
  select
    location.id,
    v_cycle_number,
    p_scheduled_for,
    p_season,
    pg_catalog.btrim(p_style_name),
    pg_catalog.btrim(p_technique_and_finish),
    pg_catalog.btrim(p_color_palette),
    p_approx_date,
    pg_catalog.btrim(p_theme_name),
    nullif(pg_catalog.btrim(p_content_style_name), ''),
    nullif(pg_catalog.btrim(p_content_hook), ''),
    p_event_anchors,
    nullif(pg_catalog.btrim(p_research_window), ''),
    p_research_prompts,
    nullif(pg_catalog.btrim(p_timing_note), '')
  from public.locations as location
  where location.salon_account_id = v_account_id;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$function$;

revoke all on function public.add_shared_content_schedule_entry(
  uuid, date, text, text, text, text, date, text, text, text, text[], text, text[], text
) from public, anon, authenticated;
grant execute on function public.add_shared_content_schedule_entry(
  uuid, date, text, text, text, text, date, text, text, text, text[], text, text[], text
) to authenticated;