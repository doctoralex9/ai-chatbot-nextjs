'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { FileUIPart } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Image from 'next/image';
import Loading from './Loader';
import ChatMessage from '@/components/ChatMessage';
import BetInputForm from '@/components/BetInputForm';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string };

// Returns null for unknown part types (tool-invocation, step-boundary, etc.)
// so they are filtered out instead of rendering as "[object Object]"
const convertToMessagePart = (part: unknown): MessagePart | null => {
  if (part && typeof part === 'object' && 'type' in part) {
    const p = part as Record<string, unknown>;
    if (p.type === 'text' && typeof p.text === 'string' && p.text.length > 0) {
      return { type: 'text', text: p.text };
    }
    if (p.type === 'file') {
      const url = typeof p.url === 'string' ? p.url : '';
      if (url) return { type: 'image', imageUrl: url, alt: typeof p.filename === 'string' ? p.filename : 'Image' };
    }
    if (p.type === 'image') {
      // AI SDK v5 uses p.image (string or URL object); older paths used p.imageUrl / p.image_url
      const raw = p.image ?? p.imageUrl ?? p.image_url;
      const url =
        typeof raw === 'string' ? raw :
        raw instanceof URL ? raw.href : '';
      if (url) return { type: 'image', imageUrl: url, alt: typeof p.alt === 'string' ? p.alt : undefined };
    }
  }
  return null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const QUICK_ACTIONS = [
  { label: 'Analyze My Bet',  message: 'I want to analyze a bet I am considering. Can you walk me through the risk, EV, and whether I should place it?' },
  { label: 'Risk Check',      message: 'What are the key risk factors I should check before placing any bet? Be brutally honest.' },
  { label: 'Bankroll Advice', message: 'Based on responsible bankroll management, what percentage of my bankroll should I risk per bet, and why?' },
  { label: 'Stop Losses',     message: 'I feel like I might be chasing losses. Can you help me assess my situation and tell me honestly if I should stop?' },
  { label: 'Check EV',        message: 'Explain expected value in betting and help me calculate whether a bet I have in mind has positive or negative EV.' },
];

const PARTICLES = [
  { left: '12%', delay: '0s',   dur: '3.2s', size: 2 },
  { left: '28%', delay: '0.6s', dur: '4.1s', size: 3 },
  { left: '47%', delay: '1.2s', dur: '2.9s', size: 2 },
  { left: '63%', delay: '0.3s', dur: '3.7s', size: 2 },
  { left: '79%', delay: '0.9s', dur: '4.4s', size: 3 },
  { left: '91%', delay: '1.8s', dur: '3.1s', size: 2 },
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

function validateImageFile(file: File): string | null {
  const isHeic = /heic|heif/i.test(file.type) || /\.heic$/i.test(file.name);
  if (isHeic) return 'HEIC not supported. On iPhone: tap Share → "Save as JPEG" and retry.';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()))
    return 'Please use JPEG, PNG, GIF, or WebP.';
  if (file.size > 10 * 1024 * 1024)
    return `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`;
  return null;
}

export default function Chatbot() {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput]                       = useState('');
  const [attachmentFile, setAttachmentFile]     = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [uploadError, setUploadError]           = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isDragOver, setIsDragOver]             = useState(false);

  const dragCounterRef = useRef(0);
  const fileInputRef   = useRef<HTMLInputElement | null>(null);
  const bottomRef      = useRef<HTMLDivElement | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement | null>(null);

  const { messages, setMessages, sendMessage, status, error, stop } = useChat({
    onError: (err) => console.error('[useChat error]', err),
  });

  useEffect(() => {
    const fetchChatHistory = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', 'guest')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
      } else {
        const historyMessages: UIMessage[] = [];
        (data || []).forEach(item => {
          historyMessages.push({
            id: `history-user-${item.id}`,
            role: 'user' as const,
            parts: [{ type: 'text' as const, text: item.prompt }],
          });
          historyMessages.push({
            id: `history-assistant-${item.id}`,
            role: 'assistant' as const,
            parts: [{ type: 'text' as const, text: item.response }],
          });
        });
        setMessages(historyMessages);
      }
      setIsLoadingHistory(false);
    };
    fetchChatHistory();
  }, [setMessages]);

  useEffect(() => {
    if (!attachmentFile) { setAttachmentPreviewUrl(''); return; }
    const preview = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [attachmentFile]);

  useLayoutEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, status]);

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

  // ── File input (button) ───────────────────────────────────────────────────
  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = event.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setUploadError(err); event.target.value = ''; return; }
    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => setAttachmentFile(null);

  // ── Drag and drop ─────────────────────────────────────────────────────────
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (isDisabled) return;

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const err = validateImageFile(file);
    if (err) { setUploadError(err); return; }

    setUploadError('');
    setIsUploadingAttachment(true);
    try {
      const url  = await uploadAttachment(file);
      const text = input.trim() || 'Analyze this betting slip for me';
      const filePart: FileUIPart = { type: 'file', mediaType: file.type || 'image/jpeg', filename: file.name, url };
      sendMessage({ text, files: [filePart] });
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } catch (error) {
      setUploadError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // ── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((input.trim().length === 0 && !attachmentFile) || status === 'streaming') return;

    const currentInput = input.trim();
    const currentFile  = attachmentFile;
    let attachmentUrl  = '';

    if (currentFile) {
      setIsUploadingAttachment(true);
      try {
        attachmentUrl = await uploadAttachment(currentFile);
      } catch (error) {
        setUploadError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsUploadingAttachment(false);
        return;
      }
      setIsUploadingAttachment(false);
    }

    const fileParts: FileUIPart[] = attachmentUrl && currentFile
      ? [{ type: 'file', mediaType: currentFile.type || 'image/jpeg', filename: currentFile.name, url: attachmentUrl }]
      : [];
    sendMessage({
      text: currentInput || (fileParts.length > 0 ? 'Analyze this betting slip for me' : ''),
      ...(fileParts.length > 0 && { files: fileParts }),
    });

    setInput('');
    setAttachmentFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleQuickAction = (message: string) => {
    if (status === 'streaming' || isUploadingAttachment) return;
    sendMessage({ text: message });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim().length > 0 || attachmentFile) && status !== 'streaming') {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
  };

  const handleBetSubmit = (betData: { odds: string; stake: string; teams: string; bankroll: string }) => {
    const betMessage = `Analyze this bet for me:\n- Teams: ${betData.teams}\n- Odds: ${betData.odds}\n- Stake: €${betData.stake}${betData.bankroll ? `\n- Bankroll: €${betData.bankroll}` : ''}`;
    sendMessage({ text: betMessage });
  };

  if (isLoadingHistory) return <Loading />;

  const isStreaming = status === 'streaming';

  if (error) console.error("useChat error:", error);

  const isDisabled  = isStreaming || isUploadingAttachment;

  // True when every message in state has no visible parts (e.g. only tool-invocation
  // or image parts the SDK emitted in an unrecognised format). Show welcome screen
  // instead of a black void.
  const hasNoVisibleMessages = messages.every(
    msg => msg.parts.every(p => convertToMessagePart(p) === null)
  );

  return (
    <div
      className="relative flex flex-col h-dvh overflow-hidden app-bg app-grid text-[var(--text-1)] antialiased"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Ambient glows ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[650px] h-[450px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.05) 0%, transparent 68%)' }} />
        <div className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.025) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 -left-32 w-[320px] h-[320px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 70%)' }} />
      </div>

      {/* ── Drag-and-drop overlay ───────────────────────────────────────── */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
             style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}>
          <div className="absolute inset-4 rounded-3xl"
               style={{ border: '2px dashed rgba(255,255,255,0.18)' }} />
          <div className="relative flex flex-col items-center gap-5 p-8 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-2xl"
                   style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
                   style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                     style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white mb-2">Drop to Analyze</p>
              <p className="text-sm max-w-xs leading-relaxed"
                 style={{ color: 'rgba(255,255,255,0.4)' }}>
                Release your betting slip or coupon screenshot for instant AI analysis
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['JPEG', 'PNG', 'WebP', 'GIF'].map(fmt => (
                <span key={fmt} className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════ */}
      <header className="relative z-20 flex-none flex items-center justify-between px-4 py-3 glass-dark slide-down">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="orbit-ring" />
            <div className="relative z-10 w-9 h-9 rounded-full overflow-hidden avatar-ring">
              <Image src="/botavatar.jpg" alt="Wager Wizard" width={36} height={36}
                     className="w-full h-full object-cover" />
            </div>
            <span className="absolute bottom-0 right-0 z-20 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: 'var(--green)', borderColor: '#000000', animation: 'status-pulse 2.5s ease-in-out infinite' }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight text-gradient tracking-tight">
              Wager Wizard Pro
            </h1>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mt-0.5"
               style={{ color: 'var(--text-4)' }}>
              AI Risk Copilot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
               style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)', color: 'var(--green)' }}>
            <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--green)', animation: 'status-pulse 2.5s ease-in-out infinite' }} />
            Live
          </div>
          <button
            className="p-2 rounded-xl transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-2)', color: 'var(--text-4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-4)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
            aria-label="Options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 photon-line" aria-hidden />
      </header>

      {/* ══════════════════════════════════════════════
          CHAT AREA
      ══════════════════════════════════════════════ */}
      <main className="relative flex-1 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-2xl px-4 pt-6 pb-2 space-y-5">

          {/* Empty state */}
          {(messages.length === 0 || hasNoVisibleMessages) && (
            <div className="relative flex flex-col items-center justify-center min-h-[55vh] text-center px-4 scale-in">
              {PARTICLES.map((p, i) => (
                <div key={i} className="absolute rounded-full pointer-events-none"
                     style={{ width: p.size, height: p.size, background: 'rgba(255,255,255,0.45)', left: p.left, bottom: '8%', animation: `particle-rise ${p.dur} ease-out ${p.delay} infinite` }} />
              ))}

              <div className="float mb-6">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full"
                       style={{ border: '1px solid rgba(255,255,255,0.12)', animation: 'ping-expand 2.6s ease-out 0.5s infinite' }} />
                  <div className="absolute inset-0 rounded-full"
                       style={{ border: '1px solid rgba(255,255,255,0.06)', animation: 'ping-expand 2.6s ease-out 1.3s infinite' }} />
                  <div className="absolute inset-0 rounded-full blur-xl"
                       style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1), transparent)' }} />
                  <div className="relative w-20 h-20 rounded-full overflow-hidden avatar-ring-user">
                    <Image src="/botavatar.jpg" alt="Wager Wizard" width={80} height={80}
                           className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-2 tracking-tight">
                Wager Wizard Pro
              </h2>
              <p className="text-sm max-w-sm mb-8 leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Not a tipster. An AI risk copilot that tells you when to step back — before you lose.
              </p>

              <div className="grid grid-cols-2 gap-3 w-full max-w-xs sm:max-w-sm mb-7">
                {[
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, title: 'Risk Analysis', desc: 'EV & probability', delay: '0.05s' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>, title: 'Bankroll Mode', desc: 'Max bet sizing', delay: '0.1s' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>, title: 'Loss Prevention', desc: 'Protect bankroll', delay: '0.15s' },
                  { icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, title: 'Brutal Honesty', desc: 'Straight talk, no hype', delay: '0.2s' },
                ].map(f => (
                  <div key={f.title} className="card p-3 text-left reveal-up hover:scale-[1.03]"
                       style={{ animationDelay: f.delay, transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)' }}>
                    <div className="mb-2" style={{ color: 'var(--text-3)' }}>{f.icon}</div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{f.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-4)' }}>{f.desc}</div>
                  </div>
                ))}
              </div>

              {/* Drag-to-upload hint */}
              <p className="text-[11px] mb-3 px-4 py-2 rounded-full"
                 style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}>
                ↑ drag &amp; drop a betting slip anywhere to instantly analyze
              </p>

              <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                Use the quick actions below or describe a bet
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((message, index) => {
            const visibleParts = message.parts
              .map(convertToMessagePart)
              .filter((p): p is MessagePart => p !== null);
            if (visibleParts.length === 0) return null;
            return (
              <div key={message.id} className="message-appear"
                   style={{ animationDelay: `${Math.min(index * 0.04, 0.25)}s` }}>
                <ChatMessage
                  role={message.role as 'user' | 'assistant'}
                  parts={visibleParts}
                  avatarSrc={message.role === 'user' ? '/useravatar.jpg' : '/botavatar.jpg'}
                />
              </div>
            );
          })}

          {/* Typing indicator */}
          {isStreaming && (
            <div className="flex items-end gap-2.5 message-appear">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 avatar-ring">
                <Image src="/botavatar.jpg" alt="AI thinking" width={28} height={28}
                       className="w-full h-full object-cover" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
                   style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                <div className="flex items-center gap-[5px] h-5">
                  <span className="typing-bar" />
                  <span className="typing-bar" />
                  <span className="typing-bar" />
                  <span className="typing-bar" />
                </div>
              </div>
            </div>
          )}

          {/* Uploading indicator */}
          {isUploadingAttachment && !isStreaming && (
            <div className="flex items-end gap-2.5 message-appear">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 avatar-ring">
                <Image src="/useravatar.jpg" alt="Uploading" width={28} height={28}
                       className="w-full h-full object-cover" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"
                     style={{ color: 'var(--text-3)' }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs" style={{ color: 'var(--text-4)' }}>Uploading image…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          BOTTOM PANEL
      ══════════════════════════════════════════════ */}
      <div className="relative flex-none z-10 glass-dark"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="divider-glow" />

        <div className="flex flex-col items-center w-full">
        <div className="w-full max-w-2xl">
          {/* Quick action chips */}
          <div className="px-4 pt-3 pb-0">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.message)}
                  disabled={isDisabled}
                  className="flex-none px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap snap-start
                             transition-all duration-200 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)'; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)'; }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-2">
            <BetInputForm onSubmit={handleBetSubmit} isLoading={isStreaming} />
          </div>

          {/* Disclaimer */}
          <div className="mx-4 mb-2 flex items-start gap-2 px-3 py-2 rounded-xl"
               style={{ background: 'var(--amber-dim)', border: '1px solid var(--amber-border)' }}>
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"
                 style={{ color: 'var(--amber)' }}>
              <path fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd" />
            </svg>
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(251,191,36,0.65)' }}>
              <span className="font-bold" style={{ color: 'var(--amber)' }}>DISCLAIMER: </span>
              Betting involves risk. Never wager more than you can afford to lose.
            </p>
          </div>

          {/* Attachment preview */}
          {attachmentPreviewUrl && (
            <div className="mx-4 mb-2 rounded-xl overflow-hidden message-appear"
                 style={{ border: '1px solid var(--border-3)', background: '#0d0d0d' }}>
              <Image src={attachmentPreviewUrl} alt="Screenshot preview"
                     width={400} height={300} unoptimized
                     className="w-full max-h-36 object-cover"
                     onError={() => {
                       setUploadError('Could not preview this image.');
                       setAttachmentFile(null);
                     }} />
              <div className="flex items-center justify-between px-3 py-2 text-xs"
                   style={{ borderTop: '1px solid var(--border-2)' }}>
                <span className="font-semibold flex items-center gap-1" style={{ color: 'var(--green)' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Screenshot ready
                </span>
                <button type="button" onClick={handleRemoveAttachment}
                        className="font-medium transition-colors" style={{ color: 'var(--text-4)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-4)'}>
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Upload error */}
          {uploadError && (
            <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl text-xs flex items-start gap-2"
                 style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{uploadError}</span>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2 px-4 pb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAttachmentChange}
            />

            {/* Attach button */}
            <button
              type="button"
              onClick={() => { setUploadError(''); fileInputRef.current?.click(); }}
              disabled={isDisabled}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                         transition-all duration-200 disabled:opacity-35"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-3)', color: 'var(--text-3)' }}
              onMouseEnter={e => { if (!isDisabled) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
              aria-label="Attach image"
              title="Attach image (or drag & drop anywhere)"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                placeholder="Ask about odds, drop a betting slip, or describe a bet…"
                rows={1}
                className="w-full min-h-[44px] max-h-[160px] px-4 py-3 pr-3 rounded-xl resize-none overflow-y-auto
                           text-sm leading-relaxed input-field disabled:opacity-50"
              />
            </div>

            {/* Send / Stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.35)', color: '#ff5050' }}
                aria-label="Stop generating"
                title="Stop"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
            <button
              type="submit"
              disabled={isUploadingAttachment || (!input.trim() && !attachmentFile)}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center btn-primary"
              aria-label="Send message"
            >
              {isUploadingAttachment ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
            )}
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
