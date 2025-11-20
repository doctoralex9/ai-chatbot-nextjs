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
    // Validate input shape at runtime using Zod and apply safe defaults.
    const OddsToolInput = z.object({
      sport: z.string().optional(),
      region: z.string().optional(),
    });

    const parsed = OddsToolInput.safeParse(input);
    if (!parsed.success) {
      // Invalid input — log for debugging and fall back to safe defaults
      console.warn('getUpcomingFootballOdds: invalid input, using defaults', parsed.error);
    }

    const apiSport = parsed.success ? (parsed.data.sport ?? "soccer_uefa_champs_league") : "soccer_uefa_champs_league";
    const apiRegion = parsed.success ? (parsed.data.region ?? "us") : "us";

    // Helper type guards to safely handle external JSON shapes
    const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
    const findOutcomePrice = (outcomes: unknown[], name: string): string | number => {
      for (const o of outcomes) {
        if (isRecord(o)) {
          const oName = o['name'];
          const price = o['price'];
          if (typeof oName === 'string' && oName === name && (typeof price === 'string' || typeof price === 'number')) {
            return price;
          }
        }
      }
      return 'N/A';
    };

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
      const matches = Array.isArray(data) ? data.slice(0, 5).map((game: unknown) => {
        if (!isRecord(game)) return null;

        const id = typeof game['id'] === 'string' ? game['id'] : String(game['id'] ?? '');
        const homeTeam = typeof game['home_team'] === 'string' ? game['home_team'] : '';
        const awayTeam = typeof game['away_team'] === 'string' ? game['away_team'] : '';
        const commence_time = typeof game['commence_time'] === 'string' ? game['commence_time'] : undefined;

        const rawBookmakers = Array.isArray(game['bookmakers']) ? game['bookmakers'] as unknown[] : [];
        const bookmaker_odds = rawBookmakers.slice(0, 3).map((bm: unknown) => {
          if (!isRecord(bm)) return { title: 'Unknown', home: 'N/A', draw: 'N/A', away: 'N/A' };

          const title = typeof bm['title'] === 'string' ? bm['title'] : 'Unknown';
          const markets = Array.isArray(bm['markets']) ? bm['markets'] as unknown[] : [];
          const market0 = markets[0];
          const outcomes = Array.isArray(isRecord(market0) ? market0['outcomes'] as unknown[] : undefined) ? (market0 as Record<string, unknown>)['outcomes'] as unknown[] : [];

          const home = findOutcomePrice(outcomes, homeTeam);
          const draw = findOutcomePrice(outcomes, 'Draw');
          const away = findOutcomePrice(outcomes, awayTeam);

          return { title, home, draw, away };
        });

        return {
          id,
          matchup: `${homeTeam} vs ${awayTeam}`,
          commence_time,
          bookmaker_odds,
        };
      }).filter(Boolean) : [];

      return JSON.stringify({
        source_league: apiSport,
        source_region: apiRegion,
        matches,
      });

    } catch (error: unknown) {
      const err = error;
      if (err instanceof Error) {
        console.error('Error fetching odds:', err.message);
        if (err.name === 'AbortError') {
          return 'TIMEOUT: The odds API is taking too long to respond. Please try again.';
        }
      } else {
        console.error('Error fetching odds (non-Error):', err);
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
    } catch (streamError: unknown) {
      clearTimeout(timeoutId);
      // ... Error handling remains robust with proper narrowing
      if (streamError instanceof Error) {
        if (streamError.name === 'AbortError') {
          return new Response('Request timeout. Please try again.', { status: 408 });
        }
      }
      throw streamError;
    }
  } catch (error: unknown) {
    // ... Global error handling remains the same, but narrow the unknown
    const err = error;
    console.error('Chat API error:', err);
    const maybe = err as { message?: string };
    if (typeof maybe.message === 'string' && maybe.message.includes('API key')) {
      return new Response('API configuration error. Please contact support.', { status: 500 });
    }
    return new Response('An error occurred. Please try again.', { status: 500 });
  }
}