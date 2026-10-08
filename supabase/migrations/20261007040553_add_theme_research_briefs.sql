alter table public.content_schedule_entries
  add column approx_date date,
  add column theme_name text,
  add column content_style_name text,
  add column content_hook text,
  add column event_anchors text[],
  add column research_window text,
  add column research_prompts text[],
  add column timing_note text;