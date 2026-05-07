'use client';

import Image from 'next/image';
import { useState } from 'react';
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

// ── Attachment image with broken-image fallback ───────────────────────────
function AttachmentImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: 'var(--text-4)' }}>
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Image unavailable
      </div>
    );
  }
  return (
    <Image src={src} alt={alt} width={640} height={480}
           className="w-full h-auto object-cover" unoptimized
           onError={() => setError(true)} />
  );
}

// ── User text: extract embedded image URLs and render inline ──────────────
function renderUserText(text: string): ReactNode {
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
          <AttachmentImage src={url} alt="Attached image" />
        </div>
      ))}
    </>
  );
}

// ── Inline formatter: **bold**, *italic*, `code` ──────────────────────────
function inlineFormat(text: string): ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  if (segments.length === 1) return text;

  return (
    <>
      {segments.map((seg, i) => {
        if (/^\*\*[^*]+\*\*$/.test(seg))
          return <strong key={i} className="font-bold" style={{ color: '#ffffff' }}>{seg.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(seg))
          return <em key={i} className="italic" style={{ color: 'rgba(255,255,255,0.75)' }}>{seg.slice(1, -1)}</em>;
        if (/^`[^`]+`$/.test(seg))
          return <code key={i} className="code-inline">{seg.slice(1, -1)}</code>;
        return <span key={i}>{seg}</span>;
      })}
    </>
  );
}

// ── Block renderer: headings, lists, code fences, paragraphs ─────────────
function renderMarkdown(text: string): ReactNode {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key  = `l${i}`;

    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={key} className="font-bold text-sm mt-3 mb-1" style={{ color: '#ffffff' }}>
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={key} className="font-semibold text-xs mt-2 mb-0.5 uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.55)' }}>
          {line.slice(4)}
        </h4>
      );
    } else if (line === '---' || line === '***') {
      nodes.push(<hr key={key} className="divider-glow border-0 my-2" />);
    } else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) { codeLines.push(lines[j]); j++; }
      i = j;
      nodes.push(
        <pre key={key} className="code-pre my-2 whitespace-pre-wrap">{codeLines.join('\n')}</pre>
      );
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      nodes.push(
        <div key={key} className="flex items-start gap-2 my-0.5">
          <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>▸</span>
          <span className="text-sm leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/);
      if (m) {
        nodes.push(
          <div key={key} className="flex items-start gap-2 my-0.5">
            <span className="font-mono text-xs mt-0.5 flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>{m[1]}.</span>
            <span className="text-sm leading-relaxed">{inlineFormat(m[2])}</span>
          </div>
        );
      }
    } else if (line.trim() === '') {
      if (i > 0 && i < lines.length - 1) nodes.push(<div key={key} className="h-1" />);
    } else {
      nodes.push(<p key={key} className="text-sm leading-relaxed">{inlineFormat(line)}</p>);
    }

    i++;
  }

  return <>{nodes}</>;
}

// ── Component ─────────────────────────────────────────────────────────────
export default function ChatMessage({ role, parts, avatarSrc }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex items-end gap-2.5 w-full ${isUser ? 'flex-row-reverse' : ''}`}>

      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full overflow-hidden ${isUser ? 'avatar-ring-user' : 'avatar-ring'}`}>
        <Image src={avatarSrc} alt={isUser ? 'You' : 'AI'} width={28} height={28}
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
                  ? renderUserText(part.text)
                  : <div className="space-y-0.5">{renderMarkdown(part.text)}</div>
                }
              </div>
            ) : (
              // Explicit image parts (from old history entries or direct attachment)
              <div key={idx} className="rounded-xl overflow-hidden mt-2"
                   style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <AttachmentImage src={part.imageUrl} alt={part.alt ?? 'Attachment'} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
