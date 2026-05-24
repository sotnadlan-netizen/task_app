import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/providers/language-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Task Orchestrator",
  description:
    "Privacy-first, multi-tenant platform that transforms live audio into actionable tasks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark mode flash on page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        {/* Set language + direction before paint to avoid a flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('app-lang');if(l!=='he'&&l!=='en'){l='en'}document.documentElement.lang=l;document.documentElement.dir=(l==='he'?'rtl':'ltr')}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased text-gray-800`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
