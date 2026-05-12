import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const FREE_LIMIT = 5;

export async function GET() {
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('analyses_count, analyses_reset_at')
    .eq('id', user.id)
    .single();

  if (!profile) {
    const nextReset = getNextMonthStart();
    await supabaseAdmin
      .from('profiles')
      .insert({ id: user.id, analyses_count: 0, analyses_reset_at: nextReset });
    profile = { analyses_count: 0, analyses_reset_at: nextReset };
  }

  const now = new Date();
  const resetAt = new Date(profile.analyses_reset_at);
  const count = now > resetAt ? 0 : profile.analyses_count;

  return Response.json({ count, limit: FREE_LIMIT, resetAt: profile.analyses_reset_at });
}

function getNextMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}
