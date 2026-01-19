import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import HeroImage from "@/components/HeroImage";
import NavBackground from "@/components/NavBackground";

export const metadata: Metadata = {
  title: "Dylan Selden",
  description: "Designer Portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased overflow-x-hidden">
        <NavBackground />
        <Navigation />
        <HeroImage />
        {children}
      </body>
    </html>
  );
}
