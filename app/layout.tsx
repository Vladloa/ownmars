import type { Metadata } from "next";
import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";
import { DataFast } from "@/components/DataFast";
import { Plausible } from "@/components/Plausible";
import { Providers } from "@/components/Providers";

const heading = Montserrat({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

const sans = Roboto({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"],
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
    <html lang="en" className="dark">
      <body className={`${heading.variable} ${sans.variable} relative antialiased`}>
        <div className="relative isolate flex min-h-svh flex-col">
          <Providers>
            <DataFast />
            <Plausible />
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
