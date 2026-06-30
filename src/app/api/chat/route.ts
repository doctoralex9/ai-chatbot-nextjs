import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const FREE_LIMIT = 5;

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

        // ← Replace this with your app's system prompt
        system: `You are a helpful AI assistant. Answer questions clearly and concisely.${lang === 'en' ? ' Always respond in English.' : ''}`,

        stopWhen: stepCountIs(1),
        maxOutputTokens: 700,
        temperature: 0.7,
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
