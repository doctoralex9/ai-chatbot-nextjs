# AI Betting Copilot

A focused betting risk-management assistant that helps users avoid bad bets, manage bankroll and make smarter staking decisions. This project is built on a solid technical foundation: Next.js, Supabase chat history, live odds integration, image attachment support and mobile-first responsiveness.

## Product Positioning

> Το προϊόν δεν είναι prediction tipster.

Το MVP πρέπει να είναι:

- risk-first, όχι “βάλε αυτό το στοίχημα”
- honest warning-driven
- focused σε μείωση losses
- όχι σε “αξία” που υπόσχεται κέρδος

## Why this pivot

Η αγορά των generic AI predictions είναι κορεσμένη και δύσκολη για monetization.

Το σωστό niche για αυτό το project είναι:

- **AI Betting Copilot (risk-first)**
- Προτείνει **“μην παίξεις”**, **“μείωσε stake”**, **“overbet”**, **“αρνητικό EV”**
- Αυτή η θέση χτίζει εμπιστοσύνη και έχει διαφοροποίηση

## Current Status

Το project έχει ήδη χρήσιμα στοιχεία που πρέπει να κρατηθούν:

- Next.js app και UI
- Supabase history persistence
- Odds API integration
- Βασικό chat / AI pipeline
- Mobile-first responsive chat experience
- Screenshot/image attachment support for ticket uploads

Αυτό που πρέπει να σταματήσει τώρα:

- generic AI betting recommendations
- fancy prediction logic χωρίς direction
- feature-bloat πριν αποφασίσουμε το product

## Planned MVP

### Core value

Αντί για «predict the best bet», το MVP πρέπει να κάνει:

1. **Bet Input Analyzer**
   - Ο χρήστης εισάγει τα bets του
   - Το σύστημα δίνει συνολική πιθανότητα, risk score, EV estimate
   - Recommendation: **“μην παίξεις” / “μείωσε stake” / “too risky”**

2. **Bankroll Mode**
   - Ο χρήστης βάζει πόσα έχει διαθέσιμα
   - Το σύστημα προτείνει max bet size και risk per bet

3. **Brutal honesty AI**
   - Straight talk, όχι marketing
   - “This is a bad bet”, “You are chasing losses”, “This looks like a trap”

## 14-day execution plan

### Day 1–2: Product decision

- Οριστικοποιούμε το positioning:
  - **AI Betting Copilot που μειώνει losses — όχι tipster**
- Σταματάμε να διορθώνουμε τυχαία bugs ή να γράφουμε features που δεν έχουν σχέση με το νέο product

### Day 3–5: MVP build

- Σχεδιάζουμε simple bet input form
- Προσθέτουμε basic analysis logic
- Δίνουμε clear output:
  - risk score
  - EV direction
  - betting recommendation

### Day 6–7: Deploy

- Deploy σε Vercel
- Κάνουμε sanity check στα βασικά flows
- Ελέγχουμε ότι το app είναι shareable

### Day 8–14: Early go-to-market

- Ξεκινάμε TikTok push με daily posts
- Messaging:
  - “AI stopped me from losing 100€”
  - “Don’t bet before you see this”
  - “Most people lose because of THIS”
- Secondary channel: LinkedIn με building journey και product story
- Στόχος: first 100 users

## Monetization Path

### Phase 1 (0–2 εβδομάδες)

- free tool
- στόχος: traffic και engagement

### Phase 2 (2–4 εβδομάδες)

- affiliate links με Stoiximan / Novibet / άλλες πλατφόρμες
- φέρνουν πρώτα χρήματα χωρίς να χρειάζεται product-market fit

### Phase 3 (1–2 μήνες)

- premium λειτουργία (€5–10)
- πρόσθετα analytics, bankroll planner, προειδοποιήσεις

## What to keep in the repo

### Keep

- Next.js setup
- chat UI foundation
- Supabase history
- Odds API integration

### Avoid investing more in

- “AI predictions logic”
- fancy tips prompts
- generic recommendation flow

## Tech Stack

- **Framework:** Next.js 15 with Turbopack
- **AI:** Vercel AI SDK with OpenAI integration
- **Database:** Supabase
- **Styling:** Tailwind CSS 4
- **Language:** TypeScript
- **Data Source:** The Odds API

## Prerequisites

Before running this project, you need:

- Node.js 20+ installed
- npm, yarn, pnpm, or bun package manager
- Supabase account and project
- OpenAI API key
- The Odds API key

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

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

Create a `chat_history` table in your Supabase project:

```sql
CREATE TABLE chat_history (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
```

Create a Supabase Storage bucket for attachments:

```bash
# In Supabase Storage create a public bucket named:
chat_uploads
```

Use this bucket to store screenshot attachments uploaded by users.

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

3. Set up your environment variables (see above)

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build the production application
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## Usage

1. Open the application in your browser
2. Use the app as an early **AI Betting Copilot**
3. Attach ticket screenshots or odds slips to get context-aware risk feedback
4. Focus on evaluating risk and reducing losses rather than finding the “best bet”

## Important Disclaimer

This application is for informational and educational purposes only. Betting involves significant financial risk. Users should:

- Never wager more than they can afford to lose
- Understand that all betting decisions are probabilistic, not guaranteed
- Comply with local gambling laws and regulations
- Use the tool responsibly

## License

This project is private and proprietary.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [Vercel AI SDK](https://sdk.vercel.ai/)
- Odds data from [The Odds API](https://the-odds-api.com/)
- Database by [Supabase](https://supabase.com/)
