"use client";

import { ArrowLeft, Flower2, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!configured) {
      setError("Add your Supabase project URL and publishable key to web/.env.local, then restart the app.");
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/");
  }

  return (
    <main className="login-shell">
      <section className="login-aside">
        <Link className="login-brand" href="/"><span className="brand-mark"><Flower2 size={22} /></span><span><strong>bellacure</strong><small>CONTENT STUDIO</small></span></Link>
        <div className="login-art">
          <div className="login-orbit login-orbit-one" /><div className="login-orbit login-orbit-two" />
          <div className="login-hand">
            <span className="login-finger finger-one"><i /></span><span className="login-finger finger-two"><i /></span><span className="login-finger finger-three"><i /></span><span className="login-finger finger-four"><i /></span><span className="login-palm" />
          </div>
          <div className="login-art-copy"><span>THE WORK IS YOURS.</span><strong>We help it<br />find its moment.</strong></div>
          <span className="login-art-caption">A softer way to share what you do.</span>
        </div>
        <div className="login-aside-footer"><ShieldCheck size={14} /> Your originals always stay yours</div>
      </section>
      <section className="login-main">
        <div className="login-card">
          <Link className="back-link" href="/"><ArrowLeft size={15} /> Back to studio preview</Link>
          <span className="card-kicker">WELCOME BACK</span>
          <h1>Your studio,<br />right where you left it.</h1>
          <p className="login-description">Sign in with the email your salon administrator invited.</p>
          {!configured && <div className="login-setup-note">Supabase project details are not configured yet. The preview dashboard remains available until then.</div>}
          <form className="login-form" onSubmit={signIn}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@your-salon.com" /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
            <button className="button-primary login-submit" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className="spin" size={17} /> : null}Sign in to your studio</button>
            {error && <p className="login-error" role="alert">{error}</p>}
          </form>
          <div className="login-no-account">Need access? <a href="mailto:hello@bellacure.com">Ask your salon administrator</a></div>
        </div>
        <span className="login-bottom-note">Made with care for the work you do.</span>
      </section>
    </main>
  );
}
