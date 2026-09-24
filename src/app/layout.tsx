import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: "#0b0d10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="apple-touch-icon" href="/app-icon.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
