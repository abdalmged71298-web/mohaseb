import type { Metadata } from "next";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "بوابة دليل الطالب قسم المحاسبة | منصة أكاديمية ذكية",
  description:
    "منصة أكاديمية ذكية لطلبة قسم المحاسبة - كلية إدارة الأعمال. مكتبة تعليمية منظمة، مساعد ذكي، أدوات دراسية، ملاحظات، اختبارات تفاعلية والمزيد.",
  keywords: [
    "محاسبة",
    "بوابة الطالب",
    "منصة تعليمية",
    "كلية إدارة الأعمال",
    "جامعة العلوم والتكنولوجيا",
    "مكتبة أكاديمية",
    "مساعد ذكي",
  ],
  authors: [{ name: "عبدالمجيد المنيعي" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "بوابة دليل الطالب قسم المحاسبة",
    description: "منصة أكاديمية ذكية لطلبة قسم المحاسبة",
    type: "website",
    locale: "ar_SA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${amiri.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
