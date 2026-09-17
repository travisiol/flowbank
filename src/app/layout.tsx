import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { LaunchProvider } from "@/components/launch-provider";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { WalletProvider } from "@/components/wallet-provider";
import { site } from "@/lib/site";

import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const fullTitle = `${site.name} — ${site.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: fullTitle,
  description: site.description,
  icons: {
    icon: [{ url: site.brandImage, type: "image/png" }],
    apple: site.brandImage,
  },
  openGraph: {
    title: fullTitle,
    siteName: site.name,
    images: [{ url: site.brandImage, width: site.brandImageWidth, height: site.brandImageHeight, alt: site.name }],
  },
  twitter: {
    card: "summary",
    site: site.xHandle,
    title: fullTitle,
    images: [site.brandImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <WalletProvider>
          <LaunchProvider>
            <SiteHeader />
            {children}
            <SiteFooter />
          </LaunchProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
