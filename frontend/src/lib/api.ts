const BASE = "http://localhost:8000";

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
  if (!res.ok) throw new Error(`sendMessage failed: ${res.status}`);
  return res.json();
}

export async function advanceWeek(userId: string, week: number): Promise<unknown> {
  const res = await fetch(`${BASE}/progress/${userId}/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ week }),
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
  const res = await fetch(`${BASE}/papers/${paperId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, message }),
  });
  if (!res.ok) throw new Error(`chatAboutPaper failed: ${res.status}`);
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
