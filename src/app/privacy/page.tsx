import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How BetSense collects, uses, and protects your personal data.',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main
      className="privacy-page"
      style={{
        minHeight: '100dvh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-sans)',
        padding: '48px 24px 80px',
      }}
    >
      <style>{`
        .privacy-page ul { list-style: disc; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
        .privacy-page li { padding-left: 4px; }
        .privacy-page code { background: rgba(255,255,255,0.07); padding: 1px 6px; border-radius: 4px; font-size: 12px; }
        .privacy-page p { margin: 0; }
      `}</style>

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Back link */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            marginBottom: '40px',
          }}
        >
          ← Back to BetSense
        </Link>

        {/* Header */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 5vw, 36px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: '8px',
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '48px' }}>
          Last updated: 20 May 2026
        </p>

        <Section title="1. Who we are">
          <p>
            BetSense (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a betting risk analysis tool operated as an independent project.
            For any privacy-related enquiries please contact us at{' '}
            <a href="mailto:asyncdev2026@gmail.com" style={{ color: 'var(--color-text-primary)' }}>
              asyncdev2026@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="2. What data we collect">
          <ul>
            <li><strong>Account data:</strong> your email address, collected when you create an account via Supabase Auth.</li>
            <li><strong>Chat messages:</strong> the text prompts you send and the AI responses you receive are stored in our database so your conversation history is available between sessions.</li>
            <li><strong>Uploaded images:</strong> screenshots or bet-slip images you attach to a message are uploaded to Supabase Storage and kept as part of your conversation history.</li>
            <li><strong>Usage data:</strong> a counter of how many analyses you have performed in the current period, stored server-side.</li>
            <li><strong>Analytics:</strong> anonymous page-view and navigation data collected by Vercel Analytics. No personal identifiers are stored; no cookies are set by this service.</li>
          </ul>
        </Section>

        <Section title="3. How we use your data">
          <ul>
            <li>To provide the core service: your messages are sent to OpenAI&apos;s API to generate risk analysis responses.</li>
            <li>To persist your conversation history and let you continue previous sessions.</li>
            <li>To enforce usage limits and prevent abuse.</li>
            <li>To understand aggregate usage patterns and improve the product (via Vercel Analytics).</li>
          </ul>
        </Section>

        <Section title="4. Third-party services">
          <p>We share data with the following processors in order to operate the service:</p>
          <ul>
            <li>
              <strong>OpenAI</strong> — your messages and any attached images are transmitted to OpenAI for processing.
              OpenAI&apos;s privacy policy applies:{' '}
              <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-primary)' }}>
                openai.com/policies/privacy-policy
              </a>.
            </li>
            <li>
              <strong>Supabase</strong> — stores your account data, chat history, and uploaded files.
              Supabase&apos;s privacy policy applies:{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-primary)' }}>
                supabase.com/privacy
              </a>.
            </li>
            <li>
              <strong>Vercel</strong> — hosts the application and provides anonymous analytics.
              Vercel&apos;s privacy policy applies:{' '}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-primary)' }}>
                vercel.com/legal/privacy-policy
              </a>.
            </li>
          </ul>
        </Section>

        <Section title="5. Data retention">
          <p>
            Chat history and uploaded images are retained for as long as your account is active. If you wish to have your data deleted, contact us at{' '}
            <a href="mailto:asyncdev2026@gmail.com" style={{ color: 'var(--color-text-primary)' }}>
              asyncdev2026@gmail.com
            </a>{' '}
            and we will delete it within 30 days.
          </p>
        </Section>

        <Section title="6. Your rights (GDPR)">
          <p>If you are located in the European Economic Area you have the following rights:</p>
          <ul>
            <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
            <li><strong>Rectification:</strong> ask us to correct inaccurate data.</li>
            <li><strong>Erasure:</strong> ask us to delete your personal data.</li>
            <li><strong>Portability:</strong> receive your data in a structured, machine-readable format.</li>
            <li><strong>Objection:</strong> object to processing based on legitimate interests.</li>
            <li><strong>Restriction:</strong> ask us to restrict processing of your data.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:asyncdev2026@gmail.com" style={{ color: 'var(--color-text-primary)' }}>
              asyncdev2026@gmail.com
            </a>.
            You also have the right to lodge a complaint with your local supervisory authority (in Greece:{' '}
            <a href="https://www.dpa.gr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-primary)' }}>
              dpa.gr
            </a>).
          </p>
        </Section>

        <Section title="7. Cookies">
          <p>
            BetSense uses a single session cookie (<code>rr-lang</code>) to remember your language preference. No advertising or tracking cookies are used.
            Vercel Analytics uses a cookie-free, privacy-first approach and does not set any persistent cookies.
          </p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We may update this policy occasionally. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of BetSense after changes are posted constitutes acceptance of the revised policy.
          </p>
        </Section>

      </div>
    </main>
  );
}

/* ── Sub-component ─────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '0.01em',
          marginBottom: '12px',
          color: 'var(--color-text-primary)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: '14px',
          lineHeight: '1.75',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {children}
      </div>
    </section>
  );
}
