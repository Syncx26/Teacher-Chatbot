# Mastermind — Session Guide for Claude CLI

This file is designed to be fed to Claude Code running with
`--dangerously-skip-permissions` so it can finish the remaining frontend wiring
for 4 features (Weekly Digest, Multi-Topic Tracks, Export Journal, Push
Scheduling) **plus 3 engagement features** (cliffhanger end screen, streak
milestones, topic switcher).

The backend is already 100% done and deployed. Only frontend wiring + polish is
left.

---

## How to run this guide

From your local `Mastermind` repo on your Mac:

```bash
cd /Users/sagardeepsingh/Mastermind
claude --dangerously-skip-permissions
```

Then paste the single prompt at the bottom of this file.

---

## Context: What's already done (backend)

Everything in `backend/` is committed and deployed:

- **Database schema** — new columns via idempotent ALTER TABLE in
  `db/helpers.py`:
  - `users`: `push_enabled`, `push_hour`, `digest_enabled`, `digest_day`, `digest_hour`
  - `curricula`: `completed_at`, `emoji`
- **New routers:**
  - `routers/email.py` — Resend weekly HTML digest + `/email/digest/preferences`
  - `routers/export.py` — `GET /export/{curriculum_id}?format=markdown|json`
  - `routers/ingest.py` — URL/YouTube text extraction
- **Updated routers:**
  - `routers/push.py` — adds `POST /push/schedule`, `GET /push/schedule`
  - `routers/curriculum.py` — adds `POST /{id}/complete`, `DELETE /{id}`,
    `PATCH /{id}`; richer `GET /user/{user_id}` with sessions_done/total
  - `routers/users.py` — adds `GET /{user_id}/stats`
- **main.py** — APScheduler hourly job dispatches push + digest at user-chosen
  UTC hours
- **requirements.txt** — added `apscheduler`, `youtube-transcript-api`,
  `beautifulsoup4`

## Context: What's already done (frontend)

- **lib/api.ts** — all client functions for the new backend endpoints
  (`getUserCurricula`, `completeCurriculum`, `deleteCurriculum`,
  `downloadCurriculum`, `getUserStats`, `getPushSchedule`, `setPushSchedule`,
  `subscribePush`, `getVapidKey`, `getDigestPreferences`, `setDigestPreferences`,
  `exportCurriculumUrl`)
- **app/topics/page.tsx** — new page with active/completed tabs, 5-topic limit,
  open/complete/delete/download actions
- **Theme** — Editorial Ink / Nordic Slate CSS variables, Fraunces +
  JetBrains Mono via `next/font/google`
- **PWA icons** — `public/icons/icon-192.png`, `icon-512.png`

---

## Remaining work

1. **Update Zustand store** (`src/lib/store.ts`) to track `activeCurriculumId`
2. **Update BottomNav** (`src/components/BottomNav.tsx`) — 5 tabs including "Topics"
3. **Update Today page** (`src/app/today/page.tsx`):
   - Respect `activeCurriculumId` when picking curriculum to load
   - Topic switcher pill row at top if multiple active curricula
   - Session header: "Week N · Day M"
   - **Cliffhanger end screen** — after `done`, show tomorrow's next session
     theme in a blurred/teaser panel
   - **Streak milestone celebration** — full-screen overlay when user hits
     streak thresholds (3/7/14/30) today
4. **Update Settings page** (`src/app/settings/page.tsx`):
   - Push notification schedule block — toggle + hour picker + "Enable on this
     device" button that registers the Service Worker & subscribes to VAPID
   - Weekly digest block — toggle + day-of-week + hour-of-day pickers
5. **Update Progress page** (`src/app/progress/page.tsx`) — use `getUserStats()`
   from the API client (not raw fetch with localStorage token)
6. **Add Service Worker** (`public/sw.js`) — handle push notifications
7. **Commit + push** to the correct feature branch

---

# ============================================================
# PROMPT TO FEED TO CLAUDE CLI
# ============================================================

The section below is the actual prompt. Copy everything between the two
`===PROMPT START===` / `===PROMPT END===` markers and paste it into Claude CLI.

```
===PROMPT START===

You are finishing the Mastermind AI tutor app in this repo. The backend is
fully done and deployed. Only frontend wiring remains for 4 features:

- Multi-topic tracks (max 5 active, active/completed split, delete/export)
- Weekly email digest (Resend)
- Push notification scheduling (VAPID)
- Export journal (Markdown / JSON download)

Plus 3 engagement features: cliffhanger end screen, streak milestone
celebration, topic switcher.

All backend endpoints you need are already live. API client functions are
already written in `frontend/src/lib/api.ts` — IMPORT AND USE THEM, do not
write raw `fetch` calls. Do NOT modify any backend file — they're deployed.

Theme tokens (already defined in `globals.css`):
  --bg --bg-card --bg-elev --ink --ink-soft --ink-mute --hairline
  --accent --accent-soft --mark --good --danger
Fonts: `font-display` (Fraunces), `font-label` (JetBrains Mono small-caps).
All buttons use `rounded-full`. All cards use `rounded-2xl` with hairline
border. Orange `--mark` is the highlight/accent emphasis color.

## TASK 1 — Update Zustand store

Edit `frontend/src/lib/store.ts`. Add:

  activeCurriculumId: string | null;
  setActiveCurriculumId: (id: string | null) => void;

Initial value: null. Persist it via the existing `partialize` allowlist.

## TASK 2 — BottomNav: 5 tabs

Edit `frontend/src/components/BottomNav.tsx`. Tabs in order:

  { href: "/today",    label: "Today",    icon: "⚡" }
  { href: "/topics",   label: "Topics",   icon: "📚" }
  { href: "/explore",  label: "Explore",  icon: "✦" }
  { href: "/progress", label: "Progress", icon: "◎" }
  { href: "/settings", label: "Settings", icon: "⊙" }

Keep all existing styling (var(--bg-card), var(--mark) active color,
font-label). Active detection: `pathname === tab.href`.

## TASK 3 — Today page: switcher + cliffhanger + streak celebration

Edit `frontend/src/app/today/page.tsx`. Replace the whole file with the
following behavior:

1. Fetch curricula via `getUserCurricula(userId)`.
2. Filter to `status === "active"`. If none: redirect to `/onboarding`.
3. Active curriculum selection:
   - If store has `activeCurriculumId` and it matches a fetched active one, use it.
   - Otherwise use `curricula[0].id` and save it via `setActiveCurriculumId`.
4. If multiple active curricula: render a horizontal pill row above the card
   area. Each pill shows `{emoji ?? '📘'} {topic}`. Clicking switches the active
   curriculum and re-loads today's session. Active pill:
   `background: var(--accent); color: var(--bg)`. Inactive:
   `background: var(--bg-elev); color: var(--ink-mute)`.
5. Session header strip above the card: `font-label` showing
   `Week {week_number} · Day {day_number}` in `var(--ink-mute)`.
   (Get week/day from `session.week_number` / `session.day_number` — the
   `/sessions/today/{curriculum_id}` response includes these.)
6. Fetch `getUserStats(userId)` in parallel on load; store `stats.streak_days`.
7. **Streak milestone celebration** — on load, if
   `stats.streak_days ∈ {3, 7, 14, 30, 60, 100}` AND localStorage
   `celebrated_streak_{streak}` is not set: show a full-screen overlay for 2.5s
   then auto-dismiss and set the localStorage key. Overlay:
   `position: fixed; inset: 0; z-index: 100; background: var(--bg);` centered
   with: large 🔥 emoji (animate-pulse), `font-display text-5xl font-bold`
   "{streak} day streak!", `font-label` subtitle "Keep the fire going".
8. **Cliffhanger end screen** — when `done === true`, instead of the current
   "Session complete" card show:
   - Mono label "SESSION COMPLETE" in var(--good)
   - `font-display text-4xl` "Nice work." in var(--ink)
   - Streak line "🔥 {streak_days} day streak" if streak > 0
   - A card-like block with `mark-rule` left border showing:
       font-label "Tomorrow's teaser" in var(--mark)
       A blurred text line `filter: blur(4px); opacity: 0.85`
       Sample text: "The next concept waits for you…"
       (You don't have tomorrow's data — use the fixed teaser line. This works
       as a Zeigarnik effect tease.)
   - Two buttons: "Explore more →" (primary, var(--mark)) links `/explore`;
     "Browse topics" (secondary, var(--bg-elev)) links `/topics`.
9. Keep the existing progress bar, CardReel import and handleComplete logic.
10. Use `<BottomNav />` at the bottom throughout.

## TASK 4 — Settings page: push + digest blocks

Edit `frontend/src/app/settings/page.tsx`. Keep existing Appearance / Language /
English Complexity blocks. Add two new blocks BEFORE the Sign Out button.

Import at top:
  import { useEffect, useState } from "react";
  import {
    getPushSchedule, setPushSchedule, getVapidKey, subscribePush,
    getDigestPreferences, setDigestPreferences,
  } from "@/lib/api";

### Push notifications block

State:
  pushEnabled (boolean, default false)
  pushHour (number, default 9)  // 0-23 UTC
  pushSubscribed (boolean)      // detects existing SW subscription

On mount: call `getPushSchedule()` and set pushEnabled + pushHour from result.
Also check `navigator.serviceWorker` readiness + existing subscription:
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setPushSubscribed(!!sub);
  }

Handler — `enableOnThisDevice()`:
  1. Register /sw.js if not registered
  2. const vapid = await getVapidKey();
  3. const sub = await reg.pushManager.subscribe({
       userVisibleOnly: true,
       applicationServerKey: urlBase64ToUint8Array(vapid.public_key),
     });
  4. await subscribePush(sub.toJSON() as PushSubscriptionJSON);
  5. setPushSubscribed(true);

Add a urlBase64ToUint8Array util inside the file:
  function urlBase64ToUint8Array(base64: string) {
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

Handler — `toggleSchedule()`:
  await setPushSchedule(!pushEnabled, pushHour);
  setPushEnabled(!pushEnabled);

Handler — `changeHour(h)`:
  setPushHour(h);
  if (pushEnabled) await setPushSchedule(true, h);

UI: a block styled like the other settings cards with:
  font-label "Daily Reminder"
  Toggle switch (same style as theme toggle) bound to toggleSchedule
  If !pushSubscribed: small warning text in var(--mark) +
    "Enable on this device" button that calls enableOnThisDevice
  Hour select 0-23 with labels "{h}:00 UTC" — disabled if !pushEnabled
  Tiny help text: "You'll get a notification to study at this time each day."

### Weekly digest block

State:
  digestEnabled (boolean)
  digestDay (0-6, Mon-Sun)
  digestHour (0-23)

On mount: call `getDigestPreferences()` and populate state.

Handler — `toggleDigest()`:
  await setDigestPreferences(!digestEnabled, digestDay, digestHour);
  setDigestEnabled(!digestEnabled);

UI:
  font-label "Weekly Digest"
  Toggle
  Day select: Mon/Tue/Wed/Thu/Fri/Sat/Sun (value 0-6)
  Hour select 0-23
  Help text: "A recap of your week delivered to your inbox."

Use the same card styling as existing settings blocks
(`background: var(--bg-card); border: 1px solid var(--hairline)`).

## TASK 5 — Progress page: use getUserStats

Edit `frontend/src/app/progress/page.tsx`.

Replace the raw fetch block with:
  import { getUserStats } from "@/lib/api";
  ...
  useEffect(() => {
    if (!userId) return;
    getUserStats(userId).then(setStats).catch(console.error);
  }, [userId]);

Also show the new `active_topics` field in the stats grid if available
(label "Active Topics").

## TASK 6 — Service Worker for push

Create `frontend/public/sw.js`:

  self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "Mastermind";
    const options = {
      body: data.body || "Your session is ready.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "mastermind",
      renotify: true,
      requireInteraction: false,
      data: { url: "/today" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data?.url || "/today"));
  });

## TASK 7 — Verify and commit

1. Run `npm run build` in `frontend/` to verify no TypeScript errors.
   If errors appear: fix them. Common issue: PushSubscriptionJSON type — cast
   via `sub.toJSON() as PushSubscriptionJSON`.
2. `git add -A`
3. Commit message:
     "Wire multi-topic switcher, push/digest settings, cliffhanger end screen"
     body:
     - BottomNav: 5 tabs including Topics
     - Today: curriculum switcher, session header, cliffhanger end screen,
       streak milestone celebration (3/7/14/30/60/100 days)
     - Settings: push schedule (VAPID SW) + weekly digest preferences
     - Progress: use getUserStats
     - public/sw.js: push + notificationclick handlers
     - store: activeCurriculumId persisted
4. Push to the feature branch the repo is already on. Do NOT create a PR.

## Constraints

- Do NOT modify any backend file.
- Do NOT create any docs / markdown files.
- Do NOT add new npm deps — everything is already installed.
- Use the API client functions in `@/lib/api`, never raw fetch except for
  `getVapidKey` which already exists in the client.
- Keep the Editorial Ink / Nordic Slate design language:
  serif headings with `font-display`, small-caps `font-label`, `rounded-full`
  buttons, `rounded-2xl` cards, hairline borders.
- Minimal comments — only where a non-obvious constraint requires it.

===PROMPT END===
```

---

## After Claude CLI finishes

Verify the 4 features work:

1. **Multi-topic** — start a 2nd curriculum, switch between them on Today,
   complete one, check it moves to Completed on /topics, download its .md.
2. **Push** — Settings → enable push → grant browser permission → verify
   subscription. For a smoke test, in Railway set a test user's `push_hour`
   to the current UTC hour and wait for the hourly scheduler.
3. **Digest** — Settings → enable weekly digest → set to today/current hour →
   wait or call `POST /email/digest/send-now/{user_id}` from Railway shell.
4. **Export** — /topics → any active or completed → Download .md.
5. **Engagement** — finish a session, see cliffhanger screen; if you have a
   streak of 3/7/14/30, see the milestone overlay.

## Env vars to verify in Railway backend

- `RESEND_API_KEY` — already set per CLAUDE.md
- `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_CLAIMS_EMAIL` — need to be
  set. Generate with:
  ```bash
  pip install py-vapid
  vapid --gen
  ```
  VAPID_CLAIMS_EMAIL can be any valid email (required by push standards).
