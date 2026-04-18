"use client";

import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useStore } from "@/lib/store";
import { setAuthToken, syncUser } from "@/lib/api";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const setUser = useStore((s) => s.setUser);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    setUser(user.id);

    async function refreshToken() {
      try {
        const token = await getToken({ skipCache: true });
        setAuthToken(token);
      } catch {
        setAuthToken(null);
      }
    }

    // Initial sync
    getToken()
      .then((token) => {
        setAuthToken(token);
        return syncUser(
          user.id,
          user.primaryEmailAddress?.emailAddress ?? null,
          user.fullName ?? null,
        );
      })
      .catch(console.error);

    // Refresh token every 50 minutes (Clerk tokens expire after 60 minutes)
    const interval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
