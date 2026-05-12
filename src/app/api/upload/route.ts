import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const STORAGE_BUCKET  = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'chat_uploads';

export async function POST(req: NextRequest) {
  // Auth guard — only signed-in users may upload
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[upload] Missing env vars: URL=%s KEY=%s', !!SUPABASE_URL, !!SUPABASE_KEY);
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase env vars' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeFileName = `screenshots/${Date.now()}.${ext}`;
    const contentType = file.type || 'image/jpeg';
    const buffer = await file.arrayBuffer();

    // Call Supabase Storage REST API directly to get the real HTTP error (not SDK-wrapped "fetch failed")
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${safeFileName}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('[upload] Storage HTTP %d: %s', uploadRes.status, text);
      return NextResponse.json(
        { error: `Storage error ${uploadRes.status}: ${text}` },
        { status: 500 }
      );
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${safeFileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
