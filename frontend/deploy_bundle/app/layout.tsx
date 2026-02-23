import "./globals.css";
import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Alouré | Precision Color Intelligence",
  description:
    "Alouré blends luxury cosmetics with color science to craft bespoke foundation pigment ratios and premium experiences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-ivory text-matteCharcoal antialiased">
        {children}
      </body>
    </html>
  );
}
