"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useDictionary } from "~/lib/i18n/LanguageProvider";
import { createSupabaseBrowser } from "~/lib/supabase/browser";

import { Button } from "./Button";

export function SignOutButton() {
  const dict = useDictionary();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="danger"
      block
      disabled={pending}
      onClick={handleSignOut}
      className="justify-center gap-2"
    >
      <LogOut size={18} strokeWidth={2} />
      {pending ? dict.profile.signingOut : dict.profile.signOut}
    </Button>
  );
}
