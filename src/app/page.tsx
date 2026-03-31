import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function RootPage() {
  const session = await getSession()
  if (session?.rol === 'admin' || session?.rol === 'master_admin') redirect('/coach')
  if (session?.rol === 'jugador') redirect('/player')
  // Not logged in → render landing inline via iframe
  return (
    <html style={{ margin: 0, padding: 0, height: '100%' }}>
      <body style={{ margin: 0, padding: 0, height: '100%' }}>
        <iframe
          src="/landing.html"
          style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
          title="W&P Wellness & Performance"
        />
      </body>
    </html>
  )
}
