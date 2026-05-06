'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { createClient } from '@supabase/supabase-js';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Image from 'next/image';
import "./globals.css";
import Loading from './Loader';
import ChatMessage from '@/components/ChatMessage';
import BetInputForm from '@/components/BetInputForm';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string };

const convertToMessagePart = (part: unknown): MessagePart => {
  if (part && typeof part === 'object' && 'type' in part) {
    const p = part as Record<string, unknown>;
    if (p.type === 'text' && typeof p.text === 'string') {
      return { type: 'text', text: p.text };
    } else if (p.type === 'image') {
      return {
        type: 'image',
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl :
                 typeof p.image_url === 'string' ? p.image_url : '',
        alt: typeof p.alt === 'string' ? p.alt : undefined,
      };
    }
  }
  return { type: 'text', text: String(part) };
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'chat_uploads';

const QUICK_ACTIONS = [
  { label: '🏆 Best Odds',     message: 'What are the best odds for upcoming football matches today?' },
  { label: '📊 Predictions',   message: 'Give me AI-powered predictions for upcoming football matches' },
  { label: '⚽ Live Scores',   message: 'What are the current football fixtures and how do they affect betting?' },
  { label: '💰 Value Bets',    message: "Find value bets with positive expected value in today's fixtures" },
  { label: '⚠️ Risk Check',   message: 'What are the key risk factors I should check before placing any bet?' },
];

export default function Chatbot() {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const fileInputRef  = useRef<HTMLInputElement | null>(null);
  const bottomRef     = useRef<HTMLDivElement | null>(null);
  const textareaRef   = useRef<HTMLTextAreaElement | null>(null);

  const { messages, setMessages, sendMessage, status } = useChat();

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
    if (!attachmentFile) {
      setAttachmentPreviewUrl('');
      return;
    }
    const preview = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [attachmentFile]);

  useLayoutEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, status]);

  const uploadAttachment = async (file: File) => {
    const safeFileName = `screenshots/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safeFileName, file, { upsert: true });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(safeFileName);

    if (!publicUrlData?.publicUrl) throw new Error('Failed to generate public URL');
    return publicUrlData.publicUrl;
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => setAttachmentFile(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((input.trim().length === 0 && !attachmentFile) || status === 'streaming') return;

    let attachmentUrl = '';

    if (attachmentFile) {
      setIsUploadingAttachment(true);
      try {
        attachmentUrl = await uploadAttachment(attachmentFile);
      } catch (error) {
        console.error('Attachment upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown upload failure';
        setUploadError(`Upload failed: ${message}`);
        setIsUploadingAttachment(false);
        return; // abort — don't send without the attachment
      }
      setIsUploadingAttachment(false);
    }

    if (attachmentUrl) {
      setMessages(prev => [
        ...prev,
        {
          id: `user-attachment-${Date.now()}`,
          role: 'user',
          parts: [
            { type: 'text',  text: input.trim() || 'Screenshot attached' },
            { type: 'image', imageUrl: attachmentUrl, alt: 'Attached screenshot' },
          ],
        } as UIMessage,
      ]);
    }

    sendMessage({
      text: input.trim() + (attachmentUrl ? `\n\nAttached screenshot: ${attachmentUrl}` : ''),
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

    setMessages(prev => [
      ...prev,
      {
        id: `user-bet-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text: betMessage }],
      } as UIMessage,
    ]);

    sendMessage({ text: betMessage });
  };

  if (isLoadingHistory) return <Loading />;

  const isStreaming = status === 'streaming';
  const isDisabled  = isStreaming || isUploadingAttachment;

  return (
    <div className="relative flex flex-col h-screen overflow-hidden app-bg app-grid text-[var(--text-1)] antialiased">

      {/* ── Ambient glow blobs ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.10) 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-24 w-[450px] h-[450px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 -left-24 w-[380px] h-[380px] rounded-full"
             style={{ background: 'radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)' }} />
      </div>

      {/* ══════════════════════════════════════════════
          HEADER
          ══════════════════════════════════════════ */}
      <header className="relative z-20 flex-none flex items-center justify-between px-4 py-3 glass-blue slide-down">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with animated glow ring */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-[-3px] rounded-full pulse-glow"
                 style={{ background: 'linear-gradient(135deg, #3B82F6, #22D3EE)' }} />
            <div className="relative z-10 w-9 h-9 rounded-full overflow-hidden border border-blue-500/40">
              <Image src="/botavatar.jpg" alt="Wager Wizard" width={36} height={36}
                     className="w-full h-full object-cover" />
            </div>
            <span className="absolute bottom-0 right-0 z-20 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#06101E]"
                  style={{ animation: 'status-pulse 2.2s ease-in-out infinite' }} />
          </div>

          {/* Title */}
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight text-gradient tracking-tight">
              Wager Wizard Pro
            </h1>
            <p className="text-[10px] text-[var(--text-3)] font-semibold tracking-widest uppercase mt-0.5">
              AI Betting Analyst
            </p>
          </div>
        </div>

        {/* Right-side badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-emerald-400"
               style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ animation: 'status-pulse 2.2s ease-in-out infinite' }} />
            Live
          </div>
          <button
            className="p-2 rounded-xl text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
            aria-label="Options"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="divider-glow flex-none" />

      {/* ══════════════════════════════════════════════
          CHAT AREA
          ══════════════════════════════════════════ */}
      <main className="relative flex-1 overflow-y-auto px-4 pt-6 pb-2 space-y-5">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-4 scale-in">
            {/* Floating wizard icon */}
            <div className="float mb-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-2xl blur-2xl"
                     style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent)' }} />
                <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center card"
                     style={{ fontSize: '2.25rem' }}>
                  🧙‍♂️
                </div>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gradient mb-2 tracking-tight">
              Wager Wizard Pro
            </h2>
            <p className="text-sm text-[var(--text-2)] max-w-xs mb-8 leading-relaxed">
              AI-powered betting analysis. Get live odds, risk scores, and data-driven insights before you place a single bet.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-2 gap-3 max-w-xs w-full mb-7">
              {[
                { icon: '📊', title: 'Risk Analysis',   desc: 'EV & probability' },
                { icon: '🏆', title: 'Live Odds',       desc: 'Real-time data'   },
                { icon: '🛡️', title: 'Loss Prevention', desc: 'Protect bankroll' },
                { icon: '⚡', title: 'Instant AI',      desc: 'In seconds'       },
              ].map(f => (
                <div key={f.title} className="card p-3 text-left transition-all duration-200 hover:scale-[1.02]">
                  <div className="text-xl mb-1.5">{f.icon}</div>
                  <div className="text-xs font-bold text-[var(--text-1)]">{f.title}</div>
                  <div className="text-[10px] text-[var(--text-3)] mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[var(--text-3)]">
              Use the quick actions below or type your question
            </p>
          </div>
        )}

        {/* Message list */}
        {messages.map((message, index) => (
          <div
            key={message.id}
            className="message-appear"
            style={{ animationDelay: `${Math.min(index * 0.04, 0.25)}s` }}
          >
            <ChatMessage
              role={message.role as 'user' | 'assistant'}
              parts={message.parts.map(convertToMessagePart)}
              avatarSrc={message.role === 'user' ? '/useravatar.jpg' : '/botavatar.jpg'}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {isStreaming && (
          <div className="flex items-end gap-2.5 message-appear">
            <div className="w-7 h-7 rounded-full overflow-hidden border flex-shrink-0 avatar-ring-cyan">
              <Image src="/botavatar.jpg" alt="AI thinking" width={28} height={28}
                     className="w-full h-full object-cover" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
                 style={{
                   background: 'linear-gradient(145deg, #0F1928, #0C1722)',
                   border: '1px solid rgba(6,182,212,0.18)',
                   boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                 }}>
              <div className="flex items-center gap-1.5">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ══════════════════════════════════════════════
          BOTTOM PANEL (quick actions + input)
          ══════════════════════════════════════════ */}
      <div className="relative flex-none z-10 glass-blue">
        <div className="divider-glow" />

        {/* Quick action chips */}
        <div className="px-4 pt-3 pb-0">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 snap-x snap-mandatory">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.message)}
                disabled={isDisabled}
                className="flex-none px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap snap-start
                           transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(15,25,40,0.9)',
                  border: '1px solid rgba(59,130,246,0.22)',
                  color: '#93C5FD',
                }}
                onMouseEnter={e => {
                  if (!isDisabled) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(59,130,246,0.14)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.42)';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(15,25,40,0.9)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(59,130,246,0.22)';
                }}
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
        <div className="mx-4 mb-3 flex items-start gap-2 px-3 py-2 rounded-xl"
             style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.16)' }}>
          <svg className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
          </svg>
          <p className="text-[10px] leading-snug" style={{ color: 'rgba(252,211,77,0.7)' }}>
            <span className="font-bold text-amber-400">DISCLAIMER: </span>
            Betting involves risk. Never wager more than you can afford to lose.
          </p>
        </div>

        {/* Attachment preview */}
        {attachmentPreviewUrl && (
          <div className="mx-4 mb-3 rounded-xl overflow-hidden message-appear"
               style={{ border: '1px solid rgba(59,130,246,0.22)', background: '#0C1722' }}>
            <Image src={attachmentPreviewUrl} alt="Screenshot preview"
                   width={400} height={300} unoptimized
                   className="w-full max-h-36 object-cover" />
            <div className="flex items-center justify-between px-3 py-2 text-xs"
                 style={{ borderTop: '1px solid rgba(59,130,246,0.12)' }}>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Screenshot ready
              </span>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="text-[var(--text-3)] hover:text-red-400 transition-colors font-medium"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mx-4 mb-3 px-4 py-2.5 rounded-xl text-xs text-red-300"
               style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
            {uploadError}
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

          {/* Attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                       transition-all duration-200 disabled:opacity-40"
            style={{ background: 'rgba(15,25,40,0.9)', border: '1px solid rgba(59,130,246,0.2)', color: 'rgba(96,165,250,0.7)' }}
            aria-label="Attach image"
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
              placeholder="Ask about odds, upload a ticket, or describe a bet..."
              rows={1}
              autoFocus
              className="w-full min-h-[44px] max-h-[160px] px-4 py-3 pr-3 rounded-xl resize-none overflow-y-auto
                         text-sm leading-relaxed input-field disabled:opacity-50"
            />
          </div>

          {/* Send */}
          <button
            type="submit"
            disabled={isDisabled || (!input.trim() && !attachmentFile)}
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
        </form>
      </div>
    </div>
  );
}
