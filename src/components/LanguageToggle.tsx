'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="flex rounded-lg overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-2)' }}
    >
      {(['el', 'en'] as const).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider transition-all duration-200"
          style={
            lang === l
              ? { background: 'rgba(255,255,255,0.12)', color: 'var(--text-1)' }
              : { color: 'var(--text-4)' }
          }
        >
          {l === 'el' ? 'ΕΛ' : 'EN'}
        </button>
      ))}
    </div>
  );
}
