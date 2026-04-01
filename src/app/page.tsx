import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function RootPage() {
  const session = await getSession()
  if (session?.rol === 'admin' || session?.rol === 'master_admin') redirect('/coach')
  if (session?.rol === 'jugador') redirect('/player')
  // No session → mostrar landing
  redirect('/landing.html')
}
