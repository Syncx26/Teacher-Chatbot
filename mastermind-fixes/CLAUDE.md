# Mastermind — Claude CLI Build Guide
> Complete guide for building the Mastermind AI tutor app.
> All 13 audit fixes are baked in. Follow phases in order.

---

## Quick start (local dev)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in your keys
alembic upgrade head
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_* vars
npm run dev
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | FastAPI + Python 3.11 | Async, streaming-friendly |
| ORM | SQLAlchemy + Alembic | Type-safe migrations |
| DB | PostgreSQL (Railway) | Relational + JSON columns |
| Auth | Clerk (JWT) | Works in Next.js App Router |
| Frontend | Next.js 15 App Router | RSC + streaming |
| State | Zustand + persist | Survives page refresh |
| Gestures | Framer Motion | Spring physics swipes |
| Styling | Tailwind CSS variables | Dual theme |
| Hosting | Railway (backend) + Vercel (frontend) | |

---

## Environment variables

### Backend (.env)

```
DATABASE_URL=postgresql://user:password@host/mastermind
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
CLERK_SECRET_KEY=
CLERK_JWKS_URL=https://<your-clerk-domain>/.well-known/jwks.json
VAPID_PRIVATE_KEY=
VAPID_PUBLIC_KEY=
VAPID_CLAIMS_EMAIL=
RESEND_API_KEY=
FRONTEND_URL=http://localhost:3000
APP_ENV=development
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/today
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

---

## Directory structure

```
mastermind/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── auth.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── env.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── schema.py
│   │   ├── helpers.py
│   │   └── session_helpers.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── curriculum.py
│   │   ├── sessions.py
│   │   ├── cards.py
│   │   ├── chat.py
│   │   ├── checkpoints.py
│   │   ├── explore.py
│   │   ├── onboarding.py
│   │   ├── push.py
│   │   └── transcribe.py
│   ├── chatbot/
│   │   ├── __init__.py
│   │   └── router.py
│   └── sr/
│       ├── __init__.py
│       └── engine.py
└── frontend/
    ├── public/
    │   ├── manifest.json
    │   └── icons/
    │       ├── icon-192.png
    │       └── icon-512.png
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── today/page.tsx
        │   ├── explore/page.tsx
        │   ├── progress/page.tsx
        │   ├── settings/page.tsx
        │   └── onboarding/page.tsx
        ├── components/
        │   ├── UserSync.tsx
        │   ├── CardReel.tsx
        │   ├── cards/
        │   │   ├── ConceptCard.tsx
        │   │   ├── ExerciseCard.tsx
        │   │   ├── CheckpointCard.tsx
        │   │   ├── ExploreCard.tsx
        │   │   └── ReviewCard.tsx
        │   ├── NovaDrawer.tsx
        │   └── BottomNav.tsx
        └── lib/
            ├── store.ts
            ├── stream.ts
            ├── haptics.ts
            └── api.ts
```

---

## Model routing table

| Task | Model | Client |
|---|---|---|
| Curriculum build | claude-opus-4-6 | Anthropic |
| Onboarding dialogue | claude-opus-4-6 | Anthropic |
| Curriculum restructure | claude-opus-4-6 | Anthropic |
| Card teaching (70% traffic) | claude-sonnet-4-6 | Anthropic |
| Remediation | claude-sonnet-4-6 | Anthropic |
| Explore cards | claude-sonnet-4-6 | Anthropic |
| Ask Nova | claude-sonnet-4-6 | Anthropic |
| Checkpoint grading | o3 | OpenAI |
| Spaced review cards | mistral-large-latest | Mistral |
| Memory extraction | claude-haiku-4-5-20251001 | Anthropic |
| Sentiment check (background) | llama-3.3-70b-versatile | Groq |
| Voice transcription | whisper-1 | OpenAI |

---

## DB Schema

See `backend/db/schema.py` for the full ORM. Tables:

- **users** — Clerk ID, language, english_level, timezone
- **curricula** — topic, duration_weeks, weekday/weekend_minutes, opus_json, status
- **sessions** — week/day number, scheduled_date, is_weekend, status
- **cards** — UUID ID, card_type, content_json, position
- **sr_queue** — SM-2 state: due_date, interval_days, ease_factor, repetitions
- **explore_cache** — date-keyed JSON blob of Explore cards per user
- **cost_log** — model, tokens, usd_cost per call
- **push_subscriptions** — VAPID endpoint + keys

**All IDs that appear in URLs must be UUIDs (str), never auto-increment integers.**

---

## Alembic setup (Fix #6)

`alembic/env.py` must import your schema and DATABASE_URL:

```python
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from db.schema import Base
from config import DATABASE_URL
target_metadata = Base.metadata

def run_migrations_online():
    from sqlalchemy import create_engine
    connectable = create_engine(DATABASE_URL)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
```

---

## Card types

### concept
```json
{
  "type": "concept",
  "title": "...",
  "body": "...",
  "visual": "svg_string or null",
  "analogy": "...",
  "key_term": "...",
  "key_term_definition": "..."
}
```

### exercise
```json
{
  "type": "exercise",
  "prompt": "...",
  "hints": ["...", "..."],
  "answer": "...",
  "explanation": "..."
}
```

### checkpoint
```json
{
  "type": "checkpoint",
  "question": "...",
  "rubric": "...",
  "passing_threshold": 3,
  "gap_if_fail": "..."
}
```

### explore (variable reward)
```json
{
  "type": "explore",
  "subtype": "real_story | hot_take | connection | did_you_know | what_would_you_do",
  "title": "...",
  "body": "...",
  "source": "..."
}
```

### review (SR queue)
```json
{
  "type": "review",
  "original_card_id": "uuid",
  "prompt": "...",
  "answer": "..."
}
```

---

## Swipe mechanics

| Gesture | SM-2 Grade | Meaning |
|---|---|---|
| Swipe UP | 4 | Correct — advance |
| Swipe RIGHT | 5 | Too easy — advance + long interval |
| Swipe LEFT | 1 | Confused — add to remediation queue |
| Long press (550ms) | — | Open Ask Nova drawer |

Checkpoint cards: **drag disabled** (Framer Motion `drag={false}`) until o3 returns a passing grade.

---

## Opus curriculum JSON schema

Opus must return valid JSON matching this schema:

```json
{
  "topic": "string",
  "total_weeks": 4,
  "mastery_goal": "string",
  "weeks": [
    {
      "week_number": 1,
      "theme": "string",
      "days": [
        {
          "day_number": 1,
          "is_weekend": false,
          "cards": [
            { "type": "concept", "title": "...", "body": "...", "analogy": "...", "key_term": "...", "key_term_definition": "..." },
            { "type": "exercise", "prompt": "...", "hints": [], "answer": "...", "explanation": "..." },
            { "type": "checkpoint", "question": "...", "rubric": "...", "passing_threshold": 3, "gap_if_fail": "..." }
          ]
        }
      ]
    }
  ]
}
```

System prompt for Opus curriculum build:

```
You are a master curriculum designer using adult learning principles (Andragogy, SM-2 spaced repetition, deliberate practice, flow state).

The user wants to learn: {topic}
Duration: {duration_weeks} weeks
Weekday session: {weekday_minutes} minutes
Weekend session: {weekend_minutes} minutes (0 = no weekend sessions)

User context from onboarding:
Q1 (why it matters): {answer_1}
Q2 (what failed before): {answer_2}
Q3 (desired outcome): {answer_3}

Design principles:
- One concept per card. Never two ideas on one screen.
- Every concept card must be followed by an exercise card.
- Every week ends with a checkpoint card.
- Exercise difficulty must be slightly above current ability (deliberate practice).
- End each day session on a cliffhanger — the next concept is hinted at but not revealed (Zeigarnik effect).
- Include one explore card per week (variable reward).
- Weekend sessions are shorter — use review and explore cards only.

Return ONLY valid JSON matching the schema. No markdown, no explanation.
```

---

## SM-2 algorithm (Fix #9, #10)

See `backend/sr/engine.py`. Key formula:

```python
new_ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
new_ease = max(1.3, new_ease)

if grade >= 3:
    if reps == 0: interval = 1
    elif reps == 1: interval = 6
    else: interval = round(interval * ease, 1)
    reps += 1
else:
    interval = 1
    reps = 0
```

---

## Themes

### Nordic Slate (dark — default)

```css
:root[data-theme="dark"] {
  --background:    #0F172A;
  --surface:       #1E293B;
  --surface-alt:   #334155;
  --border:        #334155;
  --text-primary:  #F1F5F9;
  --text-secondary:#94A3B8;
  --accent:        #6366F1;
  --accent-hover:  #818CF8;
  --success:       #10B981;
  --warning:       #F59E0B;
  --danger:        #EF4444;
}
```

### Editorial Ink (light)

```css
:root[data-theme="light"] {
  --background:    #FAFAF8;
  --surface:       #FFFFFF;
  --surface-alt:   #F3F4F6;
  --border:        #E5E7EB;
  --text-primary:  #111827;
  --text-secondary:#6B7280;
  --accent:        #4F46E5;
  --accent-hover:  #4338CA;
  --success:       #059669;
  --warning:       #D97706;
  --danger:        #DC2626;
}
```

Apply theme via `data-theme` attribute on `<html>`. Toggle in Zustand store (`theme: "dark" | "light"`).

---

## API endpoints

```
POST /onboarding/start          body: {topic, duration_weeks, weekday_minutes, weekend_minutes}
POST /onboarding/answer         body: {answer}
GET  /onboarding/state

POST /curriculum/build          body: {user_id} → streams Opus JSON → saves to DB
GET  /curriculum/{id}
POST /curriculum/{id}/restructure

GET  /sessions/today            → get_or_create_session for today
GET  /sessions/{id}
POST /sessions/{id}/complete

GET  /cards/{id}
POST /cards/{id}/swipe          body: {grade: 0-5}
POST /cards/{id}/checkpoint     body: {answer} → o3 grades → streams result

GET  /explore/{user_id}         → cached or generates new explore cards
POST /chat                      body: {card_id, message, history}  → streams Sonnet

POST /transcribe                form: {audio: file} → Whisper → returns {text}
POST /push/subscribe            body: {endpoint, keys}
POST /push/send                 body: {user_id, title, body}

POST /users/sync                body: {id, email, display_name}
```

---

## Build phases

### Phase 0 — Repo setup
- Init git repo, Railway project, Vercel project
- Set all env vars in Railway + Vercel dashboards
- Create `alembic.ini` and run `alembic init alembic`
- Fix `alembic/env.py` (see Alembic setup section above)
- Run `alembic revision --autogenerate -m "init"` and `alembic upgrade head`

### Phase 1 — Auth skeleton
- Install Clerk, wrap `app/layout.tsx` with `<ClerkProvider>`
- Add `<UserSync />` to layout (inside ClerkProvider)
- Create `backend/auth.py` with proper JWKS verification (no `verify_signature: False`)
- Add `/users/sync` endpoint
- Protect all other endpoints with `Depends(verify_token)`

### Phase 2 — Onboarding flow
- `routers/onboarding.py` — 3-question state machine (server-side `_STATE` dict)
- Frontend `app/onboarding/page.tsx` — one question per screen, progress bar
- On completion, call `/curriculum/build`

### Phase 3 — Curriculum builder
- `routers/curriculum.py` → calls Opus with full system prompt, streams JSON
- `parse_and_save_curriculum()` in `db/session_helpers.py` converts JSON → DB rows
- All IDs are UUIDs

### Phase 4 — Card reel (Today tab)
- `app/today/page.tsx` → fetches today's session cards
- `CardReel.tsx` — Framer Motion drag with swipe threshold detection
- Five card components (ConceptCard, ExerciseCard, CheckpointCard, ExploreCard, ReviewCard)
- Haptics on swipe via `lib/haptics.ts`
- NovaDrawer opens on 550ms long press

### Phase 5 — Spaced repetition
- SR engine in `sr/engine.py`
- Swipe LEFT → grade 1, Swipe RIGHT → grade 5, Swipe UP → grade 4
- Due SR cards injected at start of tomorrow's session

### Phase 6 — Checkpoint grading
- Frontend disables swipe on checkpoint card
- POST /cards/{id}/checkpoint → o3 grades → streams back reasoning + pass/fail
- On fail: Sonnet generates remediation card using gap_if_fail field
- On pass: hapticSuccess, unlock swipe

### Phase 7 — Explore feed
- Unlocked after daily session complete
- Sonnet generates 10 variable-reward cards: real_story, hot_take, connection, did_you_know, what_would_you_do
- Cached in explore_cache table for the day

### Phase 8 — Progress tab
- Theta decay SVG (knowledge decay curve)
- Streak counter, cards completed, topics mastered
- Weekly heatmap

### Phase 9 — Push notifications + voice
- VAPID setup in Railway
- `/push/subscribe` and `/push/send` endpoints
- Whisper transcription at `/transcribe`
- Microphone button on NovaDrawer

### Phase 10 — Polish + PWA
- `public/manifest.json` (see file above)
- `next.config.js` — add `next-pwa` plugin
- Add icons to `public/icons/`
- Lighthouse PWA audit ≥ 90

---

## AI behaviour rules

1. **Never summarise a concept before teaching it.** Build from first principles.
2. **Never ask "Does that make sense?"** — it produces false confirmation. Instead, ask a concrete check question.
3. **Analogies must come from the user's industry** (stored in user profile after onboarding).
4. **Language in card body**: user's selected language. Technical terms: always English.
5. **english_level="simple"**: ≤ 12-word sentences, no idioms. **"fluent"**: normal register.
6. **Checkpoint grading is strict**: o3 must return a 0-5 score and one specific gap sentence if score < 3.
7. **Remediation is never a repeat of the concept.** It targets the exact gap from the checkpoint rubric.
8. **Explore cards must feel like a reward**, not a lesson. No bullet points. Short paragraphs. First-person narrative where possible.

---

## Cost logging

Wrap every model call with a cost logger:

```python
MODEL_COSTS = {
    "claude-opus-4-6":          (15.00, 75.00),   # (input $/1M, output $/1M)
    "claude-sonnet-4-6":        (3.00,  15.00),
    "claude-haiku-4-5-20251001":(0.80,  4.00),
    "o3":                       (10.00, 40.00),
    "mistral-large-latest":     (2.00,  6.00),
    "llama-3.3-70b-versatile":  (0.05,  0.08),
}

def log_cost(user_id, model, input_tok, output_tok, task, db):
    inp_cost, out_cost = MODEL_COSTS.get(model, (0, 0))
    usd = (input_tok * inp_cost + output_tok * out_cost) / 1_000_000
    db.add(CostLog(user_id=user_id, model=model,
                   input_tokens=input_tok, output_tokens=output_tok,
                   usd_cost=usd, task=task))
    db.commit()
```

---

## Key fixes applied (audit)

1. **requirements.txt** — all packages listed (groq, pywebpush, resend, python-jose included)
2. **db/helpers.py** — `get_db()` context manager with commit/rollback/close
3. **main.py** — all 9 routers registered; `init_db()` called on startup
4. **parse_and_save_curriculum()** — full implementation in `db/session_helpers.py`
5. **onboarding.py** — server-side `_STATE` dict tracks progress across requests
6. **alembic/env.py** — imports Base.metadata and DATABASE_URL from app code
7. **UserSync.tsx** — syncs Clerk user to Zustand store + backend on sign-in
8. **ExploreCache table** — added to schema.py
9. **get_or_create_session()** — lazily assigns calendar dates matching is_weekend flag
10. **is_off_day()** — `weekday() >= 5` correctly detects Saturday/Sunday
11. **manifest.json** — start_url, theme_color, display, icons defined
12. **build_review_card()** — loads original card content, wraps as review card
13. **All IDs are UUIDs** — `str(uuid.uuid4())` everywhere; never auto-increment in URLs
