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
  let minLat=Infinity,maxLat=-Infinity,minLon=Infinity,maxLon=-Infinity
  for(const n of nodes){minLat=Math.min(minLat,n.lat);maxLat=Math.max(maxLat,n.lat);minLon=Math.min(minLon,n.lon);maxLon=Math.max(maxLon,n.lon)}
  const dLat=haversine(minLat,minLon,maxLat,minLon)
  const dLon=haversine(minLat,minLon,minLat,maxLon)
  const largo=Math.round(Math.max(dLat,dLon)*10)/10
  const ancho=Math.round(Math.min(dLat,dLon)*10)/10
  const area=Math.round(polyArea(nodes)*10)/10
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
  const [pitches,setPitches]=useState<Pitch[]>([])
  const [selected,setSelected]=useState<Pitch|null>(null)
  const [saved,setSaved]=useState<SavedPitch[]>([])
  const [loading,setLoading]=useState(false)
  const [measuring,setMeasuring]=useState(false)
  const [measurePts,setMeasurePts]=useState<{lat:number,lng:number}[]>([])
  const [measureResult,setMeasureResult]=useState<{largo:number,ancho:number,area:number}|null>(null)
  const [saveForm,setSaveForm]=useState<{nombre:string,superficie:string,notas:string}>({nombre:'',superficie:'natural',notas:''})
  const [saving,setSaving]=useState(false)
  const [tab,setTab]=useState<'buscar'|'guardadas'>('buscar')

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

  // Search location via Nominatim
  const searchLocation=useCallback(async()=>{
    if(!query.trim()||!mapInst.current)return
    setLoading(true)
    try{
      const r=await fetch(`/api/nominatim?q=${encodeURIComponent(query)}`)
      const d=await r.json()
      if(d.length>0){const{lat,lon}=d[0];mapInst.current.setView([Number(lat),Number(lon)],15);await loadPitches()}
    }catch{}
    setLoading(false)
  },[query])

  // Load pitches from Overpass
  const loadPitches=useCallback(async()=>{
    if(!mapInst.current)return
    setLoading(true)
    const b=mapInst.current.getBounds()
    const bbox=`${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`
    const q=`[out:json][timeout:15];(nwr["leisure"="pitch"]["sport"~"soccer|football|futbol"](${bbox});nwr["leisure"="pitch"](${bbox}););out geom;`
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
        // Filtrar estricto: solo mostrar canchas que tengan dimensiones y sean de Fútbol 11 (>=90x45)
        if(!dim || dim.largo < 90 || dim.ancho < 45) continue;
        
        results.push({id:`${el.type}_${el.id}`,name:el.tags?.name||'Cancha sin nombre',lat,lon,nodes,largo:dim.largo,ancho:dim.ancho,area:dim.area,tipo:'F11'})
      }
      setPitches(results)
      // Add markers
      markersRef.current.forEach(m=>mapInst.current?.removeLayer(m))
      markersRef.current=[]
      const icon=L.divIcon({className:'',html:`<div style="width:28px;height:28px;background:#c8f135;border:2px solid #080808;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.4)">⚽</div>`,iconSize:[28,28],iconAnchor:[14,14]})
      for(const p of results){
        const m=L.marker([p.lat,p.lon],{icon}).addTo(mapInst.current)
        m.on('click',()=>setSelected(p))
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
          
          const d1 = haversine(pts[0].lat, pts[0].lng, pts[1].lat, pts[1].lng)
          const d2 = haversine(pts[1].lat, pts[1].lng, pts[2].lat, pts[2].lng)
          const d3 = haversine(pts[2].lat, pts[2].lng, pts[3].lat, pts[3].lng)
          const d4 = haversine(pts[3].lat, pts[3].lng, pts[0].lat, pts[0].lng)
          
          const l1 = (d1 + d3) / 2
          const l2 = (d2 + d4) / 2
          
          const largo=Math.round(Math.max(l1,l2)*10)/10
          const ancho=Math.round(Math.min(l1,l2)*10)/10
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

  const savePitch=async(p:Pitch)=>{
    setSaving(true)
    try{
      const r=await fetch('/api/canchas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:saveForm.nombre||p.name,direccion:p.address||'',lat:p.lat,lng:p.lon,largo_m:p.largo,ancho_m:p.ancho,area_m2:p.area,tipo_cancha:p.tipo,superficie:saveForm.superficie,notas:saveForm.notas,osm_id:p.id.includes('_')?Number(p.id.split('_')[1]):null})})
      const d=await r.json()
      if(d.id)setSaved(prev=>[d,...prev])
      setSaveForm({nombre:'',superficie:'natural',notas:''})
      setSelected(null)
    }catch{}
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
            <button key={t} onClick={()=>setTab(t)} style={{...C.btnGhost,background:tab===t?'rgba(200,241,53,.1)':'transparent',color:tab===t?'var(--lime)':'var(--silver)',borderColor:tab===t?'rgba(200,241,53,.3)':'var(--fog)',fontWeight:tab===t?700:500}}>
              {t==='buscar'?'🗺️ Buscar':'⭐ Guardadas'} {t==='guardadas'&&saved.length>0&&`(${saved.length})`}
            </button>
          ))}
        </div>
      </div>

      {tab==='buscar'&&(
        <>
          {/* Search bar */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200,position:'relative'}}>
              <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')searchLocation()}} placeholder="Buscar dirección, ciudad o barrio..." style={C.input}/>
            </div>
            <button onClick={searchLocation} disabled={loading} style={{...C.btn,opacity:loading?0.5:1}}>
              {loading?'Buscando...':'🔍 Buscar'}
            </button>
            <button onClick={()=>{if(navigator.geolocation&&mapInst.current){navigator.geolocation.getCurrentPosition(p=>{mapInst.current.setView([p.coords.latitude,p.coords.longitude],15);setTimeout(loadPitches,500)})}}} style={C.btnGhost} title="Mi ubicación">
              📍
            </button>
            <button onClick={loadPitches} disabled={loading} style={C.btnGhost} title="Buscar estadios en esta zona">
              ⚽ Buscar estadios aquí
            </button>
            <button onClick={startMeasure} style={{...C.btnGhost,color:measuring?'var(--lime)':'var(--silver)',borderColor:measuring?'var(--lime)':'var(--fog)'}} title="Medir cancha manualmente">
              📏 {measuring?'Click 4 esquinas...':'Medir'}
            </button>
          </div>

          {/* Map */}
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
                <button onClick={startMeasure} style={C.btnGhost}>📏 Medir otra</button>
              </div>
            </div>
          )}

          {/* Found pitches */}
          {pitches.length>0&&(
            <div style={C.card}>
              <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>⚽ {pitches.length} canchas encontradas</p>
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:300,overflowY:'auto'}}>
                {pitches.map(p=>(
                  <button key={p.id} onClick={()=>{setSelected(p);if(mapInst.current)mapInst.current.setView([p.lat,p.lon],17)}} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'12px 16px',background:selected?.id===p.id?'rgba(200,241,53,.08)':'transparent',border:selected?.id===p.id?'1px solid rgba(200,241,53,.2)':'1px solid var(--mist)',borderRadius:12,cursor:'pointer',textAlign:'left',transition:'all .12s'}}>
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
                <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'var(--fog)',cursor:'pointer',fontSize:18}}>✕</button>
              </div>
              {selected.largo&&selected.ancho&&(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:16}}>
                  {[['Largo',`${selected.largo}m`,'var(--snow)'],['Ancho',`${selected.ancho}m`,'var(--snow)'],['Área',`${selected.area}m²`,'var(--lime)'],['Tipo',selected.tipo||'—','var(--lime)']].map(([l,v,c])=>(
                    <div key={l as string} style={{background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                      <div className="display" style={{fontSize:32,color:c as string,lineHeight:1}}>{v}</div>
                      <div style={{fontSize:10,color:'var(--silver)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.06em'}}>{l}</div>
                    </div>
                  ))}
                </div>
              )}
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
              </div>
            </div>
          )}
        </>
      )}

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
