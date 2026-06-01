import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    await sql`DELETE FROM gps_logs`
    return NextResponse.json({ success: true, message: 'Deleted all gps_logs' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
