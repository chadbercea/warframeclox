import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";
import { ToastProvider } from "@/contexts/toast-context";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const ailerons = localFont({
  src: "./fonts/ailerons.ttf",
  variable: "--font-ailerons",
  weight: "400",
});

const notoSans = localFont({
  src: [
    {
      path: "./fonts/noto-sans.regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/noto-sans.bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-noto-sans",
});

const flareserif = localFont({
  src: "./fonts/flareserif-821-bold.otf",
  variable: "--font-flareserif",
  weight: "700",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Warframe Clox - Cetus Day/Night Cycle Tracker",
  description: "Real-time Cetus day/night cycle tracker for Warframe. Get notifications for cycle transitions on the Plains of Eidolon.",
  keywords: ["warframe", "cetus", "plains of eidolon", "day night cycle", "eidolon", "tracker", "timer"],
  authors: [{ name: "Warframe Clox" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Warframe Clox",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://warframeclox.com",
    title: "Warframe Clox - Cetus Day/Night Cycle Tracker",
    description: "Real-time Cetus day/night cycle tracker for Warframe. Get notifications for cycle transitions on the Plains of Eidolon.",
    siteName: "Warframe Clox",
  },
  twitter: {
    card: "summary_large_image",
    title: "Warframe Clox - Cetus Day/Night Cycle Tracker",
    description: "Real-time Cetus day/night cycle tracker for Warframe. Get notifications for cycle transitions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ overflow: 'hidden', height: '100%', touchAction: 'none', background: '#000000' }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ailerons.variable} ${notoSans.variable} ${flareserif.variable} antialiased`}
        suppressHydrationWarning
        style={{ overflow: 'hidden', position: 'fixed', inset: 0, touchAction: 'none', background: '#000000' }}
      >
        <ServiceWorkerProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
