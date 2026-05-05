import { Cormorant_Garamond, Outfit } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Liberty Art Exposition Paris 2026 — Vernissage 19 & 20 Juin',
  description:
    'Réservez votre invitation pour deux personnes au vernissage Liberty Art Paris 2026 — exposition collective d\'art contemporain à la Galerie Joseph, 17 Rue Chapon, Paris.',
}

export default function VernissageLayout({ children }) {
  return (
    <div className={`${cormorant.variable} ${outfit.variable}`}>
      {children}
    </div>
  )
}
