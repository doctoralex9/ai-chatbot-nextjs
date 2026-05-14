'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function WarningBanner() {
  const { tr } = useLanguage();

  return (
    <div className="warning-banner">
      <WarningIcon />
      <p style={{ fontFamily: 'var(--font-sans)' }}>
        <span style={{ fontWeight: 700 }}>{tr.disclaimerLabel}</span>
        {tr.disclaimerText}
      </p>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 20 20"
      fill="currentColor" style={{ flexShrink: 0, marginTop: '1px' }}
    >
      <path fillRule="evenodd" clipRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      />
    </svg>
  );
}
