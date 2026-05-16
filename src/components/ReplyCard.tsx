'use client';

import { useEffect, useRef } from 'react';
import { renderMarkdown } from '@/lib/renderMarkdown';

interface ReplyCardProps {
  text:         string;
  timestamp?:   Date;
  isStreaming?: boolean; // true only on the last card while AI is generating
}

// Formats a Date to HH:MM using the browser locale.
// Called lazily so it never runs on the server.
function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ReplyCard({ text, timestamp, isStreaming }: ReplyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // "From mouth" entrance — card rises from below and expands like a spoken word.
  // Fires once on mount; empty dep array means text stream updates don't re-trigger it.
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !cardRef.current) return;
      gsap.fromTo(
        cardRef.current,
        { y: 44, scale: 0.86, opacity: 0, transformOrigin: 'bottom center' },
        { y: 0,  scale: 1,    opacity: 1, duration: 0.72, ease: 'back.out(1.15)' }
      );
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div ref={cardRef} className="reply-card" style={{ opacity: 0 /* GSAP entrance */ }}>

      {/* ── Header row ── */}
      <div className="flex items-center gap-2 mb-3">
        {/* Pulsing green dot — signals the AI is "live" */}
        <span
          className="status-live-dot flex-shrink-0"
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      '10px',
            fontWeight:    600,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         'var(--color-text-secondary)',
          }}
        >
          RiskRadar AI
        </span>
      </div>

      {/* ── Message body ── */}
      <div
        className="space-y-0.5"
        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}
      >
        {text
          ? renderMarkdown(text)
          : isStreaming && <TypingBars />
        }
      </div>

      {/* ── Footer: timestamp ── */}
      {timestamp && !isStreaming && (
        <div
          className="flex justify-end mt-3"
          style={{
            fontFamily:    'var(--font-sans)',
            fontSize:      '10px',
            color:         'var(--color-text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          {formatTime(timestamp)}
        </div>
      )}
    </div>
  );
}

// ── Typing indicator shown while waiting for the first streaming token ────────
// Reuses the .typing-bar keyframe already defined in globals.css.
function TypingBars() {
  return (
    <div className="flex items-center gap-[5px] h-5 py-0.5">
      <span className="typing-bar" />
      <span className="typing-bar" />
      <span className="typing-bar" />
      <span className="typing-bar" />
    </div>
  );
}
