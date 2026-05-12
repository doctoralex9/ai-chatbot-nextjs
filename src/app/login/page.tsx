'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const { tr } = useLanguage();
  const supabase = createClient();
  const router   = useRouter();

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
        raw === 'Invalid login credentials'
          ? tr.login.errCredentials
          : raw === 'User already registered'
          ? tr.login.errAlreadyRegistered
          : raw
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
    <div
      className="min-h-dvh flex flex-col items-center justify-center app-bg app-grid px-4"
      style={{ color: 'var(--text-1)' }}
    >
      {/* Language toggle — top right */}
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 68%)' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-14 h-14 rounded-full overflow-hidden mb-4 avatar-ring">
            <Image src="/botavatar.jpg" alt="RiskRadar AI" width={56} height={56}
                   className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-extrabold text-gradient tracking-tight">RiskRadar AI</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-4)' }}>{tr.login.subtitle}</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tab switcher */}
          <div className="flex rounded-xl mb-6 p-1"
               style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-2)' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                style={
                  mode === m
                    ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-1)', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }
                    : { color: 'var(--text-4)' }
                }
              >
                {m === 'signin' ? tr.login.tabSignin : tr.login.tabSignup}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="email@example.com"
                style={{ fontSize: '16px' }}
                className="w-full px-4 py-3 rounded-xl input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>
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
                style={{ fontSize: '16px' }}
                className="w-full px-4 py-3 rounded-xl input-field"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-xs"
                   style={{ background: 'var(--red-dim)', border: '1px solid var(--red-border)', color: 'var(--red)' }}>
                {error}
              </div>
            )}

            {success && (
              <div className="px-4 py-3 rounded-xl text-xs"
                   style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)', color: 'var(--green)' }}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-3 rounded-xl font-bold text-sm btn-primary disabled:opacity-50 transition-opacity"
            >
              {loading
                ? tr.login.btnLoading
                : mode === 'signin'
                ? tr.login.btnSignin
                : tr.login.btnSignup}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-4)' }}>
          {tr.login.footer}
        </p>
      </div>
    </div>
  );
}
