import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Discovery Engine",
  description: "Discover social profiles at scale",
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
