-- Run after creating the first leadership user in Supabase Auth.
-- Replace this email before running.
do $$
declare
  owner_email text := 'admin@stack.report';
  owner_id uuid;
  salon_id uuid;
  location_id uuid;
  location_names text[] := array[
    'Beverly Hills',
    'Brentwood Village',
    'Larchmont Village',
    'Santa Monica',
    'South Bay',
    'Studio City',
    'Sunset'
  ];
  location_number integer;
begin
  select id into owner_id
  from auth.users
  where email = owner_email
  limit 1;

  if owner_id is null then
    raise exception 'Create the first Supabase Auth user for % before running this script.', owner_email;
  end if;

  select id into salon_id
  from public.salon_accounts
  where name in ('Bellacures', 'BellaCure')
  order by case when name = 'Bellacures' then 0 else 1 end, created_at
  limit 1;

  if salon_id is not null then
    update public.salon_accounts
    set name = 'Bellacures'
    where id = salon_id and name <> 'Bellacures';
  end if;

  if salon_id is null then
    insert into public.salon_accounts (name)
    values ('Bellacures')
    returning id into salon_id;
  end if;

  for location_number in 1..7 loop
    insert into public.locations (salon_account_id, name)
    values (salon_id, location_names[location_number])
    on conflict (salon_account_id, name) do update
      set name = excluded.name
    returning id into location_id;

    insert into public.location_memberships (location_id, user_id, role)
    values (location_id, owner_id, 'leadership')
    on conflict (location_id, user_id) do update
      set role = excluded.role;
  end loop;
end
$$;
