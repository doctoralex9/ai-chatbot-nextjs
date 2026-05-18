# BetSense — CLAUDE.md

## What this project is

A risk-first AI betting radar. The product tells users when **not** to bet, helps them assess risk, and protects their bankroll. It is not a tipster and does not predict outcomes or suggest "winning" bets.

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
      upload/
        route.ts      — POST handler: uploads image to Supabase storage, returns public URL
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
- Markdown in AI responses is rendered by a hand-rolled parser in `ChatMessage.tsx` — no external markdown library.
- The design system uses CSS custom properties defined in `:root` (`globals.css`). Prefer `var(--name)` over inline Tailwind color classes for brand colors.
- **AI SDK v5** (`ai@5.x`, `@ai-sdk/react@2.x`): `maxSteps` does not exist. Use `stopWhen: stepCountIs(N)` imported from `'ai'`. Default is `stepCountIs(1)` — always set to 5 when tools are present, otherwise the model calls a tool and the stream ends with no text response.
- Image uploads go via `/api/upload` → Supabase public storage → URL passed as `FileUIPart` to `sendMessage`. The `chat_uploads` bucket must remain **public**.

## What to avoid adding

- Generic AI prediction flows ("best bet today", "top picks")
- Tipster-style recommendations without risk context
- Feature bloat before the core risk-analysis flow is validated

## Public assets

`/public/botavatar.jpg` — AI assistant avatar  
`/public/useravatar.jpg` — User avatar (default)
