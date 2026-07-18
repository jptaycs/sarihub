"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { cn } from "~/lib/cn";
import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { interpolate } from "~/lib/i18n/interpolate";

import { resendOtpAction, verifyOtpAction, type ResendState, type VerifyState } from "./actions";

const CODE_LEN = 6;
const RESEND_SECONDS = 47;

export function OtpCodeForm({ phoneE164 }: { phoneE164: string }) {
  const dict = useDictionary();
  const [verifyState, verifyAction, verifying] = useActionState<VerifyState, FormData>(
    verifyOtpAction,
    null,
  );
  const [, resendAction, resending] = useActionState<ResendState, FormData>(resendOtpAction, null);

  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: CODE_LEN }, () => ""));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const code = digits.join("");

  function setDigit(i: number, v: string) {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  function handleChange(i: number, raw: string) {
    const v = raw.replace(/\D/g, "").slice(0, 1);
    setDigit(i, v);
    if (v && i < CODE_LEN - 1) {
      inputsRef.current[i + 1]?.focus();
    }
    if (v && i === CODE_LEN - 1) {
      // Auto-submit once the final digit is filled.
      const filled = [...digits];
      filled[i] = v;
      if (filled.every((d) => d.length === 1)) {
        requestSubmit();
      }
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
      setDigit(i - 1, "");
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputsRef.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < CODE_LEN - 1) {
      inputsRef.current[i + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LEN);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length: CODE_LEN }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    const focusIdx = Math.min(pasted.length, CODE_LEN - 1);
    inputsRef.current[focusIdx]?.focus();
    if (pasted.length === CODE_LEN) requestSubmit();
  }

  function requestSubmit() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={verifyAction} className="mt-9">
      <input type="hidden" name="phone" value={phoneE164} />
      <input type="hidden" name="code" value={code} />

      <div
        className="flex justify-between gap-[10px]"
        role="group"
        aria-label={dict.verify.codeGroupLabel}
      >
        {digits.map((d, i) => {
          const isFocus = d === "" && digits.slice(0, i).every((x) => x !== "");
          return (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={1}
              aria-label={interpolate(dict.verify.digitLabel, { n: i + 1 })}
              className={cn(
                "tnum h-16 flex-1 rounded-md border bg-white text-center text-[28px] font-medium text-ink outline-none transition-shadow",
                isFocus
                  ? "border-action shadow-[0_0_0_3px_rgba(216,90,48,0.15)]"
                  : "border-hair-strong",
              )}
            />
          );
        })}
      </div>

      {verifyState?.error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {verifyState.error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <span className="text-[13px] text-ink-2">
          {seconds > 0
            ? interpolate(dict.verify.resendIn, { seconds: seconds.toString().padStart(2, "0") })
            : dict.verify.resendReady}
        </span>

        <form action={resendAction}>
          <input type="hidden" name="phone" value={phoneE164} />
          <button
            type="submit"
            disabled={seconds > 0 || resending}
            onClick={() => seconds === 0 && setSeconds(RESEND_SECONDS)}
            className={cn(
              "bg-transparent text-sm font-medium",
              seconds > 0 ? "text-ink-3" : "text-ink",
            )}
          >
            {dict.verify.resendButton}
          </button>
        </form>
      </div>

      {/* Visually hidden submit so Enter key works even with manual digit input. */}
      <button type="submit" className="sr-only" tabIndex={-1} disabled={verifying}>
        Verify
      </button>
    </form>
  );
}
