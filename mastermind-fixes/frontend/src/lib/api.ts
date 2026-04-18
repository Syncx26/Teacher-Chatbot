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

// Users
export async function syncUser(id: string, email: string | null, displayName: string | null) {
  return authedFetch("/users/sync", {
    method: "POST",
    body: JSON.stringify({ id, email, display_name: displayName }),
  });
}

// Onboarding
export async function startOnboarding(topic: string, durationWeeks: number, weekdayMinutes: number, weekendMinutes: number, context?: string) {
  const r = await authedFetch("/onboarding/start", {
    method: "POST",
    body: JSON.stringify({ topic, duration_weeks: durationWeeks, weekday_minutes: weekdayMinutes, weekend_minutes: weekendMinutes, context }),
  });
  return r.json();
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

export async function answerOnboarding(answer: string) {
  const r = await authedFetch("/onboarding/answer", {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
  return r.json();
}

// Curriculum
export async function buildCurriculum(userId: string): Promise<Response> {
  return authedFetch("/curriculum/build", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getUserCurricula(userId: string) {
  const r = await authedFetch(`/curriculum/user/${userId}`);
  return r.json();
}

// Sessions
export async function getTodaySession(curriculumId: string) {
  const r = await authedFetch(`/sessions/today/${curriculumId}`);
  return r.json();
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
