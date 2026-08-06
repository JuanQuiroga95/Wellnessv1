import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { lemonSqueezySetup, getCustomer } from '@lemonsqueezy/lemonsqueezy.js'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!process.env.LEMON_SQUEEZY_API_KEY) {
      return NextResponse.json({ error: 'Llaves de Lemon Squeezy no configuradas' }, { status: 500 })
    }

    const sql = getDb()
    const users = await sql`SELECT ls_customer_id FROM usuarios WHERE id = ${session.id}`
    const customerId = users[0]?.ls_customer_id

    if (!customerId) {
      return NextResponse.json({ error: 'No tienes una suscripción activa' }, { status: 404 })
    }

    lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY })

    const customer = await getCustomer(customerId)
    const portalUrl = customer.data?.data.attributes.urls.customer_portal

    if (!portalUrl) {
      return NextResponse.json({ error: 'No se pudo generar el portal' }, { status: 500 })
    }

    return NextResponse.json({ url: portalUrl })
  } catch (error: any) {
    console.error('Error getting portal:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
