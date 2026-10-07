-- Run after applying all migrations and creating the first leadership user in Supabase Auth.
-- Replace this email before running. Safe to rerun; it upserts locations and schedule entries.
do $$
declare
  owner_email text := 'admin@stack.report';
  owner_id uuid;
  salon_id uuid;
  v_location_id uuid;
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
    returning id into v_location_id;

    insert into public.location_memberships (location_id, user_id, role)
    values (v_location_id, owner_id, 'leadership')
    on conflict (location_id, user_id) do update
      set role = excluded.role;

    insert into public.content_schedule_entries (
      location_id,
      cycle_number,
      scheduled_for,
      season,
      style_name,
      technique_and_finish,
      color_palette
    )
    select
      v_location_id,
      themes.cycle_number,
      date '2026-10-06' + ((themes.cycle_number - 1) * 21),
      themes.season,
      themes.style_name,
      themes.technique_and_finish,
      themes.color_palette
    from (values
      (1, 'Fall', 'Tactile Crocodile Art', '3D sculpted texture, builder gel', 'Deep dark plum'),
      (2, 'Fall', 'Transition Deepening', 'High-gloss, precise Russian manicure cuticle lines', 'Rich espresso brown'),
      (3, 'Fall', 'High-Gloss Vampy Plum', 'Ultra-glossy top coat', 'Deep burgundies and near-black plum'),
      (4, 'Winter', 'Heavy Metal Shimmer', 'Platinum chrome line work over hardgel base', 'Platinum silver and sheer nude'),
      (5, 'Winter', 'Reflective Charcoal Velvet', 'Magnetic gel wands, velvet finish', 'Gunmetal shimmer and deep charcoal'),
      (6, 'Winter', 'High-End Matte Espresso', 'Ultra-matte top coat', 'Deep espresso brown'),
      (7, 'Winter', 'Low-Profile Charcoal', 'Flat, low-sheen finish', 'Dark industrial charcoal'),
      (8, 'Winter', 'Sapphire Jewel Tones', 'Meticulous hardgel base, high-gloss top coat', 'Deep sapphire blue'),
      (9, 'Winter', 'Ceramic 3D Structures', 'Minimalist raised 3D lines, ceramic effect finish', 'Opaque chalk white and structural neutrals'),
      (10, 'Spring', 'The ''Clean Girl'' Refresh', 'Flawless dry cuticle prep, sheer overlay', 'Milky lavender veil'),
      (11, 'Spring', 'Hardgel Mauve Veil', 'Ultra-clean minimalist overlay', 'Cool grey-mauve'),
      (12, 'Spring', 'Coachella Melted Metallics', 'Liquid-style 3D sculpting', 'Molten silver accents'),
      (13, 'Spring', 'Cyber-Streetwear Graphics', 'Clear builder gel droplets', 'Transparent gloss over bare nail bed'),
      (14, 'Spring', 'Matte Moss & Earth', 'Flat, satin-finish top coat', 'Low-saturation olive greens'),
      (15, 'Spring', 'Concrete Grey Satin', 'Smooth architectural finish', 'Muted concrete grey'),
      (16, 'Summer', 'Velvet June Gloom', 'Reflective magnetic gel manipulation', 'Sapphire blue and overcast grey shift'),
      (17, 'Summer', 'Glazed Citrus Chrome', 'Ultra-reflective chrome powder overlay', 'Milky vanilla and soft peach base with orange-gold chrome'),
      (18, 'Summer', 'Molten Chocolate Chrome', 'Heavy dark metallic chrome top coat', 'Rich reflective chocolate brown')
    ) as themes(cycle_number, season, style_name, technique_and_finish, color_palette)
    on conflict (location_id, cycle_number) do update
      set scheduled_for = excluded.scheduled_for,
          season = excluded.season,
          style_name = excluded.style_name,
          technique_and_finish = excluded.technique_and_finish,
          color_palette = excluded.color_palette;
  end loop;
end
$$;
