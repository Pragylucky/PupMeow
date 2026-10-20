"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail, MailOpen, RotateCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmail.in": "gmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.co.in", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "outlok.com": "outlook.com", "rediffmial.com": "rediffmail.com",
};

function suggestFor(email: string) {
  const [user, domain] = email.trim().toLowerCase().split("@");
  if (!user || !domain) return null;
  const fix = DOMAIN_FIXES[domain];
  return fix ? `${user}@${fix}` : null;
}

function inboxUrl(email: string) {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  if (d === "gmail.com" || d === "googlemail.com") return { label: "Open Gmail", href: "https://mail.google.com/mail/u/0/#inbox" };
  if (/^(outlook|hotmail|live)\./.test(d)) return { label: "Open Outlook", href: "https://outlook.live.com/mail/" };
  if (d.startsWith("yahoo.")) return { label: "Open Yahoo Mail", href: "https://mail.yahoo.com/" };
  return null;
}

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "code">("start");
  const [loading, setLoading] = useState<"google" | "email" | "verify" | null>(null);
  const [error, setError] = useState(initialError ?? "");
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : env.siteUrl;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const suggestion = suggestFor(email);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const google = async () => {
    setError("");
    setLoading("google");
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setError("Google sign-in isn't available right now. Use your email instead.");
      setLoading(null);
    }
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading("email");
    const { error } = await createClient().auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    setLoading(null);
    if (error) {
      console.error("[login] signInWithOtp failed", error.status, error.code, error.message);
      if (error.code === "over_email_send_rate_limit") setError("We've hit the email limit for now. Try again in an hour, or continue with Google.");
      else if (error.status === 429) setError("Too many attempts. Please wait a minute and try again.");
      else setError("We couldn't send the email. Check the address and try again.");
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(60);
  };

  const verify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) { setError("Enter the 6-digit code from the email."); return; }
    setError("");
    setLoading("verify");
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) {
      setLoading(null);
      console.error("[login] verifyOtp failed", error.status, error.code, error.message);
      setError(error.code === "otp_expired" ? "That code has expired or isn't right. Check the newest email, or send a new code." : "That code didn't work. Check the newest email and try again.");
      return;
    }
    window.location.assign(`/auth/callback-done?next=${encodeURIComponent(next)}`);
  };

  if (step === "code") {
    const inbox = inboxUrl(email);
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => { setStep("start"); setError(""); }} className="inline-flex items-center gap-1 text-sm font-bold text-muted hover:text-text">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Use a different email
        </button>
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-cream p-4 text-ink">
          <MailOpen className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <p className="text-[0.95rem] font-semibold">We sent a 6-digit code to <strong className="break-all">{email.trim()}</strong>. It also has a sign-in link: open it in this same browser.</p>
        </div>
        {error && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3.5 py-2.5 text-sm font-bold text-danger">{error}</p>}
        <form onSubmit={verify} className="space-y-3" noValidate>
          <label htmlFor="otp" className="block text-sm font-bold">Sign-in code</label>
          <input
            id="otp"
            ref={codeRef}
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
            }}
            placeholder="••••••"
            className="h-16 w-full rounded-[var(--radius-md)] border-2 border-border bg-surface text-center font-heading text-[2rem] font-semibold tracking-[0.55em] placeholder:text-muted/40 focus:border-primary focus:outline-none"
          />
          <Button type="submit" size="lg" className="w-full" loading={loading === "verify"} disabled={code.length < 6}>Verify and continue</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          {inbox && <a href={inbox.href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-border px-4 text-sm font-bold hover:border-text"><Mail className="h-4 w-4" aria-hidden /> {inbox.label}</a>}
          <Button variant="ghost" size="sm" disabled={cooldown > 0 || loading !== null} onClick={() => sendCode()}>
            <RotateCw className="h-4 w-4" aria-hidden /> {cooldown > 0 ? `Resend in 0:${String(cooldown).padStart(2, "0")}` : "Send a new code"}
          </Button>
        </div>
        <p className="text-xs text-muted">Can&apos;t find it? Check Promotions and Spam. Only the newest email works.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3.5 py-2.5 text-sm font-bold text-danger">{error}</p>}
      <Button variant="outline" size="lg" className="w-full" onClick={google} loading={loading === "google"} disabled={loading !== null}>
        {loading !== "google" && <GoogleIcon />} Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-wider text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={sendCode} className="space-y-3" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leading={<Mail className="h-4 w-4" />}
          required
        />
        {suggestion && (
          <p className="text-sm font-semibold" aria-live="polite">
            Did you mean <button type="button" className="font-extrabold text-primary underline underline-offset-2" onClick={() => setEmail(suggestion)}>{suggestion}</button>?
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading === "email"} disabled={loading !== null}>
          {loading !== "email" && <Mail className="h-5 w-5" aria-hidden />} Email me a sign-in code
        </Button>
      </form>
      <p className="text-center text-sm text-muted">No password to remember. New here? This creates your free account.</p>
    </div>
  );
}
