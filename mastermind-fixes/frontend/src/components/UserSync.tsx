"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useStore } from "@/lib/store";

/**
 * Drop this inside your root layout (inside <ClerkProvider>).
 * It syncs the Clerk user ID into the Zustand store and registers
 * the user with the backend on first sign-in.
 */
export function UserSync() {
  const { user, isLoaded } = useUser();
  const setUser = useStore((s) => s.setUser);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;

    setUser(user.id);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        display_name: user.fullName ?? null,
      }),
    }).catch(console.error);
  }, [user?.id, isLoaded]);

  return null;
}
