# Wager Wizard Pro — CLAUDE.md

## What this project is

A risk-first AI betting copilot. The product tells users when **not** to bet, helps them assess risk, and protects their bankroll. It is not a tipster and does not predict outcomes or suggest "winning" bets.

Core philosophy: honest, data-driven analysis — not marketing-driven recommendations.

## Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Framework   | Next.js 15 (App Router, `use client`)   |
| AI          | Vercel AI SDK (`@ai-sdk/react` + `useChat`) |
| LLM         | OpenAI (via `/api/chat` route)          |
| Database    | Supabase (PostgreSQL + Storage)         |
| Styling     | Tailwind CSS v4 + custom CSS design system |
| Deploy      | Vercel                                  |

## Project structure

```
src/
  app/
    page.tsx          — Main chat UI (client component)
    layout.tsx        — Root layout with font loading
    globals.css       — Design system: CSS variables, keyframes, utility classes
    Loader.tsx        — Full-screen loading spinner
    loading.tsx       — Next.js loading state
    api/
      chat/
        route.ts      — POST handler: streams AI responses, saves to Supabase
  components/
    ChatMessage.tsx   — Renders user/assistant messages with inline markdown
    BetInputForm.tsx  — Collapsible bet analysis form (odds, stake, teams, bankroll)
  lib/
    betAnalysis.ts    — Bet analysis helper logic
```

## Running locally

```bash
npm install
npm run dev
```

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=chat_uploads
OPENAI_API_KEY=
```

## Supabase schema

### `chat_history` table

| Column    | Type      | Notes                    |
|-----------|-----------|--------------------------|
| id        | int8 (PK) | auto-increment           |
| user_id   | text      | currently hardcoded `'guest'` |
| prompt    | text      | user message             |
| response  | text      | assistant reply          |
| created_at| timestamptz | auto                  |

RLS policy: allow all operations where `user_id = 'guest'` (for MVP).

### Storage bucket

Name: `chat_uploads` (or value of `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`)
Must be **public** so uploaded screenshot URLs are accessible to the AI.

## Key conventions

- All UI state lives in `page.tsx` — no global state management.
- `useChat` from `@ai-sdk/react` drives the streaming message loop.
- Messages with image attachments are pre-pushed to `messages` state before `sendMessage` is called (so the image preview appears immediately).
- Markdown in AI responses is rendered by a hand-rolled parser in `ChatMessage.tsx` — no external markdown library.
- The design system uses CSS custom properties defined in `:root` (`globals.css`). Prefer `var(--name)` over inline Tailwind color classes for brand colors.

## What to avoid adding

- Generic AI prediction flows ("best bet today", "top picks")
- Tipster-style recommendations without risk context
- Feature bloat before the core risk-analysis flow is validated

## Public assets

`/public/botavatar.jpg` — AI assistant avatar  
`/public/useravatar.jpg` — User avatar (default)
