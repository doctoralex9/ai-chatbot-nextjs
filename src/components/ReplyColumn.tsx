'use client';

import { useEffect, useRef } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import ReplyCard from './ReplyCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReplyColumnProps {
  messages:       UIMessage[];
  isStreaming:    boolean;
  onQuickAction?: (msg: string) => void;
}

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

export default function ReplyColumn({ messages, isStreaming, onQuickAction }: ReplyColumnProps) {
  const { tr } = useLanguage();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const columnRef  = useRef<HTMLDivElement>(null);

  // Tracks how many assistant messages existed on the previous render.
  // null = first render (all cards are history, no from-mouth animation).
  // After first render it is set to the count; any card beyond that count is "new".
  const prevCountRef = useRef<number | null>(null);

  const assistantMessages = messages.filter(m => m.role === 'assistant');

  // After every render, store the current count so the next render can compare.
  useEffect(() => {
    prevCountRef.current = assistantMessages.length;
  });

  const isNewCard = (idx: number) =>
    prevCountRef.current !== null && idx >= prevCountRef.current;

  // Auto-scroll to the latest reply
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // Column entrance on first mount
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
        opacity:       0, // GSAP entrance
        display:       'flex',
        flexDirection: 'column',
        gap:           '12px',
        overflowY:     'auto',
        height:        '100%',
        padding:       '24px 16px 24px 24px',
      }}
    >
      {/* Empty state */}
      {assistantMessages.length === 0 && !isStreaming && (
        <div
          className="flex flex-col items-start gap-4 m-auto"
          style={{ paddingBottom: '8px', width: '100%' }}
        >
          {/* Description */}
          <div className="flex flex-col gap-1.5 reply-empty-header">
            <span style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      '10px',
              fontWeight:    600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color:         'var(--color-text-muted)',
            }}>
              Replies
            </span>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize:   '12px',
              color:      'var(--color-text-secondary)',
              lineHeight: 1.6,
            }}>
              {tr.emptyDesc}
            </p>
          </div>

          {/* Quick action chips */}
          {onQuickAction && (
            <div className="flex flex-col gap-2 w-full">
              <span style={{
                fontFamily:    'var(--font-sans)',
                fontSize:      '10px',
                letterSpacing: '0.06em',
                color:         'var(--color-text-muted)',
              }}>
                {tr.quickHint}
              </span>
              <div className="quick-chips-list">
                {tr.quickActions.map(a => (
                  <button
                    key={a.label}
                    onClick={() => onQuickAction(a.message)}
                    style={{
                      textAlign:          'left',
                      background:         'rgba(255,255,255,0.08)',
                      backdropFilter:     'blur(12px) saturate(120%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(120%)',
                      border:             '1px solid rgba(255,255,255,0.14)',
                      borderRadius:       'var(--radius-sm)',
                      padding:            '7px 11px',
                      fontFamily:         'var(--font-sans)',
                      fontSize:           '11px',
                      color:              'rgba(255,255,255,0.82)',
                      cursor:             'pointer',
                      lineHeight:         1.4,
                      transition:         'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background  = 'rgba(255,255,255,0.14)';
                      el.style.borderColor = 'rgba(255,255,255,0.26)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement;
                      el.style.background  = 'rgba(255,255,255,0.08)';
                      el.style.borderColor = 'rgba(255,255,255,0.14)';
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streaming placeholder — always a "new" card */}
      {isStreaming && assistantMessages.length === 0 && (
        <ReplyCard text="" isStreaming isNew />
      )}

      {assistantMessages.map((msg, idx) => {
        const text            = extractText(msg);
        if (!text && !isStreaming) return null;

        const isLastMsg       = idx === assistantMessages.length - 1;
        const isThisStreaming = isStreaming && isLastMsg;
        const ts              = new Date();

        return (
          <ReplyCard
            key={msg.id}
            text={text ?? ''}
            timestamp={isThisStreaming ? undefined : ts}
            isStreaming={isThisStreaming}
            isNew={isNewCard(idx)}
          />
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
