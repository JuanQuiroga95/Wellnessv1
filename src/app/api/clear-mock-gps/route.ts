export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const sql = getDb()
    await sql`DELETE FROM gps_logs`
    return NextResponse.json({ success: true, message: 'Deleted all gps_logs' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
