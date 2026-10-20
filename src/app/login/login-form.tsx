"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  const origin = typeof window !== "undefined" ? window.location.origin : env.siteUrl;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const google = async () => {
    setError("");
    setLoading(true);
    const { error: authError } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (authError) {
      setError("Google sign-in isn't available right now. Please try again in a minute.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-[var(--radius-md)] bg-danger-soft px-3.5 py-2.5 text-sm font-bold text-danger">{error}</p>}
      <Button variant="outline" size="lg" className="w-full" onClick={google} loading={loading} disabled={loading}>
        {!loading && <GoogleIcon />} Continue with Google
      </Button>
      <p className="text-center text-sm text-muted">
        One tap with your Google account. New here? This creates your free Pupmeow profile.
      </p>
      <p className="text-center text-xs text-muted">
        WhatsApp on your profile is for lost &amp; adoption contact only — not for logging in (for now).
      </p>
    </div>
  );
}
