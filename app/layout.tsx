// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'CMM Kids',
  description: 'Juegos educativos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
