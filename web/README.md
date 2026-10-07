The MVP provides a technician media dashboard and a leadership job/review dashboard. Its no-credentials preview uses clearly labeled sample data and does not persist demo uploads. With Supabase configured, uploads use a private bucket and database-enforced location policies. Video composition workers, Stripe billing, and TikTok publishing are not connected yet; the queue records jobs as waiting for a worker rather than claiming videos were generated.

## Local setup

1. Create a Supabase project.
2. Disable public user sign-ups in Supabase Auth settings. Require confirmed email addresses and strong passwords for invited users. Run `supabase/migrations/20261007005446_salon_content_mvp.sql` in the Supabase SQL Editor.
3. Create the initial leadership user in Supabase Auth. Edit `supabase/bootstrap.sql` with that user's email and actual branch names, then run it in the SQL Editor.
4. Copy `.env.example` to `.env.local` and fill in the Supabase project URL and publishable key. The publishable key is intended for browser use; never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable.
5. From this directory, run `npm run dev` and open the local address printed by Next.js. Sign in with the leadership account or a technician account added to `location_memberships`.

The first migration creates the private `salon-media` bucket, location-scoped RLS policies, and upload/job metadata tables. Users can upload JPG, PNG, WebP, and MP4 files up to 50 MB after confirming they have permission to use the media. Uploads are stored in paths scoped to location and uploader; client roles cannot alter job state. An actual worker must inspect media content before processing. Supabase's MIME allowlist and the browser's file type are not a substitute for content inspection.

## Build status

- **Available:** Preview dashboard, Supabase email/password sign-in, private media upload, tenant/location isolation, and queued-job visibility.
- **Next:** Worker queue and deterministic photo-composition worker; generated output and leadership review actions.
- **Not connected:** Stripe, AI services, automated TikTok publishing. The launch path uses manual export.

The bootstrap SQL creates placeholder locations. Set actual location labels before inviting technicians and provision technician memberships explicitly in the Supabase SQL Editor.
