'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
type Tool = 'select'|'player'|'cone'|'disc'|'ring'|'ball'|'goal'|'minigoal'|'barrier'|'ladder'|'pole'|'mannequin'|'arrow_solid'|'arrow_dashed'|'arrow_wave'|'zone'|'text'
type FieldType = 'F11'|'F11_half'|'F9'|'F7'|'F5'
type Orientation = 'horizontal'|'vertical'

interface El { id:string; type:string; x:number; y:number; x2?:number; y2?:number; w?:number; h?:number; color?:string; number?:number|string; label?:string; text?:string; dashed?:boolean; wave?:boolean; fontSize?:number; rotation?:number; _rw?:number; _rh?:number }

interface BoardProps {
  initialData?: { field:FieldType; elements:El[]; series?:El[][]; orientation?:Orientation }
  onSave?: (d:{ field:FieldType; elements:El[]; series:El[][]; preview:string }) => void
  onClose?: () => void
  readOnly?: boolean
  onZoneInfo?: (zones: { rw:number; rh:number; area:number }[]) => void
}

// ═══════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════
const COLORS = ['#2563eb','#dc2626','#eab308','#16a34a','#ea580c','#9333ea']
const ARR_COLS = ['#ffffff','#eab308','#ef4444','#3b82f6','#22c55e','#f97316']

// Field configs: real proportions (width x height in meters)
const FIELD_CFG: Record<FieldType, { mW:number; mH:number; label:string; penaltyScale:number; hasCorners:boolean; futsal:boolean }> = {
  F11:      { mW:105, mH:68, label:'F11 Completa', penaltyScale:1, hasCorners:true, futsal:false },
  F11_half: { mW:52.5, mH:68, label:'F11 Mitad', penaltyScale:1, hasCorners:true, futsal:false },
  F9:       { mW:75, mH:55, label:'F9', penaltyScale:0.8, hasCorners:true, futsal:false },
  F7:       { mW:60, mH:40, label:'F7', penaltyScale:0.65, hasCorners:true, futsal:false },
  F5:       { mW:40, mH:20, label:'F5 Futsal', penaltyScale:0.5, hasCorners:false, futsal:true },
}

const FORMATIONS: Record<string,{label:string; positions:[number,number][]; forField:FieldType[]}> = {
  '4-3-3':     { label:'4-3-3', forField:['F11','F11_half'], positions:[[.08,.5],[.22,.12],[.22,.37],[.22,.63],[.22,.88],[.42,.2],[.42,.5],[.42,.8],[.65,.15],[.65,.5],[.65,.85]] },
  '4-4-2':     { label:'4-4-2', forField:['F11','F11_half'], positions:[[.08,.5],[.22,.12],[.22,.37],[.22,.63],[.22,.88],[.42,.12],[.42,.37],[.42,.63],[.42,.88],[.62,.35],[.62,.65]] },
  '3-5-2':     { label:'3-5-2', forField:['F11','F11_half'], positions:[[.08,.5],[.2,.2],[.2,.5],[.2,.8],[.38,.1],[.38,.35],[.38,.5],[.38,.65],[.38,.9],[.6,.35],[.6,.65]] },
  '4-2-3-1':   { label:'4-2-3-1', forField:['F11','F11_half'], positions:[[.08,.5],[.22,.12],[.22,.37],[.22,.63],[.22,.88],[.38,.3],[.38,.7],[.55,.15],[.55,.5],[.55,.85],[.68,.5]] },
  '3-4-3':     { label:'3-4-3', forField:['F11','F11_half'], positions:[[.08,.5],[.2,.2],[.2,.5],[.2,.8],[.4,.12],[.4,.37],[.4,.63],[.4,.88],[.62,.2],[.62,.5],[.62,.8]] },
  '3v3':       { label:'3v3', forField:['F5','F7'], positions:[[.12,.5],[.4,.2],[.4,.5],[.4,.8],[.88,.5],[.6,.2],[.6,.8]] },
  '2-3-2 (F7)':{ label:'2-3-2', forField:['F7','F9'], positions:[[.08,.5],[.25,.25],[.25,.75],[.45,.15],[.45,.5],[.45,.85],[.65,.35],[.65,.65]] },
}

let _n=0; const uid=()=>`_${Date.now().toString(36)}_${_n++}`

// ═══════════════════════════════════════════════════════════════════
// FIELD SVG
// ═══════════════════════════════════════════════════════════════════
function FieldSVG({ type, vbW, vbH, showGrid }: { type:FieldType; vbW:number; vbH:number; showGrid:boolean }) {
  const cfg = FIELD_CFG[type]
  const m = 30 // margin
  const fw = vbW - m*2, fh = vbH - m*2
  const s = 'rgba(255,255,255,.88)', lw = 1.8
  const cx = m + fw/2, cy = m + fh/2
  const ps = cfg.penaltyScale

  // Grass stripes
  const stripeCount = type === 'F11_half' ? 7 : type === 'F5' ? 8 : 13
  const stripes = Array.from({length:stripeCount},(_,i) => {
    const sw2 = fw/stripeCount
    return <rect key={i} x={m+i*sw2} y={m} width={sw2+.5} height={fh} fill={i%2===0?'#2d8c4e':'#339956'} />
  })

  // Grid overlay
  const grid = showGrid ? (
    <g>
      {Array.from({length:Math.floor(fw/40)},(_,i) => <line key={`gv${i}`} x1={m+(i+1)*40} y1={m} x2={m+(i+1)*40} y2={m+fh} stroke="rgba(255,255,255,.06)" strokeWidth={.5} />)}
      {Array.from({length:Math.floor(fh/40)},(_,i) => <line key={`gh${i}`} x1={m} y1={m+(i+1)*40} x2={m+fw} y2={m+(i+1)*40} stroke="rgba(255,255,255,.06)" strokeWidth={.5} />)}
    </g>
  ) : null

  const outline = <rect x={m} y={m} width={fw} height={fh} fill="none" stroke={s} strokeWidth={lw} />

  // Penalty area dimensions (proportional)
  const paW = fw*.128*ps, paH = fh*.44, gaW = fw*.048*ps, gaH = fh*.22
  const arcR = fh*.12*ps, dotR = 2.2, cornerR = 9*ps
  const goalH = fh*.155, goalW = 13

  const penalty = (side:'L'|'R') => {
    if (cfg.futsal) {
      // Futsal: semicircle penalty area
      const px = side==='L' ? m : m+fw
      const r = fh*.25
      const dir = side==='L' ? 1 : -1
      return <path d={`M ${px},${cy-r} A ${r},${r} 0 0,${side==='L'?1:0} ${px},${cy+r}`} fill="none" stroke={s} strokeWidth={lw} />
    }
    const sx = side==='L' ? m : m+fw-paW
    const gx = side==='L' ? m : m+fw-gaW
    const px2 = side==='L' ? m+paW*.77 : m+fw-paW*.77
    const arcX = side==='L' ? m+paW : m+fw-paW
    const arcF = side==='L' ? '0,1' : '0,0'
    return (<>
      <rect x={sx} y={cy-paH/2} width={paW} height={paH} fill="none" stroke={s} strokeWidth={lw} />
      <rect x={gx} y={cy-gaH/2} width={gaW} height={gaH} fill="none" stroke={s} strokeWidth={lw} />
      <circle cx={px2} cy={cy} r={dotR} fill={s} />
      <path d={`M ${arcX},${cy-arcR} A ${arcR},${arcR} 0 ${arcF} ${arcX},${cy+arcR}`} fill="none" stroke={s} strokeWidth={lw} />
    </>)
  }

  const goal = (side:'L'|'R') => {
    const gx = side==='L' ? m-goalW : m+fw
    return <rect x={gx} y={cy-goalH/2} width={goalW} height={goalH} fill="none" stroke={s} strokeWidth={1} strokeDasharray="3 2" />
  }

  const corners = cfg.hasCorners ? (<>
    <path d={`M ${m},${m+cornerR} A ${cornerR},${cornerR} 0 0,1 ${m+cornerR},${m}`} fill="none" stroke={s} strokeWidth={lw} />
    <path d={`M ${m+fw-cornerR},${m} A ${cornerR},${cornerR} 0 0,1 ${m+fw},${m+cornerR}`} fill="none" stroke={s} strokeWidth={lw} />
    <path d={`M ${m+cornerR},${m+fh} A ${cornerR},${cornerR} 0 0,1 ${m},${m+fh-cornerR}`} fill="none" stroke={s} strokeWidth={lw} />
    <path d={`M ${m+fw},${m+fh-cornerR} A ${cornerR},${cornerR} 0 0,1 ${m+fw-cornerR},${m+fh}`} fill="none" stroke={s} strokeWidth={lw} />
  </>) : null

  const centerR = cfg.futsal ? fh*.15 : fh*.128*Math.min(ps*1.2,1)

  if (type === 'F11_half') {
    return (<g>
      {stripes}{grid}{outline}
      {penalty('L')}{goal('L')}
      <path d={`M ${m+fw},${cy-centerR} A ${centerR},${centerR} 0 0,0 ${m+fw},${cy+centerR}`} fill="none" stroke={s} strokeWidth={lw} />
      <circle cx={m+fw} cy={cy} r={dotR} fill={s} />
      {corners}
    </g>)
  }

  return (<g>
    {stripes}{grid}{outline}
    <line x1={cx} y1={m} x2={cx} y2={m+fh} stroke={s} strokeWidth={lw} />
    <circle cx={cx} cy={cy} r={centerR} fill="none" stroke={s} strokeWidth={lw} />
    <circle cx={cx} cy={cy} r={dotR} fill={s} />
    {penalty('L')}{penalty('R')}{goal('L')}{goal('R')}{corners}
    {cfg.futsal && <>
      <circle cx={m+fw*.25} cy={cy} r={dotR} fill={s} />
      <circle cx={m+fw*.75} cy={cy} r={dotR} fill={s} />
    </>}
  </g>)
}

// ═══════════════════════════════════════════════════════════════════
// ELEMENT RENDERER
// ═══════════════════════════════════════════════════════════════════
function Elem({ el, sel, onDown }: { el:El; sel:boolean; onDown:(e:any)=>void }) {
  const hi = '#a3e635'
  const S = { cursor:'pointer' as const }
  const selRing = sel ? <circle r={20} fill="none" stroke={hi} strokeWidth={1.5} strokeDasharray="3 2" opacity={.5} /> : null

  switch (el.type) {
    case 'player': {
      const c = el.color||COLORS[0]
      return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>
        {selRing}
        <defs><radialGradient id={`pg${el.id}`} cx="35%" cy="30%"><stop offset="0%" stopColor="rgba(255,255,255,.3)"/><stop offset="100%" stopColor="rgba(0,0,0,.12)"/></radialGradient></defs>
        <ellipse cy={3} rx={11} ry={3.5} fill="rgba(0,0,0,.28)"/>
        <circle r={13} fill={c}/><circle r={13} fill={`url(#pg${el.id})`}/>
        <circle r={13} fill="none" stroke={sel?hi:'rgba(0,0,0,.22)'} strokeWidth={sel?2.5:1.2}/>
        <text textAnchor="middle" dy={4.5} fontSize={12} fontWeight={900} fill="#fff" fontFamily="system-ui" style={{pointerEvents:'none',userSelect:'none'} as any}>{el.number??''}</text>
        {el.label && <text textAnchor="middle" y={22} fontSize={7.5} fill="rgba(255,255,255,.85)" fontWeight={700} style={{pointerEvents:'none'} as any}>{el.label}</text>}
      </g>
    }
    case 'cone': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{selRing}<ellipse cy={6} rx={7} ry={2.5} fill={`${el.color||'#f97316'}44`}/><path d="M 0,-10 L 7,5 Q 0,7 -7,5 Z" fill={el.color||'#f97316'} stroke="rgba(0,0,0,.15)" strokeWidth={.5}/><path d="M 0,-10 L 2.5,-1 L -2.5,-1 Z" fill="rgba(255,255,255,.18)"/><ellipse cy={5.5} rx={7} ry={2} fill="none" stroke={el.color||'#f97316'} strokeWidth={1.5}/></g>
    case 'disc': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{selRing}<ellipse rx={8} ry={4} fill={el.color||'#eab308'} stroke="rgba(0,0,0,.15)" strokeWidth={.5}/><ellipse cy={-1} rx={6} ry={3} fill="rgba(255,255,255,.12)"/></g>
    case 'ring': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{selRing}<ellipse rx={10} ry={5} fill="none" stroke={el.color||'#3b82f6'} strokeWidth={2.5}/></g>
    case 'ball': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{selRing}<defs><radialGradient id={`bg${el.id}`} cx="40%" cy="35%"><stop offset="0%" stopColor="#fff"/><stop offset="100%" stopColor="#ccc"/></radialGradient></defs><circle r={7} fill={`url(#bg${el.id})`} stroke={sel?hi:'#888'} strokeWidth={sel?2:.8}/><path d="M 0,-3 L 2.8,-.9 L 1.7,2.4 L -1.7,2.4 L -2.8,-.9 Z" fill="none" stroke="#666" strokeWidth={.6}/></g>
    case 'goal': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y}) rotate(${el.rotation||0})`}>{sel&&<rect x={-26} y={-18} width={52} height={36} fill="none" stroke={hi} strokeWidth={1.5} strokeDasharray="3 2" rx={3}/>}<rect x={-22} y={-14} width={44} height={28} fill="rgba(255,255,255,.04)" rx={1}/>{Array.from({length:9},(_,i)=><line key={i} x1={-22+i*5.5} y1={-14} x2={-22+i*5.5} y2={14} stroke="rgba(255,255,255,.1)" strokeWidth={.3}/>)}{Array.from({length:5},(_,i)=><line key={`h${i}`} x1={-22} y1={-14+i*7} x2={22} y2={-14+i*7} stroke="rgba(255,255,255,.1)" strokeWidth={.3}/>)}<path d="M -22,-14 L -22,14" stroke="#eee" strokeWidth={3} strokeLinecap="round"/><path d="M 22,-14 L 22,14" stroke="#eee" strokeWidth={3} strokeLinecap="round"/><path d="M -22,-14 L 22,-14" stroke="#eee" strokeWidth={3} strokeLinecap="round"/><rect x={-22} y={-14} width={44} height={28} fill="none" stroke={sel?hi:'rgba(255,255,255,.4)'} strokeWidth={sel?2:.6} rx={1}/></g>
    case 'minigoal': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y}) rotate(${el.rotation||0})`}>{selRing}<rect x={-13} y={-9} width={26} height={18} fill="rgba(255,255,255,.04)" stroke={sel?hi:'#ccc'} strokeWidth={1.2} rx={1}/>{Array.from({length:5},(_,i)=><line key={i} x1={-13+i*6.5} y1={-9} x2={-13+i*6.5} y2={9} stroke="rgba(255,255,255,.08)" strokeWidth={.3}/>)}</g>
    case 'barrier': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y}) rotate(${el.rotation||0})`}>{selRing}<rect x={-17} y={-3.5} width={34} height={7} rx={2} fill="#fbbf24" stroke={sel?hi:'#92400e'} strokeWidth={sel?2:1}/><rect x={-17} y={-5} width={34} height={2} rx={1} fill="#fcd34d"/><line x1={-11} y1={3.5} x2={-13} y2={10} stroke="#92400e" strokeWidth={1.5} strokeLinecap="round"/><line x1={11} y1={3.5} x2={13} y2={10} stroke="#92400e" strokeWidth={1.5} strokeLinecap="round"/></g>
    case 'ladder': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y}) rotate(${el.rotation||0})`}>{selRing}<line x1={-20} y1={-5} x2={20} y2={-5} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round"/><line x1={-20} y1={5} x2={20} y2={5} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round"/>{[-14,-7,0,7,14].map(dx=><line key={dx} x1={dx} y1={-5} x2={dx} y2={5} stroke="#fbbf24" strokeWidth={1.2}/>)}</g>
    case 'pole': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{selRing}<line y1={-14} y2={6} stroke={sel?hi:'#94a3b8'} strokeWidth={2.5} strokeLinecap="round"/><circle cy={-14} r={3} fill="#ef4444"/><ellipse cy={7} rx={4} ry={1.5} fill="rgba(0,0,0,.2)"/></g>
    case 'mannequin': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{selRing}<ellipse cy={14} rx={6} ry={2} fill="rgba(0,0,0,.18)"/><circle cy={-11} r={5} fill="none" stroke={sel?hi:'#94a3b8'} strokeWidth={1.8}/><line y1={-6} y2={5} stroke="#94a3b8" strokeWidth={2}/><line x1={-9} y1={-2} x2={9} y2={-2} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"/><line y1={5} x2={-7} y2={14} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"/><line y1={5} x2={7} y2={14} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round"/></g>
    case 'arrow': {
      const x2=el.x2??el.x+60, y2=el.y2??el.y, col=el.color||'#fff', dc=sel?hi:col
      const ang=Math.atan2(y2-el.y,x2-el.x)*180/Math.PI
      if (el.wave) {
        const dx=x2-el.x,dy=y2-el.y,len=Math.sqrt(dx*dx+dy*dy),nx=-dy/len,ny=dx/len
        const steps=Math.max(4,Math.round(len/20))
        let d=`M ${el.x},${el.y}`
        for(let i=1;i<=steps;i++){const t=i/steps;const amp=(i%2===0?8:-8)*(i<steps?1:0);d+=` Q ${el.x+dx*(t-.5/steps)+nx*amp},${el.y+dy*(t-.5/steps)+ny*amp} ${el.x+dx*t},${el.y+dy*t}`}
        return <g onMouseDown={onDown} onTouchStart={onDown} style={S}><path d={d} fill="none" stroke={dc} strokeWidth={2}/><path d={d} fill="none" stroke="transparent" strokeWidth={14}/><polygon points="0,-5 11,0 0,5" fill={dc} transform={`translate(${x2},${y2}) rotate(${ang})`}/></g>
      }
      return <g onMouseDown={onDown} onTouchStart={onDown} style={S}><line x1={el.x} y1={el.y} x2={x2} y2={y2} stroke={dc} strokeWidth={2.2} strokeDasharray={el.dashed?'8 4':'none'} strokeLinecap="round"/><line x1={el.x} y1={el.y} x2={x2} y2={y2} stroke="transparent" strokeWidth={14}/><polygon points="0,-4.5 10,0 0,4.5" fill={dc} transform={`translate(${x2},${y2}) rotate(${ang})`}/></g>
    }
    case 'zone': {
      const zw=el.w||60, zh=el.h||40
      const rw = el._rw, rh = el._rh
      const area = rw && rh ? rw * rh : 0
      return <g onMouseDown={onDown} onTouchStart={onDown} style={S}>
        {sel&&<rect x={el.x-2} y={el.y-2} width={zw+4} height={zh+4} fill="none" stroke={hi} strokeWidth={1.5} strokeDasharray="3 2" rx={4}/>}
        <rect x={el.x} y={el.y} width={zw} height={zh} fill={`${el.color||'#3b82f6'}20`} stroke={`${el.color||'#3b82f6'}77`} strokeWidth={1.5} strokeDasharray="5 3" rx={3}/>
        {rw && rh && <>
          <text x={el.x+zw/2} y={el.y-5} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,.85)" fontWeight={800} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{rw}m × {rh}m</text>
          <text x={el.x+zw/2} y={el.y+zh/2+4} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,.7)" fontWeight={700} fontFamily="system-ui" style={{pointerEvents:'none'} as any}>{area}m²</text>
        </>}
      </g>
    }
    case 'text': return <g onMouseDown={onDown} onTouchStart={onDown} style={S} transform={`translate(${el.x},${el.y})`}>{sel&&<rect x={-3} y={-(el.fontSize||13)} width={Math.max(30,(el.text?.length||3)*(el.fontSize||13)*.55+6)} height={(el.fontSize||13)+4} fill="rgba(163,230,53,.1)" stroke={hi} strokeWidth={1} rx={2}/>}<text fontSize={el.fontSize||13} fill="#fff" fontWeight={700} fontFamily="system-ui" style={{pointerEvents:'none',userSelect:'none'} as any}>{el.text||''}</text></g>
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════════════
// BUTTON HELPER
// ═══════════════════════════════════════════════════════════════════
const tb = (active:boolean, extra?:React.CSSProperties):React.CSSProperties => ({
  padding:'4px 6px',fontSize:9,fontWeight:700,borderRadius:5,cursor:'pointer',
  border:`1px solid ${active?'#a3e635':'rgba(255,255,255,.06)'}`,
  background:active?'rgba(163,230,53,.1)':'rgba(255,255,255,.02)',
  color:active?'#a3e635':'#8896a8',
  display:'flex',flexDirection:'column',alignItems:'center',gap:1,
  transition:'all .1s',minWidth:36,...extra
})
const lbl:React.CSSProperties = {fontSize:7,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:4}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function TacticalBoard({ initialData, onSave, onClose, readOnly, onZoneInfo }:BoardProps) {
  const [field, setField] = useState<FieldType>(initialData?.field||'F11')
  const [orient, setOrient] = useState<Orientation>(initialData?.orientation||'horizontal')
  const [elements, setElements] = useState<El[]>(initialData?.elements||[])
  const [series, setSeries] = useState<El[][]>(initialData?.series||[initialData?.elements||[]])
  const [actSerie, setActSerie] = useState(0)
  const [hist, setHist] = useState<El[][]>([initialData?.elements||[]])
  const [hI, setHI] = useState(0)
  const [tool, setTool] = useState<Tool>('select')
  const [selId, setSelId] = useState<string|null>(null)
  const [pCol, setPCol] = useState(COLORS[0])
  const [pNum, setPNum] = useState(1)
  const [arrCol, setArrCol] = useState('#ffffff')
  const [zCol, setZCol] = useState('#3b82f6')
  const [showGrid, setShowGrid] = useState(false)
  const [drag, setDrag] = useState<{id:string;ox:number;oy:number}|null>(null)
  const [draw, setDraw] = useState<{sx:number;sy:number}|null>(null)
  const [prev, setPrev] = useState<{x:number;y:number}|null>(null)
  const [txtP, setTxtP] = useState<{x:number;y:number}|null>(null)
  const [txtV, setTxtV] = useState('')
  const ref = useRef<SVGSVGElement>(null)

  // ViewBox based on field + orientation
  const cfg = FIELD_CFG[field]
  const ratio = cfg.mW / cfg.mH
  const baseW = 860
  const vbW = orient==='horizontal' ? baseW : Math.round(baseW / ratio)
  const vbH = orient==='horizontal' ? Math.round(baseW / ratio) : baseW

  useEffect(() => { setSeries(p => { const c=[...p]; c[actSerie]=elements; return c }) }, [elements])
  useEffect(() => {
    if (!onZoneInfo) return
    const zones = elements.filter(e => e.type === 'zone' && e._rw && e._rh).map(e => ({ rw: e._rw!, rh: e._rh!, area: e._rw! * e._rh! }))
    onZoneInfo(zones)
  }, [elements, onZoneInfo])

  // Recalculate zone real dimensions when field type changes
  useEffect(() => {
    const fieldPxW = vbW - 60, fieldPxH = vbH - 60
    setElements(prev => prev.map(el => {
      if (el.type !== 'zone' || !el.w || !el.h) return el
      return { ...el, _rw: Math.round((el.w / fieldPxW) * cfg.mW), _rh: Math.round((el.h / fieldPxH) * cfg.mH) }
    }))
  }, [field])

  const push = useCallback((els:El[])=>{setHist(p=>[...p.slice(0,hI+1),els].slice(-50));setHI(p=>p+1);setElements(els)},[hI])
  const undo = ()=>{ if(hI>0){setHI(hI-1);setElements(hist[hI-1])} }
  const redo = ()=>{ if(hI<hist.length-1){setHI(hI+1);setElements(hist[hI+1])} }

  const pt = useCallback((e:any)=>{
    const svg=ref.current; if(!svg) return {x:0,y:0}
    const r=svg.getBoundingClientRect()
    const cx2=e.touches?.[0]?.clientX??e.clientX, cy2=e.touches?.[0]?.clientY??e.clientY
    return { x:((cx2-r.left)/r.width)*vbW, y:((cy2-r.top)/r.height)*vbH }
  },[vbW,vbH])

  const down = (e:any)=>{
    if(readOnly) return; const p=pt(e)
    if(tool==='select'){setSelId(null);return}
    if(tool.startsWith('arrow')||tool==='zone'){setDraw({sx:p.x,sy:p.y});setPrev(p);return}
    if(tool==='text'){setTxtP(p);return}
    const el:El = {id:uid(),type:tool,x:p.x,y:p.y}
    if(tool==='player'){el.color=pCol;el.number=pNum;setPNum(n=>n+1)}
    if(['cone','disc','ring'].includes(tool)) el.color='#f97316'
    push([...elements,el])
  }
  const move = (e:any)=>{if(readOnly)return;const p=pt(e);if(drag)setElements(prev2=>prev2.map(el=>el.id===drag.id?{...el,x:p.x-drag.ox,y:p.y-drag.oy}:el));if(draw)setPrev(p)}
  const up = ()=>{
    if(drag){push([...elements]);setDrag(null);return}
    if(draw&&prev){
      const{sx,sy}=draw,{x,y}=prev
      if(Math.abs(x-sx)>8||Math.abs(y-sy)>8){
        if(tool==='zone') {
          const zoneW = Math.abs(x-sx), zoneH = Math.abs(y-sy)
          const fieldPxW = vbW - 60, fieldPxH = vbH - 60 // minus margins
          const realW = Math.round((zoneW / fieldPxW) * cfg.mW)
          const realH = Math.round((zoneH / fieldPxH) * cfg.mH)
          push([...elements,{id:uid(),type:'zone',x:Math.min(sx,x),y:Math.min(sy,y),w:zoneW,h:zoneH,color:zCol,_rw:realW,_rh:realH} as any])
        }
        else push([...elements,{id:uid(),type:'arrow',x:sx,y:sy,x2:x,y2:y,dashed:tool==='arrow_dashed',wave:tool==='arrow_wave',color:arrCol}])
      }
      setDraw(null);setPrev(null)
    }
  }
  const elDown = (e:any,el:El)=>{e.stopPropagation();if(readOnly||tool!=='select')return;setSelId(el.id);const p=pt(e);setDrag({id:el.id,ox:p.x-el.x,oy:p.y-el.y})}
  const addTxt = ()=>{if(!txtP||!txtV.trim()){setTxtP(null);return};push([...elements,{id:uid(),type:'text',x:txtP.x,y:txtP.y,text:txtV.trim()}]);setTxtV('');setTxtP(null)}
  const del = ()=>{if(selId){push(elements.filter(e=>e.id!==selId));setSelId(null)}}
  const dup = ()=>{const el=elements.find(e=>e.id===selId);if(!el)return;const ne={...el,id:uid(),x:el.x+20,y:el.y+20};if(ne.x2)ne.x2+=20;if(ne.y2)ne.y2+=20;push([...elements,ne]);setSelId(ne.id)}
  const rotate = ()=>{if(!selId)return;setElements(p=>p.map(el=>el.id===selId?{...el,rotation:((el.rotation||0)+90)%360}:el))}
  const clear = ()=>{if(confirm('¿Borrar todo?')){push([]);setSelId(null)}}

  // Formation
  const placeFormation = (key:string)=>{
    const f = FORMATIONS[key]; if(!f) return
    const m2=30, fw=vbW-m2*2, fh=vbH-m2*2
    const newEls:El[] = f.positions.map((pos,i)=>({
      id:uid(), type:'player', x:m2+pos[0]*fw, y:m2+pos[1]*fh,
      color: i===0 ? '#16a34a' : COLORS[0], number:i===0?1:i+1,
    }))
    push([...elements,...newEls]); setPNum(f.positions.length+1)
  }

  // Series
  const addSerie = ()=>{setSeries(p=>[...p,[]]);setActSerie(series.length);setElements([]);setSelId(null);setHist([[]]);setHI(0)}
  const switchSerie = (i:number)=>{setActSerie(i);const els=series[i]||[];setElements(els);setSelId(null);setHist([els]);setHI(0)}
  const removeSerie = (i:number)=>{if(series.length<=1)return;const c=series.filter((_,j)=>j!==i);setSeries(c);const ni=Math.min(i,c.length-1);setActSerie(ni);setElements(c[ni]||[])}

  // Export
  const getPng = async():Promise<string>=>{
    const svg=ref.current;if(!svg)return ''
    const d=new XMLSerializer().serializeToString(svg)
    const canvas=document.createElement('canvas');canvas.width=vbW*2;canvas.height=vbH*2
    const ctx=canvas.getContext('2d');if(!ctx)return ''
    const img=new Image()
    return new Promise(r=>{img.onload=()=>{ctx.drawImage(img,0,0,canvas.width,canvas.height);r(canvas.toDataURL('image/png',.85))};img.onerror=()=>r('');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(d)})
  }
  const downloadPng = async()=>{
    const png=await getPng();if(!png)return
    const a=document.createElement('a');a.href=png;a.download=`tactica_${new Date().toISOString().split('T')[0]}.png`;a.click()
  }
  const save = async()=>{const p=await getPng();onSave?.({field,elements,series,preview:p})}

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{
      if(e.target instanceof HTMLInputElement)return
      if((e.key==='Delete'||e.key==='Backspace')&&selId){e.preventDefault();del()}
      if(e.key==='Escape'){setSelId(null);setDraw(null);setTxtP(null)}
      if(e.ctrlKey&&e.key==='z'){e.preventDefault();undo()}
      if(e.ctrlKey&&e.key==='y'){e.preventDefault();redo()}
      if(e.ctrlKey&&e.key==='d'&&selId){e.preventDefault();dup()}
      if(e.key==='r'&&selId)rotate()
    }
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[selId,hI,elements])

  const availableFormations = Object.entries(FORMATIONS).filter(([,f])=>f.forField.includes(field))

  if(readOnly){
    return <div style={{borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,.05)'}}>
      <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{width:'100%',display:'block'}}>
        <rect width={vbW} height={vbH} fill="#1a472a"/>
        <FieldSVG type={field} vbW={vbW} vbH={vbH} showGrid={false}/>
        {elements.map(el=><Elem key={el.id} el={el} sel={false} onDown={()=>{}}/>)}
      </svg>
    </div>
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {/* Toolbar */}
      <div style={{background:'rgba(10,15,25,.97)',border:'1px solid rgba(255,255,255,.05)',borderRadius:10,padding:'8px 12px',display:'flex',gap:10,alignItems:'flex-start',flexWrap:'wrap'}}>
        {/* Field + orient */}
        <div>
          <div style={lbl}>Cancha</div>
          <div style={{display:'flex',gap:2}}>
            {(['F11','F11_half','F9','F7','F5'] as const).map(f=>(
              <button key={f} onClick={()=>setField(f)} style={tb(field===f)}><span style={{fontSize:10,fontWeight:900}}>{FIELD_CFG[f].label.replace('F11 ','').replace('F5 ','')}</span></button>
            ))}
            <button onClick={()=>setOrient(o=>o==='horizontal'?'vertical':'horizontal')} style={tb(false)} title="Rotar campo">
              <span style={{fontSize:12}}>{orient==='horizontal'?'⬌':'⬍'}</span>
            </button>
          </div>
        </div>

        {/* Select */}
        <div>
          <div style={lbl}>Herram.</div>
          <div style={{display:'flex',gap:2}}>
            <button onClick={()=>setTool('select')} style={tb(tool==='select')}>
              <svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 1L3 13L7 9L11 13L13 11L9 7L13 3Z" fill="currentColor"/></svg>
              <span style={{fontSize:8}}>Mover</span>
            </button>
          </div>
        </div>

        {/* Players */}
        <div>
          <div style={lbl}>Jugadores</div>
          <div style={{display:'flex',gap:2}}>
            <button onClick={()=>setTool('player')} style={tb(tool==='player')}><span style={{fontSize:14}}>●</span><span style={{fontSize:8}}>Jugador</span></button>
            <button onClick={()=>setTool('ball')} style={tb(tool==='ball')}><span style={{fontSize:14}}>◎</span><span style={{fontSize:8}}>Pelota</span></button>
          </div>
        </div>

        {/* Materials */}
        <div>
          <div style={lbl}>Materiales</div>
          <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
            {([['cone','Cono','▲'],['disc','Tortuga','◆'],['ring','Aro','○'],['barrier','Valla','▬'],['goal','Arco','⊓'],['minigoal','Mini','⊔'],['ladder','Escal.','≡'],['pole','Pica','|'],['mannequin','Maniq.','♟']] as [Tool,string,string][]).map(([k,l2,ic])=>(
              <button key={k} onClick={()=>setTool(k)} style={tb(tool===k)}><span style={{fontSize:12}}>{ic}</span><span style={{fontSize:7}}>{l2}</span></button>
            ))}
          </div>
        </div>

        {/* Drawing */}
        <div>
          <div style={lbl}>Dibujo</div>
          <div style={{display:'flex',gap:2}}>
            {([['arrow_solid','Flecha','→'],['arrow_dashed','Pase','⇢'],['arrow_wave','Dribling','〰'],['zone','Zona','□'],['text','Texto','T']] as [Tool,string,string][]).map(([k,l2,ic])=>(
              <button key={k} onClick={()=>setTool(k)} style={tb(tool===k)}><span style={{fontSize:12}}>{ic}</span><span style={{fontSize:7}}>{l2}</span></button>
            ))}
          </div>
        </div>

        {/* Player color */}
        {tool==='player' && <div>
          <div style={lbl}>Color · #{pNum} <button onClick={()=>setPNum(1)} style={{fontSize:7,color:'#64748b',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Reset</button></div>
          <div style={{display:'flex',gap:3}}>
            {COLORS.map((c,i)=><button key={c} onClick={()=>setPCol(c)} style={{width:22,height:22,borderRadius:'50%',cursor:'pointer',background:c,border:pCol===c?'2.5px solid #fff':'1.5px solid rgba(0,0,0,.4)',fontSize:9,fontWeight:900,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>{i+1}</button>)}
          </div>
        </div>}

        {/* Arrow color */}
        {tool.startsWith('arrow') && <div>
          <div style={lbl}>Color</div>
          <div style={{display:'flex',gap:2}}>
            {ARR_COLS.map(c=><button key={c} onClick={()=>setArrCol(c)} style={{width:18,height:18,borderRadius:3,cursor:'pointer',background:c,border:arrCol===c?'2px solid #a3e635':'1px solid rgba(255,255,255,.15)'}}/>)}
          </div>
        </div>}

        {/* Formations */}
        {availableFormations.length > 0 && <div>
          <div style={lbl}>Formación</div>
          <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
            {availableFormations.map(([k,f])=>(
              <button key={k} onClick={()=>placeFormation(k)} style={tb(false)}><span style={{fontSize:9}}>{f.label}</span></button>
            ))}
          </div>
        </div>}

        {/* Actions */}
        <div style={{marginLeft:'auto',display:'flex',gap:4,alignItems:'flex-end',flexWrap:'wrap'}}>
          <button onClick={()=>setShowGrid(g=>!g)} style={tb(showGrid)} title="Grilla"><span style={{fontSize:10}}>⊞</span></button>
          <button onClick={undo} style={tb(false,{opacity:hI<=0?.3:1})} title="Ctrl+Z"><span style={{fontSize:12}}>↩</span></button>
          <button onClick={redo} style={tb(false,{opacity:hI>=hist.length-1?.3:1})} title="Ctrl+Y"><span style={{fontSize:12}}>↪</span></button>
          {selId&&<button onClick={dup} style={tb(false)} title="Ctrl+D"><span style={{fontSize:10}}>⧉</span></button>}
          {selId&&<button onClick={rotate} style={tb(false)} title="R"><span style={{fontSize:10}}>⟳</span></button>}
          {selId&&<button onClick={del} style={tb(false,{color:'#f87171',borderColor:'rgba(239,68,68,.25)'})}><span style={{fontSize:10}}>🗑</span></button>}
          <button onClick={downloadPng} style={tb(false)} title="Descargar PNG"><span style={{fontSize:10}}>📥</span></button>
          <button onClick={clear} style={tb(false,{color:'#f87171',borderColor:'rgba(239,68,68,.15)'})}><span style={{fontSize:8}}>Borrar</span></button>
          {onSave&&<button onClick={save} style={tb(true,{padding:'5px 14px'})}><span style={{fontSize:10}}>💾 Guardar</span></button>}
          {onClose&&<button onClick={onClose} style={tb(false)}><span style={{fontSize:10}}>✕</span></button>}
        </div>
      </div>

      {/* Series */}
      <div style={{display:'flex',gap:4,alignItems:'center',fontSize:10}}>
        <span style={{color:'#475569',fontWeight:700,fontSize:8,textTransform:'uppercase',letterSpacing:'.1em'}}>Series:</span>
        {series.map((_,i)=>(
          <div key={i} style={{display:'flex'}}>
            <button onClick={()=>switchSerie(i)} style={{padding:'4px 12px',fontSize:11,fontWeight:700,cursor:'pointer',borderRadius:series.length>1?'6px 0 0 6px':'6px',border:`1px solid ${actSerie===i?'#a3e635':'rgba(255,255,255,.08)'}`,background:actSerie===i?'rgba(163,230,53,.1)':'rgba(255,255,255,.02)',color:actSerie===i?'#a3e635':'#64748b'}}>S{i+1}</button>
            {series.length>1&&<button onClick={()=>removeSerie(i)} style={{padding:'4px 6px',fontSize:9,cursor:'pointer',borderRadius:'0 6px 6px 0',border:'1px solid rgba(239,68,68,.15)',borderLeft:'none',background:'rgba(239,68,68,.05)',color:'#f87171'}}>✕</button>}
          </div>
        ))}
        <button onClick={addSerie} style={{padding:'4px 10px',fontSize:10,fontWeight:700,cursor:'pointer',borderRadius:6,border:'1px solid rgba(163,230,53,.2)',background:'rgba(163,230,53,.04)',color:'#a3e635'}}>+ Serie</button>
      </div>

      {/* Text input */}
      {txtP&&<div style={{display:'flex',gap:6,alignItems:'center',padding:'5px 10px',background:'rgba(10,15,25,.97)',borderRadius:8,border:'1px solid #a3e635'}}>
        <input autoFocus value={txtV} onChange={e=>setTxtV(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTxt()} style={{flex:1,background:'transparent',border:'1px solid rgba(255,255,255,.1)',borderRadius:4,padding:'3px 8px',fontSize:12,color:'#fff',outline:'none'}} placeholder="Texto..."/>
        <button onClick={addTxt} style={{padding:'3px 10px',fontSize:10,fontWeight:700,borderRadius:4,border:'1px solid #a3e635',background:'rgba(163,230,53,.1)',color:'#a3e635',cursor:'pointer'}}>OK</button>
        <button onClick={()=>setTxtP(null)} style={{background:'none',border:'none',color:'#475569',cursor:'pointer'}}>✕</button>
      </div>}

      {/* Canvas */}
      <div style={{borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,.05)',boxShadow:'0 6px 30px rgba(0,0,0,.5)'}}>
        <svg ref={ref} viewBox={`0 0 ${vbW} ${vbH}`}
          style={{width:'100%',display:'block',cursor:tool==='select'?'default':'crosshair',touchAction:'none'}}
          onMouseDown={down} onMouseMove={move} onMouseUp={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up}
          onMouseLeave={()=>{setDrag(null);setDraw(null);setPrev(null)}}>
          <rect width={vbW} height={vbH} fill="#1a472a"/>
          <FieldSVG type={field} vbW={vbW} vbH={vbH} showGrid={showGrid}/>
          {draw&&prev&&tool.startsWith('arrow')&&<line x1={draw.sx} y1={draw.sy} x2={prev.x} y2={prev.y} stroke="rgba(163,230,53,.35)" strokeWidth={2} strokeDasharray={tool==='arrow_dashed'?'6 4':'none'}/>}
          {draw&&prev&&tool==='zone'&&<rect x={Math.min(draw.sx,prev.x)} y={Math.min(draw.sy,prev.y)} width={Math.abs(prev.x-draw.sx)} height={Math.abs(prev.y-draw.sy)} fill="rgba(163,230,53,.06)" stroke="rgba(163,230,53,.3)" strokeWidth={1.5} strokeDasharray="4 3"/>}
          {elements.map(el=><Elem key={el.id} el={el} sel={el.id===selId} onDown={(e:any)=>elDown(e,el)}/>)}
          {/* Zone dimension labels (real meters) */}
          {elements.filter(e=>e.type==='zone').map(z=>{
            const zw=z.w||60, zh=z.h||40
            const scaleX=cfg.mW/(vbW-60), scaleY=cfg.mH/(vbH-60)
            const mW2=Math.round(zw*scaleX), mH2=Math.round(zh*scaleY)
            return <g key={`zl_${z.id}`} style={{pointerEvents:'none'}}>
              <text x={z.x+zw/2} y={z.y-5} textAnchor="middle" fontSize={10} fontWeight={700} fill="rgba(255,255,255,.8)" fontFamily="system-ui">{mW2}m × {mH2}m</text>
              <text x={z.x+zw/2} y={z.y+zh/2+4} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,.5)" fontFamily="system-ui">{mW2*mH2} m²</text>
            </g>
          })}
        </svg>
      </div>

      {/* Density calculator */}
      {(()=>{
        const zones = elements.filter(e=>e.type==='zone')
        const players = elements.filter(e=>e.type==='player')
        if(zones.length===0) return null
        const scaleX=cfg.mW/(vbW-60), scaleY=cfg.mH/(vbH-60)
        // Use largest zone
        const z = zones.reduce((a,b)=>((a.w||60)*(a.h||40)>(b.w||60)*(b.h||40)?a:b))
        const mW2=Math.round((z.w||60)*scaleX), mH2=Math.round((z.h||40)*scaleY)
        const area = mW2*mH2
        // Count players inside the zone
        const inside = players.filter(p=>p.x>=z.x&&p.x<=(z.x+(z.w||60))&&p.y>=z.y&&p.y<=(z.y+(z.h||40))).length
        const totalP = players.length
        const nJug = inside > 0 ? inside : totalP
        const densidad = nJug > 0 ? area / nJug : 0
        // Castellano classification
        const getCuad = (d:number,j:number) => {
          if(j<=4) { if(d<50) return {cat:'Fuerza/Velocidad',col:'#ef4444',icon:'🔴'}; if(d<100) return {cat:'Activación/Recuperación',col:'#22c55e',icon:'🟢'}; if(d<200) return {cat:'Activación/Recuperación',col:'#22c55e',icon:'🟢'}; return {cat:'Activación/Recuperación',col:'#22c55e',icon:'🟢'} }
          if(j<=8) { if(d<50) return {cat:'Fuerza',col:'#ef4444',icon:'🔴'}; if(d<100) return {cat:'Resistencia',col:'#f59e0b',icon:'🟡'}; if(d<200) return {cat:'Resistencia/Velocidad',col:'#f59e0b',icon:'🟡'}; return {cat:'Velocidad',col:'#3b82f6',icon:'🔵'} }
          if(j<=14) { if(d<50) return {cat:'Fuerza',col:'#ef4444',icon:'🔴'}; if(d<100) return {cat:'Fuerza/Resistencia',col:'#ef4444',icon:'🟠'}; if(d<200) return {cat:'Resistencia',col:'#f59e0b',icon:'🟡'}; return {cat:'Velocidad/Resistencia',col:'#3b82f6',icon:'🔵'} }
          if(d<50) return {cat:'Fuerza',col:'#ef4444',icon:'🔴'}; if(d<100) return {cat:'Fuerza/Resistencia',col:'#ef4444',icon:'🟠'}; if(d<200) return {cat:'Resistencia',col:'#f59e0b',icon:'🟡'}; return {cat:'Velocidad',col:'#3b82f6',icon:'🔵'}
        }
        const cuad = nJug > 0 ? getCuad(densidad,nJug) : null
        return (
          <div style={{background:'rgba(10,15,25,.97)',border:'1px solid rgba(255,255,255,.05)',borderRadius:10,padding:'10px 14px',display:'flex',gap:16,alignItems:'center',flexWrap:'wrap',fontSize:11}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:8,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.1em'}}>Espacio:</span>
              <span style={{color:'#a3e635',fontWeight:700}}>{mW2}m × {mH2}m</span>
              <span style={{color:'#64748b'}}>= {area} m²</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:8,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.1em'}}>Jugadores:</span>
              <span style={{color:'#eab308',fontWeight:700}}>{nJug} {inside>0?'(en zona)':'(total)'}</span>
            </div>
            {nJug>0&&<div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:8,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.1em'}}>Densidad:</span>
              <span style={{color:'#06b6d4',fontWeight:700}}>{densidad.toFixed(0)} m²/jug</span>
            </div>}
            {cuad&&<div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:8,fontWeight:800,color:'#3e4c5e',textTransform:'uppercase',letterSpacing:'.1em'}}>Clasificación:</span>
              <span style={{fontWeight:800,color:cuad.col}}>{cuad.icon} {cuad.cat}</span>
              <span style={{fontSize:8,color:'#475569'}}>(Castellano & Casamichana)</span>
            </div>}
          </div>
        )
      })()}

      {/* Status */}
      <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'#3e4c5e',padding:'0 2px'}}>
        <span>{elements.length} elem · {FIELD_CFG[field].label} · {orient==='horizontal'?'Horizontal':'Vertical'} · Serie {actSerie+1}/{series.length}</span>
        <span>Click colocar · Arrastrar mover · R rotar · Ctrl+D duplicar · Del eliminar · Ctrl+Z deshacer</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════════════════════
export function TacticalPreview({ data }:{ data:{field:FieldType;elements:El[]} }) {
  if(!data?.elements?.length) return null
  const cfg=FIELD_CFG[data.field]; const ratio=cfg.mW/cfg.mH
  const vbW=860, vbH=Math.round(860/ratio)
  return <div style={{borderRadius:8,overflow:'hidden',border:'1px solid rgba(255,255,255,.05)'}}>
    <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{width:'100%',display:'block'}}>
      <rect width={vbW} height={vbH} fill="#1a472a"/>
      <FieldSVG type={data.field} vbW={vbW} vbH={vbH} showGrid={false}/>
      {data.elements.map(el=><Elem key={el.id} el={el} sel={false} onDown={()=>{}}/>)}
    </svg>
  </div>
}
