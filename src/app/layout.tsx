import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Font Configuration
 * Using Next.js Font Optimization with Google Fonts
 * Following horizontal programming: fonts loaded once at root level
 */
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
    default: "AI Chatbot - Wager Wizard Pro",
    template: "%s | Wager Wizard Pro",
  },
  description:
    "AI-powered chatbot for intelligent betting analysis and financial insights. Get real-time odds, risk assessments, and data-driven predictions.",
  keywords: [
    "AI chatbot",
    "betting analysis",
    "sports analytics",
    "odds comparison",
    "risk assessment",
  ],
  authors: [{ name: "Wager Wizard Team" }],
  creator: "Wager Wizard Pro",
  publisher: "Wager Wizard Pro",
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
    title: "AI Chatbot - Wager Wizard Pro",
    description:
      "AI-powered chatbot for intelligent betting analysis and financial insights.",
    siteName: "Wager Wizard Pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Chatbot - Wager Wizard Pro",
    description:
      "AI-powered chatbot for intelligent betting analysis and financial insights.",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
