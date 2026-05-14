'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { FileUIPart, DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Loading from './Loader';
import RobotStage, { type RobotStageHandle } from '@/components/RobotStage';
import ReplyColumn   from '@/components/ReplyColumn';
import ChatHistory   from '@/components/ChatHistory';
import InputForm     from '@/components/InputForm';
import WarningBanner from '@/components/WarningBanner';
import StatusBar     from '@/components/StatusBar';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const FREE_LIMIT = 5;
const ALLOWED_IMAGE_TYPES   = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Chatbot() {
  const { tr, lang } = useLanguage();
  const langRef = useRef(lang);
  langRef.current = lang;

  // ── State ─────────────────────────────────────────────────────────────────
  const [isLoadingHistory, setIsLoadingHistory]   = useState(true);
  const [userEmail, setUserEmail]                 = useState('');
  const [usageCount, setUsageCount]               = useState(0);
  const [usageResetAt, setUsageResetAt]           = useState('');
  const [isSuperuser, setIsSuperuser]             = useState(false);
  const [showPaywall, setShowPaywall]             = useState(false);
  const [input, setInput]                         = useState('');
  const [attachmentFile, setAttachmentFile]       = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [uploadError, setUploadError]             = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragOver, setIsDragOver]               = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const dragCounterRef = useRef(0);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const robotRef       = useRef<RobotStageHandle | null>(null);

  const supabase = createClient();
  const router   = useRouter();

  // ── Transport / useChat ───────────────────────────────────────────────────
  const [transport] = useState(() => new DefaultChatTransport({
    api:  '/api/chat',
    body: () => ({ lang: langRef.current }),
  }));

  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    transport,
    onError: (err) => console.error('[useChat error]', err),
  });

  const isStreaming = status === 'streaming';

  // ── Auth + history load ───────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const remembers  = localStorage.getItem('rr-remember-me');
      const tabActive  = sessionStorage.getItem('rr-tab-session');
      if (remembers === 'false' && !tabActive) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
      sessionStorage.setItem('rr-tab-session', '1');
      setUserEmail(user.email ?? '');

      const usageRes = await fetch('/api/usage');
      if (usageRes.ok) {
        const u = await usageRes.json() as { count: number; limit: number; resetAt: string; isSuperuser?: boolean };
        setUsageCount(u.count);
        setUsageResetAt(u.resetAt);
        setIsSuperuser(u.isSuperuser ?? false);
      }

      const { createClient: sb } = await import('@supabase/supabase-js');
      const client = sb(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data, error: dbErr } = await client
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('id', { ascending: true });

      if (dbErr) {
        console.error('Error loading chat history:', dbErr);
      } else {
        const hist: UIMessage[] = [];
        (data || []).forEach(item => {
          hist.push({ id: `history-user-${item.id}`,      role: 'user',      parts: [{ type: 'text' as const, text: item.prompt }] });
          hist.push({ id: `history-assistant-${item.id}`, role: 'assistant', parts: [{ type: 'text' as const, text: item.response }] });
        });
        setMessages(hist);
      }
      setIsLoadingHistory(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh usage count after each completed response
  useEffect(() => {
    if (status === 'ready' && userEmail) {
      fetch('/api/usage')
        .then(r => r.json())
        .then((u: { count: number; resetAt: string; isSuperuser?: boolean }) => {
          setUsageCount(u.count);
          setUsageResetAt(u.resetAt);
          setIsSuperuser(u.isSuperuser ?? false);
        })
        .catch(() => {});
    }
  }, [status, userEmail]);

  const handleLogout = useCallback(async () => {
    robotRef.current?.setIdle();  // turn back to right profile before leaving
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  // Attachment preview URL
  useEffect(() => {
    if (!attachmentFile) { setAttachmentPreviewUrl(''); return; }
    const url = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attachmentFile]);

  // ── Upload helper ─────────────────────────────────────────────────────────
  const uploadAttachment = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const blob   = new Blob([buffer], { type: file.type || 'image/jpeg' });
    const form   = new FormData();
    form.append('file', blob, file.name);
    const res  = await fetch('/api/upload', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({})) as { url?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
    if (!json.url) throw new Error('Server returned no URL');
    return json.url;
  };

  const validateImageFile = (file: File): string | null => {
    const isHeic = /heic|heif/i.test(file.type) || /\.heic$/i.test(file.name);
    if (isHeic) return tr.heicError;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) return tr.imageTypeError;
    if (file.size > 10 * 1024 * 1024) return tr.imageSizeError((file.size / 1024 / 1024).toFixed(1));
    return null;
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setUploadError(err); e.target.value = ''; return; }
    setAttachmentFile(file);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((input.trim().length === 0 && !attachmentFile) || isStreaming) return;
    if (usageCount >= FREE_LIMIT && !isSuperuser) { setShowPaywall(true); return; }

    const currentInput = input.trim();
    const currentFile  = attachmentFile;
    let   attachmentUrl = '';

    if (currentFile) {
      setIsUploadingAttachment(true);
      try {
        attachmentUrl = await uploadAttachment(currentFile);
      } catch (err) {
        setUploadError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsUploadingAttachment(false);
        return;
      }
      setIsUploadingAttachment(false);
    }

    const fileParts: FileUIPart[] = attachmentUrl && currentFile
      ? [{ type: 'file', mediaType: currentFile.type || 'image/jpeg', filename: currentFile.name, url: attachmentUrl }]
      : [];

    sendMessage({ text: currentInput, ...(fileParts.length > 0 && { files: fileParts }) });
    setInput('');
    setAttachmentFile(null);
  };

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragOver(false); }
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (isStreaming || isUploadingAttachment) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setUploadError(err); return; }
    setUploadError('');
    setIsUploadingAttachment(true);
    try {
      const url      = await uploadAttachment(file);
      const filePart: FileUIPart = { type: 'file', mediaType: file.type || 'image/jpeg', filename: file.name, url };
      sendMessage({ text: input.trim(), files: [filePart] });
      setInput('');
    } catch (err) {
      setUploadError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  if (isLoadingHistory) return <Loading />;
  if (error) console.error('useChat error:', error);

  const isDisabled     = isStreaming || isUploadingAttachment;
  const resetDateLabel = usageResetAt
    ? new Date(usageResetAt).toLocaleDateString(tr.dateLocale, { day: 'numeric', month: 'long' })
    : '';

  const inputPlaceholder = usageCount >= FREE_LIMIT && !isSuperuser
    ? tr.inputPlaceholderLimit(usageCount, FREE_LIMIT, resetDateLabel)
    : tr.inputPlaceholder;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-grid relative overflow-hidden"
      style={{ height: '100dvh' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {/* ── Paywall modal — UI preserved from original ── */}
      {showPaywall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
          onClick={() => setShowPaywall(false)}
        >
          <div
            className="w-full max-w-sm text-center scale-in"
            style={{
              background:           'var(--color-bg-card)',
              border:               '1px solid var(--color-border)',
              borderRadius:         'var(--radius-lg)',
              backdropFilter:       'var(--blur-card)',
              WebkitBackdropFilter: 'var(--blur-card)',
              padding:              '28px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">⛔</div>
            <h2
              className="text-xl font-extrabold mb-2 tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              {tr.paywallTitle}
            </h2>
            <p className="text-sm mb-5 leading-relaxed" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)' }}>
              {tr.paywallUsed(usageCount, FREE_LIMIT)}
            </p>
            <div className="w-full h-1.5 rounded-full mb-5" style={{ background: 'var(--color-border)' }}>
              <div className="h-full rounded-full" style={{ width: '100%', background: 'var(--red)' }} />
            </div>
            {resetDateLabel && (
              <div className="mb-6 px-4 py-3 rounded-xl"
                   style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-border)' }}>
                <p className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--amber)' }}>
                  {tr.paywallResetsOn} <strong>{resetDateLabel}</strong>
                </p>
              </div>
            )}
            <button
              onClick={() => setShowPaywall(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold"
              style={{
                fontFamily: 'var(--font-sans)',
                background: 'rgba(255,255,255,0.05)',
                color:      'var(--color-text-muted)',
                border:     '1px solid var(--color-border)',
              }}
            >
              {tr.paywallClose}
            </button>
          </div>
        </div>
      )}

      {/* ── Drag overlay ── */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
             style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>
          <div className="absolute inset-4 rounded-3xl" style={{ border: '2px dashed rgba(255,255,255,0.18)' }} />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                   style={{ color: 'rgba(255,255,255,0.75)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-xl font-bold text-white">{tr.dragTitle}</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{tr.dragSubtitle}</p>
          </div>
        </div>
      )}

      {/* ── Main layout: fills viewport above the 32px status bar ── */}
      <div style={{
        height:        'calc(100dvh - 32px)',
        display:       'flex',
        flexDirection: 'column',
      }}>

        {/* ── 3-column grid ── */}
        <div className="chat-grid">
          {/* Left / mobile-bottom: AI reply cards */}
          <div className="chat-col-replies">
            <ReplyColumn messages={messages} isStreaming={isStreaming} />
          </div>

          {/* Center / mobile-top: Three.js robot */}
          <div className="chat-col-robot">
            <RobotStage ref={robotRef} />
          </div>

          {/* Right: Chat history — desktop only */}
          <div className="chat-col-history">
            <ChatHistory messages={messages} isStreaming={isStreaming} />
          </div>
        </div>

        {/* ── Bottom panel: warning + input ── */}
        <div style={{
          flexShrink: 0,
          borderTop:  '1px solid var(--color-border)',
          background: 'rgba(8, 8, 8, 0.92)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}>
            <div style={{ padding: '10px 16px 6px' }}>
              <WarningBanner />
            </div>
            <InputForm
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onStop={stop}
              onAttachClick={() => { setUploadError(''); fileInputRef.current?.click(); }}
              isStreaming={isStreaming}
              isDisabled={isDisabled}
              isUploading={isUploadingAttachment}
              placeholder={inputPlaceholder}
              attachmentPreviewUrl={attachmentPreviewUrl}
              attachmentFileName={attachmentFile?.name}
              onRemoveAttachment={() => setAttachmentFile(null)}
              uploadError={uploadError}
            />
          </div>
        </div>
      </div>

      {/* ── Status bar — fixed 32px strip at very bottom ── */}
      <StatusBar
        usageCount={usageCount}
        isSuperuser={isSuperuser}
        userEmail={userEmail}
        onLogout={handleLogout}
        onUsageClick={() => { if (usageCount >= FREE_LIMIT && !isSuperuser) setShowPaywall(true); }}
      />

      {/* Hidden file input — triggered by InputForm's attach button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAttachmentChange}
      />
    </div>
  );
}
