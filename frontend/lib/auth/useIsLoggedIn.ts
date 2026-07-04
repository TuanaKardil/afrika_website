"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Client-side login state. Reads the session from local storage/cookies
 * (no network call) so server components never need cookies() for the
 * header UI; keeping cookies() out of the root layout is what allows
 * article and static pages to stay ISR/SSG-cacheable.
 */
export function useIsLoggedIn(): boolean {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return loggedIn;
}
