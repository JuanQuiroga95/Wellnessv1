import type { Metadata } from 'next'
import './globals.css'
// build: 20260319-1150
export const metadata: Metadata = { title: 'W&P — Wellness & Performance', description: 'Control de carga deportiva' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
