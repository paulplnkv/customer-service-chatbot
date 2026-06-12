import type { Metadata } from "next";
import { Geist_Mono, Inter_Tight, Instrument_Serif } from 'next/font/google';
import "./globals.css";

const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-sans' });

const instrumentSerif = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-serif',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "STARR — Starr Aviation Insurance",
  description: "AI underwriting assistant for STARR Aviation Insurance policyholders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${interTight.variable} ${instrumentSerif.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
