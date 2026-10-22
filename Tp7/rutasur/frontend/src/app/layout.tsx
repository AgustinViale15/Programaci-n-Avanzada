import './globals.css';

export const metadata = {
  title: 'RutaSur - Torre de Control',
  description: 'Seguimiento de envíos en tiempo real orientada a eventos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
