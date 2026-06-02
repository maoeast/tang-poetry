import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "唐诗画境",
  description: "每天一首唐诗，配以诗境插画和 AI 讲解，全家一起感受诗意之美。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body>{children}</body>
    </html>
  );
}
