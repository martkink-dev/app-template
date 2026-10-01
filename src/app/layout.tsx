import type { Metadata } from "next";
import { Roboto_Flex, Roboto_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";

import "./globals.css";

// Material Design 3 uses Roboto. Roboto Flex is its variable version, so a
// single file covers every weight. To change the font, swap these imports
// and keep the variable names (globals.css maps them to font-sans and
// font-mono).
const appSans = Roboto_Flex({
  variable: "--font-app-sans",
  subsets: ["latin", "latin-ext"],
});

const appMono = Roboto_Mono({
  variable: "--font-app-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html>
    // before React hydrates, which would otherwise log a warning.
    <html
      lang={siteConfig.locale}
      suppressHydrationWarning
      className={`${appSans.variable} ${appMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
