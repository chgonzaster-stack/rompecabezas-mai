import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Mi Proyecto Next",
  description: "PWA con Next.js",
  // 👇 Ojo: ya NO pongas themeColor aquí
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

// 👇 AHORA el color del tema va aquí
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}