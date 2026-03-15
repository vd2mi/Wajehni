import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const ibmArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "وجهني — مساعد الدراسة الذكي",
  description: "مساعد دراسي ذكي للطلاب الناطقين بالعربية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={ibmArabic.variable}>
      <body className="font-arabic antialiased bg-background text-foreground min-h-screen">
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  );
}
