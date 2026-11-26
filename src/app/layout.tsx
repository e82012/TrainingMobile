import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";

// 只用在數字（重量、天數、課表名稱大字），中文仍走系統字型
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Training Mobile",
  description: "滾動式訓練計畫與 Google Sheets 雲端連動日誌",
  icons: {
    icon: "/app-icon.jpg",
    apple: "/app-icon.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c1119",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={barlow.variable}>
      <head>
        <link rel="apple-touch-icon" href="/app-icon.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
