import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Yhteystieto-raaputtaja',
  description: 'Raaputa yhteystietoja suomalaisilta yrityssivuilta automaattisesti',
  keywords: 'yhteystiedot, raaputus, yritykset, puhelinnumerot, sähköpostit',
  authors: [{ name: 'Yhteystieto-raaputtaja' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fi">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
