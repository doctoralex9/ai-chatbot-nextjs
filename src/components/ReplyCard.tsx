'use client';

import { useEffect, useRef } from 'react';
import { renderMarkdown } from '@/lib/renderMarkdown';

interface ReplyCardProps {
  text:         string;
  timestamp?:   Date;
  isStreaming?: boolean;
  isNew?:       boolean; // true = just appeared during session → fly from mouth
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ReplyCard({ text, timestamp, isStreaming, isNew }: ReplyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !cardRef.current) return;
      const card = cardRef.current;

      if (!isNew) {
        // History card: simple fast fade-in, no motion
        gsap.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
        return;
      }

      // New message: calculate the mouth's screen position and fly from there.
      // The robot mouth sits at roughly the horizontal center of the viewport,
      // about 55% of the way down (lower half of the face).
      const rect    = card.getBoundingClientRect();
      const mouthX  = window.innerWidth  * 0.5;
      const mouthY  = window.innerHeight * 0.55;
      const startX  = mouthX - (rect.left + rect.width  / 2);
      const startY  = mouthY - (rect.top  + rect.height / 2);

      gsap.fromTo(
        card,
        { x: startX, y: startY, scale: 0.30, opacity: 0 },
        { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.85, ease: 'power3.out' }
      );
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={cardRef} className="reply-card" style={{ opacity: 0 /* GSAP entrance */ }}>

      {/* ── Header row ── */}
      <div className="flex items-center gap-2 mb-3">
        <span className="status-live-dot flex-shrink-0" aria-hidden="true" />
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
          BetSense
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
