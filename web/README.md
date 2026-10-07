The MVP provides a technician media dashboard and a leadership job/review dashboard. Its no-credentials preview uses clearly labeled sample data and does not persist demo uploads. With Supabase configured, uploads use a private bucket and database-enforced location policies. Video composition workers, Stripe billing, and TikTok publishing are not connected yet; the queue records jobs as waiting for a worker rather than claiming videos were generated.

## Local setup

1. Create a Supabase project.
2. Disable public user sign-ups in Supabase Auth settings. Require confirmed email addresses and strong passwords for invited users. Run all SQL files in `supabase/migrations/` in filename order in the Supabase SQL Editor, or link the CLI and apply the migrations.
3. Create the initial leadership user in Supabase Auth. Edit `supabase/bootstrap.sql` with that user's email, then run it in the SQL Editor. The script provisions Beverly Hills, Brentwood Village, Larchmont Village, Santa Monica, South Bay, Studio City, and Sunset, plus the shared 18-cycle theme schedule, editorial hooks, event anchors, and research briefs.

For an existing project that already has the earlier migrations, run `20261007034925_add_content_theme_schedule.sql`, then `20261007040553_add_theme_research_briefs.sql`, in that order. Rerun the updated `supabase/bootstrap.sql` to seed or refresh all 126 location-cycle entries and their research briefs. Do not rerun the older, non-idempotent migrations. Approximate cultural dates and the stated research windows are tracked separately from the existing shoot schedule, which starts October 6, 2026 and repeats every 21 days.
4. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key. The publishable key is intended for browser use; never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable.
5. From this directory, run `npm run dev` and open the local address printed by Next.js. Sign in with the leadership account or a technician account added to `location_memberships`.

The migrations create the private `salon-media` bucket, location-scoped RLS policies, upload/job metadata, a membership-protected content schedule with editorial hooks and timely research prompts, and the generated-video review history. Users can upload JPG, PNG, WebP, and MP4 files up to 50 MB after confirming they have permission to use the media. Uploads are stored in paths scoped to location and uploader; client roles cannot alter job state or schedule entries. The review function requires a generated video and records every approval, rejection, or request for changes. Approved videos are for manual export only. The calendar shows planned content themes, not customer appointment bookings; scheduled dates do not trigger generation or run research until workers are connected. An actual worker must inspect media content before processing. Supabase's MIME allowlist and the browser's file type are not a substitute for content inspection.

## Build status

- **Available:** Preview dashboard, Supabase email/password sign-in, private media upload, tenant/location isolation, live job queue with location/status filters, an 18-cycle theme calendar with content hooks, event anchors, and per-cycle research prompts, and guarded leadership review actions for generated videos.
- **Next:** Worker queue and deterministic photo-composition worker that creates immutable generated videos for the review flow.
- **Not connected:** Stripe, AI services, automated TikTok publishing. The launch path uses manual export.

The bootstrap SQL provisions the seven Bellacures locations and a leadership membership. Provision technician memberships explicitly in the Supabase SQL Editor.
