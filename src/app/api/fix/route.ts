export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    const { schema } = await import('@/lib/db')
    let results = []
    for (const q of schema) {
      try {
        await sql(q)
        results.push('OK')
      } catch (e: any) {
        results.push('Error: ' + e.message)
      }
    }
    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
