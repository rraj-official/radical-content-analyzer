import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import Image from "next/image";
import "./globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnalysisProgressProvider } from "@/lib/contexts/AnalysisProgressContext";

const satoshi = localFont({
  src: "/fonts/Satoshi.ttf",
  variable: "--font-satoshi",
});

export const metadata: Metadata = {
  title: "Cachenova - Radical Content Analyzer",
  description: "Cachenova is a platform that analyzes content for radicalism and religious extremism.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${satoshi.className} font-sans w-full antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AnalysisProgressProvider>
              <div className="min-h-screen w-full flex flex-col relative bg-gradient-to-b from-background to-background/80">
                {/* Background pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
                
                {/* Header with subtle shadow and animation */}
                <header className="w-full flex justify-between items-center px-4 py-3 md:px-6 md:py-4 sticky top-0 z-10 backdrop-blur-sm bg-background/90 border-b border-border/40 transition-all duration-200">
                  <Link href="/" className="transition-transform hover:scale-105 duration-200">
                    {/* <Image
                      src="/images/logo.png"
                      alt="logo"
                      width={160}
                      height={32}
                      className="dark:hidden"
                      priority
                    /> */}
                    <span className="text-xl text-black dark:text-white">Powered by Cachenova</span>
                    {/* <Image
                      src="/images/logo-dark.png"
                      alt="dark-logo"
                      width={160}
                      height={32}
                      className="hidden dark:block"
                      priority
                    /> */}
                  </Link>
                  <div className="flex items-center">
                    <ModeToggle />
                  </div>
                </header>
                
                {/* Main content with improved spacing */}
                <main className="flex-1 flex flex-col items-center w-full mx-auto px-4 py-6 md:px-6 md:py-8">
                  <div className="w-full max-w-7xl">
                    {children}
                  </div>
                </main>
                
                {/* Footer with unified design */}
                <footer className="w-full py-4 border-t border-border/40 bg-background/90 backdrop-blur-sm">
                  <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-center items-center">
                    <div className="text-xs text-muted-foreground text-center">
                      © {new Date().getFullYear()} Cachenova. All rights reserved.
                    </div>
                  </div>
                </footer>
              </div>
            </AnalysisProgressProvider>
          </TooltipProvider>
        </ThemeProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
