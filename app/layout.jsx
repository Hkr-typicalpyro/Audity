import { Analytics } from '@vercel/analytics/next'
import Providers from "./providers";
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata = {
  title: 'Audity — Smart Auditorium Complex Management',
  description:
    'Audity is an operational platform for auditorium building complexes: event ticketing, automated hall rental, QR check-in and building administration.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport = {
  colorScheme: 'dark',
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} bg-background antialiased`}>
        <Providers>
        {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
