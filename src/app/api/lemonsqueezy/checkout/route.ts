import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { variantId } = await req.json()
    if (!variantId) {
      return NextResponse.json({ error: 'Falta variantId' }, { status: 400 })
    }

    if (!process.env.LEMON_SQUEEZY_API_KEY || !process.env.LEMON_SQUEEZY_STORE_ID) {
      return NextResponse.json({ error: 'Llaves de Lemon Squeezy no configuradas' }, { status: 500 })
    }

    lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY })

    const newCheckout = await createCheckout(process.env.LEMON_SQUEEZY_STORE_ID, variantId, {
      checkoutData: {
        custom: {
          user_id: String(session.id)
        }
      },
      testMode: process.env.NODE_ENV !== 'production'
    })

    return NextResponse.json({ url: newCheckout.data?.data.attributes.url })
  } catch (error: any) {
    console.error('Error creating checkout:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
