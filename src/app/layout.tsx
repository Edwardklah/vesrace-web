import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MotionProvider } from "@/components/ui/motion-provider";
import "./globals.css";

/*
 * Fonts are self-hosted from npm packages (`geist`, `@fontsource-variable/archivo`)
 * so builds never depend on reaching Google Fonts, and pages load the font
 * from our own domain.
 */
// UI and body text.
const geist = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
});
// Order references, ticket codes.
const geistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  // Only ticket codes use it, so it isn't downloaded up front.
  preload: false,
});
// Display headings: heavy, narrowed, italic, to echo the Vesrace wordmark.
// These are trimmed copies of Archivo (from @fontsource-variable/archivo)
// that keep only the range we use: weight 800–850, width 82–90. That makes
// them about 60% smaller. To use other weights or widths, re-cut them from
// the full files (see README, "Fonts").
const archivo = localFont({
  src: [
    { path: "../fonts/archivo-display-normal.woff2", style: "normal", weight: "800 850" },
    { path: "../fonts/archivo-display-italic.woff2", style: "italic", weight: "800 850" },
  ],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: { default: "Vesrace", template: "%s · Vesrace" },
  description: "Find events across Ghana and get your tickets in seconds.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0e" },
  ],
};

/**
 * Runs before first paint:
 * 1. Applies the saved theme (or the system preference), so dark-mode users
 *    never see a white flash.
 * 2. Adds a `lite` class on devices that look low-powered (Chrome reports
 *    4 GB of RAM or less) or have Data Saver on. Expensive visual extras,
 *    like the frosted header, switch to plain versions. Browsers that don't
 *    report memory (e.g. Safari on iPhone) keep the full effects.
 *    CPU core count isn't used: some browsers cap it for privacy, which
 *    would wrongly flag fast devices.
 */
const themeScript = `(function(){var h=document.documentElement;try{var t=localStorage.getItem("vesrace-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;h.classList.toggle("dark",d)}catch(e){}try{var n=navigator,c=n.connection;if((n.deviceMemory&&n.deviceMemory<=4)||(c&&c.saveData))h.classList.add("lite")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-GH"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-bg text-fg">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
