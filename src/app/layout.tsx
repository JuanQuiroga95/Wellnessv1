import type { Metadata, Viewport } from 'next'
import './globals.css'
// build: 20260719-pwa-fix
export const metadata: Metadata = { 
  title: 'W&P — Wellness & Performance',
  description: 'Control de carga deportiva',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'W&P',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}
export const viewport: Viewport = {
  themeColor: '#c8f135',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
                    .then(function(reg) {
                      console.log('[SW] Registered:', reg.scope)
                      // Check for updates periodically
                      reg.update()
                      setInterval(function() { reg.update() }, 60 * 60 * 1000)
                    })
                    .catch(function(err) { console.log('[SW] Registration failed:', err) })
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
