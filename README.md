# AI Betting Copilot

This repository contains the technical implementation of an AI chat (AI Betting Copilot) application built with Next.js, Supabase, and The Odds API. 

## Overview

- Next.js 15 app with Turbopack
- AI chat interface for risk analysis
- Supabase chat history persistence
- Odds API data integration
- Screenshot/image attachment support
- Mobile-first responsive UI

## Tech Stack

- **Framework:** Next.js 15 with Turbopack
- **AI integration:** Vercel AI SDK + OpenAI
- **Database / Storage:** Supabase
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **Data Source:** The Odds API

## Prerequisites

- Node.js 20+
- npm, yarn, or pnpm
- Supabase account and project
- OpenAI API key
- The Odds API key

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# The Odds API Configuration
THE_ODDS_API_KEY=your_odds_api_key
```

## Database Setup

Create the `chat_history` table in your Supabase project:

```sql
CREATE TABLE chat_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
```

Create a Supabase Storage bucket for attachments:

```bash
# In Supabase Storage create a public bucket named:
chat_uploads
```

Use this bucket for screenshot and ticket uploads.

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-chatbot-nextjs
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up `.env.local` with your credentials.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open http://localhost:3000 in your browser.

## Available Scripts

- `npm run dev` � Start development server with Turbopack
- `npm run build` � Build production application
- `npm start` � Start production server
- `npm run lint` � Run ESLint

## Project Structure

- `src/app/` � Next.js app routes and pages
- `src/app/api/chat/route.ts` � chat API route
- `src/components/ChatMessage.tsx` � chat message UI component
- `src/app/Loader.tsx` � loading indicator
- `src/app/loading.tsx` � Next.js loading state
- `src/app/page.tsx` � main application page
- `src/app/globals.css` � global styles
- `types/globals.d.ts` � shared TypeScript declarations

## License

This project is private and proprietary.
