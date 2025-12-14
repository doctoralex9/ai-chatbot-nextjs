# Wager Wizard Pro

An AI-powered betting analyst chatbot that provides professional, data-driven betting analysis for football matches. Built with Next.js 15, AI SDK, and real-time odds integration.

## Features

- **Real-Time Odds Integration** - Fetches live betting odds from The Odds API for major football leagues
- **AI-Powered Analysis** - Uses OpenAI GPT-4o-mini for intelligent match analysis and betting recommendations
- **Persistent Chat History** - Conversation history stored in Supabase for seamless user experience
- **Responsive Design** - Mobile-first UI with Tailwind CSS 4
- **Streaming Responses** - Real-time AI responses with streaming support
- **Risk Management** - Built-in risk assessment and bankroll management advice

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

## Supported Football Leagues

The application supports multiple football leagues including:

- UEFA Champions League (`soccer_uefa_champs_league`)
- English Premier League (`soccer_epl`)
- Spanish La Liga (`soccer_spain_la_liga`)
- And more...

Odds are available in multiple formats:
- US (American)
- UK (British)
- EU (European decimal)

## Usage

1. Open the application in your browser
2. Type your question about football matches, odds, or predictions
3. The AI will fetch real-time odds and provide professional analysis
4. Receive betting recommendations with risk assessment

Example queries:
- "What are the odds for the next Champions League matches?"
- "Give me an analysis of Real Madrid vs Bayern"
- "What's the best value bet for Premier League this week?"

## Project Structure

```
ai-chatbot-nextjs/
├── src/
│   └── app/
│       ├── api/
│       │   └── chat/
│       │       └── route.ts       # Chat API endpoint with AI integration
│       ├── layout.tsx              # Root layout
│       └── page.tsx                # Main chatbot interface
├── public/                         # Static assets
├── .env.local                      # Environment variables
└── package.json                    # Project dependencies
```

## Important Disclaimer

This application is for informational and educational purposes only. Betting involves significant financial risk. Users should:

- Never wager more than they can afford to lose
- Understand that all betting predictions are probabilistic, not guaranteed
- Comply with local gambling laws and regulations
- Use the tool responsibly

## License

This project is private and proprietary.

## Contributing

This is a private project. For issues or suggestions, please contact the repository owner.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI powered by [Vercel AI SDK](https://sdk.vercel.ai/)
- Odds data from [The Odds API](https://the-odds-api.com/)
- Database by [Supabase](https://supabase.com/)
