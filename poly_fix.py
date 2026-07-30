import sys

def modify_tactical_board():
    path = 'src/app/coach/TacticalBoard.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Type updates
    content = content.replace(
        "interface El { id:string; type:string; x:number; y:number; x2?:number; y2?:number; w?:number; h?:number; color?:string; number?:number|string; label?:string; text?:string; dashed?:boolean; wave?:boolean; fontSize?:number; rotation?:number; _rw?:number; _rh?:number }",
        "interface El { id:string; type:string; x:number; y:number; x2?:number; y2?:number; w?:number; h?:number; color?:string; number?:number|string; label?:string; text?:string; dashed?:boolean; wave?:boolean; fontSize?:number; rotation?:number; _rw?:number; _rh?:number; vertices?:{x:number, y:number}[]; _area?:number }"
    )

    content = content.replace(
        "function Elem({ el, sel, onDown, onResizeDown }: { el:El; sel:boolean; onDown:(e:any)=>void; onResizeDown?:(e:any)=>void }) {",
        "function Elem({ el, sel, onDown, onResizeDown }: { el:El; sel:boolean; onDown:(e:any)=>void; onResizeDown?:(e:any, vIndex?:number)=>void }) {"
    )

    # 2. Zone render in Elem
    zone_render_old = """    case 'zone': {
      const zw=el.w||60, zh=el.h||40
      const rw = el._rw, rh = el._rh
      const area = rw && rh ? rw * rh : 0
      return <g onMouseDown={onDown} onTouchStart={onDown} style={S}>
        {sel&&<rect x={el.x-2} y={el.y-2} width={zw+4} height={zh+4} fill="none" stroke={hi} strokeWidth={1.5} strokeDasharray="3 2" rx={4}/>}
        <rect x={el.x} y={el.y} width={zw} height={zh} fill={`${el.color||'#3b82f6'}20`} stroke={`${el.color||'#3b82f6'}77`} strokeWidth={1.5} strokeDasharray="5 3" rx={3}/>
        {sel && onResizeDown && <rect x={el.x+zw-6} y={el.y+zh-6} width={12} height={12} fill={hi} cursor="nwse-resize" onMouseDown={onResizeDown} onTouchStart={onResizeDown} />}
        {rw && rh && <>
          <text x={el.x+zw/2} y={el.y-5} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,.85)" fontWeight={800} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{rw}m × {rh}m</text>
          <text x={el.x+zw/2} y={el.y+zh/2+4} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,.7)" fontWeight={700} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{area}m²</text>
        </>}
      </g>
    }"""
    
    zone_render_new = """    case 'zone': {
      if (el.vertices && el.vertices.length > 0) {
        const points = el.vertices.map(v => `${v.x},${v.y}`).join(' ')
        const minX = Math.min(...el.vertices.map(v=>v.x)), maxX = Math.max(...el.vertices.map(v=>v.x))
        const minY = Math.min(...el.vertices.map(v=>v.y)), maxY = Math.max(...el.vertices.map(v=>v.y))
        const cx = minX + (maxX-minX)/2, cy = minY + (maxY-minY)/2
        return <g style={S}>
          <polygon points={points} fill={`${el.color||'#3b82f6'}44`} stroke={el.color||'#3b82f6'} strokeWidth={2} onMouseDown={onDown} onTouchStart={onDown}/>
          {sel && el.vertices.map((v, i) => (
            <circle key={i} cx={v.x} cy={v.y} r={5} fill={hi} cursor="crosshair" onMouseDown={(e)=>{e.stopPropagation(); if (onResizeDown) onResizeDown(e, i)}} onTouchStart={(e)=>{e.stopPropagation(); if (onResizeDown) onResizeDown(e, i)}} />
          ))}
          {el._area && el._area > 0 && <text x={cx} y={cy} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,.9)" fontWeight={800} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{Math.round(el._area)} m²</text>}
        </g>
      }
      const zw=el.w||60, zh=el.h||40
      const rw = el._rw, rh = el._rh
      const area = rw && rh ? rw * rh : 0
      return <g onMouseDown={onDown} onTouchStart={onDown} style={S}>
        {sel&&<rect x={el.x-2} y={el.y-2} width={zw+4} height={zh+4} fill="none" stroke={hi} strokeWidth={1.5} strokeDasharray="3 2" rx={4}/>}
        <rect x={el.x} y={el.y} width={zw} height={zh} fill={`${el.color||'#3b82f6'}20`} stroke={`${el.color||'#3b82f6'}77`} strokeWidth={1.5} strokeDasharray="5 3" rx={3}/>
        {sel && onResizeDown && <rect x={el.x+zw-6} y={el.y+zh-6} width={12} height={12} fill={hi} cursor="nwse-resize" onMouseDown={onResizeDown} onTouchStart={onResizeDown} />}
        {rw && rh && <>
          <text x={el.x+zw/2} y={el.y-5} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,.85)" fontWeight={800} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{rw}m × {rh}m</text>
          <text x={el.x+zw/2} y={el.y+zh/2+4} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,.7)" fontWeight={700} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{area}m²</text>
        </>}
      </g>
    }"""
    content = content.replace(zone_render_old, zone_render_new)

    # 3. Add states and shoelace formula
    state_anchor = "const [resizeDrag, setResizeDrag] = useState<{id:string;ox:number;oy:number}|null>(null)"
    state_new = """const [resizeDrag, setResizeDrag] = useState<{id:string;ox:number;oy:number;vIndex?:number}|null>(null)
  const [polyDraw, setPolyDraw] = useState<{x:number;y:number}[] | null>(null)
  const [polyCursor, setPolyCursor] = useState<{x:number;y:number} | null>(null)

  function calculateShoelaceArea(vertices: {x:number, y:number}[], vbW: number, vbH: number, cfg: {mW:number, mH:number}) {
    if (!vertices || vertices.length < 3) return 0
    const fieldPxW = vbW - 60
    const fieldPxH = vbH - 60
    const realPts = vertices.map(v => ({ x: ((v.x - 30) / fieldPxW) * cfg.mW, y: ((v.y - 30) / fieldPxH) * cfg.mH }))
    let area = 0
    for (let i = 0; i < realPts.length; i++) {
      const j = (i + 1) % realPts.length
      area += realPts[i].x * realPts[j].y
      area -= realPts[j].x * realPts[i].y
    }
    return Math.abs(area) / 2
  }"""
    content = content.replace(state_anchor, state_new)

    # 4. onZoneInfo
    zoneinfo_old = """  useEffect(() => {
    if (!onZoneInfo) return
    const zones = elements.filter(e => e.type === 'zone' && e._rw && e._rh).map(e => ({ rw: e._rw!, rh: e._rh!, area: e._rw! * e._rh! }))
    onZoneInfo(zones)
  }, [elements, onZoneInfo])"""
    zoneinfo_new = """  useEffect(() => {
    if (!onZoneInfo) return
    const zones = elements.filter(e => e.type === 'zone').map(e => {
      if (e.vertices && e._area !== undefined) return { rw:0, rh:0, area: e._area }
      if (e._rw && e._rh) return { rw: e._rw, rh: e._rh, area: e._rw * e._rh }
      return { rw:0, rh:0, area:0 }
    }).filter(z => z.area > 0)
    onZoneInfo(zones)
  }, [elements, onZoneInfo])"""
    content = content.replace(zoneinfo_old, zoneinfo_new)

    # 5. down function
    down_old = """  const down = (e:any)=>{
    if(readOnly) return; const p=pt(e)
    if(tool==='select'){setSelId(null);return}
    if(tool.startsWith('arrow')||tool==='zone'){setDraw({sx:p.x,sy:p.y});setPrev(p);return}
    if(tool==='text'){setTxtP(p);return}
    const el:El = {id:uid(),type:tool,x:p.x,y:p.y}"""
    down_new = """  const down = (e:any)=>{
    if(readOnly) return; const p=pt(e)
    if(tool==='select'){setSelId(null);return}
    if(tool==='zone'){
      if (!polyDraw) {
        setPolyDraw([p])
      } else {
        const fp = polyDraw[0]
        const dist = Math.hypot(p.x - fp.x, p.y - fp.y)
        if (dist < 15 || e.detail === 2) {
          const finalPoly = [...polyDraw]
          const area = calculateShoelaceArea(finalPoly, vbW, vbH, cfg)
          push([...elements, {id:uid(), type:'zone', x:finalPoly[0].x, y:finalPoly[0].y, vertices: finalPoly, _area: Math.round(area), color:zCol} as any])
          setPolyDraw(null)
          setPolyCursor(null)
          setTool('select')
        } else {
          setPolyDraw([...polyDraw, p])
        }
      }
      return
    }
    if(tool.startsWith('arrow')){setDraw({sx:p.x,sy:p.y});setPrev(p);return}
    if(tool==='text'){setTxtP(p);return}
    const el:El = {id:uid(),type:tool,x:p.x,y:p.y}"""
    content = content.replace(down_old, down_new)

    # 6. move function
    move_old = """  const move = (e:any)=>{
    if(readOnly)return;
    const p=pt(e);
    if(drag) setElements(prev2=>prev2.map(el=>el.id===drag.id?{...el,x:p.x-drag.ox,y:p.y-drag.oy}:el));
    if(resizeDrag) setElements(prev2=>prev2.map(el=>{if(el.id===resizeDrag.id){const nw=Math.max(10,p.x-resizeDrag.ox);const nh=Math.max(10,p.y-resizeDrag.oy);const fPxW=vbW-60,fPxH=vbH-60;return{...el,w:nw,h:nh,_rw:Math.round((nw/fPxW)*cfg.mW),_rh:Math.round((nh/fPxH)*cfg.mH)}}return el}));
    if(draw)setPrev(p)
  }"""
    move_new = """  const move = (e:any)=>{
    if(readOnly)return;
    const p=pt(e);
    if(drag) setElements(prev2=>prev2.map(el=>el.id===drag.id?{...el,x:p.x-drag.ox,y:p.y-drag.oy}:el));
    if(resizeDrag) setElements(prev2=>prev2.map(el=>{
      if(el.id===resizeDrag.id){
        if (resizeDrag.vIndex !== undefined && el.vertices) {
          const nv = [...el.vertices]
          nv[resizeDrag.vIndex] = {x:p.x, y:p.y}
          const area = calculateShoelaceArea(nv, vbW, vbH, cfg)
          return {...el, vertices: nv, _area: Math.round(area)}
        }
        const nw=Math.max(10,p.x-resizeDrag.ox);const nh=Math.max(10,p.y-resizeDrag.oy);const fPxW=vbW-60,fPxH=vbH-60;return{...el,w:nw,h:nh,_rw:Math.round((nw/fPxW)*cfg.mW),_rh:Math.round((nh/fPxH)*cfg.mH)}
      }
      return el
    }));
    if(draw)setPrev(p)
    if(polyDraw)setPolyCursor(p)
  }"""
    content = content.replace(move_old, move_new)

    # 7. up function - remove tool==='zone' from rect drawing
    up_old = """      if(Math.abs(x-sx)>8||Math.abs(y-sy)>8){
        if(tool==='zone') {
          const zoneW = Math.abs(x-sx), zoneH = Math.abs(y-sy)
          const fieldPxW = vbW - 60, fieldPxH = vbH - 60 // minus margins
          const realW = Math.round((zoneW / fieldPxW) * cfg.mW)
          const realH = Math.round((zoneH / fieldPxH) * cfg.mH)
          push([...elements,{id:uid(),type:'zone',x:Math.min(sx,x),y:Math.min(sy,y),w:zoneW,h:zoneH,color:zCol,_rw:realW,_rh:realH} as any])
        }
        else push([...elements,{id:uid(),type:'arrow',x:sx,y:sy,x2:x,y2:y,dashed:tool==='arrow_dashed',wave:tool==='arrow_wave',color:arrCol}])
      }"""
    up_new = """      if(Math.abs(x-sx)>8||Math.abs(y-sy)>8){
        push([...elements,{id:uid(),type:'arrow',x:sx,y:sy,x2:x,y2:y,dashed:tool==='arrow_dashed',wave:tool==='arrow_wave',color:arrCol}])
      }"""
    content = content.replace(up_old, up_new)

    # 8. elResizeDown and keydown
    content = content.replace(
        "const elResizeDown = (e:any,el:El)=>{if(readOnly)return;e.stopPropagation();setSelId(el.id);const p=pt(e);setResizeDrag({id:el.id,ox:p.x-(el.w||0),oy:p.y-(el.h||0)})}",
        "const elResizeDown = (e:any,el:El,vIndex?:number)=>{if(readOnly)return;e.stopPropagation();setSelId(el.id);const p=pt(e);setResizeDrag({id:el.id,ox:vIndex!==undefined?0:p.x-(el.w||0),oy:vIndex!==undefined?0:p.y-(el.h||0),vIndex})}"
    )

    keydown_old = """      if((e.key==='Delete'||e.key==='Backspace')&&selId){e.preventDefault();del()}
      if(e.key==='Escape'){setSelId(null);setDraw(null);setTxtP(null)}
      if(e.ctrlKey&&e.key==='z'){e.preventDefault();undo()}"""
    keydown_new = """      if((e.key==='Delete'||e.key==='Backspace')&&selId){e.preventDefault();del()}
      if(e.key==='Enter' && polyDraw && polyDraw.length >= 3){
         const area = calculateShoelaceArea(polyDraw, vbW, vbH, cfg)
         push([...elements, {id:uid(), type:'zone', x:polyDraw[0].x, y:polyDraw[0].y, vertices: polyDraw, _area: Math.round(area), color:zCol} as any])
         setPolyDraw(null); setPolyCursor(null); setTool('select')
      }
      if(e.key==='Escape'){setSelId(null);setDraw(null);setTxtP(null);setPolyDraw(null);setPolyCursor(null)}
      if(e.ctrlKey&&e.key==='z'){e.preventDefault();undo()}"""
    content = content.replace(keydown_old, keydown_new)

    # 9. mouseLeave
    content = content.replace(
        "onMouseLeave={()=>{setDrag(null);setDraw(null);setPrev(null)}}>",
        "onMouseLeave={()=>{setDrag(null);setDraw(null);setPrev(null);setResizeDrag(null)}}>",
    )

    # 10. polygon drawing UI
    draw_ui_old = """          {draw&&prev&&tool.startsWith('arrow')&&<line x1={draw.sx} y1={draw.sy} x2={prev.x} y2={prev.y} stroke="rgba(163,230,53,.35)" strokeWidth={2} strokeDasharray={tool==='arrow_dashed'?'6 4':'none'}/>}
          {draw&&prev&&tool==='zone'&&<rect x={Math.min(draw.sx,prev.x)} y={Math.min(draw.sy,prev.y)} width={Math.abs(prev.x-draw.sx)} height={Math.abs(prev.y-draw.sy)} fill="rgba(163,230,53,.06)" stroke="rgba(163,230,53,.3)" strokeWidth={1.5} strokeDasharray="4 3"/>}
          {elements.map(el=><Elem key={el.id} el={el} sel={el.id===selId} onDown={(e:any)=>elDown(e,el)} onResizeDown={(e:any)=>elResizeDown(e,el)}/>)}"""
    draw_ui_new = """          {polyDraw && polyDraw.length > 0 && <g>
            {polyDraw.length > 1 && <polyline points={polyDraw.map(v=>`${v.x},${v.y}`).join(' ')} fill="none" stroke="rgba(163,230,53,.8)" strokeWidth={1.5} strokeDasharray="4 3"/>}
            {polyCursor && <line x1={polyDraw[polyDraw.length-1].x} y1={polyDraw[polyDraw.length-1].y} x2={polyCursor.x} y2={polyCursor.y} stroke="rgba(163,230,53,.4)" strokeWidth={1.5} strokeDasharray="4 3"/>}
            {polyDraw.map((v,i) => <circle key={`pd_${i}`} cx={v.x} cy={v.y} r={4} fill={i===0?'#ef4444':'#a3e635'} />)}
          </g>}
          {draw&&prev&&tool.startsWith('arrow')&&<line x1={draw.sx} y1={draw.sy} x2={prev.x} y2={prev.y} stroke="rgba(163,230,53,.35)" strokeWidth={2} strokeDasharray={tool==='arrow_dashed'?'6 4':'none'}/>}
          {elements.map(el=><Elem key={el.id} el={el} sel={el.id===selId} onDown={(e:any)=>elDown(e,el)} onResizeDown={(e:any, vIndex?:number)=>elResizeDown(e,el,vIndex)}/>)}"""
    content = content.replace(draw_ui_old, draw_ui_new)

    # 11. Legacy text hide if poly
    text_old = """            return <g key={`zl_${z.id}`} style={{pointerEvents:'none'}}>
              <text x={z.x+zw/2} y={z.y-5} textAnchor="middle" fontSize={10} fontWeight={700} fill="rgba(255,255,255,.8)" fontFamily="system-ui">{mW2}m × {mH2}m</text>
              <text x={z.x+zw/2} y={z.y+zh/2+4} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,.5)" fontFamily="system-ui">{mW2*mH2} m²</text>
            </g>"""
    text_new = """            if (z.vertices) return null
            return <g key={`zl_${z.id}`} style={{pointerEvents:'none'}}>
              <text x={z.x+zw/2} y={z.y-5} textAnchor="middle" fontSize={10} fontWeight={700} fill="rgba(255,255,255,.8)" fontFamily="system-ui">{mW2}m × {mH2}m</text>
              <text x={z.x+zw/2} y={z.y+zh/2+4} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,.5)" fontFamily="system-ui">{mW2*mH2} m²</text>
            </g>"""
    content = content.replace(text_old, text_new)

    # 12. Update inside count and UI in calculator
    calc_old = """              const mW2 = z._rw || Math.round((z.w||60)*scaleX)
              const mH2 = z._rh || Math.round((z.h||40)*scaleY)
              const area = mW2*mH2
              // Count players inside this zone
              const inside = players.filter(p=>p.x>=z.x&&p.x<=(z.x+(z.w||60))&&p.y>=z.y&&p.y<=(z.y+(z.h||40))).length
              const nJug = inside > 0 ? inside : players.length
              const densidad = nJug > 0 ? area / nJug : 0

              const updateZoneDim = (newRw:number, newRh:number) => {
                const newPxW = newRw / scaleX
                const newPxH = newRh / scaleY
                setElements(prev=>prev.map(el=>el.id===z.id ? {...el, w:newPxW, h:newPxH, _rw:newRw, _rh:newRh} : el))
              }"""
    
    calc_new = """              const isPoly = !!z.vertices
              const mW2 = isPoly ? 0 : (z._rw || Math.round((z.w||60)*scaleX))
              const mH2 = isPoly ? 0 : (z._rh || Math.round((z.h||40)*scaleY))
              const area = isPoly ? (z._area || 0) : (mW2*mH2)
              // Count players inside this zone
              let inside = 0
              if (isPoly && z.vertices) {
                inside = players.filter(p => {
                  let isInside = false
                  for (let i = 0, j = z.vertices!.length - 1; i < z.vertices!.length; j = i++) {
                    const xi = z.vertices![i].x, yi = z.vertices![i].y
                    const xj = z.vertices![j].x, yj = z.vertices![j].y
                    const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi)
                    if (intersect) isInside = !isInside
                  }
                  return isInside
                }).length
              } else {
                inside = players.filter(p=>p.x>=z.x&&p.x<=(z.x+(z.w||60))&&p.y>=z.y&&p.y<=(z.y+(z.h||40))).length
              }
              const nJug = inside > 0 ? inside : players.length
              const densidad = nJug > 0 ? area / nJug : 0

              const updateZoneDim = (newRw:number, newRh:number) => {
                if (isPoly) return
                const newPxW = newRw / scaleX
                const newPxH = newRh / scaleY
                setElements(prev=>prev.map(el=>el.id===z.id ? {...el, w:newPxW, h:newPxH, _rw:newRw, _rh:newRh} : el))
              }"""
    content = content.replace(calc_old, calc_new)

    calc_inputs_old = """                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontSize:8,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.1em'}}>Espacio:</span>
                    <input type="number" value={mW2} onChange={e=>{const v=Number(e.target.value);if(v>0)updateZoneDim(v,mH2)}}
                      style={{width:42,background:'rgba(163,230,53,.08)',border:'1px solid rgba(163,230,53,.25)',borderRadius:4,padding:'2px 5px',fontSize:12,fontWeight:800,color:'#a3e635',textAlign:'center',outline:'none'}} />
                    <span style={{color:'#64748b'}}>×</span>
                    <input type="number" value={mH2} onChange={e=>{const v=Number(e.target.value);if(v>0)updateZoneDim(mW2,v)}}
                      style={{width:42,background:'rgba(163,230,53,.08)',border:'1px solid rgba(163,230,53,.25)',borderRadius:4,padding:'2px 5px',fontSize:12,fontWeight:800,color:'#a3e635',textAlign:'center',outline:'none'}} />
                    <span style={{color:'#64748b',fontSize:10}}>m = {area}m²</span>
                  </div>"""
    calc_inputs_new = """                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{fontSize:8,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.1em'}}>Espacio:</span>
                    {isPoly ? (
                      <span style={{background:'rgba(163,230,53,.08)',border:'1px solid rgba(163,230,53,.25)',borderRadius:4,padding:'2px 8px',fontSize:12,fontWeight:800,color:'#a3e635'}}>{area} m² (Polígono)</span>
                    ) : (
                      <>
                        <input type="number" value={mW2} onChange={e=>{const v=Number(e.target.value);if(v>0)updateZoneDim(v,mH2)}}
                          style={{width:42,background:'rgba(163,230,53,.08)',border:'1px solid rgba(163,230,53,.25)',borderRadius:4,padding:'2px 5px',fontSize:12,fontWeight:800,color:'#a3e635',textAlign:'center',outline:'none'}} />
                        <span style={{color:'#64748b'}}>×</span>
                        <input type="number" value={mH2} onChange={e=>{const v=Number(e.target.value);if(v>0)updateZoneDim(mW2,v)}}
                          style={{width:42,background:'rgba(163,230,53,.08)',border:'1px solid rgba(163,230,53,.25)',borderRadius:4,padding:'2px 5px',fontSize:12,fontWeight:800,color:'#a3e635',textAlign:'center',outline:'none'}} />
                        <span style={{color:'#64748b',fontSize:10}}>m = {area}m²</span>
                      </>
                    )}
                  </div>"""
    content = content.replace(calc_inputs_old, calc_inputs_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

modify_tactical_board()
