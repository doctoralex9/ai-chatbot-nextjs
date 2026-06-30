# AI SaaS Starter — Setup Guide

Full-stack AI chat app with auth, usage limits, paywall, and image upload. Built with Next.js 15, Supabase, and the Vercel AI SDK v5.

---

## What's included

- Email/password auth (Supabase) with "Remember me" and forgot password
- Monthly usage limit (5 free messages/month) with automatic reset
- Paywall modal when limit is reached, showing the reset date
- Superuser bypass — set your email to skip the limit
- Streaming AI chat (Vercel AI SDK v5 + OpenAI gpt-4o-mini)
- Image upload to Supabase Storage, sent directly to the AI
- Chat history per user, saved to Supabase and restored on login
- Route protection via Next.js middleware
- Bilingual UI (English + Greek) — easy to extend or remove
- 3D robot avatar (Three.js / GLB) with idle/active animations
- Clean dark UI with Tailwind v4 + CSS custom properties
- Vercel-ready (zero config deploy)

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)
- An [OpenAI](https://platform.openai.com) account with an API key
- A [Vercel](https://vercel.com) account (free tier works)

---

## Step 1 — Clone and install

```bash
git clone <your-repo-url>
cd <project-folder>
npm install
```

---

## Step 2 — Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a name, password, and region
3. Wait for the project to be ready (~1 minute)

---

## Step 3 — Run the database schema

In your Supabase project go to **SQL Editor** and run this:

```sql
-- Chat history table
create table chat_history (
  id          bigserial primary key,
  user_id     text not null,
  prompt      text not null,
  response    text not null,
  created_at  timestamptz default now()
);

alter table chat_history enable row level security;

create policy "Users can read own history"
  on chat_history for select
  using (user_id = auth.uid()::text);

create policy "Users can insert own history"
  on chat_history for insert
  with check (user_id = auth.uid()::text);

-- Profiles table (tracks monthly usage)
create table profiles (
  id                  uuid primary key references auth.users on delete cascade,
  analyses_count      integer default 0,
  analyses_reset_at   timestamptz,
  created_at          timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, analyses_count, analyses_reset_at)
  values (
    new.id,
    0,
    date_trunc('month', now()) + interval '1 month'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## Step 4 — Create the storage bucket

1. In Supabase go to **Storage** → **New bucket**
2. Name it `chat_uploads`
3. Toggle **Public bucket** ON (required so the AI can read uploaded images)

---

## Step 5 — Set up environment variables

Create a `.env.local` file in the project root:

```env
# Supabase — find these in Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Storage bucket name (must match what you created in Step 4)
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=chat_uploads

# OpenAI — from platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Your email — bypasses the monthly usage limit
SUPERUSER_EMAIL=you@example.com
```

> **Never commit `.env.local`** — it's already in `.gitignore`.

---

## Step 6 — Configure Supabase Auth

1. In Supabase go to **Authentication → URL Configuration**
2. Set **Site URL** to your production URL (e.g. `https://your-app.vercel.app`)
3. Under **Redirect URLs**, add `https://your-app.vercel.app/auth/callback`

For local dev, also add `http://localhost:3000/auth/callback`.

---

## Step 7 — Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the login page.

---

## Step 8 — Deploy to Vercel

1. Push your code to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → Import project → select your repo
3. In the Vercel project settings, add all the same environment variables from Step 5
4. Deploy — Vercel auto-detects Next.js

---

## Customising the AI

Open `src/app/api/chat/route.ts` and find this line:

```ts
// ← Replace this with your app's system prompt
system: `You are a helpful AI assistant. Answer questions clearly and concisely.`,
```

Replace the system prompt with instructions for your specific use case.

To change the model, update this line:

```ts
model: openai('gpt-4o-mini'),  // change to 'gpt-4o' etc.
```

---

## Changing the usage limit

In `src/app/api/chat/route.ts`:

```ts
const FREE_LIMIT = 5;  // change this number
```

The same number is referenced in `src/app/page.tsx` — update it there too.

---

## Removing the language toggle

If you only need one language, delete `src/components/LanguageToggle.tsx` and `src/contexts/LanguageContext.tsx`, then simplify `src/lib/i18n.ts` to export a single flat object instead of `{ el, en }`.

---

## Support

If you run into issues, check that:
- All 5 env variables are set correctly
- The Supabase storage bucket is set to **public**
- The auth redirect URL in Supabase matches your domain exactly
- You're using Node.js 18+
