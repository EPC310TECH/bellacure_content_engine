"use client";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
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
import { ChangeEvent, DragEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Section = "overview" | "uploads" | "jobs" | "calendar" | "settings";
type Location = { id: string; name: string; role: string };
type Asset = {
  id: string;
  original_name: string;
  status: string;
  created_at: string;
  location_id: string;
  demo?: boolean;
};
type ContentJob = {
  id: string;
  status: string;
  stage: string;
  created_at: string;
  location_id: string;
  media_asset_id: string;
};

const demoLocations: Location[] = Array.from({ length: 7 }, (_, index) => ({
  id: `demo-${index + 1}`,
  name: `Salon location ${String(index + 1).padStart(2, "0")}`,
  role: index === 0 ? "leadership" : "technician",
}));

const demoAssets: Asset[] = [
  { id: "a1", original_name: "glazed-cherry-set.jpg", status: "ready", created_at: "2026-10-06T15:42:00", location_id: "demo-1", demo: true },
  { id: "a2", original_name: "autumn-chrome-detail.jpg", status: "processing", created_at: "2026-10-06T14:18:00", location_id: "demo-1", demo: true },
  { id: "a3", original_name: "soft-marble-french.jpg", status: "ready", created_at: "2026-10-05T11:06:00", location_id: "demo-1", demo: true },
];

const sampleJobs = [
  { title: "Cherry glaze close-up", location: "Beverly Grove", status: "Ready for review", color: "rose", time: "12 min ago", initials: "BG" },
  { title: "Soft chrome, autumn light", location: "West Hollywood", status: "Composing", color: "lilac", time: "34 min ago", initials: "WH" },
  { title: "A little fall in love", location: "Silver Lake", status: "Awaiting photos", color: "amber", time: "1 hr ago", initials: "SL" },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
}

function StatusPill({ status }: { status: string }) {
  const style = status === "ready" || status === "Ready for review"
    ? "status-ready"
    : status === "processing" || status === "Composing"
      ? "status-progress"
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
  const isDemo = !configured;
  const currentLocation = locations.find((location) => location.id === locationId);
  const isLeadership = !isDemo && currentLocation?.role === "leadership";

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
      .select("id, original_name, status, created_at, location_id")
      .in("location_id", ids)
      .order("created_at", { ascending: false })
      .limit(12);
    if (assetsError) {
      setErrorMessage(`Could not load uploaded media: ${assetsError.message}`);
    } else {
      setAssets(assetRows ?? []);
    }
    const { data: jobRows, error: jobsError } = await supabase
      .from("content_jobs")
      .select("id, status, stage, created_at, location_id, media_asset_id")
      .in("location_id", ids)
      .order("created_at", { ascending: false })
      .limit(25);
    if (jobsError) {
      setErrorMessage(`Could not load the content queue: ${jobsError.message}`);
    } else {
      setJobs(jobRows ?? []);
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
        .select("id, original_name, status, created_at, location_id")
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
        .select("id, status, stage, created_at, location_id, media_asset_id")
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
          <div><strong>bellacure</strong><span>CONTENT STUDIO</span></div>
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
              <div className="eyebrow"><span className="eyebrow-dot" /> BELLACURE STUDIO <span className="eyebrow-slash">/</span> {currentLocation?.name.toUpperCase() ?? "YOUR WORKSPACE"}</div>
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
              assets={selectedAssets}
              jobs={jobs.filter((job) => job.location_id === locationId)}
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
            />
          )}
          {section === "uploads" && (
            <Uploads
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
          {section === "jobs" && <Jobs isDemo={isDemo} isLeadership={isLeadership || isDemo} jobs={jobs.filter((job) => job.location_id === locationId)} assets={selectedAssets} onReview={() => setReviewPreviewOpen(true)} />}
          {section === "calendar" && <CalendarView isDemo={isDemo} />}
          {section === "settings" && <SettingsView isDemo={isDemo} configured={configured} />}
        </div>
        <footer className="page-footer"><span>Made with care for the work you do.</span><span><ShieldCheck size={14} /> Your originals always stay yours</span></footer>
      </section>

      <input id="media-upload" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple onChange={onFileChange} />
      {reviewPreviewOpen && isDemo && <ReviewPreview onClose={() => setReviewPreviewOpen(false)} />}
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

function Overview(props: UploadProps & { isLeadership: boolean; jobs: ContentJob[]; onJobs: () => void; onUploads: () => void }) {
  const ready = props.assets.filter((asset) => asset.status === "ready").length;
  const queueCount = props.isDemo ? 3 : props.jobs.filter((job) => job.status !== "approved" && job.status !== "rejected").length;
  return (
    <>
      <div className="stats-grid">
        <StatCard label="In your library" value={props.isDemo ? "24" : String(props.assets.length)} detail="Originals, kept safe" icon={<ImagePlus size={18} />} tone="lavender" />
        <StatCard label="Ready to create" value={props.isDemo ? "18" : String(ready)} detail="Photos with a little magic" icon={<Sparkles size={18} />} tone="peach" />
        <StatCard label={props.isLeadership ? "In the studio queue" : "Being prepared"} value={String(queueCount)} detail="Moving along nicely" icon={<Activity size={18} />} tone="mint" />
        <StatCard label={props.isLeadership ? "Ready to review" : "Published this month"} value={props.isDemo ? (props.isLeadership ? "2" : "4") : "0"} detail={props.isLeadership ? "Your approval makes it real" : "Little moments, shared"} icon={<BadgeCheck size={18} />} tone="cream" />
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
            <div className="section-card-top"><div><span className="card-kicker">COMING UP · SAMPLE</span><h2>A little autumn glow</h2></div><button className="more-button" aria-label="More options"><MoreHorizontal size={19} /></button></div>
            <div className="season-art"><div className="season-sun" /><div className="season-orbit orbit-one" /><div className="season-orbit orbit-two" /><div className="nail-shape nail-one" /><div className="nail-shape nail-two" /><div className="nail-shape nail-three" /><span className="season-caption">soft light <i>·</i> warm tones <i>·</i> you</span></div>
            <div className="schedule-meta"><span><CalendarDays size={15} /> October 10</span><span className="schedule-dot" /><span>Sample theme</span></div>
            <p className="schedule-description">A slow, close-up look at your favorite autumn set. No fuss, just the details.</p>
            <button className="card-link" onClick={props.onJobs}>See sample queue <ArrowRight size={15} /></button>
          </> : <>
            <div className="section-card-top"><div><span className="card-kicker">SCHEDULE</span><h2>Your next theme starts here.</h2></div><CalendarDays size={18} color="#a17a86" /></div>
            <div className="season-art schedule-empty"><CalendarDays size={24} /><span>No schedule configured</span></div>
            <p className="schedule-description">Calendar themes will appear after schedules and the background worker are connected.</p>
            <button className="card-link" onClick={props.onJobs}>View setup status <ArrowRight size={15} /></button>
          </>}
        </section>
      </div>

      <section className="content-card jobs-card">
        <div className="list-heading"><div><span className="card-kicker">{props.isLeadership ? "STUDIO QUEUE" : "YOUR RECENT WORK"}</span><h2>{props.isLeadership ? "A little progress, everywhere." : "Recently added"}</h2></div><button className="card-link" onClick={props.onJobs}>View all <ArrowRight size={15} /></button></div>
        {props.isDemo ? <JobRows onClick={props.onJobs} /> : props.jobs.length ? (
          <div className="asset-table">
            {props.jobs.slice(0, 4).map((job) => {
              const asset = props.assets.find((item) => item.id === job.media_asset_id);
              return <div className="asset-row" key={job.id}><div className="asset-thumb"><FileKind name={asset?.original_name ?? "Queued media"} /></div><div className="asset-info"><strong>{asset?.original_name ?? "Salon media"}</strong><span>{formatDate(job.created_at)} · {job.stage.replaceAll("_", " ")}</span></div><StatusPill status={job.status} /></div>;
            })}
          </div>
        ) : <EmptyState icon={<ImagePlus size={20} />} title="Your first upload starts here" description="Add a photo of your latest set and it will appear in this space." />}
      </section>
    </>
  );
}

function Uploads(props: UploadProps) {
  return (
    <>
      <section className="content-card upload-page-card">
        <div className="list-heading"><div><span className="card-kicker">ADD TO YOUR LIBRARY</span><h2>Upload a finished set</h2><p>Photos first. Your original is always kept unchanged.</p></div><div className="upload-page-badge"><ShieldCheck size={14} /> Private library</div></div>
        <UploadDropzone {...props} />
      </section>
      <section className="content-card library-card">
        <div className="list-heading"><div><span className="card-kicker">YOUR ORIGINALS</span><h2>Recently added</h2></div><button className="filter-button"><span className="status-dot" /> All media <ChevronDown size={14} /></button></div>
        {props.assets.length ? <div className="library-grid">{props.assets.map((asset, index) => <article className="library-item" key={asset.id}><div className={`library-art art-${index % 4}`}><DecorativeNails variant={index % 4} /><span className="library-kind">{asset.original_name.toLowerCase().endsWith(".mp4") ? <Video size={13} /> : <ImagePlus size={13} />}</span><button className="play-preview" aria-label={`Preview ${asset.original_name}`}><Play size={15} fill="currentColor" /></button></div><div className="library-caption"><div><strong>{asset.original_name}</strong><span>{formatDate(asset.created_at)}</span></div><StatusPill status={asset.status} /></div></article>)}</div> : <EmptyState icon={<ImagePlus size={20} />} title="Your library is ready for its first photo" description="Upload your favorite finished set to get started." />}
      </section>
    </>
  );
}

function Jobs({ isDemo, isLeadership, jobs, assets, onReview }: { isDemo: boolean; isLeadership: boolean; jobs: ContentJob[]; assets: Asset[]; onReview: () => void }) {
  return (
    <>
      <div className="stats-grid jobs-stats">
        <StatCard label="In progress" value={isDemo ? "3" : "0"} detail="Being prepared" icon={<Activity size={18} />} tone="lavender" />
        <StatCard label="Needs your eye" value={isDemo && isLeadership ? "2" : "0"} detail="Waiting for review" icon={<ShieldCheck size={18} />} tone="peach" />
        <StatCard label="Ready to share" value="0" detail="Approved and waiting" icon={<BadgeCheck size={18} />} tone="mint" />
        <StatCard label="Published this month" value={isDemo ? "4" : "0"} detail="Sent out with care" icon={<Video size={18} />} tone="cream" />
      </div>
      <section className="content-card jobs-card full-jobs-card">
        <div className="list-heading"><div><span className="card-kicker">{isLeadership ? "ALL LOCATIONS" : "YOUR CONTENT"}</span><h2>{isLeadership ? "Your studio queue" : "Jobs from your uploads"}</h2><p>{isLeadership ? "A gentle overview of every location's work." : "See how your uploads are coming along."}</p></div><button className="filter-button">All stages <ChevronDown size={14} /></button></div>
        {isDemo ? <JobRows onClick={onReview} showReview={isLeadership} /> : jobs.length ? <div className="asset-table">
          {jobs.map((job) => {
            const asset = assets.find((item) => item.id === job.media_asset_id);
            return <div className="asset-row" key={job.id}><div className="asset-thumb"><FileKind name={asset?.original_name ?? "Queued media"} /></div><div className="asset-info"><strong>{asset?.original_name ?? "Salon media"}</strong><span>{formatDate(job.created_at)} · {job.stage.replaceAll("_", " ")}</span></div><StatusPill status={job.status} /></div>;
          })}
        </div> : <EmptyState icon={<Film size={20} />} title="No video jobs yet" description="Your uploads will appear here when they enter the content queue." />}
        <div className="worker-note"><Clock3 size={15} /><span>The MVP dashboard is ready. Background composition and video workers will be connected next.</span></div>
      </section>
    </>
  );
}

function CalendarView({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return <section className="content-card"><span className="card-kicker">SCHEDULE SETUP</span><h2>Calendar themes are coming next.</h2><p className="heading-subtitle">The calendar view will show salon schedules and verified Los Angeles events after the scheduler and worker are connected.</p><EmptyState icon={<CalendarDays size={20} />} title="No schedules configured yet" description="Nothing will be generated on a schedule until leadership configures one." /></section>;
  }
  return (
    <div className="calendar-layout">
      <section className="content-card calendar-card">
        <div className="list-heading"><div><span className="card-kicker">OCTOBER 2026</span><h2>A season for the details.</h2><p>Your themes are just a starting point. Your work makes them yours.</p></div><button className="button-secondary"><CalendarDays size={15} /> Month view</button></div>
        <div className="calendar-grid">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span className="weekday" key={day}>{day}</span>)}{Array.from({ length: 35 }, (_, index) => {
          const day = index - 2;
          const valid = day > 0 && day <= 31;
          const event = isDemo && [10, 17, 24, 31].includes(day);
          return <div className={`calendar-day ${!valid ? "day-muted" : ""} ${day === 6 ? "day-today" : ""}`} key={index}>{valid ? day : day < 1 ? 30 + day : day - 31}{event && <span className="calendar-event">{day === 10 ? "Autumn glow" : day === 17 ? "Chrome story" : day === 24 ? "Soft seasonal" : "Your next set"}</span>}</div>;
        })}</div>
      </section>
      <aside className="content-card moments-card"><span className="card-kicker">UP NEXT</span><h2>Little moments worth sharing.</h2><div className="moment-item"><div className="moment-date"><strong>10</strong><span>OCT</span></div><div><strong>Autumn glow</strong><span>Still-photo edit · 1 location</span></div><span className="moment-indicator" /></div><div className="moment-item"><div className="moment-date"><strong>17</strong><span>OCT</span></div><div><strong>Chrome story</strong><span>Seasonal color · 2 locations</span></div><span className="moment-indicator moment-indicator-lilac" /></div><div className="calendar-hint"><Sparkles size={16} /><p>{isDemo ? "Connect your calendar and content schedule when the project is configured." : "Your scheduled themes will appear here once schedules are set up."}</p></div></aside>
    </div>
  );
}

function SettingsView({ isDemo, configured }: { isDemo: boolean; configured: boolean }) {
  return (
    <div className="settings-layout">
      <section className="content-card settings-card"><span className="card-kicker">WORKSPACE</span><h2>Your studio details</h2><div className="setting-row"><div className="setting-icon"><Flower2 size={17} /></div><div><strong>BellaCure Content Studio</strong><span>{isDemo ? "Preview workspace" : "Connected salon account"}</span></div><button className="button-secondary" disabled>Edit details</button></div><div className="setting-row"><div className="setting-icon"><Grid2X2 size={17} /></div><div><strong>Locations</strong><span>Seven salon locations</span></div><button className="button-secondary" disabled>Manage</button></div><div className="setting-row"><div className="setting-icon"><ShieldCheck size={17} /></div><div><strong>Permissions</strong><span>Technicians upload · leadership reviews</span></div><button className="button-secondary" disabled>View roles</button></div></section>
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
        <div className="review-details"><div className="review-detail-row"><span>LOCATION</span><strong>Beverly Grove</strong></div><div className="review-detail-row"><span>THEME</span><strong>Autumn glow · warm cherry</strong></div><div className="review-detail-row"><span>CREATIVE TREATMENT</span><strong>Slow macro push-in · soft ambient light</strong></div><div className="review-guardrail"><ShieldCheck size={16} /><span>Original nail color and design stay the source of truth. No generated text or speech.</span></div></div>
      </div>
      <footer className="review-dialog-footer"><span>{approved ? <><Check size={15} /> Preview approval noted locally only</> : "Leadership approval required before export."}</span><div><button className="button-secondary" onClick={onClose}>{approved ? "Close" : "Request changes"}</button><button className="button-primary" onClick={() => setApproved(true)} disabled={approved}><BadgeCheck size={15} />{approved ? "Preview approved" : "Approve preview"}</button></div></footer>
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
