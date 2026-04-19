const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Token is set by UserSync after Clerk initialises
let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

async function okJson<T = unknown>(r: Response): Promise<T> {
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try {
      const body = await r.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return r.json();
}

// Users
export async function syncUser(id: string, email: string | null, displayName: string | null) {
  return authedFetch("/users/sync", {
    method: "POST",
    body: JSON.stringify({ id, email, display_name: displayName }),
  });
}

// Onboarding
export async function startOnboarding(topic: string, durationWeeks: number, weekdayMinutes: number, weekendMinutes: number, context?: string): Promise<{ question: string; step: number; total: number }> {
  const r = await authedFetch("/onboarding/start", {
    method: "POST",
    body: JSON.stringify({ topic, duration_weeks: durationWeeks, weekday_minutes: weekdayMinutes, weekend_minutes: weekendMinutes, context }),
  });
  return okJson(r);
}

// Ingest — fetch text from a URL or YouTube video
export async function ingestUrl(url: string): Promise<{ text: string; source_type: string; word_count: number }> {
  const r = await authedFetch("/ingest/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.detail ?? "Could not fetch URL");
  }
  return r.json();
}

export async function answerOnboarding(answer: string): Promise<{ question?: string; step: number; total: number; done?: boolean }> {
  const r = await authedFetch("/onboarding/answer", {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
  return okJson(r);
}

// Curriculum
export async function buildCurriculum(userId: string): Promise<Response> {
  return authedFetch("/curriculum/build", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export interface CurriculumSummary {
  id: string;
  topic: string;
  emoji: string | null;
  status: "active" | "completed" | "deleted";
  duration_weeks: number;
  weekday_minutes: number;
  mastery_goal: string;
  sessions_done: number;
  sessions_total: number;
  created_at: string | null;
  completed_at: string | null;
}

export async function getUserCurricula(userId: string): Promise<CurriculumSummary[]> {
  const r = await authedFetch(`/curriculum/user/${userId}`);
  return okJson(r);
}

export async function completeCurriculum(curriculumId: string) {
  return authedFetch(`/curriculum/${curriculumId}/complete`, { method: "POST" });
}

export async function deleteCurriculum(curriculumId: string) {
  return authedFetch(`/curriculum/${curriculumId}`, { method: "DELETE" });
}

export async function updateCurriculumEmoji(curriculumId: string, emoji: string) {
  return authedFetch(`/curriculum/${curriculumId}`, {
    method: "PATCH",
    body: JSON.stringify({ emoji }),
  });
}

// User stats
export async function getUserStats(userId: string): Promise<{
  total_cards: number;
  completed_cards: number;
  streak_days: number;
  due_reviews: number;
  active_topics: number;
}> {
  const r = await authedFetch(`/users/${userId}/stats`);
  return okJson(r);
}

// Export
export function exportCurriculumUrl(curriculumId: string, format: "markdown" | "json" = "markdown"): string {
  return `${BASE}/export/${curriculumId}?format=${format}`;
}

export async function downloadCurriculum(curriculumId: string, format: "markdown" | "json" = "markdown") {
  const r = await authedFetch(`/export/${curriculumId}?format=${format}`);
  const blob = await r.blob();
  const contentDisposition = r.headers.get("content-disposition") ?? "";
  const match = contentDisposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `mastermind-export.${format === "markdown" ? "md" : "json"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Push scheduling
export async function getPushSchedule(): Promise<{ enabled: boolean; hour: number | null }> {
  const r = await authedFetch("/push/schedule");
  return r.json();
}

export async function setPushSchedule(enabled: boolean, hour: number) {
  return authedFetch("/push/schedule", {
    method: "POST",
    body: JSON.stringify({ enabled, hour }),
  });
}

export async function subscribePush(subscription: PushSubscriptionJSON) {
  return authedFetch("/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    }),
  });
}

export async function getVapidKey(): Promise<{ public_key: string }> {
  const r = await fetch(`${BASE}/push/vapid-public-key`);
  return r.json();
}

// Email digest
export async function getDigestPreferences(): Promise<{ enabled: boolean; day: number; hour: number }> {
  const r = await authedFetch("/email/digest/preferences");
  return r.json();
}

export async function setDigestPreferences(enabled: boolean, day: number, hour: number) {
  return authedFetch("/email/digest/preferences", {
    method: "POST",
    body: JSON.stringify({ enabled, day, hour }),
  });
}

// Sessions
export async function getTodaySession(curriculumId: string) {
  const r = await authedFetch(`/sessions/today/${curriculumId}`);
  return okJson(r);
}

export async function completeSession(sessionId: string) {
  return authedFetch(`/sessions/${sessionId}/complete`, { method: "POST" });
}

// Cards
export async function swipeCard(cardId: string, grade: number) {
  return authedFetch(`/cards/${cardId}/swipe`, {
    method: "POST",
    body: JSON.stringify({ grade }),
  });
}

// Checkpoint
export async function gradeCheckpoint(cardId: string, answer: string, language = "en", englishLevel = "fluent"): Promise<Response> {
  return authedFetch(`/checkpoints/${cardId}`, {
    method: "POST",
    body: JSON.stringify({ answer, language, english_level: englishLevel }),
  });
}

// Chat
export async function askNova(cardId: string, message: string, history: { role: string; content: string }[], language = "en", englishLevel = "fluent"): Promise<Response> {
  return authedFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ card_id: cardId, message, history, language, english_level: englishLevel }),
  });
}

// Explore
export async function getExploreCards(userId: string) {
  const r = await authedFetch(`/explore/${userId}`);
  return r.json();
}

// Transcribe
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audioBlob, "audio.webm");
  const r = await fetch(`${BASE}/transcribe`, {
    method: "POST",
    headers: _authToken ? { Authorization: `Bearer ${_authToken}` } : {},
    body: form,
  });
  const data = await r.json();
  return data.text ?? "";
}
