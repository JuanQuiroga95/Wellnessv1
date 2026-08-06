import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-signature')
    
    // Verify Lemon Squeezy Webhook Signature
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || ''
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret)
      const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8')
      const signatureBuffer = Buffer.from(signature || '', 'utf8')
      if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    const eventName = payload.meta.event_name
    const obj = payload.data.attributes
    const customData = payload.meta.custom_data

    const sql = getDb()

    if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
      const lsCustomerId = obj.customer_id
      const lsSubscriptionId = payload.data.id
      const status = obj.status
      // For updated plans we might get the variant name or id. We can store it in plan_tier.
      
      const userId = customData?.user_id

      if (userId) {
        await sql`
          UPDATE usuarios 
          SET 
            ls_customer_id = ${lsCustomerId},
            ls_subscription_id = ${lsSubscriptionId},
            subscription_status = ${status}
          WHERE id = ${userId}
        `
      }
    } else if (eventName === 'subscription_expired' || eventName === 'subscription_cancelled') {
      const lsSubscriptionId = payload.data.id
      await sql`
        UPDATE usuarios 
        SET subscription_status = 'canceled'
        WHERE ls_subscription_id = ${lsSubscriptionId}
      `
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
