export default function Loader() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-6"
      style={{ background: '#000000' }}
    >
      {/* Concentric orbit rings */}
      <div className="relative w-16 h-16">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        />
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(255,255,255,0.8)',
            borderRightColor: 'rgba(255,255,255,0.2)',
            animation: 'spin 1.6s linear infinite',
          }}
        />
        <span
          className="absolute inset-[5px] rounded-full"
          style={{
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(255,255,255,0.5)',
            borderLeftColor: 'rgba(255,255,255,0.12)',
            animation: 'spin 1.1s linear infinite reverse',
          }}
        />
        <span
          className="absolute inset-[11px] rounded-full"
          style={{
            border: '1.5px solid transparent',
            borderTopColor: 'rgba(255,255,255,0.3)',
            animation: 'spin 0.75s linear infinite',
          }}
        />
        {/* Centre dot */}
        <span
          className="absolute inset-[18px] rounded-full white-pulse"
          style={{ background: '#ffffff' }}
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-gradient tracking-wide">RiskRadar AI</p>
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-4)' }}>Φόρτωση συνεδρίας…</p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
