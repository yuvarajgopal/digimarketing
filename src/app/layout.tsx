import type { Metadata } from "next";
import { Inter, DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

/* Inter — clean geometric body */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

/* DM Sans — geometric heading font */
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
});

/* Plus Jakarta Sans — marketing site display font */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "DigiCampaign - AI Creative Platform",
  description: "AI-powered digital campaign creative platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${dmSans.variable} ${plusJakartaSans.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
