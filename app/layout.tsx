import type { Metadata } from "next";
import { IBM_Plex_Mono, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "All In One | Daily Utility Toolkit",
    template: "%s | All In One",
  },
  description:
    "All In One is a utility toolkit for daily tasks: downloaders, converters, compressors, upscalers, and file helpers in one clean app.",
  keywords: [
    "all in one tools",
    "youtube downloader",
    "pdf converter",
    "image compressor",
    "video compressor",
    "utility toolkit",
  ],
  openGraph: {
    title: "All In One | Daily Utility Toolkit",
    description:
      "Use one toolkit for video, image, and document tasks. Fast workflows, clean UX, and a focused tool hub.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "All In One | Daily Utility Toolkit",
    description:
      "A clean all-in-one utility app for everyday conversion and download workflows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sora.variable} ${ibmPlexMono.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem("aio-theme");var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var theme=saved||(prefersDark?"dark":"light");document.documentElement.setAttribute("data-theme",theme);}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
