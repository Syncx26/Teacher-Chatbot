const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Clerk provides the token via the getToken() helper in server components,
  // but on the client we grab it from the Clerk session.
  const { getToken } = await import("@clerk/nextjs/client" as never) as { getToken: () => Promise<string | null> };
  const token = await getToken();
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
export async function startOnboarding(topic: string, durationWeeks: number, weekdayMinutes: number, weekendMinutes: number) {
  const r = await authedFetch("/onboarding/start", {
    method: "POST",
    body: JSON.stringify({ topic, duration_weeks: durationWeeks, weekday_minutes: weekdayMinutes, weekend_minutes: weekendMinutes }),
  });
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
  const { getToken } = await import("@clerk/nextjs/client" as never) as { getToken: () => Promise<string | null> };
  const token = await getToken();
  const form = new FormData();
  form.append("audio", audioBlob, "audio.webm");
  const r = await fetch(`${BASE}/transcribe`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await r.json();
  return data.text ?? "";
}
