'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function LoginPage() {
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('rr-remember-me') !== 'false' : true
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const cardRef = useRef<HTMLDivElement>(null);

  const { tr }  = useLanguage();
  const supabase = createClient();
  const router   = useRouter();

  // Card slides up on mount — loaded dynamically so GSAP is never in the server bundle
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !cardRef.current) return;
      gsap.fromTo(
        cardRef.current,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.72, ease: 'power3.out' }
      );
    });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem('rr-remember-me', rememberMe ? 'true' : 'false');
        sessionStorage.setItem('rr-tab-session', '1');
        router.push('/');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setSuccess(tr.login.successSignup);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : tr.login.errDefault;
      setError(
        raw === 'Invalid login credentials'  ? tr.login.errCredentials       :
        raw === 'User already registered'    ? tr.login.errAlreadyRegistered :
        raw
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError('');
    setSuccess('');
  };

  return (
    <div className="bg-grid min-h-dvh flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Language toggle */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      {/* Radial glow behind the card */}
      <div className="hero-glow" aria-hidden />

      {/* Modal card */}
      <div
        ref={cardRef}
        className="relative z-10 w-full"
        style={{ maxWidth: '360px', opacity: 0 /* GSAP animates this in */ }}
      >
        {/* App name */}
        <div className="flex flex-col items-center mb-8 text-center">
          <h1
            className="text-2xl tracking-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            RiskRadar AI
          </h1>
          <p
            className="text-xs mt-1"
            style={{
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            {tr.login.subtitle}
          </p>
        </div>

        {/* Card shell */}
        <div
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            backdropFilter: 'var(--blur-modal)',
            WebkitBackdropFilter: 'var(--blur-modal)',
            padding: '32px',
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex mb-6 p-1 gap-1"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-pill)',
            }}
          >
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-2 text-xs font-semibold transition-all duration-200"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.06em',
                  ...(mode === m
                    ? { background: '#ffffff', color: '#000000', boxShadow: '0 1px 4px rgba(0,0,0,0.5)' }
                    : { background: 'transparent', color: 'var(--color-text-muted)' }
                  ),
                }}
              >
                {m === 'signin' ? tr.login.tabSignin : tr.login.tabSignup}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="email@example.com"
                style={{
                  fontSize: '16px', // prevents iOS zoom on focus
                  fontFamily: 'var(--font-sans)',
                  height: '44px',
                  padding: '0 14px',
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  width: '100%',
                }}
                onFocus={e  => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; }}
                onBlur={e   => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-semibold"
                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
              >
                {tr.login.labelPassword}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={tr.login.placeholderPassword}
                style={{
                  fontSize: '16px',
                  fontFamily: 'var(--font-sans)',
                  height: '44px',
                  padding: '0 14px',
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  width: '100%',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {/* Remember me — sign-in only */}
            {mode === 'signin' && (
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  role="checkbox"
                  aria-checked={rememberMe}
                  tabIndex={0}
                  onClick={() => setRememberMe(v => !v)}
                  onKeyDown={e => e.key === ' ' && setRememberMe(v => !v)}
                  className="relative flex-shrink-0 w-4 h-4 transition-all duration-150"
                  style={{
                    borderRadius: '4px',
                    background: rememberMe ? '#ffffff' : 'transparent',
                    border: `1.5px solid ${rememberMe ? '#ffffff' : 'rgba(255,255,255,0.22)'}`,
                  }}
                >
                  {rememberMe && (
                    <svg className="absolute inset-0 w-full h-full p-[2px]" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-secondary)' }}>
                  {tr.login.rememberMe}
                </span>
              </label>
            )}

            {/* Error state */}
            {error && (
              <div
                className="px-4 py-3 text-xs"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--red-dim)',
                  border: '1px solid var(--red-border)',
                  color: 'var(--red)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {error}
              </div>
            )}

            {/* Success state */}
            {success && (
              <div
                className="px-4 py-3 text-xs"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--green-dim)',
                  border: '1px solid var(--green-border)',
                  color: 'var(--green)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="btn-pill-primary w-full"
              style={{ height: '46px', marginTop: '4px' }}
            >
              {loading
                ? tr.login.btnLoading
                : mode === 'signin'
                ? tr.login.btnSignin
                : tr.login.btnSignup}
            </button>
          </form>
        </div>

        {/* Footer caption */}
        <p
          className="text-center text-xs mt-4"
          style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)' }}
        >
          {tr.login.footer}
        </p>
      </div>
    </div>
  );
}
