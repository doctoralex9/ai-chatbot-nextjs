'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import ReplyCard from './ReplyCard';

interface ReplyColumnProps {
  messages:    UIMessage[];
  isStreaming: boolean;
}

// Extracts the plain text from a UIMessage's parts array.
// Returns null if there's no text content (tool calls, empty messages, etc.)
function extractText(msg: UIMessage): string | null {
  for (const part of msg.parts) {
    if (
      part &&
      typeof part === 'object' &&
      'type' in part &&
      part.type === 'text' &&
      typeof (part as { text: string }).text === 'string' &&
      (part as { text: string }).text.length > 0
    ) {
      return (part as { text: string }).text;
    }
  }
  return null;
}

export default function ReplyColumn({ messages, isStreaming }: ReplyColumnProps) {
  const bottomRef  = useRef<HTMLDivElement>(null);
  const columnRef  = useRef<HTMLDivElement>(null);

  // Filter to assistant messages only — user messages go in ChatHistory (right column).
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // Auto-scroll to the latest reply whenever messages update or streaming progresses.
  // `behavior: 'smooth'` keeps it readable; the streaming text scrolls gently down.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // Column entrance on first mount — slides in from the left with the rest of the page.
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !columnRef.current) return;
      gsap.fromTo(
        columnRef.current,
        { x: -40, opacity: 0 },
        { x: 0,   opacity: 1, duration: 0.8, ease: 'power3.out', delay: 0.2 }
      );
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      ref={columnRef}
      className="scrollbar-hide"
      style={{
        opacity:   0, // GSAP entrance
        display:   'flex',
        flexDirection: 'column',
        gap:       '12px',
        overflowY: 'auto',
        height:    '100%',
        padding:   '24px 16px 24px 24px',
      }}
    >
      {/* Empty state — shown before the first AI reply */}
      {assistantMessages.length === 0 && !isStreaming && (
        <div
          className="flex flex-col items-start gap-2 mt-auto"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize:   '12px',
            color:      'var(--color-text-muted)',
            paddingBottom: '8px',
          }}
        >
          <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10px' }}>
            Replies
          </span>
          <span>AI responses will appear here.</span>
        </div>
      )}

      {/* Streaming placeholder — shown when AI has started but no text yet */}
      {isStreaming && assistantMessages.length === 0 && (
        <ReplyCard text="" isStreaming />
      )}

      {/* One card per assistant message */}
      {assistantMessages.map((msg, idx) => {
        const text        = extractText(msg);
        if (!text && !isStreaming) return null;

        const isLastMsg   = idx === assistantMessages.length - 1;
        const isThisStreaming = isStreaming && isLastMsg;

        // Timestamps are not stored in UIMessage, so we generate an approximate
        // one from the message index to give the UI a time reference.
        // When history is loaded from Supabase these will all show the same
        // relative time — acceptable for now; a future pass can persist timestamps.
        const ts = new Date();

        return (
          <ReplyCard
            key={msg.id}
            text={text ?? ''}
            timestamp={isThisStreaming ? undefined : ts}
            isStreaming={isThisStreaming}
          />
        );
      })}

      {/* Invisible anchor — scrollIntoView target */}
      <div ref={bottomRef} />
    </div>
  );
}
