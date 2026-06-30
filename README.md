# AI SaaS Starter — Next.js 15 + Supabase + OpenAI

Full-stack AI chat app with auth, monthly usage limits, paywall, and image upload. Deploy your own AI-powered SaaS in under an hour.

## What's included

- Email auth (sign up, sign in, forgot password, email confirmation)
- Monthly usage limit with automatic reset + paywall modal
- Superuser bypass for your own account
- Streaming AI chat (Vercel AI SDK v5 + gpt-4o-mini)
- Image upload to Supabase Storage — images go directly to the AI
- Chat history per user, persisted and restored on login
- Route protection via Next.js middleware
- Bilingual UI (English + Greek) — easy to extend or remove
- 3D animated robot avatar (Three.js)
- Clean dark UI, Tailwind v4, Vercel-ready

## Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Framework | Next.js 15 (App Router)             |
| AI        | Vercel AI SDK v5 + OpenAI           |
| Database  | Supabase (PostgreSQL + Storage)     |
| Auth      | Supabase Auth                       |
| Styling   | Tailwind CSS v4                     |
| Deploy    | Vercel                              |

## Setup

See **[SETUP.md](./SETUP.md)** for the full step-by-step guide including:
- Supabase schema SQL (copy-paste ready)
- All environment variables explained
- How to customise the AI system prompt
- How to change the usage limit
- Vercel deploy instructions

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

## License

Commercial use permitted. Resale of the template itself is not permitted.
