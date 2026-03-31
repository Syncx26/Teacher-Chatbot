// All requests go through the Next.js server-side proxy at /api/proxy/
// This avoids NEXT_PUBLIC_API_URL being baked at build time (causing 404s
// when the variable wasn't set before the build ran).
const BASE = "/api/proxy";

export interface ChatResponse {
  content: string;
  model_tier: string;
  confidence_score: number | null;
  post_check: Record<string, unknown>;
}

export interface ProgressResponse {
  user_id: string;
  current_week: number;
  xp: number;
  completed_weeks: number[];
}

export interface TopicResponse {
  topic_id: string;
  week: number;
  name: string;
  label?: string;
  what: string;
  why: string;
  build: string;
  hard_part: string;
  time: string;
  resources?: ResourceItem[];
  prerequisites?: string[];
}

export interface ResourceItem {
  title: string;
  url: string;
  type: string;
}

export interface PaperResponse {
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

export interface PrerequisiteResponse {
  topic_id: string;
  prerequisites: string[];
  can_unlock: boolean;
}

export async function getProgress(userId: string): Promise<ProgressResponse> {
  const res = await fetch(`${BASE}/progress/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`getProgress failed: ${res.status}`);
  return res.json();
}

export async function sendMessage(
  userId: string,
  message: string
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, message }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? "";
    } catch {}
    throw new Error(`HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return res.json();
}

export async function advanceWeek(userId: string, week: number): Promise<unknown> {
  const res = await fetch(`${BASE}/progress/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, week }),
  });
  if (!res.ok) throw new Error(`advanceWeek failed: ${res.status}`);
  return res.json();
}

export async function getTopics(userId: string): Promise<TopicResponse[]> {
  const res = await fetch(`${BASE}/topics/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`getTopics failed: ${res.status}`);
  return res.json();
}

export async function getPrerequisites(
  topicId: string,
  currentWeek: number
): Promise<PrerequisiteResponse> {
  const res = await fetch(
    `${BASE}/topics/${topicId}/prerequisites?current_week=${currentWeek}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) throw new Error(`getPrerequisites failed: ${res.status}`);
  return res.json();
}

export interface PapersListResponse {
  papers: PaperResponse[];
  total: number;
  last_refresh: string | null;
  is_stale: boolean;
}

export async function getPapers(
  limit = 20,
  offset = 0,
  source?: string
): Promise<PapersListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (source) params.set("source", source);
  const res = await fetch(`${BASE}/papers?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`getPapers failed: ${res.status}`);
  return res.json();
}

export async function getPaper(paperId: number): Promise<PaperResponse> {
  const res = await fetch(`${BASE}/papers/${paperId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`getPaper failed: ${res.status}`);
  return res.json();
}

export async function refreshPapers(userId: string): Promise<unknown> {
  const res = await fetch(`${BASE}/papers/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`refreshPapers failed: ${res.status}`);
  return res.json();
}

export async function chatAboutPaper(
  userId: string,
  paperId: number,
  message: string
): Promise<ChatResponse> {
  const res = await fetch(`${BASE}/chat/paper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, paper_id: paperId, message }),
  });
  if (!res.ok) throw new Error(`chatAboutPaper failed: ${res.status}`);
  return res.json();
}

// ── More Resources ────────────────────────────────────────────────────────────

export interface MoreResource {
  title: string;
  url: string;
  description: string;
  type: "article" | "video";
}

export async function getMoreResources(
  userId: string,
  topic: string,
  currentWeek: number
): Promise<MoreResource[]> {
  const res = await fetch(`${BASE}/topics/more-resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, topic, current_week: currentWeek }),
  });
  if (!res.ok) throw new Error(`getMoreResources failed: ${res.status}`);
  const data = await res.json();
  return data.resources ?? [];
}

// ── Custom Topics ─────────────────────────────────────────────────────────────

export interface TopicProposal {
  topic_name: string;
  plan: string;
  subtopics: string[];
  questions: Array<{
    id: string;
    question: string;
    type: "text" | "choice";
    options?: string[];
  }>;
}

export async function proposeTopic(
  userId: string,
  topicName: string
): Promise<TopicProposal> {
  const res = await fetch(`${BASE}/topics/propose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, topic_name: topicName }),
  });
  if (!res.ok) throw new Error(`proposeTopic failed: ${res.status}`);
  return res.json();
}

export async function confirmTopic(
  userId: string,
  topicName: string,
  answers: Record<string, string>
): Promise<{ topic_id: string; label: string; insert_after_week: number }> {
  const res = await fetch(`${BASE}/topics/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, topic_name: topicName, answers }),
  });
  if (!res.ok) throw new Error(`confirmTopic failed: ${res.status}`);
  return res.json();
}

export async function getChatHistory(
  userId: string
): Promise<{ messages: Array<{ role: string; content: string; timestamp: string }> }> {
  const res = await fetch(`${BASE}/chat/history/${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`getChatHistory failed: ${res.status}`);
  return res.json();
}
