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

    getToken().then((token) => {
      setAuthToken(token);
      syncUser(
        user.id,
        user.primaryEmailAddress?.emailAddress ?? null,
        user.fullName ?? null,
      ).catch(console.error);
    });
  }, [user?.id, isLoaded]);

  return null;
}
