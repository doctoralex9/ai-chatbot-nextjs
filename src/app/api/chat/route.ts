import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, dynamicTool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { analyzeBet } from '@/lib/betAnalysis';

const isTextPart = (part: unknown): part is { type: 'text'; text?: string } =>
  typeof part === 'object' && part !== null && (part as { type?: string }).type === 'text';

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
      // Invalid input β€” log for debugging and fall back to safe defaults
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

      if (!data || data.error || data.length === 0) {
        return `NODATA: No upcoming ${apiSport.replace('soccer_', '').replace('_', ' ')} matches found. Please check a different league or date.`;
      }

      // π› οΈ Professional Fix: Return structured JSON for easier, faster AI analysis.
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

// New tool: Analyze bet for risk and EV
const analyzeBetRisk = dynamicTool({
  description: `Analyze a specific bet for risk score, expected value (EV), and recommendation. 
Use this when a user provides specific odds, stake, and teams they want to analyze.
Input: odds (decimal or American format), stake in euros, optional bankroll.
Output: Risk assessment, EV calculation, and clear recommendation (don't bet / reduce stake).`,

  inputSchema: z.object({
    odds: z.string().describe('Odds in decimal (2.50) or American (-110, +200) format'),
    stake: z.string().describe('Bet stake amount in euros'),
    teams: z.string().optional().describe('Teams/match description'),
    bankroll: z.string().optional().describe('Total available bankroll in euros'),
  }),

  execute: async (input) => {
    const parsed = z.object({
      odds: z.string(),
      stake: z.string(),
      teams: z.string().optional(),
      bankroll: z.string().optional(),
    }).safeParse(input);

    if (!parsed.success) {
      return 'Invalid input. Provide odds (e.g., 2.50), stake (e.g., 50), and optional bankroll.';
    }

    const { odds, stake, teams, bankroll } = parsed.data;

    try {
      const analysis = analyzeBet(odds, stake, bankroll);

      return JSON.stringify({
        match: teams || 'Unnamed bet',
        odds: analysis.odds.toFixed(2),
        stake: analysis.stake.toFixed(2),
        impliedProbability: analysis.impliedProbability.toFixed(1),
        riskScore: analysis.riskScore,
        expectedValue: analysis.ev.toFixed(2),
        evPercentage: analysis.evPercentage.toFixed(1),
        recommendation: analysis.recommendation,
        maxStakeForBankroll: analysis.maxStakeForBankroll
          ? analysis.maxStakeForBankroll.toFixed(2)
          : null,
        bankroll: bankroll ? parseFloat(bankroll).toFixed(2) : null,
      });
    } catch (error) {
      console.error('Bet analysis error:', error);
      return 'Error analyzing bet. Check odds and stake format.';
    }
  },
});

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      // convertToModelMessages puts FileUIPart.url (a string) into FilePart.data.
      // @ai-sdk/openai only handles URL *objects* for remote URLs — string URLs get
      // incorrectly treated as raw base64 and double-encoded (SDK bug in v2.0.32).
      // Fix: walk the model messages and convert any HTTPS data string to URL object.
      const rawModelMessages = convertToModelMessages(messages);
      const modelMessages = rawModelMessages.map(msg => {
        if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;
        return {
          ...msg,
          content: msg.content.map(part => {
            const p = part as unknown as Record<string, unknown>;
            if (p['type'] !== 'file' || typeof p['data'] !== 'string') return part;
            const data = p['data'] as string;
            if (data.startsWith('https://') || data.startsWith('http://')) {
              return { ...p, data: new URL(data) };
            }
            if (data.startsWith('data:')) {
              // Extract raw base64 portion after the comma
              return { ...p, data: data.split(',')[1] ?? '' };
            }
            return part;
          }),
        };
      }) as typeof rawModelMessages;

      const result = streamText({
        model: openai('gpt-4o-mini'),
        messages: modelMessages,
        abortSignal: controller.signal,

        system: `You are the "AI Betting Copilot" - a blunt, no-nonsense risk analyst focused on preventing betting losses. Your job is to warn users against bad bets, highlight risks, and promote responsible gambling. You NEVER encourage betting or give "tips" that promise wins.

**CORE PRINCIPLES:**
- Risk-first mentality: Always prioritize loss prevention over potential gains
- Brutal honesty: Be direct and harsh about bad decisions ("This is a terrible bet", "You're chasing losses", "This looks like a trap")
- Warning-driven: Lead with cautions like "Don't bet", "Reduce your stake", "Too risky", "Negative EV"
- No marketing hype: Avoid phrases that sound like sales or excitement about betting

**RESPONSE STYLE:**
- Start with warnings immediately - no fluff or engagement
- Keep responses concise (2-3 sentences max for analysis)
- Use straightforward, serious tone - like a stern advisor
- Focus on facts and risks, not predictions or "value"

**IMAGE ANALYSIS:**
When the user uploads a betting slip or coupon screenshot, you CAN see the image. Extract all visible information (teams, odds, selections, total odds, stake, potential payout) and immediately run full risk analysis — risk score, EV direction, recommendation. Do not say you cannot access images.

**TOOL USAGE:**
- For specific bet analysis: Use \`analyzeBetRisk\` when user provides odds, stake, and teams. This calculates EV, risk score, and gives direct recommendations.
- For odds/match requests: Use \`getUpcomingFootballOdds\` to fetch current odds for the league/match mentioned
- Always call the appropriate tool based on user input - don't skip analysis
- Interpret tool output directly - present risk scores, EV, and recommendations without softening them

**ANALYSIS FORMAT (from tool output):**
1. State the risk score immediately (Low/Medium/High/Critical)
2. Present EV (positive or negative percentage)
3. Repeat the recommendation from the tool
4. Add only if relevant: Bankroll suggestion (max stake)
5. Always end with: "Betting involves risk of loss."

**FOR GENERAL CHAT:**
Respond directly to questions about betting risks or responsible gambling. Discourage impulsive bets. If user says something like "I want to bet on X", ask for odds and stake to use the analysis tool.`,

        tools: { getUpcomingFootballOdds, analyzeBetRisk },
        stopWhen: stepCountIs(5),
        temperature: 0.7,
      });

      return result.toUIMessageStreamResponse({
        onFinish: async ({ messages }) => {
          clearTimeout(timeoutId);
          // ... Persistence logic remains the same (secure and good)
          const lastUserMessage = messages.filter(m => m.role === 'user').pop();
          const assistantMessage = messages.filter(m => m.role === 'assistant').pop();

          if (lastUserMessage && assistantMessage) {
            // Extract text from parts array, handling both text and image types
            const extractText = (parts: unknown): string => {
              if (!Array.isArray(parts)) return '';
              return parts
                .filter(isTextPart)
                .map((p) => p.text || '')
                .join('');
            };

            const prompt = extractText(lastUserMessage.parts);
            const response = extractText(assistantMessage.parts);

            const { error } = await supabase.from('chat_history').insert({
              user_id: 'guest',
              prompt,
              response,
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
