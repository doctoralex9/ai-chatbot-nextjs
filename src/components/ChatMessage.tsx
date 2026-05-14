'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string };

interface ChatMessageProps {
  role: 'user' | 'assistant';
  parts: MessagePart[];
  avatarSrc: string;
}

// Matches Supabase storage image URLs embedded in text
const IMAGE_URL_REGEX = /https:\/\/[^\s\n]+\.(?:jpg|jpeg|png|gif|webp)/gi;

// ── Attachment image with zoom affordance ──────────────────────────────────
function AttachmentImage({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: 'var(--text-4)' }}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Η εικόνα δεν είναι διαθέσιμη
      </div>
    );
  }

  if (onClick) {
    return (
      <div className="relative group cursor-zoom-in" onClick={onClick}>
        <Image src={src} alt={alt} width={640} height={480}
               className="w-full max-h-52 object-contain bg-black" unoptimized
               onError={() => setError(true)} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
             style={{ background: 'rgba(0,0,0,0.38)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(4px)' }}>
            <svg className="w-5 h-5" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Image src={src} alt={alt} width={640} height={480}
           className="w-full max-h-52 object-contain bg-black" unoptimized
           onError={() => setError(true)} />
  );
}

// ── Lightbox — rendered via portal so it always sits above the scroll container
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 99999,
        background: 'rgba(0,0,0,0.93)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'fade-in 0.18s ease-out both',
      }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{
          zIndex: 100000,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#ffffff',
        }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Κλείσιμο"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image — stopPropagation so clicking the image itself doesn't close */}
      <div
        style={{
          animation: 'scale-in 0.22s var(--ease-spring) both',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Ζουμ στιγμιότυπου"
          style={{
            display: 'block',
            maxWidth: '95vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            touchAction: 'pinch-zoom',
            borderRadius: '10px',
            boxShadow: '0 16px 80px rgba(0,0,0,0.9)',
          }}
        />
      </div>

      <p
        className="absolute bottom-6 text-xs pointer-events-none select-none"
        style={{ color: 'rgba(255,255,255,0.25)' }}
      >
        Πάτα οπουδήποτε ή Esc για κλείσιμο
      </p>
    </div>,
    document.body
  );
}

// ── User text: extract embedded image URLs and render inline ──────────────
function renderUserText(text: string, onImageClick: (url: string) => void): ReactNode {
  const imageUrls = [...text.matchAll(IMAGE_URL_REGEX)].map(m => m[0]);
  const cleanText = text
    .replace(IMAGE_URL_REGEX, '')
    .replace(/\n\nAttached (screenshot|betting slip)[:\s]*/gi, '')
    .trim();

  return (
    <>
      {cleanText && (
        <p className="text-sm font-medium whitespace-pre-wrap break-words">{cleanText}</p>
      )}
      {imageUrls.map((url, i) => (
        <div key={i} className="rounded-xl overflow-hidden mt-2"
             style={{ border: '1px solid rgba(0,0,0,0.15)' }}>
          <AttachmentImage src={url} alt="Attached image" onClick={() => onImageClick(url)} />
        </div>
      ))}
    </>
  );
}

// Shared markdown renderer — also used by ReplyCard (new UI)
import { renderMarkdown } from '@/lib/renderMarkdown';

// ── Component ─────────────────────────────────────────────────────────────
export default function ChatMessage({ role, parts, avatarSrc }: ChatMessageProps) {
  const isUser = role === 'user';
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxSrc(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxSrc]);

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className={`flex items-end gap-2.5 w-full ${isUser ? 'flex-row-reverse' : ''}`}>

        {/* Avatar */}
        <div className={`flex-shrink-0 w-7 h-7 rounded-full overflow-hidden ${isUser ? 'avatar-ring-user' : 'avatar-ring'}`}>
          <Image src={avatarSrc} alt={isUser ? 'Εσύ' : 'AI'} width={28} height={28}
                 className="w-full h-full object-cover" />
        </div>

        {/* Bubble */}
        <div
          className={`max-w-[80%] sm:max-w-[75%] rounded-2xl overflow-hidden ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
          style={isUser ? {
            background: '#ffffff',
            boxShadow: '0 4px 20px rgba(255,255,255,0.12), 0 1px 4px rgba(0,0,0,0.5)',
          } : {
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className={`px-4 py-3 space-y-1 ${isUser ? '' : 'text-[var(--text-1)]'}`}
               style={isUser ? { color: '#000000' } : {}}>
            {parts.map((part, idx) =>
              part.type === 'text' ? (
                <div key={idx} className="leading-relaxed">
                  {isUser
                    ? renderUserText(part.text, setLightboxSrc)
                    : <div className="space-y-0.5">{renderMarkdown(part.text)}</div>
                  }
                </div>
              ) : (
                <div key={idx} className="rounded-xl overflow-hidden mt-2"
                     style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <AttachmentImage
                    src={part.imageUrl}
                    alt={part.alt ?? 'Attachment'}
                    onClick={() => setLightboxSrc(part.imageUrl)}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}
