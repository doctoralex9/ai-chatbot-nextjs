import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
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
    default: "RiskRadar AI — Betting Risk Analysis",
    template: "%s | RiskRadar AI",
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
  authors: [{ name: "RiskRadar AI Team" }],
  creator: "RiskRadar AI",
  publisher: "RiskRadar AI",
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
    url: "https://wagerwizard.com",
    title: "RiskRadar AI — Betting Risk Analysis",
    description:
      "Your AI-powered betting risk radar. Assess bets, protect your bankroll, and get honest EV analysis.",
    siteName: "RiskRadar AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "RiskRadar AI — Betting Risk Analysis",
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
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>

      <body
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: 'var(--font-inter), var(--font-geist-sans), system-ui' }}
      >
        {children}
      </body>
    </html>
  );
}
