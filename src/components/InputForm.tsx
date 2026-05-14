'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface InputFormProps {
  value:                 string;
  onChange:              (v: string) => void;
  onSubmit:              (e: React.FormEvent<HTMLFormElement>) => void;
  onStop:                () => void;
  onAttachClick:         () => void;
  isStreaming:           boolean;
  isDisabled:            boolean;
  isUploading:           boolean;
  placeholder:           string;
  attachmentPreviewUrl?: string;
  attachmentFileName?:   string;
  onRemoveAttachment?:   () => void;
  uploadError?:          string;
}

export default function InputForm({
  value,
  onChange,
  onSubmit,
  onStop,
  onAttachClick,
  isStreaming,
  isDisabled,
  isUploading,
  placeholder,
  attachmentPreviewUrl,
  attachmentFileName,
  onRemoveAttachment,
  uploadError,
}: InputFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset textarea height when value is cleared by the parent (after send)
  useEffect(() => {
    if (!value && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Auto-grow up to 160px, then scroll
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim().length > 0 || attachmentPreviewUrl) && !isStreaming) {
        onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  const canSend = (value.trim().length > 0 || !!attachmentPreviewUrl) && !isDisabled;

  return (
    <div style={{ padding: '0 16px 8px' }}>

      {/* Attachment preview */}
      {attachmentPreviewUrl && (
        <div
          className="mb-2 overflow-hidden"
          style={{
            border:       '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            background:   '#0d0d0d',
          }}
        >
          <Image
            src={attachmentPreviewUrl}
            alt="preview"
            width={400} height={200}
            unoptimized
            className="w-full object-cover"
            style={{ maxHeight: '120px', objectFit: 'cover' }}
          />
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: 'var(--color-live)' }}>
              ✓ {attachmentFileName ?? 'Image ready'}
            </span>
            {onRemoveAttachment && (
              <button
                type="button"
                onClick={onRemoveAttachment}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize:   '11px',
                  color:      'var(--color-text-muted)',
                  background: 'none',
                  border:     'none',
                  cursor:     'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div
          className="mb-2 px-3 py-2 flex items-center gap-2"
          style={{
            borderRadius: 'var(--radius-sm)',
            background:   'var(--red-dim)',
            border:       '1px solid var(--red-border)',
            fontFamily:   'var(--font-sans)',
            fontSize:     '11px',
            color:        'var(--red)',
          }}
        >
          <span>⚠</span>
          <span>{uploadError}</span>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={onSubmit} className="input-form-wrapper">

        {/* Attach button */}
        <button
          type="button"
          onClick={onAttachClick}
          disabled={isDisabled}
          className="input-icon-btn"
          aria-label="Attach image"
          title="Attach image or bet slip"
        >
          <PaperclipIcon />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder={placeholder}
          rows={1}
          style={{
            flex:        1,
            background:  'transparent',
            border:      'none',
            outline:     'none',
            resize:      'none',
            overflowY:   'auto',
            fontFamily:  'var(--font-sans)',
            fontSize:    '16px',   // 16px prevents iOS zoom
            lineHeight:  '1.5',
            color:       'var(--color-text-primary)',
            minHeight:   '24px',
            maxHeight:   '160px',
            paddingTop:  '2px',
          }}
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="input-icon-btn"
            aria-label="Stop generating"
            style={{ color: '#ff5050', borderColor: 'rgba(255,80,80,0.35)', background: 'rgba(255,80,80,0.10)' }}
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="input-icon-btn"
            aria-label="Send message"
            style={canSend
              ? { background: '#ffffff', color: '#000000', borderColor: '#ffffff' }
              : { opacity: 0.4 }
            }
          >
            {isUploading ? <SpinnerIcon /> : <SendIcon />}
          </button>
        )}
      </form>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         className="animate-spin" stroke="currentColor" strokeWidth={3}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" />
      <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
