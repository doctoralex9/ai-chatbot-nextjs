/**
 * Shared markdown renderer used by both ChatMessage (existing) and
 * ReplyCard (new UI). Extracted here so both components stay in sync.
 */

import type { ReactNode } from 'react';

// ── Inline formatter: **bold**, *italic*, `code` ──────────────────────────────
export function inlineFormat(text: string): ReactNode {
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

// ── Block renderer: headings, lists, code fences, paragraphs ─────────────────
export function renderMarkdown(text: string): ReactNode {
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
      nodes.push(
        <p key={key} className="text-sm leading-relaxed">{inlineFormat(line)}</p>
      );
    }

    i++;
  }

  return <>{nodes}</>;
}
