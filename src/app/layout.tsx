import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "600", "800"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "CompX | Find Verified Business Leads in Seconds",
  description: "CompX is an advanced browser extension and SaaS tool that helps you instantly extract business leads from websites, Google Maps, LinkedIn, and social media platforms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
