'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface StatusBarProps {
  usageCount:  number;
  isSuperuser: boolean;
  userEmail?:  string;
  onLogout:    () => void;
  onUsageClick?: () => void;
}

const FREE_LIMIT = 5;

export default function StatusBar({
  usageCount,
  isSuperuser,
  userEmail,
  onLogout,
  onUsageClick,
}: StatusBarProps) {
  const { lang, setLang, tr } = useLanguage();
  const barRef = useRef<HTMLDivElement>(null);

  // Slide up from the bottom edge on mount
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !barRef.current) return;
      gsap.fromTo(
        barRef.current,
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.35 }
      );
    });
    return () => { cancelled = true; };
  }, []);

  const atLimit = !isSuperuser && usageCount >= FREE_LIMIT;

  return (
    <div
      ref={barRef}
      className="status-bar-base"
      style={{ opacity: 0 /* GSAP animates in */ }}
    >
      {/* ── Language toggle ─────────────────────────── */}
      <div
        className="flex items-center overflow-hidden flex-shrink-0"
        style={{
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.03)',
        }}
      >
        {(['el', 'en'] as const).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.10em',
              fontFamily: 'var(--font-sans)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              ...(lang === l
                ? { background: 'rgba(255,255,255,0.12)', color: 'var(--color-text-primary)' }
                : { background: 'transparent',            color: 'var(--color-text-muted)'   }),
            }}
          >
            {l === 'el' ? 'ΕΛ' : 'ΕΝ'}
          </button>
        ))}
      </div>

      <Separator />

      {/* ── Usage counter ────────────────────────────── */}
      <button
        onClick={onUsageClick}
        disabled={!onUsageClick}
        className="flex items-center gap-1.5 flex-shrink-0"
        title={isSuperuser ? 'Superuser — unlimited' : `${usageCount} / ${FREE_LIMIT} analyses used`}
        style={{
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-sans)',
          color: atLimit ? 'var(--red)' : 'var(--color-text-secondary)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: onUsageClick ? 'pointer' : 'default',
        }}
      >
        <BarChartIcon />
        {isSuperuser ? '∞' : `${usageCount} / ${FREE_LIMIT}`}
      </button>

      <Separator />

      {/* ── Live indicator ───────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="status-live-dot" aria-hidden="true" />
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {tr.live}
        </span>
      </div>

      {/* ── Spacer pushes right-side items to the edge ─ */}
      <div style={{ flex: 1 }} />

      {/* ── User email (hidden below sm breakpoint) ──── */}
      {userEmail && (
        <span
          className="hidden sm:block flex-shrink-0"
          style={{
            fontSize: '10px',
            letterSpacing: '0.03em',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-muted)',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {userEmail}
        </span>
      )}

      {/* ── Logout icon ──────────────────────────────── */}
      <button
        onClick={onLogout}
        title={`Sign out${userEmail ? ` (${userEmail})` : ''}`}
        aria-label="Sign out"
        className="flex-shrink-0"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          borderRadius: 'var(--radius-sm)',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}
      >
        <LogoutIcon />
      </button>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function Separator() {
  return (
    <span
      aria-hidden="true"
      style={{ color: 'var(--color-text-muted)', fontSize: '10px', userSelect: 'none', flexShrink: 0 }}
    >
      |
    </span>
  );
}

function BarChartIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
