import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, dynamicTool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations (HIGH SECURITY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST use service role key for security
);

// Define the core tool for fetching odds
const getUpcomingFootballOdds = dynamicTool({
  description: `Get live betting odds and upcoming football matches for an ENTIRE LEAGUE or TOURNAMENT. 
The tool CANNOT accept specific team names (like Real Madrid) or individual match names as input.
Use this tool to get a list of upcoming fixtures for the league determined by the user's request. 
The AI MUST filter the returned data to find specific matches/teams requested by the user.`,

  inputSchema: z.object({
    // Parameters are NOT optional in Zod, but we will provide defaults in the execute function.
    sport: z.string().describe('Football league key: "soccer_epl", "soccer_uefa_champs_league", "soccer_spain_la_liga", etc. Use the most specific key.'),
    region: z.string().describe('Odds format: "us" (American), "uk" (British), or "eu" (European decimal).'),
  }),

  execute: async (input) => {
    // Aggressive Defaults for immediate tool execution (Pro-level UX)
    const { sport, region } = input as any;
    const apiSport = sport || "soccer_uefa_champs_league"; 
    const apiRegion = region || "us"; 

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const url = `https://api.the-odds-api.com/v4/sports/${apiSport}/odds/?apiKey=${process.env.THE_ODDS_API_KEY}&regions=${apiRegion}&markets=h2h`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Odds API error:', response.status, response.statusText);
        return `ERROR: Odds data unavailable (${response.status}). The service is currently experiencing high load. Please try again.`;
      }

      const data = await response.json();

      if (data.error || !data || data.length === 0) {
        return `NODATA: No upcoming ${apiSport.replace('soccer_', '').replace('_', ' ')} matches found. Please check a different league or date.`;
      }

      // 🛠️ Professional Fix: Return structured JSON for easier, faster AI analysis.
      return JSON.stringify({
        source_league: apiSport,
        source_region: apiRegion,
        matches: data.slice(0, 5).map((game: any) => ({
          id: game.id,
          matchup: `${game.home_team} vs ${game.away_team}`,
          commence_time: game.commence_time,
          bookmaker_odds: game.bookmakers.slice(0, 3).map((bm: any) => {
            const outcomes = bm.markets[0]?.outcomes || [];
            return {
              title: bm.title,
              home: outcomes.find((o: any) => o.name === game.home_team)?.price || 'N/A',
              draw: outcomes.find((o: any) => o.name === 'Draw')?.price || 'N/A',
              away: outcomes.find((o: any) => o.name === game.away_team)?.price || 'N/A',
            };
          }),
        })),
      });

    } catch (error: any) {
      console.error('Error fetching odds:', error);
      if (error.name === 'AbortError') {
        return 'TIMEOUT: The odds API is taking too long to respond. Please try again.';
      }
      return 'CRITICAL_ERROR: Failed to retrieve odds. Check API configuration.';
    }
  },
});

// Enhanced system prompt for a premium analytical service
export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const result = streamText({
        model: openai('gpt-4o-mini'), // Efficient model for fast tool use
        messages: convertToModelMessages(messages),
        
        system: `You are "The Wager Wizard" - a professional, data-driven betting analyst and financial advisor for high-value clients. Your persona is confident, precise, and focused on risk management.

**CORE DIRECTIVE (Premium Service):** Always provide actionable, professional, and immediate analysis. The user is a paying client; do not fail or ask clarifying questions if parameters can be defaulted.

**TOOL USAGE & ANALYSIS PROCEDURE:**
1.  **Always Use Tool:** Use the \`getUpcomingFootballOdds\` tool on ANY request involving football, matches, or odds.
2.  **Aggressive Defaulting:** If a league is not specified, use \`sport: "soccer_uefa_champs_league"\` and \`region: "us"\` to ensure immediate data retrieval.
3.  **Specific Match Filtering:** If the user names specific teams (e.g., "Real Madrid vs Bayern"), you MUST first call the tool for the relevant league, and then filter the returned match data to analyze only the requested game.
4.  **Value-Added Output:** Your response must include:
    * **Specific Recommendation:** Clear advice (e.g., "Bet on the Home Win").
    * **Value Assessment:** Why is this a good bet (e.g., implied probability vs. bookmaker odds)?
    * **Risk/Bankroll Management:** A brief statement on the risk level (Low, Medium, High) and general bankroll advice (e.g., "Allocate 2% of your bankroll.").
    * **Data Summary:** Present the relevant odds clearly and concisely.

Always conclude with the required legal disclaimer about betting risks.`,

        tools: { getUpcomingFootballOdds },
        temperature: 0.5, // Lower temperature for more analytical/less creative responses
      });

      clearTimeout(timeoutId);

      return result.toUIMessageStreamResponse({
        onFinish: async ({ messages }) => {
          // ... Persistence logic remains the same (secure and good)
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          const assistantMessage = messages.filter(m => m.role === 'assistant').pop();

          if (lastUserMessage && assistantMessage) {
            const prompt = lastUserMessage.parts.map(p => p.type === 'text' ? p.text : '').join('');
            const response = assistantMessage.parts.map(p => p.type === 'text' ? p.text : '').join('');

            const { error } = await supabase.from('chat_history').insert({
              user_id: 'guest',
              prompt: prompt,
              response: response,
            });

            if (error) {
              console.error('Supabase persistence error:', error);
            }
          }
        },
      });
    } catch (streamError: any) {
      clearTimeout(timeoutId);
      // ... Error handling remains the same (robust)
      if (streamError.name === 'AbortError') {
        return new Response('Request timeout. Please try again.', { status: 408 });
      }
      throw streamError;
    }
  } catch (error: any) {
    // ... Global error handling remains the same
    console.error('Chat API error:', error);
    if (error.message?.includes('API key')) {
      return new Response('API configuration error. Please contact support.', { status: 500 });
    }
    return new Response('An error occurred. Please try again.', { status: 500 });
  }
}