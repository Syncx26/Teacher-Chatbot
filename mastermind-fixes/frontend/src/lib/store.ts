/**
 * Zustand global store with persist middleware.
 * Persists to localStorage under "mastermind-store".
 * All server data (cards, curriculum) is kept in separate React Query cache —
 * this store only holds UI state and user identity.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MastermindState {
  // Auth
  userId: string | null;
  setUser: (id: string) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;

  // Language
  language: string;
  setLanguage: (lang: string) => void;

  // English level
  englishLevel: "simple" | "fluent";
  setEnglishLevel: (level: "simple" | "fluent") => void;

  // Current session progress (persisted so a refresh continues mid-session)
  currentSessionId: string | null;
  currentCardIndex: number;
  setCurrentSession: (sessionId: string) => void;
  setCurrentCardIndex: (index: number) => void;

  // Ask Nova drawer
  novaOpen: boolean;
  setNovaOpen: (open: boolean) => void;
}

export const useStore = create<MastermindState>()(
  persist(
    (set) => ({
      // Auth
      userId: null,
      setUser: (id) => set({ userId: id }),

      // Theme
      theme: "dark",
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      // Language
      language: "en",
      setLanguage: (lang) => set({ language: lang }),

      // English level
      englishLevel: "fluent",
      setEnglishLevel: (level) => set({ englishLevel: level }),

      // Session
      currentSessionId: null,
      currentCardIndex: 0,
      setCurrentSession: (sessionId) =>
        set({ currentSessionId: sessionId, currentCardIndex: 0 }),
      setCurrentCardIndex: (index) => set({ currentCardIndex: index }),

      // Nova
      novaOpen: false,
      setNovaOpen: (open) => set({ novaOpen: open }),
    }),
    {
      name: "mastermind-store",
      // Only persist these keys — don't persist transient UI state
      partialize: (s) => ({
        userId: s.userId,
        theme: s.theme,
        language: s.language,
        englishLevel: s.englishLevel,
        currentSessionId: s.currentSessionId,
        currentCardIndex: s.currentCardIndex,
      }),
    }
  )
);
