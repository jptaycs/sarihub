"use client";

import { useState } from "react";

import type { OAuthProvider } from "~/lib/auth/oauthProviders";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { createSupabaseBrowser } from "~/lib/supabase/browser";

/** "Continue with Google / Facebook" — only the providers enabled in Supabase. */
export function SocialSignIn(props: { providers: OAuthProvider[]; next: string; failed: boolean }) {
  const dict = useDictionary();
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState(props.failed);

  if (props.providers.length === 0) return null;

  async function start(provider: OAuthProvider) {
    setPending(provider);
    setError(false);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(props.next)}`;
    const { error: oauthError } = await createSupabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    // On success the browser is already leaving for the provider.
    if (oauthError) {
      setPending(null);
      setError(true);
    }
  }

  const label: Record<OAuthProvider, string> = {
    google: dict.login.continueWithGoogle,
    facebook: dict.login.continueWithFacebook,
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-[13px] text-ink-2" aria-hidden>
        <span className="h-px flex-1 bg-hair" />
        {dict.login.or}
        <span className="h-px flex-1 bg-hair" />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {props.providers.map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => void start(provider)}
            disabled={pending !== null}
            className="flex h-14 items-center justify-center gap-3 rounded-pill border border-hair bg-surface text-[16px] font-semibold text-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {provider === "google" ? <GoogleMark /> : <FacebookMark />}
            {pending === provider ? dict.login.redirecting : label[provider]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {dict.login.oauthFailed}
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M15.1 15.5l.5-3.1h-3v-2c0-.9.4-1.7 1.8-1.7h1.4V6s-1.3-.2-2.5-.2c-2.5 0-4.2 1.5-4.2 4.3v2.3H6.4v3.1h2.7V24h3.4v-8.5h2.6z"
      />
    </svg>
  );
}
