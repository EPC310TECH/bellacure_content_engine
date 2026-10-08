"use client";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudUpload,
  Film,
  Flower2,
  Grid2X2,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
  WandSparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChangeEvent, DragEvent, FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demoSchedule, type ScheduleEntry } from "@/lib/content-schedule";

type Section = "overview" | "uploads" | "jobs" | "calendar" | "settings";
type Location = { id: string; name: string; role: string };
type Asset = {
  id: string;
  original_name: string;
  status: string;
  created_at: string;
  location_id: string;
  object_path?: string;
  preview_object_path?: string | null;
  mime_type?: string;
  demo?: boolean;
};
type ContentJob = {
  id: string;
  status: string;
  stage: string;
  created_at: string;
  location_id: string;
  media_asset_id: string;
  generated_object_path: string | null;
  attempt_count: number;
  last_error: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
};
type LocationInsight = {
  location_id: string;
  location_name: string;
  sample_period: string;
  appointments_booked: number;
  open_slots_next_7_days: number;
  booking_fill_rate_percent: number;
  top_services: Array<{ service: string; bookings: number }>;
  busiest_day: string;
  busiest_time_block: string;
  content_opportunity: string;
};
type InsightsResponse = {
  source: "mock";
  is_mock_data: true;
  notice: string;
  locations: LocationInsight[];
};

const locationNames = [
  "Beverly Hills",
  "Brentwood Village",
  "Larchmont Village",
  "Santa Monica",
  "South Bay",
  "Studio City",
  "Sunset",
];
const mindbodyLocationSlugs: Record<string, string> = {
  "Beverly Hills": "beverly-hills",
  "Brentwood Village": "brentwood-village",
  "Larchmont Village": "larchmont-village",
  "Santa Monica": "santa-monica",
  "South Bay": "south-bay",
  "Studio City": "studio-city",
  Sunset: "sunset",
};

const demoLocations: Location[] = locationNames.map((name, index) => ({
  id: `demo-${index + 1}`,
  name,
  role: index === 0 ? "leadership" : "technician",
}));

const demoAssets: Asset[] = [
  { id: "a1", original_name: "glazed-cherry-set.jpg", status: "ready", created_at: "2026-10-06T15:42:00", location_id: "demo-1", demo: true },
  { id: "a2", original_name: "autumn-chrome-detail.jpg", status: "processing", created_at: "2026-10-06T14:18:00", location_id: "demo-1", demo: true },
  { id: "a3", original_name: "soft-marble-french.jpg", status: "ready", created_at: "2026-10-05T11:06:00", location_id: "demo-1", demo: true },
];

const sampleJobs = [
  { title: "Cherry glaze close-up", location: "Beverly Hills", status: "Ready for review", color: "rose", time: "12 min ago", initials: "BH" },
  { title: "Soft chrome, autumn light", location: "Santa Monica", status: "Composing", color: "lilac", time: "34 min ago", initials: "SM" },
  { title: "A little fall in love", location: "Studio City", status: "Awaiting photos", color: "amber", time: "1 hr ago", initials: "SC" },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

function formatScheduleDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
}

function todayInLosAngeles() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function StatusPill({ status }: { status: string }) {
  const style = status === "ready" || status === "Ready for review"
    ? "status-ready"
    : status === "processing" || status === "Composing"
      ? "status-progress"
      : status === "failed" || status === "rejected"
        ? "status-failed"
        : "status-queued";
  return <span className={`status-pill ${style}`}><span className="status-dot" />{status.replaceAll("_", " ")}</span>;
}

export default function Home() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => configured ? createClient() : null, [configured]);
  const [section, setSection] = useState<Section>("overview");
  const [locations, setLocations] = useState<Location[]>(configured ? [] : demoLocations);
  const [locationId, setLocationId] = useState(configured ? "" : demoLocations[0].id);
  const [assets, setAssets] = useState<Asset[]>(configured ? [] : demoAssets);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(configured ? [] : demoSchedule(demoLocations.map((location) => location.id)));
  const [jobs, setJobs] = useState<ContentJob[]>([]);
  const [userName, setUserName] = useState(configured ? "" : "Alex Morgan");
  const [loading, setLoading] = useState(configured);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [reviewPreviewOpen, setReviewPreviewOpen] = useState(false);
  const [reviewJob, setReviewJob] = useState<ContentJob | null>(null);
  const isDemo = !configured;
  const currentLocation = locations.find((location) => location.id === locationId);
  const isLeadership = !isDemo && currentLocation?.role === "leadership";
  const canAddTheme = isLeadership || (isDemo && currentLocation?.role === "leadership");

  const loadWorkspace = useCallback(async () => {
    if (!supabase) return;
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      router.replace("/login");
      return;
    }
    setUserName(userData.user.email?.split("@")[0] ?? "Team member");
    const { data: memberships, error: membershipError } = await supabase
      .from("location_memberships")
      .select("location_id, role")
      .order("created_at");
    if (membershipError) {
      setErrorMessage(`Could not load your locations: ${membershipError.message}`);
      setLoading(false);
      return;
    }
    const ids = (memberships ?? []).map((membership) => membership.location_id);
    if (ids.length === 0) {
      setLocations([]);
      setLoading(false);
      setErrorMessage("Your account is signed in but has no location access yet. Ask an administrator to add your membership.");
      return;
    }
    const { data: locationRows, error: locationError } = await supabase
      .from("locations")
      .select("id, name")
      .in("id", ids)
      .order("name");
    if (locationError) {
      setErrorMessage(`Could not load locations: ${locationError.message}`);
      setLoading(false);
      return;
    }
    const roleByLocation = new Map((memberships ?? []).map((membership) => [membership.location_id, membership.role]));
    const availableLocations = (locationRows ?? []).map((location) => ({
      ...location,
      role: roleByLocation.get(location.id) ?? "technician",
    }));
    setLocations(availableLocations);
    setLocationId((current) => availableLocations.some((location) => location.id === current) ? current : availableLocations[0]?.id ?? "");
    const { data: assetRows, error: assetsError } = await supabase
      .from("media_assets")
      .select("id, original_name, status, created_at, location_id, object_path, preview_object_path, mime_type")
      .in("location_id", ids)
      .order("created_at", { ascending: false })
      .limit(100);
    if (assetsError) {
      setErrorMessage(`Could not load uploaded media: ${assetsError.message}`);
    } else {
      setAssets(assetRows ?? []);
    }
    const { data: jobRows, error: jobsError } = await supabase
      .from("content_jobs")
      .select("id, status, stage, created_at, location_id, media_asset_id, generated_object_path, attempt_count, last_error, reviewed_by, reviewed_at, review_note")
      .in("location_id", ids)
      .order("created_at", { ascending: false })
      .limit(25);
    if (jobsError) {
      setErrorMessage(`Could not load the content queue: ${jobsError.message}`);
    } else {
      setJobs(jobRows ?? []);
    }
    const { data: scheduleRows, error: scheduleError } = await supabase
      .from("content_schedule_entries")
      .select("id, location_id, cycle_number, scheduled_for, season, style_name, technique_and_finish, color_palette, approx_date, theme_name, content_style_name, content_hook, event_anchors, research_window, research_prompts, timing_note")
      .in("location_id", ids)
      .order("scheduled_for");
    if (scheduleError) {
      setErrorMessage(`Could not load the content calendar: ${scheduleError.message}`);
    } else {
      setScheduleEntries(scheduleRows ?? []);
    }
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    if (!configured) return;
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [configured, loadWorkspace]);

  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploadMessage("");
    setErrorMessage("");
    if (!consentConfirmed) {
      setErrorMessage("Confirm you have permission to upload these images and use them for salon content before continuing.");
      return;
    }
    for (const file of files) {
      if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.type === "video/mp4")) {
        setErrorMessage(`${file.name}: choose a JPG, PNG, WebP, or MP4 file.`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage(`${file.name}: files must be 50 MB or smaller for this MVP.`);
        return;
      }
    }
    if (isDemo) {
      const now = new Date().toISOString();
      setAssets((current) => [
        ...files.map((file, index) => ({
          id: `preview-${Date.now()}-${index}`,
          original_name: file.name,
          status: "demo preview",
          created_at: now,
          location_id: locationId,
          demo: true,
        })),
        ...current,
      ]);
      setUploadMessage("Preview only. Connect a Supabase project to store these files.");
      return;
    }
    if (!supabase || !currentLocation) {
      setErrorMessage("Select a location before uploading.");
      return;
    }
    setUploading(true);
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user) {
      setErrorMessage(`Your sign-in could not be verified. Please sign in again${authError ? `: ${authError.message}` : "."}`);
      setUploading(false);
      return;
    }
    let savedCount = 0;
    let queuedCount = 0;
    for (const file of files) {
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);
      const objectPath = `${locationId}/${userData.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: storageError } = await supabase.storage.from("salon-media").upload(objectPath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (storageError) {
        setErrorMessage(`Could not upload ${file.name}: ${storageError.message}`);
        break;
      }
      const { data: insertedAsset, error: insertError } = await supabase
        .from("media_assets")
        .insert({
          location_id: locationId,
          uploaded_by: userData.user.id,
          object_path: objectPath,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          ai_consent_confirmed: true,
        })
        .select("id, original_name, status, created_at, location_id, object_path, preview_object_path, mime_type")
        .single();
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from("salon-media").remove([objectPath]);
        setErrorMessage(`File record could not be saved: ${insertError.message}.${cleanupError ? ` Cleanup also failed: ${cleanupError.message}.` : " The uploaded file was removed."} Contact support before retrying.`);
        break;
      }
      setAssets((current) => [insertedAsset, ...current]);
      const { data: insertedJob, error: jobError } = await supabase
        .from("content_jobs")
        .insert({
          location_id: locationId,
          media_asset_id: insertedAsset.id,
          created_by: userData.user.id,
        })
        .select("id, status, stage, created_at, location_id, media_asset_id, generated_object_path, attempt_count, last_error, reviewed_by, reviewed_at, review_note")
        .single();
      if (jobError) {
        setErrorMessage(`Your file was uploaded, but its queue record could not be created: ${jobError.message}. It remains in your media library.`);
      } else {
        setJobs((current) => [insertedJob, ...current]);
        queuedCount += 1;
      }
      savedCount += 1;
    }
    if (savedCount > 0) {
      const uploadSummary = `${savedCount} ${savedCount === 1 ? "file" : "files"} uploaded privately.`;
      const queueSummary = `${queuedCount} queued for processing when the worker is connected.`;
      const warning = savedCount > queuedCount ? ` ${savedCount - queuedCount} ${savedCount - queuedCount === 1 ? "file needs" : "files need"} queue setup.` : "";
      setUploadMessage(`${uploadSummary} ${queueSummary}${warning}`);
    }
    setUploading(false);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void handleFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  }

  const selectedAssets = assets.filter((asset) => asset.location_id === locationId);
  const sectionTitle: Record<Section, string> = {
    overview: "Your content, in motion.",
    uploads: "A little detail goes a long way.",
    jobs: isLeadership ? "The studio at a glance." : "Your content queue.",
    calendar: "Plan for the moment.",
    settings: "Your studio settings.",
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Flower2 size={22} strokeWidth={1.7} /></div>
          <div><strong>bellacures</strong><span>CONTENT STUDIO</span></div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileMenu(false)}><X size={19} /></button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <label className="location-picker">
          <span className="location-avatar">{currentLocation?.name.slice(0, 1) ?? "B"}</span>
          <span className="location-picker-copy"><small>LOCATION</small><strong>{currentLocation?.name ?? (loading ? "Loading…" : "No location")}</strong></span>
          <ChevronDown size={15} />
          <select aria-label="Choose salon location" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
        </label>

        <div className="nav-label">STUDIO</div>
        <nav className="side-nav" aria-label="Studio">
          <NavItem icon={<Grid2X2 size={18} />} label="Overview" active={section === "overview"} onClick={() => setSection("overview")} />
          <NavItem icon={<CloudUpload size={18} />} label="Uploads" active={section === "uploads"} count={selectedAssets.length || undefined} onClick={() => setSection("uploads")} />
          <NavItem icon={<Film size={18} />} label={isLeadership || isDemo ? "Jobs & review" : "My jobs"} active={section === "jobs"} count={isDemo ? 3 : undefined} onClick={() => setSection("jobs")} />
          <NavItem icon={<CalendarDays size={18} />} label="Calendar" active={section === "calendar"} onClick={() => setSection("calendar")} />
        </nav>

        <div className="nav-label nav-label-spaced">MANAGE</div>
        <nav className="side-nav" aria-label="Manage">
          <NavItem icon={<Settings2 size={18} />} label="Settings" active={section === "settings"} onClick={() => setSection("settings")} />
          <a className="nav-item" href="mailto:hello@bellacure.com"><CircleHelp size={18} /><span>Help & support</span><ArrowRight className="nav-arrow" size={15} /></a>
        </nav>

        <div className="sidebar-spacer" />
        <div className="plan-card">
          <div className="plan-card-icon"><Sparkles size={16} /></div>
          <div className="plan-title-row"><strong>{isDemo ? "Sample plan" : "MVP setup"}</strong><span>{isDemo ? "DEMO" : "SETUP"}</span></div>
          <p>{isDemo ? "Preview usage only." : "Billing is not connected yet."}</p>
          <div className="plan-progress"><span /></div>
          <div className="plan-foot"><span>{isDemo ? "Sample limits only" : "No charges yet"}</span><button onClick={() => setSection("settings")}>Details <ArrowRight size={13} /></button></div>
        </div>
        <button className="profile-row" onClick={configured ? signOut : undefined}>
          <div className="profile-avatar">{userName.slice(0, 1).toUpperCase() || "A"}</div>
          <span className="profile-copy"><strong>{userName || "Team member"}</strong><small>{isLeadership || isDemo ? "Studio leadership" : "Salon technician"}</small></span>
          {configured ? <LogOut size={16} /> : <MoreHorizontal size={18} />}
        </button>
      </aside>

      {mobileMenu && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMobileMenu(false)} />}

      <section className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenu(true)}><Menu size={20} /></button><span>Studio</span><span className="crumb-slash">/</span><strong>{section === "jobs" ? "Jobs & review" : section[0].toUpperCase() + section.slice(1)}</strong></div>
          <div className="topbar-actions">
            <span className="date-label"><CalendarDays size={15} /> Today · Los Angeles</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <button className="help-button"><CircleHelp size={16} /> <span>Help</span></button>
          </div>
        </header>

        {isDemo && <div className="demo-banner"><Sparkles size={15} /><span><strong>Preview workspace</strong> — sample data only. Connect Supabase to enable sign-in and persistent uploads.</span><a href="/login">Set up project <ArrowRight size={13} /></a></div>}
        {errorMessage && <div className="alert-banner" role="alert"><CircleHelp size={17} /><span>{errorMessage}</span>{configured && <a href="/login">Sign in</a>}</div>}

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> BELLACURES STUDIO <span className="eyebrow-slash">/</span> {currentLocation?.name.toUpperCase() ?? "YOUR WORKSPACE"}</div>
              <h1>{sectionTitle[section]}</h1>
              <p className="heading-subtitle">{section === "overview" ? "The beautiful work you do, ready for its next little moment." : section === "uploads" ? "Your original work, kept lovely and exactly as you made it." : section === "jobs" ? "Every idea and edit, all in one thoughtful little queue." : "Thoughtful themes, timed for what’s just around the corner."}</p>
            </div>
            <div className="heading-actions">
              <button className="button-secondary" onClick={() => setSection("calendar")}><CalendarDays size={16} /> Plan content</button>
              <button className="button-primary" onClick={() => setSection("uploads")}><Plus size={17} /> Add new work</button>
            </div>
          </div>

          {section === "overview" && (
            <Overview
              isDemo={isDemo}
              isLeadership={isLeadership || isDemo}
              supabase={supabase}
              locationName={currentLocation?.name ?? "Selected location"}
              assets={selectedAssets}
              jobs={jobs.filter((job) => job.location_id === locationId)}
              scheduleEntries={scheduleEntries.filter((entry) => entry.location_id === locationId)}
              uploading={uploading}
              uploadMessage={uploadMessage}
              errorMessage={errorMessage}
              consentConfirmed={consentConfirmed}
              setConsentConfirmed={setConsentConfirmed}
              dragging={dragging}
              setDragging={setDragging}
              onDrop={onDrop}
              onFileChange={onFileChange}
              onUpload={() => document.getElementById("media-upload")?.click()}
              onJobs={() => setSection("jobs")}
              onUploads={() => setSection("uploads")}
              onCalendar={() => setSection("calendar")}
            />
          )}
          {section === "uploads" && (
            <Uploads
              supabase={supabase}
              isDemo={isDemo}
              assets={selectedAssets}
              uploading={uploading}
              uploadMessage={uploadMessage}
              errorMessage={errorMessage}
              consentConfirmed={consentConfirmed}
              setConsentConfirmed={setConsentConfirmed}
              dragging={dragging}
              setDragging={setDragging}
              onDrop={onDrop}
              onFileChange={onFileChange}
              onUpload={() => document.getElementById("media-upload")?.click()}
            />
          )}
          {section === "jobs" && <Jobs isDemo={isDemo} isLeadership={isLeadership || isDemo} jobs={isLeadership ? jobs : jobs.filter((job) => job.location_id === locationId)} assets={assets} locations={locations} onReview={(job) => job ? setReviewJob(job) : setReviewPreviewOpen(true)} />}
          {section === "calendar" && <CalendarView
            isDemo={isDemo}
            canAddTheme={canAddTheme}
            entries={scheduleEntries.filter((entry) => entry.location_id === locationId)}
            locationId={locationId}
            locationName={currentLocation?.name ?? "Selected location"}
            supabase={supabase}
            onCreated={loadWorkspace}
          />}
          {section === "settings" && <SettingsView isDemo={isDemo} configured={configured} />}
        </div>
        <footer className="page-footer"><span>Made with care for the work you do.</span><span><ShieldCheck size={14} /> Your originals always stay yours</span></footer>
      </section>

      <input id="media-upload" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={onFileChange} />
      {reviewPreviewOpen && isDemo && <ReviewPreview onClose={() => setReviewPreviewOpen(false)} />}
      {reviewJob && supabase && <ReviewDialog
        job={reviewJob}
        assets={assets}
        locationName={locations.find((location) => location.id === reviewJob.location_id)?.name ?? "Salon location"}
        supabase={supabase}
        onClose={() => setReviewJob(null)}
        onReviewed={async () => {
          await loadWorkspace();
          setReviewJob(null);
        }}
      />}
    </main>
  );
}

function NavItem({ icon, label, active, count, onClick }: { icon: ReactNode; label: string; active?: boolean; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? "nav-item-active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}</button>;
}

type UploadProps = {
  isDemo: boolean;
  assets: Asset[];
  uploading: boolean;
  uploadMessage: string;
  errorMessage: string;
  consentConfirmed: boolean;
  setConsentConfirmed: (value: boolean) => void;
  dragging: boolean;
  setDragging: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
};

function UploadDropzone({ isDemo, uploading, uploadMessage, errorMessage, consentConfirmed, setConsentConfirmed, dragging, setDragging, onDrop, onFileChange, onUpload }: UploadProps) {
  return (
    <>
      <div className={`upload-dropzone ${dragging ? "dropzone-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <div className="upload-icon-wrap"><ImagePlus size={25} strokeWidth={1.7} /></div>
        <div className="dropzone-title">Drop your photos here</div>
        <p>or <button className="text-button" onClick={onUpload}>browse files</button> from your device</p>
        <div className="dropzone-specs"><span>JPG, PNG, WebP</span><i /> <span>MP4 video</span><i /> <span>Up to 50 MB each</span></div>
        <button className="button-primary upload-select-button" onClick={onUpload} disabled={uploading || !consentConfirmed}>
          {uploading ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}
          {uploading ? "Uploading…" : "Choose files"}
        </button>
        <label className="consent-check"><input type="checkbox" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} /><span>I confirm I have permission to upload these files and use them to create salon content.</span></label>
        <input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={onFileChange} />
      </div>
      {uploadMessage && <div className="success-note"><Check size={16} />{uploadMessage}</div>}
      {errorMessage && <div className="inline-error" role="alert"><X size={16} />{errorMessage}</div>}
      {isDemo && <div className="helper-note"><CircleHelp size={15} />Files are not saved in preview mode. Add your Supabase project settings to upload privately.</div>}
    </>
  );
}

function Overview(props: UploadProps & { isLeadership: boolean; supabase: ReturnType<typeof createClient> | null; locationName: string; jobs: ContentJob[]; scheduleEntries: ScheduleEntry[]; onJobs: () => void; onUploads: () => void; onCalendar: () => void }) {
  const ready = props.assets.filter((asset) => asset.status === "ready").length;
  const queueCount = props.isDemo ? 3 : props.jobs.filter((job) => job.status !== "approved" && job.status !== "rejected").length;
  const reviewCount = props.jobs.filter((job) => job.status === "ready_for_review").length;
  const approvedCount = props.jobs.filter((job) => job.status === "approved").length;
  const nextTheme = props.scheduleEntries.find((entry) => entry.scheduled_for >= todayInLosAngeles());
  return (
    <>
      <div className="stats-grid">
        <StatCard label="In your library" value={props.isDemo ? "24" : String(props.assets.length)} detail="Originals, kept safe" icon={<ImagePlus size={18} />} tone="lavender" />
        <StatCard label="Ready to create" value={props.isDemo ? "18" : String(ready)} detail="Photos with a little magic" icon={<Sparkles size={18} />} tone="peach" />
        <StatCard label={props.isLeadership ? "In the studio queue" : "Being prepared"} value={String(queueCount)} detail="Moving along nicely" icon={<Activity size={18} />} tone="mint" />
        <StatCard label={props.isLeadership ? "Ready to review" : "Approved for export"} value={props.isDemo ? (props.isLeadership ? "2" : "4") : String(props.isLeadership ? reviewCount : approvedCount)} detail={props.isLeadership ? "Your approval makes it real" : "Ready for manual export"} icon={<BadgeCheck size={18} />} tone="cream" />
      </div>

      <div className="overview-grid">
        <section className="content-card upload-card">
          <div className="card-heading">
            <div><span className="card-kicker">YOUR LIBRARY</span><h2>Bring us the good stuff.</h2><p>Technician-captured photos are the start of every lovely little story.</p></div>
            <button className="round-action" aria-label="View uploads" onClick={props.onUploads}><ArrowRight size={17} /></button>
          </div>
          <UploadDropzone {...props} />
          <div className="privacy-footnote"><ShieldCheck size={15} /><span>Your originals stay yours. We keep them safe and never alter the original.</span></div>
        </section>

        <section className="content-card schedule-card">
          {props.isDemo ? <>
            <div className="section-card-top"><div><span className="card-kicker">COMING UP · SAMPLE</span><h2>{nextTheme?.theme_name ?? "Theme schedule"}</h2></div><button className="more-button" aria-label="More options"><MoreHorizontal size={19} /></button></div>
            <div className="season-art"><div className="season-sun" /><div className="season-orbit orbit-one" /><div className="season-orbit orbit-two" /><div className="nail-shape nail-one" /><div className="nail-shape nail-two" /><div className="nail-shape nail-three" /><span className="season-caption">soft light <i>·</i> warm tones <i>·</i> you</span></div>
            <div className="schedule-meta"><span><CalendarDays size={15} /> {nextTheme ? formatScheduleDate(nextTheme.scheduled_for) : "Schedule complete"}</span><span className="schedule-dot" /><span>{nextTheme ? `Cycle ${nextTheme.cycle_number} · ${nextTheme.season}` : "Sample theme"}</span></div>
            <p className="schedule-description">{nextTheme?.content_hook ?? (nextTheme ? `${nextTheme.technique_and_finish} · ${nextTheme.color_palette}` : "The 18-cycle shared content calendar is ready to explore.")}</p>
            <button className="card-link" onClick={props.onCalendar}>Open content calendar <ArrowRight size={15} /></button>
          </> : <>
            <div className="section-card-top"><div><span className="card-kicker">CONTENT CALENDAR</span><h2>{nextTheme?.theme_name ?? nextTheme?.style_name ?? "Schedule not loaded yet"}</h2></div><CalendarDays size={18} color="#a17a86" /></div>
            {nextTheme ? <>
              <div className="season-art schedule-empty"><span className="schedule-theme-number">CYCLE {nextTheme.cycle_number}</span><strong>{nextTheme.season}</strong><span>{nextTheme.color_palette}</span></div>
              <div className="schedule-meta"><span><CalendarDays size={15} /> {formatScheduleDate(nextTheme.scheduled_for)}</span><span className="schedule-dot" /><span>Every 3 weeks</span></div>
              <p className="schedule-description">{nextTheme.technique_and_finish}</p>
            </> : <div className="season-art schedule-empty"><CalendarDays size={24} /><span>Run the calendar bootstrap to load all 18 themes.</span></div>}
            <button className="card-link" onClick={props.onCalendar}>Open content calendar <ArrowRight size={15} /></button>
          </>}
        </section>
      </div>

      {props.isLeadership && <MindbodyInsightsPanel supabase={props.supabase} isDemo={props.isDemo} locationName={props.locationName} />}

      <section className="content-card jobs-card">
        <div className="list-heading"><div><span className="card-kicker">{props.isLeadership ? "STUDIO QUEUE" : "YOUR RECENT WORK"}</span><h2>{props.isLeadership ? "A little progress, everywhere." : "Recently added"}</h2></div><button className="card-link" onClick={props.onJobs}>View all <ArrowRight size={15} /></button></div>
        {props.isDemo ? <JobRows onClick={props.onJobs} /> : props.jobs.length ? (
          <div className="asset-table">
            {props.jobs.slice(0, 4).map((job) => {
              const asset = props.assets.find((item) => item.id === job.media_asset_id);
              return <div className="asset-row" key={job.id}><div className="asset-thumb"><FileKind name={asset?.original_name ?? "Queued media"} /></div><div className="asset-info"><strong>{asset?.original_name ?? "Salon media"}</strong><span>{formatDate(job.created_at)} · {job.stage.replaceAll("_", " ")} · {job.attempt_count}/3 attempts</span>{job.last_error && <span className="job-error">{job.last_error}</span>}</div><StatusPill status={job.status} /></div>;
            })}
          </div>
        ) : <EmptyState icon={<ImagePlus size={20} />} title="Your first upload starts here" description="Add a photo of your latest set and it will appear in this space." />}
      </section>
    </>
  );
}

function MindbodyInsightsPanel({ supabase, isDemo, locationName }: { supabase: ReturnType<typeof createClient> | null; isDemo: boolean; locationName: string }) {
  const [insight, setInsight] = useState<LocationInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadInsights() {
      if (isDemo || !supabase) {
        setInsight(null);
        setError("");
        return;
      }
      const locationSlug = mindbodyLocationSlugs[locationName];
      if (!locationSlug) {
        setInsight(null);
        setError("There is no mock-insights mapping for this location.");
        return;
      }

      setLoading(true);
      setError("");
      const { data, error: functionError } = await supabase.functions.invoke<InsightsResponse>("mindbody-insights", {
        method: "POST",
        body: { location_id: locationSlug },
      });
      if (cancelled) return;
      setLoading(false);
      if (functionError) {
        setInsight(null);
        setError(`Could not load insights: ${functionError.message}`);
        return;
      }
      if (!data?.is_mock_data || data.source !== "mock" || !Array.isArray(data.locations)) {
        setInsight(null);
        setError("The insights function returned an unexpected response.");
        return;
      }
      setInsight(data.locations.find((item) => item.location_id === locationSlug) ?? null);
      if (!data.locations.some((item) => item.location_id === locationSlug)) {
        setError("No mock insights are available for this location.");
      }
    }
    void loadInsights();
    return () => { cancelled = true; };
  }, [isDemo, locationName, supabase]);

  return (
    <section className="content-card insights-card">
      <div className="list-heading">
        <div><span className="card-kicker">MINDBODY · MOCK DATA</span><h2>Demand signals for {locationName}</h2><p>Illustrative aggregates to prototype content planning. No live Mindbody data.</p></div>
        <span className="mock-data-badge"><Sparkles size={13} /> SAMPLE ONLY</span>
      </div>
      {isDemo ? <div className="insights-message">Sign in to preview the authenticated Supabase Edge Function.</div>
        : loading ? <div className="insights-message"><LoaderCircle className="spin" size={16} /> Loading sample insights…</div>
          : error ? <div className="insights-error" role="alert">{error}</div>
            : insight ? <>
              <div className="insights-metrics">
                <div><span>Sample appointments</span><strong>{insight.appointments_booked}</strong><small>{insight.sample_period}</small></div>
                <div><span>Open slots · next 7 days</span><strong>{insight.open_slots_next_7_days}</strong><small>{insight.booking_fill_rate_percent}% sample fill rate</small></div>
                <div><span>Busiest time</span><strong>{insight.busiest_time_block}</strong><small>{insight.busiest_day}</small></div>
              </div>
              <div className="insights-bottom">
                <div><span className="insights-label">SAMPLE TOP SERVICES</span><p>{insight.top_services.map((service) => `${service.service} (${service.bookings})`).join(" · ")}</p></div>
                <div><span className="insights-label">CONTENT IDEA</span><p>{insight.content_opportunity}</p></div>
              </div>
              <div className="insights-disclaimer">Mock data only · No Mindbody API was contacted · No customer information</div>
            </> : <div className="insights-message">No sample data is available for this location.</div>}
    </section>
  );
}

function Uploads(props: UploadProps & { supabase: ReturnType<typeof createClient> | null }) {
  return (
    <>
      <section className="content-card upload-page-card">
        <div className="list-heading"><div><span className="card-kicker">ADD TO YOUR LIBRARY</span><h2>Upload a finished set</h2><p>Photos first. Your original is always kept unchanged.</p></div><div className="upload-page-badge"><ShieldCheck size={14} /> Private library</div></div>
        <UploadDropzone {...props} />
      </section>
      <section className="content-card library-card">
        <div className="list-heading"><div><span className="card-kicker">YOUR ORIGINALS</span><h2>Recently added</h2></div><button className="filter-button"><span className="status-dot" /> All media <ChevronDown size={14} /></button></div>
        {props.assets.length ? <div className="library-grid">{props.assets.map((asset, index) => <LibraryAssetCard key={asset.id} asset={asset} index={index} supabase={props.supabase} />)}</div> : <EmptyState icon={<ImagePlus size={20} />} title="Your library is ready for its first photo" description="Upload your favorite finished set to get started." />}
      </section>
    </>
  );
}

function LibraryAssetCard({ asset, index, supabase }: { asset: Asset; index: number; supabase: ReturnType<typeof createClient> | null }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      if (!supabase || !asset.preview_object_path) return;
      const { data, error } = await supabase.storage.from("salon-media").createSignedUrl(asset.preview_object_path, 900);
      if (cancelled) return;
      if (error) {
        setPreviewError(error.message);
        console.error(`Could not load preview for ${asset.id}: ${error.message}`);
        return;
      }
      setPreviewUrl(data.signedUrl);
    }
    void loadPreview();
    return () => { cancelled = true; };
  }, [asset.id, asset.preview_object_path, supabase]);

  return <article className="library-item">
    <div className={`library-art art-${index % 4}`}>
      {previewUrl ? <Image className="library-preview-image" src={previewUrl} alt={`Processed preview for ${asset.original_name}`} fill sizes="(max-width: 560px) 50vw, 25vw" unoptimized />
        : <DecorativeNails variant={index % 4} />}
      <span className="library-kind">{asset.original_name.toLowerCase().endsWith(".mp4") ? <Video size={13} /> : <ImagePlus size={13} />}</span>
      {asset.preview_object_path && <span className="preview-ready-label"><Check size={11} /> Preview ready</span>}
      {previewError && <span className="preview-error-label">Preview unavailable</span>}
    </div>
    <div className="library-caption"><div><strong>{asset.original_name}</strong><span>{formatDate(asset.created_at)}</span></div><StatusPill status={asset.status} /></div>
  </article>;
}

function Jobs({ isDemo, isLeadership, jobs, assets, locations, onReview }: { isDemo: boolean; isLeadership: boolean; jobs: ContentJob[]; assets: Asset[]; locations: Location[]; onReview: (job?: ContentJob) => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const filteredJobs = jobs.filter((job) =>
    (statusFilter === "all" || job.status === statusFilter)
    && (locationFilter === "all" || job.location_id === locationFilter)
  );
  const inProgress = jobs.filter((job) => job.status === "queued" || job.status === "processing").length;
  const awaitingReview = jobs.filter((job) => job.status === "ready_for_review").length;
  const approved = jobs.filter((job) => job.status === "approved").length;
  const changesRequested = jobs.filter((job) => job.stage === "review_changes_requested").length;
  return (
    <>
      <div className="stats-grid jobs-stats">
        <StatCard label="In progress" value={isDemo ? "3" : String(inProgress)} detail="Queued or processing" icon={<Activity size={18} />} tone="lavender" />
        <StatCard label="Needs your eye" value={isDemo && isLeadership ? "2" : String(awaitingReview)} detail="Waiting for review" icon={<ShieldCheck size={18} />} tone="peach" />
        <StatCard label="Approved for export" value={isDemo ? "0" : String(approved)} detail="Ready for manual export" icon={<BadgeCheck size={18} />} tone="mint" />
        <StatCard label="Changes requested" value={isDemo ? "0" : String(changesRequested)} detail="Returned for another pass" icon={<Activity size={18} />} tone="cream" />
      </div>
      <section className="content-card jobs-card full-jobs-card">
        <div className="list-heading"><div><span className="card-kicker">{isLeadership ? "ALL LOCATIONS" : "YOUR CONTENT"}</span><h2>{isLeadership ? "Your studio queue" : "Jobs from your uploads"}</h2><p>{isLeadership ? "A gentle overview of every location's work." : "See how your uploads are coming along."}</p></div>
          <div className="queue-filters">
            {isLeadership && <label className="visually-hidden" htmlFor="job-location-filter">Filter jobs by location</label>}
            {isLeadership && <select id="job-location-filter" className="filter-button" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option value="all">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>}
            <label className="visually-hidden" htmlFor="job-status-filter">Filter jobs by status</label>
            <select id="job-status-filter" className="filter-button" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All stages</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="ready_for_review">Ready for review</option>
              <option value="approved">Approved for export</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        {isDemo ? <JobRows onClick={() => onReview()} showReview={isLeadership} /> : filteredJobs.length ? <div className="asset-table">
          {filteredJobs.map((job) => {
            const asset = assets.find((item) => item.id === job.media_asset_id);
            const locationName = locations.find((location) => location.id === job.location_id)?.name ?? "Salon location";
            const canReview = isLeadership && job.status === "ready_for_review" && Boolean(job.generated_object_path);
            return <div className="asset-row" key={job.id}>
              <div className="asset-thumb"><FileKind name={asset?.original_name ?? "Queued media"} /></div>
              <div className="asset-info"><strong>{asset?.original_name ?? "Salon media"}</strong><span>{locationName} · {formatDate(job.created_at)} · {job.stage.replaceAll("_", " ")} · {job.attempt_count}/3 attempts</span>{job.last_error && <span className="job-error">{job.last_error}</span>}</div>
              <StatusPill status={job.status} />
              {canReview && <button className="button-secondary review-action" onClick={() => onReview(job)}><ShieldCheck size={14} /> Review video</button>}
              {job.status === "ready_for_review" && !job.generated_object_path && <span className="review-pending-note">Video file unavailable</span>}
            </div>;
          })}
        </div> : <EmptyState icon={<Film size={20} />} title={jobs.length ? "No jobs match these filters" : "No video jobs yet"} description={jobs.length ? "Try a different location or stage." : "Your uploads will appear here when they enter the content queue."} />}
        {isDemo ? <div className="worker-note"><Clock3 size={15} /><span>Sample jobs only. Connect Supabase for the live queue; generated videos remain unavailable until a worker is connected.</span></div> : <div className="worker-note"><Clock3 size={15} /><span>Queue status is live. Generation and manual export workers are not connected yet.</span></div>}
      </section>
    </>
  );
}

function CalendarView({
  isDemo,
  canAddTheme,
  entries,
  locationId,
  locationName,
  supabase,
  onCreated,
}: {
  isDemo: boolean;
  canAddTheme: boolean;
  entries: ScheduleEntry[];
  locationId: string;
  locationName: string;
  supabase: ReturnType<typeof createClient> | null;
  onCreated: () => Promise<void>;
}) {
  const [month, setMonth] = useState(() => new Date(Date.UTC(2026, 9, 1)));
  const [selectedDate, setSelectedDate] = useState("2026-10-06");
  const [draftEntries, setDraftEntries] = useState<ScheduleEntry[]>([]);
  const [addingEntry, setAddingEntry] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [entryMessage, setEntryMessage] = useState("");
  const [formDate, setFormDate] = useState("2026-10-06");
  const [formSeason, setFormSeason] = useState<ScheduleEntry["season"]>("Fall");
  const [ideaTheme, setIdeaTheme] = useState("");
  const [ideaStyle, setIdeaStyle] = useState("");
  const [ideaTechnique, setIdeaTechnique] = useState("");
  const [ideaPalette, setIdeaPalette] = useState("");
  const [contentHook, setContentHook] = useState("");
  const [formResetKey, setFormResetKey] = useState(0);
  const visibleEntries = [...entries, ...draftEntries];
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const firstWeekday = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const monthCells = Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex, index - firstWeekday + 1));
    return { date: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === monthIndex };
  });
  const entriesByDate = new Map(visibleEntries.map((entry) => [entry.scheduled_for, entry]));
  const selectedEntry = entriesByDate.get(selectedDate);
  const nextEntries = visibleEntries.filter((entry) => entry.scheduled_for >= todayInLosAngeles()).slice(0, 3);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(month);

  function moveMonth(amount: number) {
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1)));
  }

  function seasonForDate(dateString: string): ScheduleEntry["season"] {
    const monthIndex = new Date(`${dateString}T00:00:00.000Z`).getUTCMonth();
    if ([11, 0, 1].includes(monthIndex)) return "Winter";
    if ([2, 3, 4].includes(monthIndex)) return "Spring";
    if ([5, 6, 7].includes(monthIndex)) return "Summer";
    return "Fall";
  }

  function openAddEntry() {
    const start = new Date(`${selectedDate}T00:00:00.000Z`);
    let candidate = start;
    for (let day = 0; day < 366; day += 1) {
      const dateString = candidate.toISOString().slice(0, 10);
      if (!entriesByDate.has(dateString)) {
        setFormDate(dateString);
        setFormSeason(seasonForDate(dateString));
        setSelectedDate(dateString);
        setMonth(new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), 1)));
        break;
      }
      candidate = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate() + 1));
    }
    setEntryError("");
    setIdeaTheme("");
    setIdeaStyle("");
    setIdeaTechnique("");
    setIdeaPalette("");
    setContentHook("");
    setAddingEntry(true);
    setFormResetKey((key) => key + 1);
  }

  const contentIdea = `A silent, text-free nail-art reel for ${ideaTheme.trim() || "this theme"}: open on a close-up of ${ideaStyle.trim() || "the finished manicure"}, show ${ideaTechnique.trim() || "the technique and finish"} catching the light against ${ideaPalette.trim() || "the chosen color palette"}, then end on the completed set.`.slice(0, 500);

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEntryError("");
    setEntryMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = (key: string) => String(formData.get(key) ?? "").trim();
    const lines = (key: string) => value(key).split("\n").map((line) => line.trim()).filter(Boolean);
    const draft = {
      scheduled_for: value("scheduled_for"),
      season: value("season") as ScheduleEntry["season"],
      theme_name: value("theme_name"),
      content_style_name: value("content_style_name") || null,
      style_name: value("style_name"),
      technique_and_finish: value("technique_and_finish"),
      color_palette: value("color_palette"),
      approx_date: value("approx_date") || null,
      content_hook: value("content_hook") || null,
      event_anchors: lines("event_anchors"),
      research_window: value("research_window") || null,
      research_prompts: lines("research_prompts"),
      timing_note: value("timing_note") || null,
    };

    if (isDemo && canAddTheme) {
      const cycleNumber = Math.max(0, ...visibleEntries.map((entry) => entry.cycle_number)) + 1;
      const newEntry: ScheduleEntry = {
        ...draft,
        id: `demo-custom-${Date.now()}`,
        location_id: locationId,
        cycle_number: cycleNumber,
      };
      setDraftEntries((current) => [...current, newEntry]);
      setSelectedDate(draft.scheduled_for);
      setAddingEntry(false);
      setEntryMessage("Preview only: this theme was added locally and will disappear when the preview is refreshed.");
      return;
    }

    if (!supabase || !canAddTheme) {
      setEntryError("Only location leadership can add a shared calendar theme.");
      return;
    }
    if (entriesByDate.has(draft.scheduled_for)) {
      setEntryError("A theme already exists on that date. Choose another calendar day.");
      return;
    }

    setSavingEntry(true);
    try {
      const { data: insertedCount, error } = await supabase.rpc("add_shared_content_schedule_entry", {
        p_location_id: locationId,
        p_scheduled_for: draft.scheduled_for,
        p_season: draft.season,
        p_style_name: draft.style_name,
        p_technique_and_finish: draft.technique_and_finish,
        p_color_palette: draft.color_palette,
        p_approx_date: draft.approx_date,
        p_theme_name: draft.theme_name,
        p_content_style_name: draft.content_style_name,
        p_content_hook: draft.content_hook,
        p_event_anchors: draft.event_anchors,
        p_research_window: draft.research_window,
        p_research_prompts: draft.research_prompts,
        p_timing_note: draft.timing_note,
      });
      if (error) {
        setEntryError(`Could not add the shared theme: ${error.message}`);
        return;
      }
      if (!insertedCount) {
        setEntryError("The theme was not added to any salon calendars.");
        return;
      }
      await onCreated();
      setSelectedDate(draft.scheduled_for);
      setAddingEntry(false);
      setEntryMessage(`Theme added to ${insertedCount} salon ${insertedCount === 1 ? "calendar" : "calendars"}.`);
    } catch (error) {
      setEntryError(`Could not add the shared theme: ${error instanceof Error ? error.message : "Unexpected network error."}`);
    } finally {
      setSavingEntry(false);
    }
  }

  return (
    <div className="calendar-layout">
      <section className="content-card calendar-card">
        <div className="list-heading">
          <div><span className="card-kicker">{isDemo ? "SAMPLE CONTENT SCHEDULE" : `${locationName.toUpperCase()} · CONTENT SCHEDULE`}</span><h2>{monthLabel}</h2><p>One salon theme every three weeks · shared across all seven locations.</p></div>
          <div className="calendar-controls">
            {canAddTheme && <button className="button-primary calendar-add-button" onClick={openAddEntry}><Plus size={14} /> Add theme</button>}
            <button className="icon-button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={17} /></button>
            <button className="icon-button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={17} /></button>
          </div>
        </div>
        <div className="calendar-grid">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span className="weekday" key={day}>{day}</span>)}
          {monthCells.map((cell) => {
            const entry = entriesByDate.get(cell.date);
            return <button type="button" aria-label={entry ? `${entry.theme_name ?? entry.style_name}, ${formatScheduleDate(cell.date)}` : formatScheduleDate(cell.date)} className={`calendar-day ${!cell.inMonth ? "day-muted" : ""} ${cell.date === todayInLosAngeles() ? "day-today" : ""} ${cell.date === selectedDate ? "day-selected" : ""}`} key={cell.date} onClick={() => setSelectedDate(cell.date)}>
              <span>{cell.day}</span>{entry && <span className="calendar-event">C{entry.cycle_number} · {entry.theme_name ?? entry.style_name}</span>}
            </button>;
          })}
        </div>
        {isDemo && <div className="calendar-sample-note"><Sparkles size={14} /> Sample schedule preview. Apply the calendar and research migrations, then rerun bootstrap to load the schedule and research briefs in Supabase.</div>}
        {entryMessage && <div className="calendar-sample-note"><Check size={14} /> {entryMessage}</div>}
        {entryError && !addingEntry && <div className="inline-error" role="alert"><X size={15} />{entryError}</div>}
        {!isDemo && entries.some((entry) => !entry.research_prompts?.length) && <div className="calendar-sample-note"><CircleHelp size={14} /> Research briefs are not loaded yet. Rerun <code>supabase/bootstrap.sql</code> after applying the research migration.</div>}
        {!isDemo && entries.length === 0 && <div className="calendar-sample-note"><CircleHelp size={14} /> No schedule entries were found for this location. Apply the calendar migration, then rerun <code>supabase/bootstrap.sql</code>.</div>}
      </section>
      <aside className="content-card moments-card">
        <span className="card-kicker">{selectedEntry ? `CYCLE ${selectedEntry.cycle_number} · ${selectedEntry.season.toUpperCase()}` : "UP NEXT"}</span>
        <h2>{selectedEntry?.theme_name ?? selectedEntry?.style_name ?? "Upcoming themes"}</h2>
        {selectedEntry ? <div className="selected-theme">
          <div className="moment-item"><div className="moment-date"><strong>{formatScheduleDate(selectedEntry.scheduled_for, { day: "numeric" })}</strong><span>{formatScheduleDate(selectedEntry.scheduled_for, { month: "short" }).toUpperCase()}</span></div><div><strong>{formatScheduleDate(selectedEntry.scheduled_for, { weekday: "long", year: "numeric" })}</strong><span>Los Angeles · every 3 weeks</span></div></div>
          {selectedEntry.content_hook && <p className="theme-hook">“{selectedEntry.content_hook}”</p>}
          {selectedEntry.approx_date && <div className="theme-detail"><span>APPROXIMATE CULTURAL DATE</span><strong>{formatScheduleDate(selectedEntry.approx_date, { weekday: "long", year: "numeric" })}</strong></div>}
          <div className="theme-detail"><span>NAIL STYLE</span><strong>{selectedEntry.style_name}</strong></div>
          {selectedEntry.content_style_name && selectedEntry.content_style_name !== selectedEntry.style_name && <div className="theme-detail"><span>CONTENT STYLE</span><strong>{selectedEntry.content_style_name}</strong></div>}
          <div className="theme-detail"><span>TECHNIQUE & FINISH</span><strong>{selectedEntry.technique_and_finish}</strong></div>
          <div className="theme-detail"><span>COLOR PALETTE</span><strong>{selectedEntry.color_palette}</strong></div>
          {selectedEntry.event_anchors?.length ? <div className="theme-detail"><span>EVENT ANCHORS</span><div className="event-anchor-list">{selectedEntry.event_anchors.map((anchor) => <span key={anchor}>{anchor}</span>)}</div></div> : null}
          {selectedEntry.research_window && <div className="theme-detail"><span>RESEARCH WINDOW</span><strong>{selectedEntry.research_window}</strong></div>}
          {selectedEntry.research_prompts?.length ? <details className="research-details">
            <summary>Research brief · {selectedEntry.research_prompts.length} prompts</summary>
            <ol>{selectedEntry.research_prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol>
          </details> : null}
          {selectedEntry.timing_note && <div className="timing-note"><CircleHelp size={14} /><span>{selectedEntry.timing_note}</span></div>}
        </div> : nextEntries.map((entry) => <button className="moment-item moment-button" key={entry.id} onClick={() => { setSelectedDate(entry.scheduled_for); setMonth(new Date(`${entry.scheduled_for}T00:00:00.000Z`)); }}>
          <div className="moment-date"><strong>{formatScheduleDate(entry.scheduled_for, { day: "numeric" })}</strong><span>{formatScheduleDate(entry.scheduled_for, { month: "short" }).toUpperCase()}</span></div><div><strong>{entry.theme_name ?? entry.style_name}</strong><span>Cycle {entry.cycle_number} · {entry.season} · {entry.content_hook ?? entry.color_palette}</span></div><span className="moment-indicator" />
        </button>)}
        <div className="calendar-hint"><CalendarDays size={16} /><p>{entries.length ? "These are content-planning dates, not customer appointment bookings. Every location shares this theme cadence." : "Load the schedule entries to view the 18 planned themes."}</p></div>
      </aside>
      {addingEntry && <div className="review-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !savingEntry) setAddingEntry(false); }}>
        <section className="review-dialog calendar-entry-dialog" role="dialog" aria-modal="true" aria-labelledby="add-theme-title">
          <header className="review-dialog-header">
            <div><span className="card-kicker">{isDemo ? "PREVIEW ONLY" : "SHARED SALON CALENDAR"}</span><h2 id="add-theme-title">Add a content theme</h2></div>
            <button className="icon-button" aria-label="Close add theme form" onClick={() => setAddingEntry(false)} disabled={savingEntry}><X size={19} /></button>
          </header>
          <div className="review-preview-banner"><CalendarDays size={14} /> {isDemo ? "This is a local preview; it will not be saved." : "This theme will be added to all locations in the salon account."}</div>
          <form key={formResetKey} className="calendar-entry-form" onSubmit={saveEntry}>
            <div className="calendar-form-grid">
              <label>Scheduled date<input type="date" name="scheduled_for" value={formDate} onChange={(event) => { setFormDate(event.target.value); setFormSeason(seasonForDate(event.target.value)); }} required /></label>
              <label>Season<select name="season" value={formSeason} onChange={(event) => setFormSeason(event.target.value as ScheduleEntry["season"])}><option>Fall</option><option>Winter</option><option>Spring</option><option>Summer</option></select></label>
              <label className="calendar-form-wide">Theme name<input name="theme_name" maxLength={120} required placeholder="e.g. Velvet After Dark" value={ideaTheme} onChange={(event) => setIdeaTheme(event.target.value)} /></label>
              <label>Nail style<input name="style_name" maxLength={160} required placeholder="e.g. Sculpted chrome lines" value={ideaStyle} onChange={(event) => setIdeaStyle(event.target.value)} /></label>
              <label>Content style <span>optional</span><input name="content_style_name" maxLength={160} placeholder="Editorial name, if different" /></label>
              <label className="calendar-form-wide">Technique & finish<input name="technique_and_finish" maxLength={300} required placeholder="e.g. Magnetic gel, velvet finish" value={ideaTechnique} onChange={(event) => setIdeaTechnique(event.target.value)} /></label>
              <label className="calendar-form-wide">Color palette<input name="color_palette" maxLength={200} required placeholder="e.g. Charcoal and plum" value={ideaPalette} onChange={(event) => setIdeaPalette(event.target.value)} /></label>
              <label>Approximate cultural date <span>optional</span><input type="date" name="approx_date" /></label>
              <label>Research window <span>optional</span><input name="research_window" maxLength={120} placeholder="e.g. Two weeks before shoot" /></label>
              <div className="calendar-content-idea calendar-form-wide">
                <div><span className="card-kicker">CONTENT IDEA SUGGESTION</span><p>{contentIdea}</p><small>Silent visual concept · no speech or on-screen text</small></div>
                <button type="button" className="button-secondary" onClick={() => setContentHook(contentIdea)}>Use idea</button>
              </div>
              <label className="calendar-form-wide">Content hook / idea <span>optional · edit the suggestion as needed</span><textarea name="content_hook" value={contentHook} onChange={(event) => setContentHook(event.target.value)} maxLength={500} rows={3} placeholder="Use the suggestion above or write your own idea" /></label>
              <label className="calendar-form-wide">Event anchors <span>one per line · optional</span><textarea name="event_anchors" maxLength={1609} rows={2} placeholder={"LA event or seasonal moment\nHoliday / cultural anchor"} /></label>
              <label className="calendar-form-wide">Research prompts <span>one per line · optional</span><textarea name="research_prompts" maxLength={6009} rows={3} placeholder={"What is trending for this theme?\nWhat local events are coming up?"} /></label>
              <label className="calendar-form-wide">Timing note <span>optional</span><textarea name="timing_note" maxLength={1000} rows={2} placeholder="Any context about timing or styling" /></label>
            </div>
            {entryError && <div className="inline-error" role="alert"><X size={15} />{entryError}</div>}
            <footer className="calendar-form-actions"><span>New themes continue the cycle numbering.</span><div><button type="button" className="button-secondary" onClick={() => setAddingEntry(false)} disabled={savingEntry}>Cancel</button><button type="submit" className="button-primary" disabled={savingEntry}>{savingEntry ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}{savingEntry ? "Saving…" : "Add to calendar"}</button></div></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}

function SettingsView({ isDemo, configured }: { isDemo: boolean; configured: boolean }) {
  return (
    <div className="settings-layout">
      <section className="content-card settings-card"><span className="card-kicker">WORKSPACE</span><h2>Your studio details</h2><div className="setting-row"><div className="setting-icon"><Flower2 size={17} /></div><div><strong>Bellacures Content Studio</strong><span>{isDemo ? "Preview workspace" : "Connected salon account"}</span></div><button className="button-secondary" disabled>Edit details</button></div><div className="setting-row"><div className="setting-icon"><Grid2X2 size={17} /></div><div><strong>Locations</strong><span>Seven salon locations</span></div><button className="button-secondary" disabled>Manage</button></div><div className="setting-row"><div className="setting-icon"><ShieldCheck size={17} /></div><div><strong>Permissions</strong><span>Technicians upload · leadership reviews</span></div><button className="button-secondary" disabled>View roles</button></div></section>
      <section className="content-card settings-card"><span className="card-kicker">CONNECTIONS</span><h2>Made to work together.</h2><ConnectionRow icon={<Flower2 size={18} />} name="Supabase" detail={configured ? "Project connected" : "Connect your project to enable sign-in and storage"} active={configured} />
        <ConnectionRow icon={<WandSparkles size={18} />} name="Photo composition" detail="Deterministic edits · worker not connected" active={false} />
        <ConnectionRow icon={<Video size={18} />} name="TikTok publishing" detail="Manual export for MVP · API review later" active={false} />
        <ConnectionRow icon={<BadgeCheck size={18} />} name="Stripe billing" detail="Connect after pilot pricing is set" active={false} />
      </section>
    </div>
  );
}

function ReviewPreview({ onClose }: { onClose: () => void }) {
  const [approved, setApproved] = useState(false);
  return <div className="review-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <header className="review-dialog-header"><div><span className="card-kicker">PREVIEW REVIEW</span><h2 id="review-title">Cherry glaze close-up</h2></div><button className="icon-button" aria-label="Close review" onClick={onClose}><X size={19} /></button></header>
      <div className="review-preview-banner"><Sparkles size={14} /> Sample-only review flow. No actual video is generated, approved, or published.</div>
      <div className="review-body">
        <div className="review-video-poster"><div className="review-poster-glow" /><DecorativeNails variant={0} /><span className="review-duration">0:05</span><span className="review-play"><Play size={18} fill="currentColor" /></span><span className="poster-caption">STILL PHOTO COMPOSITION PREVIEW</span></div>
        <div className="review-details"><div className="review-detail-row"><span>LOCATION</span><strong>Beverly Hills</strong></div><div className="review-detail-row"><span>THEME</span><strong>Autumn glow · warm cherry</strong></div><div className="review-detail-row"><span>CREATIVE TREATMENT</span><strong>Slow macro push-in · soft ambient light</strong></div><div className="review-guardrail"><ShieldCheck size={16} /><span>Original nail color and design stay the source of truth. No generated text or speech.</span></div></div>
      </div>
      <footer className="review-dialog-footer"><span>{approved ? <><Check size={15} /> Preview approval noted locally only</> : "Leadership approval required before export."}</span><div><button className="button-secondary" onClick={onClose}>{approved ? "Close" : "Request changes"}</button><button className="button-primary" onClick={() => setApproved(true)} disabled={approved}><BadgeCheck size={15} />{approved ? "Preview approved" : "Approve preview"}</button></div></footer>
    </section>
  </div>;
}

type ReviewDecision = "approved" | "rejected" | "changes_requested";
type ReviewHistoryEntry = {
  id: string;
  decision: ReviewDecision;
  note: string | null;
  created_at: string;
};

function ReviewDialog({
  job,
  assets,
  locationName,
  supabase,
  onClose,
  onReviewed,
}: {
  job: ContentJob;
  assets: Asset[];
  locationName: string;
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onReviewed: () => Promise<void>;
}) {
  const sourceAsset = assets.find((asset) => asset.id === job.media_asset_id);
  const [videoUrl, setVideoUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadReviewMedia() {
      if (!job.generated_object_path) {
        setError("This job does not have a generated video available.");
        setLoading(false);
        return;
      }
      const [videoResult, sourceResult, historyResult] = await Promise.all([
        supabase.storage.from("salon-media").createSignedUrl(job.generated_object_path, 900),
        sourceAsset?.object_path
          ? supabase.storage.from("salon-media").createSignedUrl(sourceAsset.object_path, 900)
          : Promise.resolve({ data: null, error: null }),
        supabase.from("content_job_reviews")
          .select("id, decision, note, created_at")
          .eq("content_job_id", job.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (cancelled) return;
      if (videoResult.error) {
        setError(`Could not load the generated video: ${videoResult.error.message}`);
      } else if (sourceResult.error) {
        setError(`Could not load the source media: ${sourceResult.error.message}`);
      } else if (historyResult.error) {
        setError(`Could not load review history: ${historyResult.error.message}`);
      } else {
        setVideoUrl(videoResult.data.signedUrl);
        setSourceUrl(sourceResult.data?.signedUrl ?? "");
        setReviewHistory(historyResult.data ?? []);
      }
      setLoading(false);
    }
    void loadReviewMedia();
    return () => { cancelled = true; };
  }, [job.generated_object_path, job.id, sourceAsset?.object_path, supabase]);

  async function submitDecision(decision: ReviewDecision) {
    setError("");
    if (decision !== "approved" && !note.trim()) {
      setError("Add a reason when requesting changes or rejecting this video.");
      return;
    }
    setSubmitting(true);
    const { error: reviewError } = await supabase.rpc("review_content_job", {
      p_job_id: job.id,
      p_decision: decision,
      p_note: note.trim() || null,
    });
    setSubmitting(false);
    if (reviewError) {
      setError(`Could not save your review: ${reviewError.message}`);
      return;
    }
    await onReviewed();
  }

  return <div className="review-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
    <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="live-review-title">
      <header className="review-dialog-header"><div><span className="card-kicker">LEADERSHIP REVIEW</span><h2 id="live-review-title">{sourceAsset?.original_name ?? "Generated salon video"}</h2></div><button className="icon-button" aria-label="Close review" onClick={onClose} disabled={submitting}><X size={19} /></button></header>
      <div className="review-preview-banner"><ShieldCheck size={14} /> Review the generated video before approving it for manual export. Approval does not publish to TikTok.</div>
      <div className="review-body">
        <div className="live-review-media">
          {loading ? <div className="review-media-placeholder"><LoaderCircle className="spin" size={22} />Loading private review media…</div>
            : videoUrl ? <video className="review-video" src={videoUrl} controls playsInline preload="metadata" aria-label="Generated salon video for review" />
              : <div className="review-media-placeholder"><Film size={21} />Generated video unavailable</div>}
          <div className="review-source">
            <span className="card-kicker">SOURCE MEDIA · {sourceAsset?.original_name ?? "Original upload"}</span>
            {sourceUrl && sourceAsset?.mime_type?.startsWith("video/")
              ? <video className="review-source-video" src={sourceUrl} controls playsInline preload="metadata" aria-label="Original uploaded video" />
              : <div className="review-source-image" role="img" aria-label={`Original source: ${sourceAsset?.original_name ?? "uploaded media"}`} style={sourceUrl ? { backgroundImage: `url(${JSON.stringify(sourceUrl)})` } : undefined}>{!sourceUrl && <ImagePlus size={20} />}</div>}
          </div>
        </div>
        <div className="review-details">
          <div className="review-detail-row"><span>LOCATION</span><strong>{locationName}</strong></div>
          <div className="review-detail-row"><span>JOB STATUS</span><strong>{job.status.replaceAll("_", " ")}</strong></div>
          <div className="review-detail-row"><span>CREATED</span><strong>{formatDate(job.created_at)}</strong></div>
          {job.review_note && <div className="review-detail-row"><span>PREVIOUS REVIEW NOTE</span><strong>{job.review_note}</strong></div>}
          <label className="review-note-label" htmlFor="review-note">Review note <span>Required for changes or rejection</span></label>
          <textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} placeholder="Share a clear, helpful note for the next pass." />
          <div className="review-guardrail"><ShieldCheck size={16} /><span>Only designated location leadership can record this decision. Every review is kept in the audit history.</span></div>
          {reviewHistory.length > 0 && <div className="review-history"><span className="card-kicker">RECENT REVIEW HISTORY</span><ol>{reviewHistory.map((entry) => <li key={entry.id}><strong>{entry.decision.replaceAll("_", " ")}</strong><time>{formatDate(entry.created_at)}</time>{entry.note && <p>{entry.note}</p>}</li>)}</ol></div>}
        </div>
      </div>
      {(error || loading) && <div className={`review-action-message ${error ? "review-error" : ""}`} role={error ? "alert" : "status"}>{error || "Loading signed, private media…"}</div>}
      <footer className="review-dialog-footer"><span>Approved videos are prepared for manual export only.</span><div>
        <button className="button-secondary" onClick={() => void submitDecision("changes_requested")} disabled={submitting || loading || !videoUrl}><WandSparkles size={14} /> Request changes</button>
        <button className="button-secondary" onClick={() => void submitDecision("rejected")} disabled={submitting || loading || !videoUrl}><X size={14} /> Reject</button>
        <button className="button-primary" onClick={() => void submitDecision("approved")} disabled={submitting || loading || !videoUrl}>{submitting ? <LoaderCircle className="spin" size={15} /> : <BadgeCheck size={15} />}{submitting ? "Saving…" : "Approve for export"}</button>
      </div></footer>
    </section>
  </div>;
}

function ConnectionRow({ icon, name, detail, active }: { icon: ReactNode; name: string; detail: string; active: boolean }) {
  return <div className="connection-row"><div className="connection-icon">{icon}</div><div><strong>{name}</strong><span>{detail}</span></div><span className={`connection-state ${active ? "connected" : ""}`}><i />{active ? "Connected" : "Not connected"}</span></div>;
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><div className="stat-sparkline" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div></article>;
}

function JobRows({ onClick, showReview = false }: { onClick: () => void; showReview?: boolean }) {
  return <div className="job-table">
    {sampleJobs.map((job, index) => <button className="job-row" onClick={onClick} key={job.title}>
      <div className={`job-art job-art-${job.color}`}><DecorativeNails variant={index} />{showReview && index === 0 && <span className="job-play"><Play size={13} fill="currentColor" /></span>}</div>
      <div className="job-main"><strong>{job.title}</strong><span><i className={`location-dot location-dot-${job.color}`} />{job.location} <span className="job-separator">·</span> {job.time}</span></div>
      <StatusPill status={job.status} />
      {showReview && index === 0 ? <span className="review-button">Review <ArrowRight size={14} /></span> : <MoreHorizontal className="job-more" size={18} />}
    </button>)}
  </div>;
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{description}</p></div>;
}

function FileKind({ name }: { name: string }) {
  const isVideo = name.toLowerCase().endsWith(".mp4");
  return isVideo ? <Video size={18} /> : <ImagePlus size={18} />;
}

function DecorativeNails({ variant }: { variant: number }) {
  const nails = [
    ["#f2bec1", "#d98c97", "#9b5466"],
    ["#dec7ed", "#b798d1", "#856aa8"],
    ["#e7c5a7", "#bb755d", "#824650"],
    ["#f2d8c6", "#d6a49d", "#745466"],
  ][variant % 4];
  return <div className="decorative-nails"><span style={{ background: `linear-gradient(150deg, #fff9f4, ${nails[0]})` }} /><span style={{ background: `linear-gradient(150deg, #fff8f2, ${nails[1]})` }} /><span style={{ background: `linear-gradient(150deg, #fff9f4, ${nails[2]})` }} /><span style={{ background: `linear-gradient(150deg, #fff8f2, ${nails[1]})` }} /><span style={{ background: `linear-gradient(150deg, #fff9f4, ${nails[0]})` }} /></div>;
}
