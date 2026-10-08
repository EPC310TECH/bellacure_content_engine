create table public.salon_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  salon_account_id uuid not null references public.salon_accounts(id) on delete cascade,
  name text not null,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  unique (salon_account_id, name)
);

create table public.location_memberships (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('technician', 'leadership')),
  created_at timestamptz not null default now(),
  unique (location_id, user_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  object_path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  ai_consent_confirmed boolean not null default false,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'needs_attention', 'failed')),
  created_at timestamptz not null default now(),
  check (object_path like location_id::text || '/' || uploaded_by::text || '/%')
);

create table public.content_jobs (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready_for_review', 'approved', 'rejected', 'failed')),
  stage text not null default 'waiting_for_worker',
  created_at timestamptz not null default now(),
  check (status = 'queued' or stage <> 'waiting_for_worker')
);

create index locations_salon_account_id_idx on public.locations (salon_account_id);
create index location_memberships_user_location_idx on public.location_memberships (user_id, location_id);
create index media_assets_location_created_idx on public.media_assets (location_id, created_at desc);
create index media_assets_uploader_created_idx on public.media_assets (uploaded_by, created_at desc);
create index content_jobs_location_created_idx on public.content_jobs (location_id, created_at desc);
create index content_jobs_media_asset_idx on public.content_jobs (media_asset_id);

alter table public.salon_accounts enable row level security;
alter table public.locations enable row level security;
alter table public.location_memberships enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_jobs enable row level security;

revoke all on table public.salon_accounts, public.locations, public.location_memberships, public.media_assets, public.content_jobs from anon, authenticated;
grant select on table public.salon_accounts, public.locations, public.location_memberships, public.media_assets, public.content_jobs to authenticated;
grant insert (location_id, uploaded_by, object_path, original_name, mime_type, size_bytes, ai_consent_confirmed)
  on public.media_assets to authenticated;
grant insert (location_id, media_asset_id, created_by)
  on public.content_jobs to authenticated;

create policy "Members can read their salon account"
on public.salon_accounts for select
to authenticated
using (
  exists (
    select 1
    from public.locations l
    join public.location_memberships lm on lm.location_id = l.id
    where l.salon_account_id = salon_accounts.id
      and lm.user_id = (select auth.uid())
  )
);

create policy "Members can read assigned locations"
on public.locations for select
to authenticated
using (
  exists (
    select 1 from public.location_memberships lm
    where lm.location_id = locations.id
      and lm.user_id = (select auth.uid())
  )
);

create policy "Users can read their own location memberships"
on public.location_memberships for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Members can read permitted media"
on public.media_assets for select
to authenticated
using (
  exists (
    select 1 from public.location_memberships lm
    where lm.location_id = media_assets.location_id
      and lm.user_id = (select auth.uid())
      and (lm.role = 'leadership' or media_assets.uploaded_by = (select auth.uid()))
  )
);

create policy "Members can upload consented media"
on public.media_assets for insert
to authenticated
with check (
  uploaded_by = (select auth.uid())
  and ai_consent_confirmed
  and status = 'uploaded'
  and exists (
    select 1 from public.location_memberships lm
    where lm.location_id = media_assets.location_id
      and lm.user_id = (select auth.uid())
      and lm.role in ('technician', 'leadership')
  )
);

create policy "Members can read permitted content jobs"
on public.content_jobs for select
to authenticated
using (
  exists (
    select 1 from public.location_memberships lm
    where lm.location_id = content_jobs.location_id
      and lm.user_id = (select auth.uid())
      and (
        lm.role = 'leadership'
        or exists (
          select 1 from public.media_assets ma
          where ma.id = content_jobs.media_asset_id
            and ma.uploaded_by = (select auth.uid())
        )
      )
  )
);

create policy "Users can queue jobs for their own media"
on public.content_jobs for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'queued'
  and stage = 'waiting_for_worker'
  and exists (
    select 1
    from public.media_assets ma
    join public.location_memberships lm on lm.location_id = ma.location_id
    where ma.id = content_jobs.media_asset_id
      and ma.location_id = content_jobs.location_id
      and ma.uploaded_by = (select auth.uid())
      and lm.user_id = (select auth.uid())
      and lm.role in ('technician', 'leadership')
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'salon-media',
  'salon-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

revoke all on table storage.objects from anon, authenticated;
grant select, insert, delete on table storage.objects to authenticated;

create policy "Members can read permitted salon media files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'salon-media'
  and exists (
    select 1 from public.location_memberships lm
    where lm.location_id::text = (storage.foldername(name))[1]
      and lm.user_id = (select auth.uid())
      and (
        lm.role = 'leadership'
        or (storage.foldername(name))[2] = (select auth.uid())::text
      )
  )
);

create policy "Members can upload salon media files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'salon-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.location_memberships lm
    where lm.location_id::text = (storage.foldername(name))[1]
      and lm.user_id = (select auth.uid())
      and lm.role in ('technician', 'leadership')
  )
);

create policy "Uploaders can remove files without a media record"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'salon-media'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and not exists (
    select 1 from public.media_assets ma
    where ma.object_path = storage.objects.name
  )
  and exists (
    select 1 from public.location_memberships lm
    where lm.location_id::text = (storage.foldername(name))[1]
      and lm.user_id = (select auth.uid())
  )
);