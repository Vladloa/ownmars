import type { Metadata } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { DataFast } from "@/components/DataFast";
import { Plausible } from "@/components/Plausible";
import { Providers } from "@/components/Providers";
import { WhopPixel } from "@/components/WhopPixel";

const sans = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "OwnMars.lol — Colonize Mars for $1",
  description:
    "50 Martian territories. Pay $1 more than the current owner and your name goes on the map.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark overflow-hidden overscroll-none">
      <body className={`${sans.variable} relative h-svh overflow-hidden overscroll-none antialiased`}>
        <div className="relative isolate flex h-svh min-h-0 flex-col overflow-hidden">
          <Providers>
            <WhopPixel />
            <DataFast />
            <Plausible />
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
