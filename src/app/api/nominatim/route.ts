import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')
    if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
      headers: {
        'User-Agent': 'WellnessApp/1.0'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Nominatim error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Nominatim proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
