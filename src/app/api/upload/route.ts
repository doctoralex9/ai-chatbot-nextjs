import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Prefer service role key server-side — bypasses RLS so storage uploads work
// without needing to configure storage policies.
// Falls back to anon key if service role key is not set.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'chat_uploads';

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[upload] Missing Supabase env vars');
    return NextResponse.json({ error: 'Server misconfigured: Supabase env vars not set' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeFileName = `screenshots/${Date.now()}.${ext}`;
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type || 'image/jpeg' });

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safeFileName, blob, { contentType: file.type || 'image/jpeg', upsert: true });

    if (error) {
      console.error('[upload] Supabase storage error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(safeFileName);

    if (!publicUrlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to generate public URL' }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
