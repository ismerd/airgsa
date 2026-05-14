import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import { NavigationLoadingIndicator } from "@/components/dashboard/navigation-loading-indicator";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "AirGSA | Aviation cargo partnerships",
  description: "A B2B platform connecting airlines and air cargo GSA partners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}` }} />
      </head>
      <body className="min-h-full bg-page text-ink">
        <NavigationLoadingIndicator />
        {children}
      </body>
    </html>
  );
}
