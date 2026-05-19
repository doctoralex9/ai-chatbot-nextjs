'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import RobotStage, { type RobotStageHandle } from '@/components/RobotStage';

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
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const robotRef  = useRef<RobotStageHandle>(null);
  const titleRef  = useRef<HTMLDivElement>(null);
  const cardRef   = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLParagraphElement>(null);

  const { tr }  = useLanguage();
  const supabase = createClient();
  const router   = useRouter();

  // Cinematic entrance: robot zooms in first, then UI elements stagger in.
  // Title → card shell → form fields → footer, coordinated with robot's 0.3s delay.
  useEffect(() => {
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled || !titleRef.current || !cardRef.current || !footerRef.current) return;

      const formEls = Array.from(cardRef.current.querySelectorAll('[data-s]'));

      // Set initial transform positions (opacity is set via inline style in JSX)
      gsap.set(titleRef.current, { y: 22 });
      gsap.set(cardRef.current,  { y: 30 });
      gsap.set(formEls,          { y: 14 });

      // Timeline starts at 0.5s — robot zoom is halfway done by then (delay 0.3 + 0.2 into tween)
      const tl = gsap.timeline({ delay: 0.5 });

      tl.to(titleRef.current, {
        opacity: 1, y: 0, duration: 0.65, ease: 'power3.out',
      });
      tl.to(cardRef.current, {
        opacity: 1, y: 0, duration: 0.70, ease: 'power3.out',
      }, '-=0.3');
      tl.to(formEls, {
        y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.09,
      }, '<0.22');
      tl.to(footerRef.current, {
        opacity: 1, duration: 0.45,
      }, '-=0.1');
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
        robotRef.current?.loginTurn();
        await new Promise(r => setTimeout(r, 700));
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

  const handleForgotPassword = async () => {
    if (forgotLoading) return;
    if (!email.trim()) {
      setForgotMessage({ type: 'error', text: tr.login.forgotPasswordNoEmail });
      return;
    }
    setForgotLoading(true);
    setForgotMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      setForgotMessage({ type: 'success', text: tr.login.forgotPasswordSuccess });
    } catch {
      setForgotMessage({ type: 'error', text: tr.login.errDefault });
    } finally {
      setForgotLoading(false);
    }
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError('');
    setSuccess('');
    setForgotMessage(null);
  };

  return (
    <div className="bg-grid overflow-hidden flex relative" style={{ height: '100dvh' }}>

      {/* Robot — absolute behind card on mobile, left flex column on desktop */}
      <div
        className="absolute inset-0 md:relative md:inset-auto md:flex-1"
        style={{ zIndex: 0 }}
      >
        <RobotStage ref={robotRef} keepIdle entrance="zoom" />

        {/* Tagline overlay — desktop only, reveals after robot entrance */}
        <div
          className="hidden md:flex flex-col justify-end pointer-events-none"
          style={{ position: 'absolute', inset: 0, padding: '0 0 40px 40px', zIndex: 5 }}
        >
          <div
            className="reveal-up"
            style={{ animationDelay: '1.2s', maxWidth: '340px' }}
          >
            <div style={{
              background:           'rgba(0,0,0,0.52)',
              backdropFilter:       'blur(22px) saturate(130%)',
              WebkitBackdropFilter: 'blur(22px) saturate(130%)',
              border:               '1px solid rgba(255,255,255,0.09)',
              borderRadius:         'var(--radius-lg)',
              padding:              '18px 22px',
            }}>
              <p style={{
                fontFamily:    'var(--font-display)',
                fontSize:      '14px',
                fontWeight:    700,
                color:         'var(--color-text-primary)',
                letterSpacing: '-0.01em',
                lineHeight:    1.3,
                marginBottom:  '8px',
              }}>
                {tr.login.tagline}
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize:   '12px',
                color:      'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginBottom: '14px',
              }}>
                {tr.emptyDesc}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {tr.features.map(f => (
                  <span key={f.title} style={{
                    background:    'rgba(255,255,255,0.05)',
                    border:        '1px solid rgba(255,255,255,0.10)',
                    borderRadius:  'var(--radius-pill)',
                    padding:       '3px 10px',
                    fontSize:      '10px',
                    letterSpacing: '0.04em',
                    color:         'var(--color-text-secondary)',
                    fontFamily:    'var(--font-sans)',
                  }}>
                    {f.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Language toggle */}
      <div className="absolute top-4 right-4" style={{ zIndex: 20 }}>
        <LanguageToggle />
      </div>

      {/* Card column — full-width overlay on mobile, fixed right panel on desktop */}
      <div
        className="login-col relative flex flex-col items-center w-full px-5 md:w-[420px] md:flex-none md:border-l"
        style={{
          zIndex: 10,
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <div className="w-full" style={{ maxWidth: '360px' }}>

        {/* App name — fades in first */}
        <div
          ref={titleRef}
          className="flex flex-col items-center mb-8 text-center"
          style={{ opacity: 0 }}
        >
          <h1
            className="text-2xl tracking-tight"
            style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              color:         'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            BetSense
          </h1>
          <p
            className="text-xs mt-1"
            style={{
              fontFamily:    'var(--font-sans)',
              color:         'var(--color-text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            {tr.login.subtitle}
          </p>
        </div>

        {/* Card shell — slides in after title */}
        <div
          ref={cardRef}
          style={{
            opacity:              0,
            background:           'rgba(0, 0, 8, 0.1)',
            border:               '1px solid rgba(255,255,255,0.18)',
            borderRadius:         'var(--radius-lg)',
            backdropFilter:       'blur(2px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            padding:              '32px',
          }}
        >
          {/* Tab switcher */}
          <div
            data-s
            className="flex mb-6 p-1 gap-1"
            style={{
              background:   'rgba(255,255,255,0.03)',
              border:       '1px solid var(--color-border)',
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
                  borderRadius:   'var(--radius-pill)',
                  fontFamily:     'var(--font-sans)',
                  letterSpacing:  '0.06em',
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
            <div data-s className="flex flex-col gap-1.5">
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
                  fontSize:     '16px',
                  fontFamily:   'var(--font-sans)',
                  height:       '44px',
                  padding:      '0 14px',
                  background:   'rgba(0,0,0,0.45)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color:        'var(--color-text-primary)',
                  outline:      'none',
                  transition:   'border-color 0.2s',
                  width:        '100%',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {/* Password */}
            <div data-s className="flex flex-col gap-1.5">
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
                  fontSize:     '16px',
                  fontFamily:   'var(--font-sans)',
                  height:       '44px',
                  padding:      '0 14px',
                  background:   'rgba(0,0,0,0.45)',
                  border:       '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color:        'var(--color-text-primary)',
                  outline:      'none',
                  transition:   'border-color 0.2s',
                  width:        '100%',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-focus)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
            </div>

            {/* Remember me — sign-in only */}
            {mode === 'signin' && (
              <label data-s className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  role="checkbox"
                  aria-checked={rememberMe}
                  tabIndex={0}
                  onClick={() => setRememberMe(v => !v)}
                  onKeyDown={e => e.key === ' ' && setRememberMe(v => !v)}
                  className="relative flex-shrink-0 w-4 h-4 transition-all duration-150"
                  style={{
                    borderRadius: '4px',
                    background:   rememberMe ? '#ffffff' : 'transparent',
                    border:       `1.5px solid ${rememberMe ? '#ffffff' : 'rgba(255,255,255,0.22)'}`,
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
                  background:   'var(--red-dim)',
                  border:       '1px solid var(--red-border)',
                  color:        'var(--red)',
                  fontFamily:   'var(--font-sans)',
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
                  background:   'var(--green-dim)',
                  border:       '1px solid var(--green-border)',
                  color:        'var(--green)',
                  fontFamily:   'var(--font-sans)',
                }}
              >
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              data-s
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

            {/* Forgot password — sign-in mode only */}
            {mode === 'signin' && (
              <div data-s style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  style={{
                    background:      'none',
                    border:          'none',
                    cursor:          forgotLoading ? 'default' : 'pointer',
                    fontFamily:      'var(--font-sans)',
                    fontSize:        '11px',
                    color:           'var(--color-text-muted)',
                    textDecoration:  'underline',
                    textDecorationColor: 'rgba(255,255,255,0.15)',
                    transition:      'color 0.15s',
                    padding:         '4px',
                  }}
                  onMouseEnter={e => { if (!forgotLoading) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}
                >
                  {forgotLoading ? '…' : tr.login.forgotPassword}
                </button>
                {forgotMessage && (
                  <div style={{
                    marginTop:    '6px',
                    padding:      '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background:   forgotMessage.type === 'success' ? 'var(--green-dim)' : 'var(--red-dim)',
                    border:       `1px solid ${forgotMessage.type === 'success' ? 'var(--green-border)' : 'var(--red-border)'}`,
                    color:        forgotMessage.type === 'success' ? 'var(--green)' : 'var(--red)',
                    fontFamily:   'var(--font-sans)',
                    fontSize:     '11px',
                  }}>
                    {forgotMessage.text}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer caption — fades in last */}
        <p
          ref={footerRef}
          className="text-center text-xs mt-4"
          style={{ opacity: 0, fontFamily: 'var(--font-sans)', color: 'var(--color-text-muted)' }}
        >
          {tr.login.footer}
        </p>
        </div>{/* maxWidth wrapper */}
      </div>{/* card column */}
    </div>
  );
}
