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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "All In One | Daily Utility Toolkit",
    template: "%s | All In One",
  },
  description:
    "All In One is a utility toolkit for image and PDF tasks: compression, HEIC conversion, merge/split, images to PDF, and page reordering.",
  keywords: [
    "all in one tools",
    "image compressor",
    "heic to jpg",
    "heic to png",
    "pdf merge split",
    "images to pdf",
    "pdf rotate reorder",
    "pdf converter",
    "utility toolkit",
  ],
  openGraph: {
    title: "All In One | Daily Utility Toolkit",
    description:
      "Use one toolkit for image and PDF tasks. Fast workflows, clean UX, and a focused Phase 1 hub.",
    type: "website",
    images: [{ url: "/allinone-logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "All In One | Daily Utility Toolkit",
    description:
      "A clean all-in-one utility app for everyday image and PDF workflows.",
    images: ["/allinone-logo.png"],
  },
  icons: {
    icon: [
      { url: "/allinone-logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/allinone-logo.png",
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
