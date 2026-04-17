import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YouTube Media Hub | The Cinematic Utility",
  description: "Advanced YouTube video/audio downloader and playlist manager.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.variable} ${manrope.variable} font-body bg-background text-foreground min-h-full antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
