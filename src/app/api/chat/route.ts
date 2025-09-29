import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, dynamicTool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define your tool here
export const getUpcomingFootballOdds = dynamicTool({
  // This description tells the AI when to use this tool
  description: `Get live betting odds and upcoming football matches. Use this tool whenever users ask about:
- Today's matches, fixtures, or games
- Premier League, Champions League, or any football league matches
- Betting odds, lines, or predictions
- Match analysis or recommendations
- "What games are on today?" or "Any good bets?"
- Comparing bookmaker odds
- Finding value bets or favorites vs underdogs
Always use this tool first when users mention football, soccer, matches, betting, or odds.`,
  
  inputSchema: z.object({
    sport: z.string().describe('Football league: "soccer_epl" (Premier League), "soccer_uefa_champs_league" (Champions League), "soccer_spain_la_liga" (La Liga), "soccer_italy_serie_a" (Serie A), "soccer_germany_bundesliga" (Bundesliga), "soccer_france_ligue_one" (Ligue 1), "soccer_usa_mls" (MLS)'),
    region: z.string().describe('Odds format: "uk" (British fractional), "us" (American +/-), "eu" (European decimal)'),
  }),

  execute: async (input) => {
    const { sport, region } = input as any;
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${process.env.THE_ODDS_API_KEY}&regions=${region}&markets=h2h`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        return `Error from Odds API: ${data.error}`;
      }
      
      if (data.length === 0) {
        return `No upcoming ${sport.replace('soccer_', '').replace('_', ' ')} matches found. Try another league or check back later.`;
      }
      
      const summary = data.map((game: any) => {
        const homeTeam = game.home_team;
        const awayTeam = game.away_team;
        const commenceTime = new Date(game.commence_time).toLocaleString();
        
        // Get best odds from different bookmakers
        const bookmakers = game.bookmakers.slice(0, 3).map((bm: any) => {
          const outcomes = bm.markets[0].outcomes;
          const homeOdds = outcomes.find((o: any) => o.name === homeTeam)?.price;
          const awayOdds = outcomes.find((o: any) => o.name === awayTeam)?.price;
          const drawOdds = outcomes.find((o: any) => o.name === 'Draw')?.price;
          
          return `${bm.title}: ${homeTeam} ${homeOdds}, Draw ${drawOdds}, ${awayTeam} ${awayOdds}`;
        }).join(' | ');
        
        return `🏆 ${homeTeam} vs ${awayTeam}
        📅 ${commenceTime}
        💰 ${bookmakers}`;
      }).join('\n\n');
      
      return `Here are the upcoming matches with live betting odds:\n\n${summary}`;
    } catch (error) {
      console.error('Error fetching odds:', error);
      return 'Unable to fetch current odds. Please try again later.';
    }
  },
});

// Enhanced system prompt
export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: convertToModelMessages(messages),
      system: `You are "The Wager Wizard" - an expert football betting analyst and advisor.

IMPORTANT: When users ask about football matches, betting, or odds - ALWAYS use the getUpcomingFootballOdds tool first to get current data.

Common triggers to use the tool:
- "What matches are on today?"
- "Any good Premier League bets?"
- "Show me today's odds"
- "What games should I bet on?"
- "Premier League predictions"
- "Champions League matches"

When users mention a specific league, use that league. If they don't specify:
- Ask them which league they're interested in
- Or suggest popular options: Premier League, Champions League, La Liga, Serie A, Bundesliga

After getting odds data, provide:
✅ Match analysis and recommendations
✅ Value bet identification (underdog vs favorite analysis)  
✅ Risk assessment for each match
✅ Bankroll management advice
✅ Multiple betting strategy options

Always remind users that betting involves risk and to only bet what they can afford to lose.`,
      
      tools: { getUpcomingFootballOdds },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}  