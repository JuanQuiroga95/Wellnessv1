import { NextRequest, NextResponse } from 'next/server'
import { getDb, SCHEMA_STATEMENTS } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    for (const stmt of SCHEMA_STATEMENTS) {
      await sql([stmt] as any)
    }
    return NextResponse.json({ success: true, message: 'Migrations executed' })
  } catch(e: any) {
    return NextResponse.json({ success: false, error: String(e) })
  }
}
