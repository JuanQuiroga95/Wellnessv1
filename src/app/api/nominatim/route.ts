import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')
    if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

    // Use Photon by Komoot for better fuzzy searching instead of strict Nominatim
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`)

    if (!response.ok) {
      return NextResponse.json({ error: `Geocode error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    
    // Map Photon GeoJSON to Nominatim format expected by frontend
    if (data.features && data.features.length > 0) {
       const coords = data.features[0].geometry.coordinates // [lon, lat]
       return NextResponse.json([{
          lat: String(coords[1]),
          lon: String(coords[0])
       }])
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error('Geocode proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
