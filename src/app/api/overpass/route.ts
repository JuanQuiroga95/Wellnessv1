import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text()
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WellnessApp/1.0'
      },
      body: bodyText,
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Overpass API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Overpass proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
