import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Tektur } from "next/font/google";
import "./globals.css";
import "./global-effects.css";
import { GlobalRouteLoader } from "@/components/layout/GlobalRouteLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const tektur = Tektur({
  variable: "--font-tektur",
  subsets: ["latin", "latin-ext"],
});

/* --- ДОБАВИТЬ ВОТ ЭТОТ БЛОК --- */
export const viewport: Viewport = {
  themeColor: "#0a0a0a", // Перенесли сюда из metadata
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Отключает возможность зумить пальцами
  // Полезно для игр:
  viewportFit: "cover", // Чтобы использовать "ушки" айфона
  interactiveWidget: "resizes-content", // Помогает корректно сдвигать контент при открытии клавиатуры
};

export const metadata: Metadata = {
  title: "Spyfall",
  description: "Spyfall game",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/duck-favicon.ico?v=2" },
      { url: "/duck-favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/duck-favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/duck-favicon.ico?v=2" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // themeColor удаляем отсюда, он теперь в viewport
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spyfall",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${tektur.variable} antialiased`}
      >
        {/* Хак для F5: пока React не гидрировался и лоадер недоступен,
            тело страницы остаётся однотонным (фон из :root).
            Видео/картинка появятся уже после монтирования приложения. */}
        <GlobalRouteLoader />
        {children}
      </body>
    </html>
  );
}