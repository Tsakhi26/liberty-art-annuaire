'use client'
import "./globals.css";
import Header from "@/components/Header";
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isIframePage = pathname === '/iframe';
  const isArtistPage = pathname?.startsWith('/artist/');
  const isVernissagePage = pathname?.startsWith('/vernissage') || pathname?.startsWith('/vernisage');

  return (
    <html lang="fr">
      <body>
        {!isIframePage && !isArtistPage && !isVernissagePage && <Header />}
        {children}
      </body>
    </html>
  );
}
