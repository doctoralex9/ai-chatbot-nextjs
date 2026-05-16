'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from '@ai-sdk/react';

interface ChatHistoryProps {
  messages:    UIMessage[];
  isStreaming: boolean;
}

// Pull the first text part out of a message.
// Returns null for tool-call-only messages (no visible text).
function extractText(msg: UIMessage): string | null {
  for (const part of msg.parts) {
    if (
      part && typeof part === 'object' && 'type' in part &&
      part.type === 'text' &&
      typeof (part as { text: string }).text === 'string' &&
      (part as { text: string }).text.length > 0
    ) {
      return (part as { text: string }).text;
    }
  }
  return null;
}

// Truncates a string to `max` chars, appending "…" if cut.
function truncate(s: string, max = 58): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

export default function ChatHistory({ messages, isStreaming }: ChatHistoryProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Column slides in from the right on mount
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !columnRef.current) return;
      gsap.fromTo(
        columnRef.current,
        { x: 40, opacity: 0 },
        { x: 0,  opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.25 }
      );
    });
    return () => { cancelled = true; };
  }, []);

  // Scroll to newest item when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const visibleMessages = messages.filter(m => extractText(m) !== null);

  return (
    <div
      ref={columnRef}
      className="scrollbar-hide"
      style={{
        opacity:       0,  // GSAP entrance
        display:       'flex',
        flexDirection: 'column',
        gap:           '10px',
        overflowY:     'auto',
        height:        '100%',
        padding:       '24px 24px 24px 16px',
      }}
    >
      {/* Column label */}
      <span
        className="flex-shrink-0"
        style={{
          fontFamily:    'var(--font-sans)',
          fontSize:      '10px',
          fontWeight:    600,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color:         'var(--color-text-muted)',
          marginBottom:  '4px',
        }}
      >
        History
      </span>

      {/* Empty state */}
      {visibleMessages.length === 0 && (
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Your conversation will appear here.
        </p>
      )}

      {/* Message rows — user bubble right, AI summary left */}
      {visibleMessages.map(msg => {
        const text = extractText(msg)!;
        return msg.role === 'user'
          ? <UserBubble  key={msg.id} text={text} />
          : <AISummary   key={msg.id} text={text} />;
      })}

      {/* "Thinking…" indicator while streaming, before first token */}
      {isStreaming && (
        <AISummary text="…" dimmed />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

// ── User bubble ───────────────────────────────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  // Strip any Supabase image URLs from the display text — just show the typed query
  const clean = text.replace(/https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp)/gi, '').trim();
  const hasImage = text !== clean;

  return (
    <div className="user-bubble flex flex-col gap-1">
      {clean && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: 1.5 }}>
          {truncate(clean, 72)}
        </span>
      )}
      {hasImage && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <PaperclipIcon /> image attached
        </span>
      )}
    </div>
  );
}

// ── AI history entry ──────────────────────────────────────────────────────────
// A compact one-line summary of the AI response.
// Not a full reply card — just enough context to identify the exchange.
function AISummary({ text, dimmed = false }: { text: string; dimmed?: boolean }) {
  return (
    <div
      style={{
        display:       'flex',
        alignItems:    'flex-start',
        gap:           '7px',
        padding:       '8px 12px',
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid var(--color-border)',
        borderRadius:  'var(--radius-sm)',
        fontFamily:    'var(--font-sans)',
        fontSize:      '11px',
        color:         dimmed ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
        lineHeight:    1.45,
      }}
    >
      {/* Small indicator dot */}
      <span
        style={{
          width:       5,
          height:      5,
          borderRadius: '50%',
          background:  'var(--color-live)',
          flexShrink:  0,
          marginTop:   '4px',
          opacity:     dimmed ? 0.4 : 1,
        }}
        aria-hidden="true"
      />
      <span>{truncate(text, 60)}</span>
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
