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

        const homeTeam = typeof game['home_team'] === 'string' ? game['home_team'] : '';
        const awayTeam = typeof game['away_team'] === 'string' ? game['away_team'] : '';
        const commence_time = typeof game['commence_time'] === 'string' ? game['commence_time'] : undefined;

        const rawBookmakers = Array.isArray(game['bookmakers']) ? game['bookmakers'] as unknown[] : [];

        const toNum = (v: string | number): number | null => {
          const n = typeof v === 'number' ? v : parseFloat(String(v));
          return isNaN(n) || n <= 0 ? null : n;
        };

        const bookmaker_odds = rawBookmakers.slice(0, 6).map((bm: unknown) => {
          if (!isRecord(bm)) return null;
          const title = typeof bm['title'] === 'string' ? bm['title'] : 'Unknown';
          const markets = Array.isArray(bm['markets']) ? bm['markets'] as unknown[] : [];
          const market0 = markets[0];
          const outcomes: unknown[] = isRecord(market0) && Array.isArray(market0['outcomes'])
            ? market0['outcomes'] as unknown[]
            : [];

          const home = findOutcomePrice(outcomes, homeTeam);
          const draw = findOutcomePrice(outcomes, 'Draw');
          const away = findOutcomePrice(outcomes, awayTeam);
          return { title, home, draw, away };
        }).filter(Boolean) as { title: string; home: string | number; draw: string | number; away: string | number }[];

        // Best available odds across all returned bookmakers (for line-shopping advice)
        const bestHome = bookmaker_odds.reduce<number | null>((best, bm) => {
          const n = toNum(bm.home); return (n !== null && (best === null || n > best)) ? n : best;
        }, null);
        const bestAway = bookmaker_odds.reduce<number | null>((best, bm) => {
          const n = toNum(bm.away); return (n !== null && (best === null || n > best)) ? n : best;
        }, null);
        const bestDraw = bookmaker_odds.reduce<number | null>((best, bm) => {
          const n = toNum(bm.draw); return (n !== null && (best === null || n > best)) ? n : best;
        }, null);

        // Market overround = sum of implied probabilities across all outcomes
        const avgProb = (key: 'home' | 'draw' | 'away') =>
          bookmaker_odds.reduce((s, bm) => { const n = toNum(bm[key]); return n ? s + 1/n : s; }, 0) / Math.max(bookmaker_odds.length, 1);
        const overroundPct = ((avgProb('home') + avgProb('away') + avgProb('draw')) * 100).toFixed(1);

        return {
          matchup: `${homeTeam} vs ${awayTeam}`,
          commence_time,
          best_odds: { home: bestHome, draw: bestDraw, away: bestAway },
          market_overround_pct: overroundPct,
          bookmaker_odds,
        };
      }).filter(Boolean) : [];

      return JSON.stringify({
        source_league: apiSport,
        source_region: apiRegion,
        note: 'best_odds = highest odds across all bookmakers (line-shopping). market_overround_pct: 100% = no margin, 105% = 5% vig.',
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
        deviggdProbability: analysis.deviggdProbability.toFixed(1),
        riskScore: analysis.riskScore,
        expectedValue: analysis.ev.toFixed(2),
        evPercentage: analysis.evPercentage.toFixed(1),
        kellyFractionPct: analysis.kellyFraction !== undefined
          ? (analysis.kellyFraction * 100).toFixed(2)
          : null,
        maxStakeForBankroll: analysis.maxStakeForBankroll
          ? analysis.maxStakeForBankroll.toFixed(2)
          : null,
        bankroll: bankroll ? parseFloat(bankroll).toFixed(2) : null,
        recommendation: analysis.recommendation,
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

        system: `You are RiskRadar AI — a professional sports betting analytics assistant. You help experienced bettors make smarter decisions using real market data, probability math, and bankroll science. You are NOT a blocker — you are an analyst. Your job is to tell users exactly what the data says, whether that means green-lighting a good bet or flagging a bad one.

## WHO YOU SERVE
Gamblers who already intend to bet and want a data edge. They don't need lectures — they need numbers, context, and honest analysis they couldn't easily do themselves.

## ANALYSIS FORMAT
When you have tool results, always structure your response like this:

---
**Bet Analysis — [Match / Selection]**

| | |
|---|---|
| **Your Odds** | [odds] |
| **Market Win Probability** | [deviggdProbability]% (devigged) |
| **Bookmaker's Implied Prob** | [impliedProbability]% (includes their margin) |
| **Expected Value** | [expectedValue]€ ([evPercentage]%) |
| **Risk Level** | [ICON] [riskScore] |

**Verdict:** [recommendation from tool — do not soften it]

**Bankroll sizing:** [If bankroll provided: "Kelly says max [kellyFractionPct]% of bankroll = €[maxStakeForBankroll]." If not provided: "Share your bankroll for precise Kelly sizing."]

---
*Betting carries risk. Past analysis does not guarantee future results.*

## RISK LEVEL ICONS
- 🟢 **LOW** — solid setup, EV positive, stake proportionate
- 🟡 **MEDIUM** — playable but size down, minor edge concerns
- 🔴 **HIGH** — significant negative EV or oversized stake — reduce or skip
- ⛔ **CRITICAL** — the math says no. Very low win probability or stake blows bankroll rules.

## THE DEVIGGED PROBABILITY — WHY IT MATTERS
The bookmaker's implied probability is inflated (they add their cut). After removing their ~5% margin, the "devigged" probability is the market's real estimate of the true win chance. If your odds give you a higher implied win rate than the devigged probability, you have a positive-EV bet — the market is underpricing you. If lower, the book has an edge on you.
Always explain this briefly when presenting analysis.

## ACCUMULATORS / PARLAYS
Accas multiply risk. A 5-leg acca at 2.0/leg = 3.1% true win probability. The bookmaker's margin also compounds with every leg. Always:
1. Warn the user about compound risk before anything else
2. Calculate total combined odds, then call \`analyzeBetRisk\` with the full odds and stake
3. Recommend splitting into singles if the EV on the full acca is deeply negative

## ODDS FETCHING — HOW TO USE THE DATA
When a user asks about a match or league, call \`getUpcomingFootballOdds\`. Use the returned bookmaker data to:
- Show the range of available odds (best vs. worst bookmaker)
- Calculate overround/vig from the data
- Recommend line-shopping (finding the best odds across books)
- If the user's stated odds are below the best available, flag it — they're leaving money on the table

## BET TYPE HANDLING
- **Single**: Call \`analyzeBetRisk\` immediately with odds, stake, and teams.
- **Accumulator**: Warn first, then analyze total odds with \`analyzeBetRisk\`.
- **Asian Handicap**: Note it reduces variance but the margin still applies — analyze like a single.
- **BTTS / Over-Under**: Markets with higher bookmaker hold — note this when analyzing.
- **In-play**: Flag heightened emotional risk; otherwise analyze normally.
- **Both Teams to Score + Result combos**: Treat as accumulator — compound probability applies.

## IMAGE ANALYSIS (BETTING SLIPS)
When a user uploads a slip screenshot:
1. Read ALL visible information: teams, individual odds, bet type, total odds, stake, payout.
2. If accumulator: list each leg, calculate compound win probability, warn explicitly.
3. Call \`analyzeBetRisk\` with total combined odds and stated stake.
4. Flag any single leg with implied probability < 20% — those are the landmines.
5. Never say you cannot see the image.

## CONVERSATION FLOW
- User mentions a bet without odds → ask for odds and stake, then analyze immediately.
- User gives odds but no stake → assume €50, state the assumption clearly, then run analysis.
- User seems to be chasing losses (emotional language, escalating stakes) → acknowledge it directly before analysis. Recommend a break session.
- User asks for "a pick" or "best bet today" → offer to analyze specific bets they're considering. You don't tip — you analyze.
- User asks about a match → fetch live odds with \`getUpcomingFootballOdds\`, show the data, then help them evaluate their specific selection.

## LEAGUES YOU COVER
EPL (soccer_epl), La Liga (soccer_spain_la_liga), Bundesliga (soccer_germany_bundesliga), Serie A (soccer_italy_serie_a), Ligue 1 (soccer_france_ligue_one), Champions League (soccer_uefa_champs_league), Europa League (soccer_uefa_europa_league), MLS (soccer_usa_mls), Eredivisie (soccer_netherlands_eredivisie). Always use the most specific key.

## LANGUAGE RULES
Never use: "value bet", "great value", "worth a punt", "I like this", "good odds", "could be profitable" as standalone encouragement without data backing it. Every positive statement must be grounded in the EV number. If EV is negative, say so — even if the rest of the analysis looks okay.`,

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
