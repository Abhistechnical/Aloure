import "./globals.css";
import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { AnalysisProvider } from "./providers/analysis-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Alouré Atelier | Foundation Color Intelligence",
  description: "Luxury beauty-tech experiences that guide you from capture to couture formula.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="bg-[#F7F3EE] text-[#1E1B18] antialiased">
        <AnalysisProvider>{children}</AnalysisProvider>
      </body>
    </html>
  );
}
