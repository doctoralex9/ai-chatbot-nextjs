import Image from 'next/image';
import type { ReactNode } from 'react';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string };

interface ChatMessageProps {
  role: 'user' | 'assistant';
  parts: MessagePart[];
  avatarSrc: string;
}

// ── Inline formatter: **bold**, *italic*, `code` ──────────────────────────
function inlineFormat(text: string): ReactNode {
  const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  if (segments.length === 1) return text;

  return (
    <>
      {segments.map((seg, i) => {
        if (/^\*\*[^*]+\*\*$/.test(seg))
          return <strong key={i} className="font-bold" style={{ color: '#EDF2FF' }}>{seg.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(seg))
          return <em key={i} className="italic text-blue-200">{seg.slice(1, -1)}</em>;
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

    // H2
    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={key} className="font-bold text-sm mt-3 mb-1" style={{ color: '#93C5FD' }}>
          {line.slice(3)}
        </h3>
      );
    }
    // H3
    else if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={key} className="font-semibold text-xs mt-2 mb-0.5 uppercase tracking-wider"
            style={{ color: '#67E8F9' }}>
          {line.slice(4)}
        </h4>
      );
    }
    // Horizontal rule
    else if (line === '---' || line === '***') {
      nodes.push(
        <hr key={key} className="divider-glow border-0 my-2" />
      );
    }
    // Fenced code block
    else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      i = j; // skip to closing fence; loop i++ moves past it
      nodes.push(
        <pre key={key} className="code-pre my-2 whitespace-pre-wrap">
          {codeLines.join('\n')}
        </pre>
      );
    }
    // Bullet list item
    else if (line.startsWith('- ') || line.startsWith('• ')) {
      nodes.push(
        <div key={key} className="flex items-start gap-2 my-0.5">
          <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: '#60A5FA' }}>▸</span>
          <span className="text-sm leading-relaxed">{inlineFormat(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list item
    else if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/);
      if (m) {
        nodes.push(
          <div key={key} className="flex items-start gap-2 my-0.5">
            <span className="font-mono text-xs mt-0.5 flex-shrink-0" style={{ color: '#60A5FA' }}>{m[1]}.</span>
            <span className="text-sm leading-relaxed">{inlineFormat(m[2])}</span>
          </div>
        );
      }
    }
    // Empty line → small gap
    else if (line.trim() === '') {
      if (i > 0 && i < lines.length - 1) nodes.push(<div key={key} className="h-1" />);
    }
    // Regular paragraph
    else {
      nodes.push(
        <p key={key} className="text-sm leading-relaxed">{inlineFormat(line)}</p>
      );
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
      <div className={`flex-shrink-0 w-7 h-7 rounded-full overflow-hidden
        ${isUser ? 'avatar-ring-blue' : 'avatar-ring-cyan'}`}>
        <Image
          src={avatarSrc}
          alt={isUser ? 'You' : 'AI'}
          width={28}
          height={28}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] sm:max-w-[75%] rounded-2xl overflow-hidden
          ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={isUser ? {
          background: 'linear-gradient(145deg, #2563EB, #1D4ED8)',
          border:     '1px solid rgba(96,165,250,0.25)',
          boxShadow:  '0 4px 18px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        } : {
          background: 'linear-gradient(145deg, #0F1928, #0A1520)',
          border:     '1px solid rgba(6,182,212,0.18)',
          boxShadow:  '0 4px 20px rgba(0,0,0,0.35)',
        }}
      >
        <div className={`px-4 py-3 space-y-1 ${isUser ? 'text-white' : 'text-[var(--text-1)]'}`}>
          {parts.map((part, idx) =>
            part.type === 'text' ? (
              <div key={idx} className="leading-relaxed">
                {isUser
                  ? <p className="text-sm font-medium whitespace-pre-wrap break-words">{part.text}</p>
                  : <div className="space-y-0.5">{renderMarkdown(part.text)}</div>
                }
              </div>
            ) : (
              <div key={idx} className="rounded-xl overflow-hidden mt-2"
                   style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <Image
                  src={part.imageUrl}
                  alt={part.alt ?? 'Attachment'}
                  width={640}
                  height={480}
                  className="w-full h-auto object-cover"
                  unoptimized
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
