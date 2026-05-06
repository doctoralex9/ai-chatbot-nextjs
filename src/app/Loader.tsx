export default function Loader() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-5"
      style={{ background: '#030711' }}
    >
      {/* Animated rings */}
      <div className="relative w-16 h-16">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid rgba(59,130,246,0.15)',
            animation: 'spin 2s linear infinite',
          }}
        />
        <span
          className="absolute inset-[4px] rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#3B82F6',
            borderRightColor: 'rgba(59,130,246,0.3)',
            animation: 'spin 1.2s linear infinite',
          }}
        />
        <span
          className="absolute inset-[9px] rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: '#22D3EE',
            animation: 'spin 0.8s linear infinite reverse',
          }}
        />
        {/* Centre dot */}
        <span
          className="absolute inset-[14px] rounded-full pulse-glow"
          style={{ background: 'radial-gradient(circle, #3B82F6, #2563EB)' }}
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gradient">Wager Wizard Pro</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Loading your session…</p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
