import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://socialdiscovery.app"),
  title: "Social Discovery Engine — Find Social Profiles at Scale",
  description:
    "Discover public social media profiles using Google footprints (dorks). Multi-platform search across Instagram, LinkedIn, X, Facebook, YouTube, and TikTok with real email validation (MX/DNS). Export leads to CSV.",
  keywords: [
    "social media leads",
    "google dorks",
    "email finder",
    "linkedin scraper",
    "instagram leads",
    "footprints",
    "osint",
    "lead generation",
    "email validation",
  ],
  authors: [{ name: "Social Discovery Engine" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Social Discovery Engine — Find Social Profiles at Scale",
    description:
      "Multi-platform lead discovery using Google footprints with real email validation. Free basic mode or API-powered.",
    url: "https://github.com/kmilo1978/socialdiscovery",
    siteName: "Social Discovery Engine",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Social Discovery Engine" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Social Discovery Engine",
    description: "Find social profiles at scale with Google footprints + real email validation.",
    images: ["/og-image.svg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
