import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, dynamicTool, stepCountIs } from 'ai';
import { z } from 'zod';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { analyzeBet } from '@/lib/betAnalysis';

const FREE_LIMIT = 5;

const oddsCache = new Map<string, { data: string; expiry: number }>();
const ODDS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const SUPERUSER_EMAILS = (process.env.SUPERUSER_EMAIL ?? '')
  .split(',').map(e => e.trim()).filter(Boolean);

const isTextPart = (part: unknown): part is { type: 'text'; text?: string } =>
  typeof part === 'object' && part !== null && (part as { type?: string }).type === 'text';

// Service-role client — bypasses RLS for server-side DB operations
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getNextMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

const getUpcomingFootballOdds = dynamicTool({
  description: `Get live betting odds and upcoming football matches for an ENTIRE LEAGUE or TOURNAMENT.
The tool CANNOT accept specific team names (like Real Madrid) or individual match names as input.
Use this tool to get a list of upcoming fixtures for the league determined by the user's request.
The AI MUST filter the returned data to find specific matches/teams requested by the user.`,

  inputSchema: z.object({
    sport: z.string().describe('Football league key: "soccer_epl", "soccer_uefa_champs_league", "soccer_spain_la_liga", etc. Use the most specific key.'),
    region: z.string().describe('Odds format: "us" (American), "uk" (British), or "eu" (European decimal).'),
  }),

  execute: async (input) => {
    const OddsToolInput = z.object({
      sport: z.string().optional(),
      region: z.string().optional(),
    });

    const parsed = OddsToolInput.safeParse(input);
    if (!parsed.success) {
      console.warn('getUpcomingFootballOdds: invalid input, using defaults', parsed.error);
    }

    const apiSport  = parsed.success ? (parsed.data.sport  ?? 'soccer_uefa_champs_league') : 'soccer_uefa_champs_league';
    const apiRegion = parsed.success ? (parsed.data.region ?? 'us') : 'us';

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

    const cacheKey = `${apiSport}:${apiRegion}`;
    const cached = oddsCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) return cached.data;

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 10000);

      const url = `https://api.the-odds-api.com/v4/sports/${apiSport}/odds/?apiKey=${process.env.THE_ODDS_API_KEY}&regions=${apiRegion}&markets=h2h`;
      const response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Odds API error:', response.status, response.statusText);
        return `ERROR: Odds data unavailable (${response.status}). Please try again.`;
      }

      const data = await response.json();
      if (!data || data.error || data.length === 0) {
        return `NODATA: No upcoming ${apiSport.replace('soccer_', '').replace('_', ' ')} matches found.`;
      }

      const toNum = (v: string | number): number | null => {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        return isNaN(n) || n <= 0 ? null : n;
      };

      const matches = Array.isArray(data) ? data.slice(0, 5).map((game: unknown) => {
        if (!isRecord(game)) return null;

        const homeTeam      = typeof game['home_team'] === 'string' ? game['home_team'] : '';
        const awayTeam      = typeof game['away_team'] === 'string' ? game['away_team'] : '';
        const commence_time = typeof game['commence_time'] === 'string' ? game['commence_time'] : undefined;
        const rawBookmakers = Array.isArray(game['bookmakers']) ? game['bookmakers'] as unknown[] : [];

        const bookmaker_odds = rawBookmakers.slice(0, 6).map((bm: unknown) => {
          if (!isRecord(bm)) return null;
          const title    = typeof bm['title'] === 'string' ? bm['title'] : 'Unknown';
          const markets  = Array.isArray(bm['markets']) ? bm['markets'] as unknown[] : [];
          const market0  = markets[0];
          const outcomes: unknown[] = isRecord(market0) && Array.isArray(market0['outcomes'])
            ? market0['outcomes'] as unknown[]
            : [];
          return { title, home: findOutcomePrice(outcomes, homeTeam), draw: findOutcomePrice(outcomes, 'Draw'), away: findOutcomePrice(outcomes, awayTeam) };
        }).filter(Boolean) as { title: string; home: string | number; draw: string | number; away: string | number }[];

        const bestHome = bookmaker_odds.reduce<number | null>((b, bm) => { const n = toNum(bm.home); return (n !== null && (b === null || n > b)) ? n : b; }, null);
        const bestAway = bookmaker_odds.reduce<number | null>((b, bm) => { const n = toNum(bm.away); return (n !== null && (b === null || n > b)) ? n : b; }, null);
        const bestDraw = bookmaker_odds.reduce<number | null>((b, bm) => { const n = toNum(bm.draw); return (n !== null && (b === null || n > b)) ? n : b; }, null);

        const avgProb = (key: 'home' | 'draw' | 'away') =>
          bookmaker_odds.reduce((s, bm) => { const n = toNum(bm[key]); return n ? s + 1/n : s; }, 0) / Math.max(bookmaker_odds.length, 1);
        const overroundPct = ((avgProb('home') + avgProb('away') + avgProb('draw')) * 100).toFixed(1);

        return { matchup: `${homeTeam} vs ${awayTeam}`, commence_time, best_odds: { home: bestHome, draw: bestDraw, away: bestAway }, market_overround_pct: overroundPct, bookmaker_odds };
      }).filter(Boolean) : [];

      const result = JSON.stringify({
        source_league: apiSport,
        source_region: apiRegion,
        note: 'best_odds = highest odds across all bookmakers. market_overround_pct: 100% = no margin, 105% = 5% vig.',
        matches,
      });
      oddsCache.set(cacheKey, { data: result, expiry: Date.now() + ODDS_CACHE_TTL });
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') return 'TIMEOUT: The odds API is taking too long. Please try again.';
        console.error('Error fetching odds:', error.message);
      }
      return 'CRITICAL_ERROR: Failed to retrieve odds. Check API configuration.';
    }
  },
});

const analyzeBetRisk = dynamicTool({
  description: `Analyze a specific bet for risk score, expected value (EV), and recommendation.
Use this when a user provides specific odds, stake, and teams they want to analyze.`,

  inputSchema: z.object({
    odds:     z.string().describe('Odds in decimal (2.50) or American (-110, +200) format'),
    stake:    z.string().describe('Bet stake amount in euros'),
    teams:    z.string().optional().describe('Teams/match description'),
    bankroll: z.string().optional().describe('Total available bankroll in euros'),
  }),

  execute: async (input) => {
    const parsed = z.object({
      odds: z.string(), stake: z.string(),
      teams: z.string().optional(), bankroll: z.string().optional(),
    }).safeParse(input);

    if (!parsed.success) return 'Invalid input. Provide odds (e.g., 2.50), stake (e.g., 50), and optional bankroll.';

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
        kellyFractionPct: analysis.kellyFraction !== undefined ? (analysis.kellyFraction * 100).toFixed(2) : null,
        maxStakeForBankroll: analysis.maxStakeForBankroll ? analysis.maxStakeForBankroll.toFixed(2) : null,
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
    // ── 1. Authenticate user ────────────────────────────────────────────────
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const isSuperuser = SUPERUSER_EMAILS.includes(user.email ?? '');

    // ── 2. Check + enforce monthly usage limit ──────────────────────────────
    let profile: { analyses_count: number; analyses_reset_at: string } | null = null;

    if (!isSuperuser) {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('analyses_count, analyses_reset_at')
        .eq('id', user.id)
        .single();

      profile = data;

      if (!profile) {
        const nextReset = getNextMonthStart();
        await supabaseAdmin.from('profiles').insert({ id: user.id, analyses_count: 0, analyses_reset_at: nextReset });
        profile = { analyses_count: 0, analyses_reset_at: nextReset };
      }

      const now     = new Date();
      const resetAt = new Date(profile.analyses_reset_at);

      if (now > resetAt) {
        const nextReset = getNextMonthStart();
        await supabaseAdmin
          .from('profiles')
          .update({ analyses_count: 0, analyses_reset_at: nextReset })
          .eq('id', user.id);
        profile = { analyses_count: 0, analyses_reset_at: nextReset };
      }

      if (profile.analyses_count >= FREE_LIMIT) {
        return Response.json(
          { code: 'LIMIT_REACHED', resetAt: profile.analyses_reset_at, limit: FREE_LIMIT },
          { status: 429 }
        );
      }

      // Increment before streaming — avoids race with serverless onFinish
      await supabaseAdmin
        .from('profiles')
        .update({ analyses_count: profile.analyses_count + 1 })
        .eq('id', user.id);
    }

    // ── 3. Parse request body ───────────────────────────────────────────────
    const { messages, lang }: { messages: UIMessage[]; lang?: string } = await req.json();

    const lastMsg = messages[messages.length - 1];
    const msgText = Array.isArray(lastMsg?.parts)
      ? (lastMsg.parts as Array<{ type: string; text?: string }>)
          .filter(p => p.type === 'text')
          .map(p => p.text ?? '')
          .join('')
      : '';
    if (msgText.length > 2500) {
      return new Response('Message too long (max 2500 characters).', { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 55000);

    try {
      const rawModelMessages = convertToModelMessages(messages);
      const modelMessages = rawModelMessages.map(msg => {
        if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;
        return {
          ...msg,
          content: msg.content.map(part => {
            const p = part as unknown as Record<string, unknown>;
            if (p['type'] !== 'file' || typeof p['data'] !== 'string') return part;
            const data = p['data'] as string;
            if (data.startsWith('https://') || data.startsWith('http://')) return { ...p, data: new URL(data) };
            if (data.startsWith('data:')) return { ...p, data: data.split(',')[1] ?? '' };
            return part;
          }),
        };
      }) as typeof rawModelMessages;

      const result = streamText({
        model: openai('gpt-4o-mini'),
        messages: modelMessages,
        abortSignal: controller.signal,

        system: `${lang === 'en'
          ? 'LANGUAGE: Always respond in ENGLISH. Use English labels in your response format (e.g. "Recommendation:" not "Σύσταση:", "Risk Level" not "ΕΠΙΠΕΔΟ ΡΙΣΚΟΥ", "Smart Tip" not "Έξυπνη Συμβουλή", "Potential win:" not "Πιθανό κέρδος:").\n\n'
          : 'ΓΛΩΣΣΑ: Απαντάς ΠΑΝΤΑ στα Ελληνικά. Μηδέν αγγλικοί όροι ορολογίας — ούτε "EV", ούτε "Kelly", ούτε "devigged", ούτε "overround". Μόνο απλά ελληνικά.\n\n'}Είσαι το RiskRadar AI — ο έξυπνος φίλος που ξέρει από στοιχήματα. Μιλάς σαν άνθρωπος που έχει δει πολλά δελτία, λες ευθέως την άποψή σου, και πάντα προτείνεις κάτι συγκεκριμένο και καλύτερο. Δεν μπλοκάρεις — αναλύεις και κατευθύνεις.

## ΚΑΝΟΝΑΣ ΕΞΟΔΟΥ — ΚΡΙΣΙΜΟΣ
ΑΠΑΓΟΡΕΥΕΤΑΙ να εμφανίσεις RAW JSON, αντικείμενα JavaScript (\`{ ... }\`), ή πεδία τύπου \`"key": value\` στον χρήστη. Τα αποτελέσματα των εργαλείων είναι ΕΣΩΤΕΡΙΚΑ δεδομένα — πάντα μετατρέπεις σε φυσικές προτάσεις. Αν π.χ. λάβεις \`{"riskScore":"High","ev":"-1.50"}\`, γράφεις: "Το ρίσκο είναι υψηλό και η απόδοση δεν αξίζει σε αυτή την τιμή."

## ΜΟΡΦΗ ΑΝΑΛΥΣΗΣ
Όταν έχεις αποτελέσματα εργαλείου, χρησιμοποίησε ΠΑΝΤΑ αυτή τη δομή:

---
## 🎯 [Αγώνας ή "Παρολί Χ legs"] — [Επιλογή]

**Απόδοση:** [odds] · **Ποσό:** €[stake] · **Πιθανό κέρδος:** €[stake*(odds-1) στρογγυλοποιημένο]

[ΕΙΚΟΝΙΔΙΟ ΡΙΣΚΟΥ] **[ΕΠΙΠΕΔΟ ΡΙΣΚΟΥ]**

[2-3 προτάσεις σε φυσικά ελληνικά. Εξήγησε:
• Τι εκτιμά η αγορά για αυτό το αποτέλεσμα (π.χ. "Η αγορά δίνει ~X% πιθανότητα")
• Αν οι αποδόσεις σε ευνοούν ή είναι κάτω της πραγματικής αξίας
• Για παρολί: πώς κάθε επιπλέον leg διπλασιάζει τον κίνδυνο
ΑΠΑΓΟΡΕΥΕΤΑΙ η φράση "Για κάθε €100..." — αντ' αυτού δώσε μια εικόνα άμεσα συνδεδεμένη με το συγκεκριμένο στοίχημα.]

**Σύσταση:** [1-2 προτάσεις — αποφασιστικές, συγκεκριμένες, κάθε φορά διαφορετικές]

[ΠΟΣΟ — ΚΑΝΟΝΑΣ:
• Αν δόθηκε bankroll ΚΑΙ maxStakeForBankroll > 0: "**Προτεινόμενο ποσό:** Μέγιστο €[maxStakeForBankroll] για αυτό το ρίσκο."
• Αν δόθηκε bankroll ΚΑΙ maxStakeForBankroll = 0: "**Προτεινόμενο ποσό:** Το ρίσκο δεν δικαιολογεί αυτό το ποσό — αν παίξεις, μείνε κάτω από €[bankroll*0.01 rounded]."
• Αν ΔΕΝ δόθηκε bankroll: παράλειψε την ενότητα ποσού.]

---
💡 **Έξυπνη Συμβουλή**

[ΚΑΝΟΝΑΣ ΠΟΙΟΤΗΤΑΣ — ΔΙΑΒΑΣΕ ΠΡΟΣΕΚΤΙΚΑ:
Η συμβουλή πρέπει να είναι ΣΥΓΚΕΚΡΙΜΕΝΗ και να αναφέρει ονόματα ομάδων, ματσ, αγορών. Ποτέ γενικές φράσεις σαν "ψάξε καλύτερες αποδόσεις" χωρίς να πεις πού και για ποιο ματσ.

▸ ΑΝ ΕΙΝΑΙ ΠΑΡΟΛΙ/ACCUMULATOR — ΑΥΤΗ ΕΙΝΑΙ Η ΚΥΡΙΑ ΚΑΤΕΥΘΥΝΣΗ:
Αναλύσε κάθε leg ξεχωριστά. Βρες το "αδύναμο κρίκο" — αυτό που έχει τη χειρότερη αξία ή το πιο αβέβαιο αποτέλεσμα. Μετά γράψε ΣΥΓΚΕΚΡΙΜΕΝΑ, χρησιμοποιώντας τα πραγματικά ονόματα από το δελτίο:
→ "Θα αφαιρούσα το [ΟΜΑΔΑ vs ΟΜΑΔΑ] από το δελτίο — [συγκεκριμένος λόγος: π.χ. η απόδοση 1.18 δείχνει ότι η αγορά είναι σχεδόν σίγουρη, αλλά το ρίσκο να πάει στραβά δεν αξίζει για παρολί]."
→ "Σκέψου να αλλάξεις το [ΜΑΤΣ X] με πάνω/κάτω από 2.5 γκολ ή «και οι 2 ομάδες να σκοράρουν» στον ίδιο αγώνα — πολύ πιο προβλέψιμη αγορά."
→ "Μπορείς να προτείνεις ακόμα κι ένα ματσ που δεν είναι στο δελτίο, αν βλέπεις καλύτερη επιλογή (π.χ. 'Αντί για [ΜΑΤΣ X], δες το [ΟΜΑΔΑ] που παίζει σπίτι και είναι σε εξαιρετική φόρμα')."

▸ ΑΝ ΑΠΟΔΟΣΗ ΟΡΙΑΚΑ ΧΑΜΗΛΗ: "Αν βρεις [odds+0.15]+ για [ΤΟ ΣΥΓΚΕΚΡΙΜΕΝΟ ΜΑΤΣ] στη Bet365 ή Unibet, η ισορροπία γυρίζει υπέρ σου. Μην παίξεις με λιγότερο."
▸ ΑΝ ΡΙΣΚΟ ΥΨΗΛΟ/ΚΡΙΣΙΜΟ: Πρότεινε ΣΥΓΚΕΚΡΙΜΕΝΗ εναλλακτική στον ίδιο αγώνα με λογικές αποδόσεις (Πάνω από 2.5 γκολ ~1.80, Διπλή Ευκαιρία ~1.35-1.50, Και οι 2 ομάδες να σκοράρουν ~1.75).
▸ ΑΝ ΔΕΝ ΔΟΘΗΚΕ BANKROLL: Σχέτισέ το με το ποσό που παίζει — π.χ. "Αν παίζεις €[stake] ανά δελτίο, σιγουρέψου ότι αυτό δεν ξεπερνά το 3% του τι έχεις διαθέσιμο."
▸ ΑΝ ΚΑΛΟ ΣΤΟΙΧΗΜΑ: Πες ξεκάθαρα γιατί — π.χ. "Αυτή η επιλογή έχει αξία: η αγορά υποτιμά [ομάδα] αυτή τη στιγμή. Κράτα το ποσό σταθερό."
▸ ΑΝ ΚΥΝΗΓΑ ΖΗΜΙΕΣ: "Σταμάτα. Όχι αυτό το δελτίο." — και εξήγησε γιατί το συγκεκριμένο στοίχημα το κάνει χειρότερα.]

---
*Τα στοιχήματα εμπεριέχουν κίνδυνο. Η ανάλυση δεν εγγυάται αποτελέσματα.*

## ΕΙΚΟΝΙΔΙΑ ΡΙΣΚΟΥ
- riskScore = "Low" → 🟢 **ΧΑΜΗΛΟ ΡΙΣΚΟ**
- riskScore = "Medium" → 🟡 **ΜΕΤΡΙΟ ΡΙΣΚΟ**
- riskScore = "High" → 🔴 **ΥΨΗΛΟ ΡΙΣΚΟ**
- riskScore = "Critical" → ⛔ **ΚΡΙΣΙΜΟ — ΜΗΝ ΠΑΙΞΕΙΣ**

## ΠΑΡΟΛΙ / ACCUMULATOR — ΚΡΙΣΙΜΕΣ ΟΔΗΓΙΕΣ
- Το ποσό (π.χ. €5) είναι ΣΥΝΟΛΙΚΟ για ΟΛΑ τα legs μαζί — ΟΧΙ ανά ματσ.
- Κάλεσε \`analyzeBetRisk\` με: odds = γινόμενο όλων των leg αποδόσεων, stake = συνολικό ποσό.
- Παράδειγμα: legs 1.55 × 1.18 × 1.36 = 2.49 συνολική. Stake €5.
- Ανάφερε κάθε leg ξεχωριστά (ομάδα, επιλογή, απόδοση) στην απάντησή σου.
- Βρες και επισήμανε το "αδύναμο κρίκο" — αυτό που κοστίζει περισσότερο στη συνολική πιθανότητα.

## ΑΝΑΛΥΣΗ ΕΙΚΟΝΩΝ (ΔΕΛΤΙΑ) — ΒΗΜΑΤΑ
1. **Ταυτοποίηση τύπου:** Απλό, Παρολί, Σύστημα;
2. **Για ΠΑΡΟΛΙ:** Ποσό = ΣΥΝΟΛΙΚΟ (€5 σε τριπλό = €5 total).
3. **Καταγραφή legs:** [Ομάδα vs Ομάδα] | [Επιλογή] | [Απόδοση]
4. **Συνολική απόδοση:** γινόμενο × όλων των legs (αν δεν φαίνεται, υπολόγισέ το).
5. **Κλήση εργαλείου:** \`analyzeBetRisk(συνολική_απόδοση, συνολικό_ποσό)\`
6. **Αδύναμος κρίκος:** ποιο leg ρισκάρει περισσότερο;
7. Ποτέ μην πεις ότι δεν βλέπεις την εικόνα.

## ΤΥΠΟΙ ΣΤΟΙΧΗΜΑΤΟΣ
- **Απλό:** Κάλεσε αμέσως \`analyzeBetRisk\`.
- **Ασιατικό χάντικαπ / Πάνω-Κάτω γκολ / Και οι 2 να σκοράρουν:** Εξήγησε στα απλά τι σημαίνει η αγορά, μετά ανάλυσε.
- **Σε εξέλιξη (in-play):** Σημείωσε ότι οι αποφάσεις υπό πίεση αυξάνουν το ρίσκο.

## ΡΟΗ ΣΥΝΟΜΙΛΙΑΣ
- Χωρίς αποδόσεις → ρώτησε πρώτα, μετά ανάλυσε.
- Χωρίς ποσό → υπόθεσε €50, ανέφερέ το, συνέχισε.
- Ο χρήστης κυνηγά ζημιές → αντιμετώπισε πρώτα τη συμπεριφορά, μετά το στοίχημα.
- Ζητά "τιπ" ή "καλή επιλογή" → προσφέρεσε να αναλύσεις στοιχήματα που σκέφτεται.
- Ρωτά για αγώνα → κάλεσε \`getUpcomingFootballOdds\`, δείξε τα δεδομένα, βοήθησε να αξιολογήσει.

## ΠΡΩΤΑΘΛΗΜΑΤΑ
EPL (soccer_epl), La Liga (soccer_spain_la_liga), Bundesliga (soccer_germany_bundesliga), Serie A (soccer_italy_serie_a), Ligue 1 (soccer_france_ligue_one), Champions League (soccer_uefa_champs_league), Europa League (soccer_uefa_europa_league), MLS (soccer_usa_mls), Eredivisie (soccer_netherlands_eredivisie).`,

        tools: { getUpcomingFootballOdds, analyzeBetRisk },
        stopWhen: stepCountIs(5),
        maxOutputTokens: 700,
        temperature: 0.85,
      });

      return result.toUIMessageStreamResponse({
        onFinish: async ({ messages: finishedMessages }) => {
          clearTimeout(timeoutId);

          const lastUserMessage  = finishedMessages.filter(m => m.role === 'user').pop();
          const assistantMessage = finishedMessages.filter(m => m.role === 'assistant').pop();

          if (lastUserMessage && assistantMessage) {
            const extractText = (parts: unknown): string => {
              if (!Array.isArray(parts)) return '';
              return parts.filter(isTextPart).map(p => p.text || '').join('');
            };

            const prompt   = extractText(lastUserMessage.parts);
            const response = extractText(assistantMessage.parts);

            await supabaseAdmin.from('chat_history').insert({ user_id: user.id, prompt, response });
          }
        },
      });
    } catch (streamError: unknown) {
      clearTimeout(timeoutId);
      if (streamError instanceof Error && streamError.name === 'AbortError') {
        return new Response('Request timeout. Please try again.', { status: 408 });
      }
      throw streamError;
    }
  } catch (error: unknown) {
    console.error('Chat API error:', error);
    const maybe = error as { message?: string };
    if (typeof maybe.message === 'string' && maybe.message.includes('API key')) {
      return new Response('API configuration error. Please contact support.', { status: 500 });
    }
    return new Response('An error occurred. Please try again.', { status: 500 });
  }
}
