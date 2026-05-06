'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ── Haversine helpers ─────────────────────────────────────────────
function haversine(lat1:number,lon1:number,lat2:number,lon2:number){
  const R=6371000,r=Math.PI/180
  const dLat=(lat2-lat1)*r,dLon=(lon2-lon1)*r
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
function polyArea(coords:{lat:number,lon:number}[]){
  const R=6371000,r=Math.PI/180
  let area=0
  for(let i=0;i<coords.length;i++){
    const j=(i+1)%coords.length
    area+=(coords[j].lon-coords[i].lon)*r*(2+Math.sin(coords[i].lat*r)+Math.sin(coords[j].lat*r))
  }
  return Math.abs(area*R*R/2)
}
function calcDimensions(nodes:{lat:number,lon:number}[]){
  if(nodes.length<4) return null
  const area=Math.round(polyArea(nodes)*10)/10
  const dists:number[]=[]
  for(let i=0;i<nodes.length-1;i++) dists.push(haversine(nodes[i].lat,nodes[i].lon,nodes[i+1].lat,nodes[i+1].lon))
  const maxSeg=Math.max(...dists)
  if(maxSeg<1) return null
  const largo=Math.round(maxSeg*10)/10
  const ancho=Math.round((area/maxSeg)*10)/10
  return{largo,ancho,area}
}
function classifyPitch(l:number,a:number){if(l>=90&&a>=45)return'F11';if(l>=65&&a>=40)return'F9';if(l>=45&&a>=25)return'F7';return'F5'}

interface Pitch{id:string;name:string;lat:number;lon:number;largo?:number;ancho?:number;area?:number;tipo?:string;nodes?:{lat:number,lon:number}[];address?:string}
interface SavedPitch{id:number;nombre:string;direccion:string;lat:string;lng:string;largo_m:string;ancho_m:string;area_m2:string;tipo_cancha:string;superficie:string;notas:string}

declare const L:any

export default function CanchasPanel(){
  const mapRef=useRef<HTMLDivElement>(null)
  const mapInst=useRef<any>(null)
  const markersRef=useRef<any[]>([])
  const measureLayerRef=useRef<any>(null)
  const [loaded,setLoaded]=useState(false)
  const [query,setQuery]=useState('')
  const [locationResults, setLocationResults]=useState<any[]>([])
  const [pitches,setPitches]=useState<Pitch[]>([])
  const [selected,setSelected]=useState<Pitch|null>(null)
  const [saved,setSaved]=useState<SavedPitch[]>([])
  const [loading,setLoading]=useState(false)
  const [measuring,setMeasuring]=useState(false)
  const [measurePts,setMeasurePts]=useState<{lat:number,lng:number}[]>([])
  const [measureResult,setMeasureResult]=useState<{largo:number,ancho:number,area:number}|null>(null)
  const [saveForm,setSaveForm]=useState<{nombre:string,superficie:string,notas:string,largo:number,ancho:number,area:number,tipo:string}>({nombre:'',superficie:'natural',notas:'',largo:0,ancho:0,area:0,tipo:''})
  const [saving,setSaving]=useState(false)
  const [saveError,setSaveError]=useState<string|null>(null)
  const [tab,setTab]=useState<'buscar'|'guardadas'>('buscar')

  const selectPitch = (p: Pitch | null) => {
    setSelected(p)
    if (p) {
      setSaveForm(f => ({
        ...f,
        nombre: p.name || '',
        largo: p.largo || 0,
        ancho: p.ancho || 0,
        area: p.area || 0,
        tipo: p.tipo || classifyPitch(p.largo || 0, p.ancho || 0)
      }))
    }
  }

  const updateDim = (field: 'largo' | 'ancho' | 'area', val: number) => {
    setSaveForm(f => {
      const next = { ...f, [field]: val }
      if (field === 'largo' || field === 'ancho') {
        next.area = Math.round(next.largo * next.ancho * 10) / 10
        next.tipo = classifyPitch(next.largo, next.ancho)
      }
      return next
    })
  }

  // Load Leaflet CSS + JS
  useEffect(()=>{
    if(typeof window==='undefined')return
    if(document.getElementById('leaflet-css'))return setLoaded(true)
    const css=document.createElement('link');css.id='leaflet-css';css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css)
    const js=document.createElement('script');js.id='leaflet-js';js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    js.onload=()=>setLoaded(true);document.head.appendChild(js)
  },[])

  // Init map
  useEffect(()=>{
    if(!loaded||!mapRef.current||mapInst.current)return
    const map=L.map(mapRef.current,{zoomControl:true}).setView([-34.6037,-58.3816],13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map)
    mapInst.current=map
    // Try geolocation
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(p=>{map.setView([p.coords.latitude,p.coords.longitude],14)},()=>{},{timeout:5000})
    }
    return ()=>{map.remove();mapInst.current=null}
  },[loaded])

  // Load saved
  useEffect(()=>{fetch('/api/canchas').then(r=>r.json()).then(d=>Array.isArray(d)?setSaved(d):setSaved([])).catch(()=>{})},[])

  // Search location via Geocoder
  const searchLocation=useCallback(async()=>{
    if(!query.trim()||!mapInst.current)return
    setLoading(true)
    setLocationResults([])
    try{
      const r=await fetch(`/api/nominatim?q=${encodeURIComponent(query)}`)
      const d=await r.json()
      if(d.length>0){
        // Si hay un solo resultado, viaja directo. Si hay más, muestra opciones para elegir.
        if (d.length === 1) {
          mapInst.current.setView([Number(d[0].lat),Number(d[0].lon)],15)
          await loadPitches()
        } else {
          setLocationResults(d)
        }
      } else {
        alert('No se encontraron resultados')
      }
    }catch{}
    setLoading(false)
  },[query])

  const selectLocation = async (loc: any) => {
    setLocationResults([])
    if (mapInst.current) {
      mapInst.current.setView([Number(loc.lat),Number(loc.lon)],15)
      await loadPitches()
    }
  }

  // Load pitches from Overpass
  const loadPitches=useCallback(async()=>{
    if(!mapInst.current)return
    setLoading(true)
    const b=mapInst.current.getBounds()
    const bbox=`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
    const q=`[out:json][timeout:15];(nwr["leisure"="stadium"](${bbox});nwr["leisure"="pitch"]["sport"~"soccer|football|futbol"](${bbox}););out geom;`
    try{
      const r=await fetch('/api/overpass',{method:'POST',body:'data='+encodeURIComponent(q)})
      const d=await r.json()
      const results:Pitch[]=[]
      for(const el of d.elements||[]){
        let lat=el.lat,lon=el.lon,nodes:any[]=[]
        if(el.type==='way'&&el.geometry){
          nodes=el.geometry.map((g:any)=>({lat:g.lat,lon:g.lon}))
          lat=nodes.reduce((s:number,n:any)=>s+n.lat,0)/nodes.length
          lon=nodes.reduce((s:number,n:any)=>s+n.lon,0)/nodes.length
        }else if(el.type==='relation'&&el.members){
          const m=el.members.find((mm:any)=>mm.type==='way'&&mm.geometry)
          if(m){nodes=m.geometry.map((g:any)=>({lat:g.lat,lon:g.lon}));lat=nodes.reduce((s:number,n:any)=>s+n.lat,0)/nodes.length;lon=nodes.reduce((s:number,n:any)=>s+n.lon,0)/nodes.length}
        }
        if(!lat||!lon)continue
        const dim=nodes.length>=4?calcDimensions(nodes):null
        const isStadium = el.tags?.leisure === 'stadium'
        const hasFootball = el.tags?.sport?.match(/soccer|football|futbol/i)
        
        // Filtro: Si es estadio, lo mostramos. Si es pitch, exigimos que tenga medidas mínimas (>= 30m para evitar objetos pequeños)
        if (!isStadium) {
           if (!dim || dim.largo < 30) continue;
        }
        
        results.push({
          id:`${el.type}_${el.id}`,
          name:el.tags?.name || (isStadium ? 'Estadio sin nombre' : 'Cancha sin nombre'),
          lat,lon,nodes,
          largo:undefined,ancho:undefined,area:undefined,
          tipo: isStadium ? 'Estadio' : 'Fútbol 11'
        })
      }
      setPitches(results)
      // Add markers
      markersRef.current.forEach(m=>mapInst.current?.removeLayer(m))
      markersRef.current=[]
      const icon=L.divIcon({className:'',html:`<div style="width:28px;height:28px;background:#c8f135;border:2px solid #080808;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.4)">⚽</div>`,iconSize:[28,28],iconAnchor:[14,14]})
      for(const p of results){
        const m=L.marker([p.lat,p.lon],{icon}).addTo(mapInst.current)
        m.on('click',()=>selectPitch(p))
        markersRef.current.push(m)
      }
    }catch(e){console.error('Overpass error',e)}
    setLoading(false)
  },[])

  // Measure mode click handler
  useEffect(()=>{
    if(!mapInst.current||!measuring)return
    const map=mapInst.current
    map.getContainer().style.cursor='crosshair'
    const onClick=(e:any)=>{
      setMeasurePts(prev=>{
        const pts=[...prev,{lat:e.latlng.lat,lng:e.latlng.lng}]
        if (pts.length < 4) {
          if(measureLayerRef.current)map.removeLayer(measureLayerRef.current)
          measureLayerRef.current=L.polyline(pts,{color:'#c8f135',weight:2,dashArray:'6 4'}).addTo(map)
        } else {
          if(measureLayerRef.current)map.removeLayer(measureLayerRef.current)
          measureLayerRef.current=L.polygon(pts,{color:'#c8f135',weight:2,fillOpacity:0.15,dashArray:'6 4'}).addTo(map)
          
          const d12=haversine(pts[0].lat,pts[0].lng,pts[1].lat,pts[1].lng)
          const d23=haversine(pts[1].lat,pts[1].lng,pts[2].lat,pts[2].lng)
          const d34=haversine(pts[2].lat,pts[2].lng,pts[3].lat,pts[3].lng)
          const d41=haversine(pts[3].lat,pts[3].lng,pts[0].lat,pts[0].lng)
          const d13=haversine(pts[0].lat,pts[0].lng,pts[2].lat,pts[2].lng)
          const d24=haversine(pts[1].lat,pts[1].lng,pts[3].lat,pts[3].lng)
          const allDists=[d12,d23,d34,d41,d13,d24].sort((a,b)=>b-a)
          const largo=Math.round(((allDists[2]+allDists[3])/2)*10)/10
          const ancho=Math.round(((allDists[4]+allDists[5])/2)*10)/10
          const area=Math.round(polyArea(pts.map(p=>({lat:p.lat,lon:p.lng})))*10)/10
          
          setMeasureResult({largo,ancho,area})
          setMeasuring(false)
          map.getContainer().style.cursor=''
          map.off('click',onClick)
        }
        return pts
      })
    }
    map.on('click',onClick)
    return()=>{map.off('click',onClick);map.getContainer().style.cursor=''}
  },[measuring])

  const startMeasure=()=>{
    if(measureLayerRef.current&&mapInst.current){mapInst.current.removeLayer(measureLayerRef.current);measureLayerRef.current=null}
    setMeasurePts([]);setMeasureResult(null);setMeasuring(true)
  }

  const handleSaveManual = () => {
    if (!measureResult || measurePts.length === 0) return
    // Calculate center point for the manual measurement
    const lat = measurePts.reduce((s, p) => s + p.lat, 0) / measurePts.length
    const lon = measurePts.reduce((s, p) => s + p.lng, 0) / measurePts.length
    
    const newPitch: Pitch = {
      id: `manual_${Date.now()}`,
      name: 'Nueva cancha manual',
      lat,
      lon,
      largo: measureResult.largo,
      ancho: measureResult.ancho,
      area: measureResult.area,
      tipo: classifyPitch(measureResult.largo, measureResult.ancho),
      nodes: measurePts.map(p => ({ lat: p.lat, lon: p.lng }))
    }
    selectPitch(newPitch)
  }

  const savePitch=async(p:Pitch)=>{
    setSaving(true)
    setSaveError(null)
    try{
      const isOsm = p.id.includes('_') && !p.id.startsWith('manual')
      const osmId = isOsm ? Number(p.id.split('_')[1]) : null

      const r=await fetch('/api/canchas',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          nombre:saveForm.nombre||p.name,
          direccion:p.address||'',
          lat:p.lat,
          lng:p.lon,
          largo_m:saveForm.largo,
          ancho_m:saveForm.ancho,
          area_m2:saveForm.area,
          tipo_cancha:saveForm.tipo,
          superficie:saveForm.superficie,
          notas:saveForm.notas,
          osm_id: osmId
        })
      })
      const d=await r.json()
      if(d.id){
        setSaved(prev=>[d,...prev])
        setSaveForm({nombre:'',superficie:'natural',notas:'',largo:0,ancho:0,area:0,tipo:''})
        setSelected(null)
        setMeasureResult(null)
        if(measureLayerRef.current && mapInst.current) {
          mapInst.current.removeLayer(measureLayerRef.current)
          measureLayerRef.current = null
        }
        alert('Cancha guardada con éxito')
      }else{
        setSaveError(d.error||'Error al guardar la cancha')
      }
    }catch(err: any){
      setSaveError('Error de conexión: ' + err.message)
    }
    setSaving(false)
  }

  const deleteSaved=async(id:number)=>{
    await fetch(`/api/canchas?id=${id}`,{method:'DELETE'})
    setSaved(prev=>prev.filter(s=>s.id!==id))
  }

  const goToSaved=(s:SavedPitch)=>{
    if(mapInst.current&&s.lat&&s.lng){mapInst.current.setView([Number(s.lat),Number(s.lng)],17);setTab('buscar')}
  }

  const C={card:{background:'var(--ink2)',border:'1px solid var(--mist)',borderRadius:16,padding:20} as any,
    input:{width:'100%',background:'var(--ink3)',border:'1px solid var(--fog)',borderRadius:10,padding:'10px 14px',fontSize:14,color:'var(--snow)',outline:'none'} as any,
    btn:{background:'var(--lime)',color:'var(--ink)',border:'none',borderRadius:10,padding:'10px 18px',fontWeight:700,fontSize:13,cursor:'pointer'} as any,
    btnGhost:{background:'transparent',color:'var(--silver)',border:'1px solid var(--fog)',borderRadius:10,padding:'10px 14px',fontSize:13,cursor:'pointer'} as any}

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div className="anim-up" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <h2 className="display" style={{fontSize:48,color:'var(--snow)'}}>ESTADIOS</h2>
          <p style={{fontSize:12,color:'var(--silver)',marginTop:2}}>Buscador de estadios · Medidas y dimensiones</p>
        </div>
        <div style={{display:'flex',gap:6}}>
          {(['buscar','guardadas'] as const).map(t=>(
            <button key={t} onClick={()=>{
              setTab(t);
              if(t==='buscar' && mapInst.current){
                setTimeout(()=>mapInst.current.invalidateSize(), 100);
              }
            }} style={{...C.btnGhost,background:tab===t?'rgba(200,241,53,.1)':'transparent',color:tab===t?'var(--lime)':'var(--silver)',borderColor:tab===t?'rgba(200,241,53,.3)':'var(--fog)',fontWeight:tab===t?700:500}}>
              {t==='buscar'?'🗺️ Buscar':'⭐ Guardadas'} {t==='guardadas'&&saved.length>0&&`(${saved.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Persistent Map and Search controls (visible only in 'buscar' tab) */}
      <div style={{display: tab==='buscar'?'flex':'none', flexDirection:'column', gap:16}}>
        {/* Search bar */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <div style={{flex:1,minWidth:200,position:'relative'}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')searchLocation()}} placeholder="Buscar dirección, ciudad o barrio..." style={C.input}/>
          </div>
          <button onClick={searchLocation} disabled={loading} style={{...C.btn,opacity:loading?0.5:1}}>
            {loading?'Buscando...':'🔍 Buscar'}
          </button>
          <button onClick={()=>{
            if(navigator.geolocation && mapInst.current){
              navigator.geolocation.getCurrentPosition(
                p=>{
                  mapInst.current.setView([p.coords.latitude,p.coords.longitude],15);
                  setTimeout(loadPitches,500)
                },
                err => {
                  console.error('Error de geolocalización:', err);
                  let msg = 'No se pudo obtener tu ubicación.';
                  if (err.code === 1) msg = 'Permiso de ubicación denegado.';
                  else if (err.code === 3) msg = 'Tiempo de espera agotado.';
                  alert(msg);
                },
                { timeout: 10000, enableHighAccuracy: true }
              )
            } else {
              alert('La geolocalización no está disponible en este navegador o el mapa no está listo.')
            }
          }} style={C.btnGhost} title="Mi ubicación">
            📍
          </button>
          <button onClick={loadPitches} disabled={loading} style={C.btnGhost} title="Buscar estadios en esta zona">
            ⚽ Buscar estadios aquí
          </button>
          <button onClick={startMeasure} style={{...C.btnGhost,color:measuring?'var(--lime)':'var(--silver)',borderColor:measuring?'var(--lime)':'var(--fog)'}} title="Medir cancha manualmente">
            📏 {measuring?'Click 4 esquinas...':'Medir'}
          </button>
        </div>

        {/* Location Results Dropdown */}
        {locationResults.length > 0 && (
          <div style={{...C.card, padding:12, background:'var(--ink)', border:'1px solid var(--lime)'}}>
            <p style={{fontSize:11,fontWeight:700,color:'var(--lime)',textTransform:'uppercase',marginBottom:8}}>Resultados (Elegí uno)</p>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {locationResults.map((loc, i) => (
                <button key={i} onClick={() => selectLocation(loc)} style={{...C.btnGhost, textAlign:'left', border:'none', background:'var(--ink3)', display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontWeight:600, color:'var(--snow)'}}>{loc.name}</span>
                  <span style={{fontSize:11, color:'var(--silver)'}}>{loc.type} · {loc.city}{loc.city && loc.country ? ', ' : ''}{loc.country}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Map Container (Always in DOM) */}
        <div style={{...C.card,padding:0,overflow:'hidden',position:'relative'}}>
          <div ref={mapRef} style={{width:'100%',height:480,background:'var(--ink3)'}}/>
          {loading&&<div style={{position:'absolute',top:10,left:'50%',transform:'translateX(-50%)',background:'rgba(8,8,8,.9)',border:'1px solid var(--lime)',borderRadius:10,padding:'8px 20px',fontSize:12,color:'var(--lime)',fontWeight:600,zIndex:1000}}>⏳ Buscando estadios...</div>}
        </div>

        {/* Measure result */}
        {measureResult&&(
          <div style={{...C.card,background:'rgba(200,241,53,.06)',border:'1px solid rgba(200,241,53,.2)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
              <div>
                <p style={{fontSize:11,fontWeight:700,color:'var(--lime)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>📏 Medición Manual</p>
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  <div><span style={{fontSize:28,fontWeight:900,color:'var(--snow)',fontFamily:'Bebas Neue,sans-serif'}}>{measureResult.largo}</span><span style={{fontSize:12,color:'var(--silver)',marginLeft:4}}>m largo</span></div>
                  <div><span style={{fontSize:28,fontWeight:900,color:'var(--snow)',fontFamily:'Bebas Neue,sans-serif'}}>{measureResult.ancho}</span><span style={{fontSize:12,color:'var(--silver)',marginLeft:4}}>m ancho</span></div>
                  <div><span style={{fontSize:28,fontWeight:900,color:'var(--lime)',fontFamily:'Bebas Neue,sans-serif'}}>{measureResult.area}</span><span style={{fontSize:12,color:'var(--silver)',marginLeft:4}}>m²</span></div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:11,padding:'4px 12px',borderRadius:20,background:'rgba(200,241,53,.15)',color:'var(--lime)',border:'1px solid rgba(200,241,53,.3)',fontWeight:700}}>{classifyPitch(measureResult.largo,measureResult.ancho)}</span>
                  </div>
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={handleSaveManual} style={{...C.btn, padding:'8px 16px'}}>⭐ Guardar medición</button>
                <button onClick={startMeasure} style={C.btnGhost}>📏 Medir otra</button>
              </div>
            </div>
          </div>
        )}

        {/* Found pitches */}
        {pitches.length>0&&(
          <div style={C.card}>
            <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>⚽ {pitches.length} canchas encontradas</p>
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:300,overflowY:'auto'}}>
              {pitches.map(p=>(
                <button key={p.id} onClick={()=>{
                  selectPitch(p);
                  if(mapInst.current)mapInst.current.setView([p.lat,p.lon],17)
                }} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'12px 16px',background:selected?.id===p.id?'rgba(200,241,53,.08)':'transparent',border:selected?.id===p.id?'1px solid rgba(200,241,53,.2)':'1px solid var(--mist)',borderRadius:12,cursor:'pointer',textAlign:'left',transition:'all .12s'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:'var(--snow)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    {p.largo&&p.ancho&&<div style={{fontSize:12,color:'var(--silver)',marginTop:2}}>{p.largo}m × {p.ancho}m · {p.area}m²</div>}
                  </div>
                  {p.tipo&&<span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(200,241,53,.1)',color:'var(--lime)',border:'1px solid rgba(200,241,53,.2)',fontWeight:700,flexShrink:0}}>{p.tipo}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected pitch detail + save */}
        {selected&&(
          <div style={{...C.card,border:'1px solid rgba(200,241,53,.25)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12,marginBottom:16}}>
              <div>
                <h3 style={{fontSize:22,fontWeight:700,color:'var(--snow)',marginBottom:4}}>{selected.name}</h3>
                <p style={{fontSize:12,color:'var(--fog)'}}>Lat: {selected.lat.toFixed(5)}, Lng: {selected.lon.toFixed(5)}</p>
              </div>
              <button onClick={()=>selectPitch(null)} style={{background:'none',border:'none',color:'var(--fog)',cursor:'pointer',fontSize:18}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:16}}>
              <div style={{background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                <input 
                  type="number" 
                  value={saveForm.largo} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setSaveForm(f => {
                      const next = { ...f, largo: val };
                      next.area = Math.round(next.largo * next.ancho * 10) / 10;
                      next.tipo = classifyPitch(next.largo, next.ancho);
                      return next;
                    });
                  }}
                  className="display" 
                  style={{fontSize:32, color:'var(--snow)', background:'transparent', border:'none', width:'100%', textAlign:'center', outline:'none', fontFamily:'Bebas Neue,sans-serif'}}
                />
                <div style={{fontSize:10,color:'var(--silver)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Largo (m)</div>
              </div>
              <div style={{background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                <input 
                  type="number" 
                  value={saveForm.ancho} 
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setSaveForm(f => {
                      const next = { ...f, ancho: val };
                      next.area = Math.round(next.largo * next.ancho * 10) / 10;
                      next.tipo = classifyPitch(next.largo, next.ancho);
                      return next;
                    });
                  }}
                  className="display" 
                  style={{fontSize:32, color:'var(--snow)', background:'transparent', border:'none', width:'100%', textAlign:'center', outline:'none', fontFamily:'Bebas Neue,sans-serif'}}
                />
                <div style={{fontSize:10,color:'var(--silver)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Ancho (m)</div>
              </div>
              <div style={{background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                <input 
                  type="number" 
                  value={saveForm.area} 
                  onChange={e => setSaveForm(f => ({ ...f, area: parseFloat(e.target.value) || 0 }))}
                  className="display" 
                  style={{fontSize:32, color:'var(--lime)', background:'transparent', border:'none', width:'100%', textAlign:'center', outline:'none', fontFamily:'Bebas Neue,sans-serif'}}
                />
                <div style={{fontSize:10,color:'var(--silver)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Área (m²)</div>
              </div>
              <div style={{background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                <div className="display" style={{fontSize:32,color:'var(--lime)',lineHeight:1}}>{saveForm.tipo || '—'}</div>
                <div style={{fontSize:10,color:'var(--silver)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>Tipo</div>
              </div>
            </div>
            {!selected.largo&&<p style={{fontSize:13,color:'var(--fog)',fontStyle:'italic',marginBottom:12}}>⚠ Esta cancha no tiene polígono mapeado. Usá la herramienta 📏 Medir para obtener dimensiones.</p>}
            <div style={{borderTop:'1px solid var(--mist)',paddingTop:14}}>
              <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>💾 Guardar cancha</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
                <div style={{flex:1,minWidth:150}}>
                  <label style={{fontSize:10,color:'var(--silver)'}}>Nombre</label>
                  <input value={saveForm.nombre} onChange={e=>setSaveForm(f=>({...f,nombre:e.target.value}))} placeholder={selected.name} style={{...C.input,padding:'8px 12px',fontSize:13}}/>
                </div>
                <div style={{minWidth:120}}>
                  <label style={{fontSize:10,color:'var(--silver)'}}>Superficie</label>
                  <select value={saveForm.superficie} onChange={e=>setSaveForm(f=>({...f,superficie:e.target.value}))} style={{...C.input,padding:'8px 12px',fontSize:13}}>
                    <option value="natural">Césped natural</option>
                    <option value="sintetico">Sintético</option>
                    <option value="tierra">Tierra</option>
                    <option value="cemento">Cemento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div style={{flex:1,minWidth:150}}>
                  <label style={{fontSize:10,color:'var(--silver)'}}>Notas</label>
                  <input value={saveForm.notas} onChange={e=>setSaveForm(f=>({...f,notas:e.target.value}))} placeholder="Notas opcionales..." style={{...C.input,padding:'8px 12px',fontSize:13}}/>
                </div>
                <button onClick={()=>savePitch(selected)} disabled={saving} style={{...C.btn,opacity:saving?0.5:1}}>{saving?'Guardando...':'⭐ Guardar'}</button>
              </div>
              {saveError&&<p style={{fontSize:12,color:'#f87171',marginTop:8}}>{saveError}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Saved Tab */}
      {tab==='guardadas'&&(
        <div style={C.card}>
          <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>⭐ Canchas guardadas</p>
          {saved.length===0?<p style={{fontSize:13,color:'var(--fog)',fontStyle:'italic'}}>No hay canchas guardadas. Buscá y guardá canchas desde el mapa.</p>:(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {saved.map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:14,transition:'all .12s'}}>
                  <div style={{fontSize:22,flexShrink:0}}>🏟️</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:15,color:'var(--snow)'}}>{s.nombre}</div>
                    <div style={{fontSize:12,color:'var(--silver)',marginTop:2}}>
                      {s.largo_m&&s.ancho_m?`${s.largo_m}m × ${s.ancho_m}m · ${s.area_m2}m²`:'Sin dimensiones'}
                      {s.tipo_cancha&&<span style={{marginLeft:8,padding:'2px 8px',borderRadius:12,background:'rgba(200,241,53,.1)',color:'var(--lime)',border:'1px solid rgba(200,241,53,.2)',fontSize:10,fontWeight:700}}>{s.tipo_cancha}</span>}
                    </div>
                    {s.superficie&&<div style={{fontSize:11,color:'var(--fog)',marginTop:1}}>Superficie: {s.superficie}</div>}
                    {s.notas&&<div style={{fontSize:11,color:'var(--fog)',marginTop:1,fontStyle:'italic'}}>"{s.notas}"</div>}
                    {s.direccion&&<div style={{fontSize:11,color:'var(--fog)',marginTop:1}}>📍 {s.direccion}</div>}
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>goToSaved(s)} style={{...C.btnGhost,padding:'6px 12px',fontSize:12}}>🗺️ Ver</button>
                    <button onClick={()=>deleteSaved(s.id)} style={{...C.btnGhost,padding:'6px 12px',fontSize:12,color:'#f87171',borderColor:'rgba(239,68,68,.3)'}}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
