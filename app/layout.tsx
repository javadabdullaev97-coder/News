import type { Metadata } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileStickyAd } from "@/components/AdSlot";
import { SearchProvider } from "@/components/SearchModal";
import { ToastProvider } from "@/components/Toast";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

const siteUrl = "https://leap.uz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LEAP — Новости, которые опережают",
    template: "%s — LEAP",
  },
  description:
    "LEAP News — современное медиа Узбекистана. Политика, экономика, бизнес, технологии, культура и спорт.",
  openGraph: {
    type: "website",
    siteName: "LEAP",
    locale: "ru_RU",
    url: siteUrl,
  },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

const themeScript = `
(function() {
  try {
    var s = localStorage.getItem('theme');
    var d = s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (d) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${manrope.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="alternate" type="application/rss+xml" title="LEAP — RSS" href="/rss.xml" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ToastProvider>
          <SearchProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <MobileStickyAd />
          </SearchProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
