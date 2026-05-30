import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "唐诗画境",
  description: "面向家庭学习场景的唐诗学习应用骨架。",
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
