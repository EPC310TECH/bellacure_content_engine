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

    update public.content_schedule_entries as entry
    set approx_date = brief.approx_date,
        theme_name = brief.theme_name,
    content_style_name = brief.content_style_name,
    content_hook = brief.content_hook,
        event_anchors = brief.event_anchors,
        research_window = brief.research_window,
        research_prompts = brief.research_prompts,
        timing_note = brief.timing_note
    from jsonb_to_recordset($theme_briefs$
      [
        {"cycle_number":1,"approx_date":"2026-10-05","theme_name":"Dark Luxe October","content_hook":"Halloween nails for people who don't do costumes.","event_anchors":["Halloween season buildup","Horror-movie month"],"research_window":"Late September 2026","research_prompts":["What horror films are releasing in October 2026, and are any of them driving beauty or nail tie-ins?","What are the top trending Halloween nail art searches and styles this year?","What are the headline mazes and themes at Universal Horror Nights Hollywood 2026?"],"timing_note":null},
        {"cycle_number":2,"approx_date":"2026-10-26","theme_name":"Haunted Forest","content_style_name":"Evergreen Depth","content_hook":"Witchy-week nails, straight from the dark forest.","event_anchors":["Halloween (Oct 31)"],"research_window":"Mid-October 2026","research_prompts":["What are the biggest Halloween weekend parties and events in Los Angeles this year?","What are the top Halloween costume trends for 2026, and what nail looks pair with them?","Which celebrities have posted Halloween-themed manicures this month?"],"timing_note":null},
        {"cycle_number":3,"approx_date":"2026-11-16","theme_name":"Holiday Party Bloodline","content_style_name":"Oxblood Ritual","content_hook":"The one red that carries from Friendsgiving straight through NYE.","event_anchors":["Thanksgiving (Nov 26)","Friendsgiving season","Holiday party kickoff"],"research_window":"Early November 2026","research_prompts":["What are the trending holiday-party colors and dress codes this season?","Have any celebrities or influencers had viral red or oxblood manicure moments recently?","What are the major Friendsgiving and holiday events happening in LA this month?"],"timing_note":null},
        {"cycle_number":4,"approx_date":"2026-12-07","theme_name":"Tinsel & Chrome","content_hook":"Tinsel you can wear for three weeks.","event_anchors":["Christmas / Hanukkah parties","Holiday season peak"],"research_window":"Late November 2026","research_prompts":["What are the biggest holiday parties and events in Los Angeles this December?","What metallic and chrome nail looks are trending this holiday season?","What jewelry and accessory trends are dominating holiday fashion right now?"],"timing_note":null},
        {"cycle_number":5,"approx_date":"2026-12-28","theme_name":"Midnight Countdown","content_hook":"Midnight, bottled.","event_anchors":["New Year's Eve"],"research_window":"Mid-December 2026","research_prompts":["What are the major New Year's Eve events and parties in Los Angeles this year?","What are the predicted NYE fashion and beauty trends?","Which celebrities are known for standout NYE manicures, and what did they wear last year?"],"timing_note":null},
        {"cycle_number":6,"approx_date":"2027-01-18","theme_name":"Quiet Luxury Reset","content_hook":"Stealth-wealth nails for the January reset.","event_anchors":["New year reset","Awards season begins","MLK weekend"],"research_window":"Early January 2027","research_prompts":["Who are the Golden Globes nominees this year, and what are the standout red-carpet beauty looks so far?","What does 'quiet luxury' mean in 2027 fashion, and which brands are leading it?","What are the trending minimalist nail looks for January?"],"timing_note":null},
        {"cycle_number":7,"approx_date":"2027-02-08","theme_name":"Lover's Protection","content_style_name":"Evil Eye Talisman","content_hook":"Protection for cuffing season — the anti-Valentine's nail.","event_anchors":["Valentine's Day (Feb 14)","Super Bowl weekend"],"research_window":"Late January 2027","research_prompts":["Who is performing the Super Bowl halftime show in 2027?","What is the cultural conversation around Valentine's Day this year — is there an anti-Valentine's or self-love angle trending?","What is the current status of the evil-eye motif in fashion and jewelry?"],"timing_note":null},
        {"cycle_number":8,"approx_date":"2027-03-01","theme_name":"Red Carpet Blues","content_hook":"Jewel tones built for flash photography.","event_anchors":["Oscars / awards season","Women's History Month"],"research_window":"Mid-February 2027","research_prompts":["Who are the Oscar nominees for 2027 across the major categories?","What were the best red-carpet nail looks of this awards season, and who wore them?","What jewel tones are dominating spring red-carpet fashion?"],"timing_note":null},
        {"cycle_number":9,"approx_date":"2027-03-22","theme_name":"Spring Minimalism","content_hook":"Gallery minimalism for the spring clear-out.","event_anchors":["Spring equinox (Mar 20)","Spring break"],"research_window":"Early March 2027","research_prompts":["What were the key color and minimalism takeaways from the spring fashion weeks?","Who are the minimalist nail artists gaining traction right now, and what is their signature look?","What does the spring equinox content cycle look like — what are wellness and lifestyle creators pushing?"],"timing_note":null},
        {"cycle_number":10,"approx_date":"2027-04-12","theme_name":"Festival Fresh","content_hook":"Desert-dawn nails without the festival chaos.","event_anchors":["Coachella weekends (actual dates)"],"research_window":"Late March 2027","research_prompts":["Who is headlining Coachella 2027 on each weekend?","What are the defining Coachella fashion and beauty trends this year?","What is the 'clean girl' aesthetic evolving into this spring?"],"timing_note":null},
        {"cycle_number":11,"approx_date":"2027-05-03","theme_name":"Polished for Everything","content_style_name":"Chrome French","content_hook":"The elevated classic for every wedding invitation.","event_anchors":["Wedding season begins","Mother's Day (May 9)"],"research_window":"Mid-April 2027","research_prompts":["What are the defining wedding nail trends for 2027?","Have any high-profile celebrity weddings been announced or covered recently, and what did the beauty looks include?","What is the current state of the French manicure revival — who is wearing it and how?"],"timing_note":null},
        {"cycle_number":12,"approx_date":"2027-05-24","theme_name":"Afterparty Chrome","content_hook":"Festival chrome, carried into summer nights.","event_anchors":["Memorial Day weekend","Summer kickoff"],"research_window":"Early May 2027","research_prompts":["What are the big Memorial Day weekend events in Los Angeles this year?","Which summer music festivals have announced lineups, and who is headlining?","What chrome and metallic nail trends are carrying over from festival season?"],"timing_note":"Style name says Coachella but the date is Memorial Day — themed as the festival look extended into summer."},
        {"cycle_number":13,"approx_date":"2027-06-14","theme_name":"Pride & Concrete","content_hook":"Pride-month nails with an edge.","event_anchors":["LA Pride (early June)","Summer streetwear season"],"research_window":"Late May 2027","research_prompts":["What are the official LA Pride 2027 events, themes, and headliners?","What Pride beauty and nail trends are emerging this year?","Who are the key voices in queer beauty and streetwear right now?"],"timing_note":null},
        {"cycle_number":14,"approx_date":"2027-07-05","theme_name":"Heatwave Neutral","content_hook":"Summer neutrals that aren't nude.","event_anchors":["July 4th week","High summer"],"research_window":"Mid-June 2027","research_prompts":["What are the big July 4th blockbuster releases, and are any driving beauty tie-ins?","What earth-tone and neutral nail trends are dominating summer?","What is the current conversation around 'no-nail' or natural-look manicures?"],"timing_note":null},
        {"cycle_number":15,"approx_date":"2027-07-26","theme_name":"City Summer","content_hook":"The anti-summer nail — no neons allowed.","event_anchors":["Peak LA summer"],"research_window":"Early July 2027","research_prompts":["What nail shapes and finishes are trending right now at the peak of summer?","What nail content is going viral on TikTok and Instagram this month?","What are the defining architectural or brutalist influences in current fashion?"],"timing_note":null},
        {"cycle_number":16,"approx_date":"2027-08-16","theme_name":"Late Summer Haze","content_hook":"Overcast beach mornings, bottled.","event_anchors":["Late-summer marine layer"],"research_window":"Late July 2027","research_prompts":["What are the defining late-summer fashion trends as the season winds down?","Are there any major August music releases, tours, or cultural moments in LA?","What is the current mood around 'sad girl summer' or melancholic aesthetics?"],"timing_note":"Name says June Gloom but the date is mid-August — themed as the marine-layer mood extended; consider renaming to 'August Haze'."},
        {"cycle_number":17,"approx_date":"2027-09-06","theme_name":"Golden Hour","content_hook":"Bottled golden hour for the end of summer.","event_anchors":["Labor Day (Sep 6)"],"research_window":"Mid-August 2027","research_prompts":["What were the key colors, textures, and nail looks at September 2027 Fashion Week?","What are the big Labor Day weekend events in Los Angeles?","What does the 'golden hour' aesthetic look like in current beauty content?"],"timing_note":null},
        {"cycle_number":18,"approx_date":"2027-09-27","theme_name":"Fall Preview","content_hook":"Full circle — the year ends dark and rich, right where it started.","event_anchors":["Fall fashion week","Return of dark"],"research_window":"Early September 2027","research_prompts":["What are the forecasted nail trends for fall 2027?","What horror releases or Halloween content is already building for October?","How are creators framing the summer-to-fall beauty transition this year?"],"timing_note":null}
      ]
    $theme_briefs$::jsonb) as brief(
      cycle_number integer,
      approx_date date,
      theme_name text,
      content_style_name text,
      content_hook text,
      event_anchors text[],
      research_window text,
      research_prompts text[],
      timing_note text
    )
    where entry.location_id = v_location_id
      and entry.cycle_number = brief.cycle_number;
  end loop;
end
$$;
