import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Orbitron } from "next/font/google";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { Lang } from "@/lib/i18n";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

/**
 * Font Configuration
 * Using Next.js Font Optimization with Google Fonts
 * Following horizontal programming: fonts loaded once at root level
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

// Display font for hero titles and robot model names (Orbitron only covers latin)
const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

/**
 * Application Metadata (SEO Optimized)
 * Following Next.js 15 best practices for metadata API
 */
export const metadata: Metadata = {
  title: {
    default: "BetSense — Betting Risk Analysis",
    template: "%s | BetSense",
  },
  description:
    "Your AI-powered betting risk radar. Assess bets, protect your bankroll, and get honest EV analysis — before you place a single stake.",
  keywords: [
    "AI chatbot",
    "betting analysis",
    "sports analytics",
    "odds comparison",
    "risk assessment",
  ],
  authors: [{ name: "BetSense Team" }],
  creator: "BetSense",
  publisher: "BetSense",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ai-chatbot-nextjs-git-main-alexs-projects-3987b915.vercel.app/",
    title: "BetSense — Betting Risk Analysis",
    description:
      "Your AI-powered betting risk radar. Assess bets, protect your bankroll, and get honest EV analysis.",
    siteName: "BetSense",
  },
  twitter: {
    card: "summary_large_image",
    title: "BetSense — Betting Risk Analysis",
    description:
      "Your AI-powered betting risk radar. Assess bets, protect your bankroll, and get honest EV analysis.",
  },
};

/**
 * Viewport Configuration
 * Following Next.js 15 best practices for mobile optimization
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

/**
 * Root Layout Component
 * Implements horizontal programming principles:
 * - Single source of truth for fonts and global styles
 * - Semantic HTML structure
 * - Performance optimizations (font-display swap)
 * - Accessibility features (lang attribute, antialiased text)
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLang = cookieStore.get('rr-lang')?.value;
  const initialLang: Lang = rawLang === 'en' ? 'en' : 'el';

  return (
    <html lang={initialLang === 'el' ? 'el' : 'en'} className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${orbitron.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: 'var(--font-inter), var(--font-geist-sans), system-ui' }}
      >
        <LanguageProvider initialLang={initialLang}>
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
