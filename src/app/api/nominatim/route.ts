import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q')
    if (!q) return NextResponse.json({ error: 'Missing query' }, { status: 400 })

    // Use Photon by Komoot for better fuzzy searching instead of strict Nominatim
    const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`)

    if (!response.ok) {
      return NextResponse.json({ error: `Geocode error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    
    // Map Photon GeoJSON to format expected by frontend, returning top 5
    if (data.features && data.features.length > 0) {
       return NextResponse.json(data.features.map((f: any) => ({
          lat: String(f.geometry.coordinates[1]),
          lon: String(f.geometry.coordinates[0]),
          name: f.properties.name || q,
          city: f.properties.city || f.properties.state || '',
          country: f.properties.country || '',
          type: f.properties.osm_value || f.properties.osm_key || ''
       })))
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error('Geocode proxy error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
