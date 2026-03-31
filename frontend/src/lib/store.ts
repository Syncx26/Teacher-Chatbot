import { create } from "zustand";

export interface Message {
  role: "user" | "assistant";
  content: string;
  model_tier?: string;
  confidence_score?: number | null;
  post_check?: Record<string, unknown>;
  timestamp: string;
}

export interface Topic {
  topic_id: string;
  label: string;
  week: number;
  prerequisites?: string[];
  subtopics?: Array<{ id: string; label: string; minutes: number }>;
  state?: "completed" | "current" | "locked";
}

export interface Paper {
  id: number;
  title: string;
  authors: string;
  abstract: string;
  summary: string;
  published_date: string;
  source: string;
  url: string;
  tags?: string[];
}

export interface CurriculumWeek {
  week: number;
  name: string;
  topics: string[];
  goal: string;
  build: string;
}

export interface Curriculum {
  id?: number | null;
  name: string;
  goal: string;
  weeks: CurriculumWeek[];
  is_active?: boolean;
  created_at?: string;
}

interface AppStore {
  userId: string;
  currentWeek: number;
  xp: number;
  completedWeeks: number[];
  messages: Message[];
  topics: Topic[];
  papers: Paper[];
  activeTab: "chat" | "research" | "topics" | "curriculum" | "resources";
  isSidebarOpen: boolean;
  pendingMessage: string;
  activeCurriculum: Curriculum | null;
  pomodoroActive: boolean;
  pomodoroSeconds: number;

  setProgress: (p: { current_week?: number; xp?: number; completed_weeks?: number[] }) => void;
  addMessage: (m: Message) => void;
  setTopics: (t: Topic[]) => void;
  setPapers: (p: Paper[]) => void;
  setActiveTab: (tab: "chat" | "research" | "topics" | "curriculum" | "resources") => void;
  toggleSidebar: () => void;
  setPendingMessage: (msg: string) => void;
  setCurriculum: (c: Curriculum | null) => void;
  startPomodoro: () => void;
  stopPomodoro: () => void;
  tickPomodoro: () => void;
  resetPomodoro: () => void;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return generateUUID();
  const stored = localStorage.getItem("warroom_user_id");
  if (stored) return stored;
  const newId = generateUUID();
  localStorage.setItem("warroom_user_id", newId);
  return newId;
}

export const useAppStore = create<AppStore>((set) => ({
  userId: getOrCreateUserId(),
  currentWeek: 1,
  xp: 0,
  completedWeeks: [],
  messages: [],
  topics: [],
  papers: [],
  activeTab: "chat",
  isSidebarOpen: false,
  pendingMessage: "",
  activeCurriculum: null,
  pomodoroActive: false,
  pomodoroSeconds: 1500,

  setProgress: (p) =>
    set((state) => ({
      currentWeek: p.current_week ?? state.currentWeek,
      xp: p.xp ?? state.xp,
      completedWeeks: p.completed_weeks ?? state.completedWeeks,
    })),

  addMessage: (m) =>
    set((state) => ({ messages: [...state.messages, m] })),

  setTopics: (t) => set({ topics: t }),

  setPapers: (p) => set({ papers: p }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setPendingMessage: (msg) => set({ pendingMessage: msg }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  setCurriculum: (c) => set({ activeCurriculum: c }),

  startPomodoro: () => set({ pomodoroActive: true }),
  stopPomodoro: () => set({ pomodoroActive: false }),
  tickPomodoro: () =>
    set((state) => ({
      pomodoroSeconds: Math.max(0, state.pomodoroSeconds - 1),
      pomodoroActive: state.pomodoroSeconds <= 1 ? false : state.pomodoroActive,
    })),
  resetPomodoro: () => set({ pomodoroSeconds: 1500, pomodoroActive: false }),
}));
