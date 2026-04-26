'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════
type Tool = 'select'|'player'|'cone'|'disc'|'ring'|'ball'|'goal'|'minigoal'|'barrier'|'ladder'|'pole'|'mannequin'|'arrow_solid'|'arrow_dashed'|'arrow_wave'|'zone'|'text'
type FieldType = 'F11'|'F11_half'|'F9'|'F7'|'F5'

interface El {
  id: string; type: string; x: number; y: number
  x2?: number; y2?: number; cx?: number; cy?: number
  w?: number; h?: number; color?: string; number?: number | string
  label?: string; text?: string; dashed?: boolean; wave?: boolean
  fontSize?: number; rotation?: number
}

interface BoardProps {
  initialData?: { field: FieldType; elements: El[]; series?: El[][] }
  onSave?: (d: { field: FieldType; elements: El[]; series: El[][]; preview: string }) => void
  onClose?: () => void
  readOnly?: boolean
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════
const W = 860, H = 570, M = 32
const COLORS = ['#2563eb','#dc2626','#eab308','#16a34a','#ea580c','#9333ea']
const COLOR_LABELS = ['Azul','Rojo','Amarillo','Verde','Naranja','Violeta']
const ARROW_COLORS = ['#ffffff','#eab308','#ef4444','#3b82f6','#22c55e','#f97316']

let _n = 0
const id = () => `_${Date.now().toString(36)}_${_n++}`

// ════════════════════════════════════════════════════════════════════════════════
// FIELD RENDERER
// ════════════════════════════════════════════════════════════════════════════════
function Field({ type }: { type: FieldType }) {
  const c = 'rgba(255,255,255,.88)', lw = 1.8
  const fw = W - M * 2, fh = H - M * 2

  // Grass
  const grass = useMemo(() => {
    const n = type === 'F11_half' ? 7 : 13
    const stripeW = (type === 'F11_half' ? fw / 2 : fw) / n
    return Array.from({ length: n }, (_, i) => (
      <rect key={i} x={M + i * stripeW} y={M} width={stripeW + 0.5} height={fh}
        fill={i % 2 === 0 ? '#2d8c4e' : '#339956'} />
    ))
  }, [type, fw, fh])

  const cx = M + fw / 2, cy = M + fh / 2
  const paW = fw * 0.128, paH = fh * 0.44
  const gaW = fw * 0.048, gaH = fh * 0.22
  const arcR = fh * 0.12, dotR = 2.2, cornerR = 9
  const goalH = fh * 0.155, goalW = 13

  const penalty = (side: 'L' | 'R') => {
    const sx = side === 'L' ? M : M + fw - paW
    const gx = side === 'L' ? M : M + fw - gaW
    const px = side === 'L' ? M + paW * 0.77 : M + fw - paW * 0.77
    const arcX = side === 'L' ? M + paW : M + fw - paW
    const arcFlag = side === 'L' ? '0,1' : '0,0'
    return (<>
      <rect x={sx} y={cy - paH / 2} width={paW} height={paH} fill="none" stroke={c} strokeWidth={lw} />
      <rect x={gx} y={cy - gaH / 2} width={gaW} height={gaH} fill="none" stroke={c} strokeWidth={lw} />
      <circle cx={px} cy={cy} r={dotR} fill={c} />
      <path d={`M ${arcX},${cy - arcR} A ${arcR},${arcR} 0 ${arcFlag} ${arcX},${cy + arcR}`} fill="none" stroke={c} strokeWidth={lw} />
    </>)
  }

  const goal = (side: 'L' | 'R') => {
    const gx = side === 'L' ? M - goalW : M + fw
    return <rect x={gx} y={cy - goalH / 2} width={goalW} height={goalH} fill="none" stroke={c} strokeWidth={1} strokeDasharray="3 2" />
  }

  const corners = (<>
    <path d={`M ${M},${M + cornerR} A ${cornerR},${cornerR} 0 0,1 ${M + cornerR},${M}`} fill="none" stroke={c} strokeWidth={lw} />
    <path d={`M ${M + fw - cornerR},${M} A ${cornerR},${cornerR} 0 0,1 ${M + fw},${M + cornerR}`} fill="none" stroke={c} strokeWidth={lw} />
    <path d={`M ${M + cornerR},${M + fh} A ${cornerR},${cornerR} 0 0,1 ${M},${M + fh - cornerR}`} fill="none" stroke={c} strokeWidth={lw} />
    <path d={`M ${M + fw},${M + fh - cornerR} A ${cornerR},${cornerR} 0 0,1 ${M + fw - cornerR},${M + fh}`} fill="none" stroke={c} strokeWidth={lw} />
  </>)

  if (type === 'F11') return (<g>
    {grass}
    <rect x={M} y={M} width={fw} height={fh} fill="none" stroke={c} strokeWidth={lw} />
    <line x1={cx} y1={M} x2={cx} y2={M + fh} stroke={c} strokeWidth={lw} />
    <circle cx={cx} cy={cy} r={fh * 0.128} fill="none" stroke={c} strokeWidth={lw} />
    <circle cx={cx} cy={cy} r={dotR} fill={c} />
    {penalty('L')}{penalty('R')}{goal('L')}{goal('R')}{corners}
  </g>)

  if (type === 'F11_half') {
    const hw = fw / 2
    return (<g>
      {grass}
      <rect x={M} y={M} width={hw} height={fh} fill="none" stroke={c} strokeWidth={lw} />
      {penalty('L')}{goal('L')}
      <path d={`M ${M + hw},${cy - fh * 0.128} A ${fh * 0.128},${fh * 0.128} 0 0,0 ${M + hw},${cy + fh * 0.128}`} fill="none" stroke={c} strokeWidth={lw} />
      <circle cx={M + hw} cy={cy} r={dotR} fill={c} />
      <path d={`M ${M},${M + cornerR} A ${cornerR},${cornerR} 0 0,1 ${M + cornerR},${M}`} fill="none" stroke={c} strokeWidth={lw} />
      <path d={`M ${M + cornerR},${M + fh} A ${cornerR},${cornerR} 0 0,1 ${M},${M + fh - cornerR}`} fill="none" stroke={c} strokeWidth={lw} />
    </g>)
  }

  // F9, F7, F5 — same as F11 but conceptually smaller pitch
  return (<g>
    {grass}
    <rect x={M} y={M} width={fw} height={fh} fill="none" stroke={c} strokeWidth={lw} />
    <line x1={cx} y1={M} x2={cx} y2={M + fh} stroke={c} strokeWidth={lw} />
    <circle cx={cx} cy={cy} r={fh * 0.11} fill="none" stroke={c} strokeWidth={lw} />
    <circle cx={cx} cy={cy} r={dotR} fill={c} />
    {penalty('L')}{penalty('R')}{goal('L')}{goal('R')}{corners}
  </g>)
}

// ════════════════════════════════════════════════════════════════════════════════
// ELEMENT RENDERERS — each material has a custom, detailed SVG
// ════════════════════════════════════════════════════════════════════════════════
function Elem({ el, sel, onDown }: { el: El; sel: boolean; onDown: (e: any) => void }) {
  const hi = sel ? '#a3e635' : ''
  const g_style = { cursor: 'pointer' as const }
  const wrap = (children: React.ReactNode, tx = el.x, ty = el.y) => (
    <g onMouseDown={onDown} onTouchStart={onDown} style={g_style} transform={`translate(${tx},${ty})`}>
      {sel && <circle r={20} fill="none" stroke="#a3e635" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />}
      {children}
    </g>
  )

  switch (el.type) {
    case 'player': {
      const col = el.color || COLORS[0]
      return wrap(<>
        <defs>
          <radialGradient id={`pg_${el.id}`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,.35)" />
            <stop offset="100%" stopColor="rgba(0,0,0,.15)" />
          </radialGradient>
        </defs>
        <ellipse cx={0} cy={3} rx={11} ry={3.5} fill="rgba(0,0,0,.3)" />
        <circle r={13} fill={col} />
        <circle r={13} fill={`url(#pg_${el.id})`} />
        <circle r={13} fill="none" stroke={sel ? hi : 'rgba(0,0,0,.25)'} strokeWidth={sel ? 2.5 : 1.2} />
        <text textAnchor="middle" dy={4.5} fontSize={12} fontWeight={900} fill="#fff" fontFamily="system-ui,-apple-system,sans-serif"
          style={{ pointerEvents: 'none', userSelect: 'none' } as any}>{el.number ?? ''}</text>
        {el.label && <text textAnchor="middle" y={22} fontSize={7.5} fill="rgba(255,255,255,.85)" fontWeight={700}
          style={{ pointerEvents: 'none' } as any}>{el.label}</text>}
      </>)
    }

    case 'cone': {
      const col = el.color || '#f97316'
      return wrap(<>
        <ellipse cx={0} cy={6} rx={7} ry={2.5} fill={`${col}44`} />
        <path d="M 0,-10 L 7,5 Q 0,7 -7,5 Z" fill={col} stroke="rgba(0,0,0,.2)" strokeWidth={0.5} />
        <path d="M 0,-10 L 3,0 L -3,0 Z" fill="rgba(255,255,255,.2)" />
        <ellipse cx={0} cy={5.5} rx={7} ry={2} fill="none" stroke={col} strokeWidth={1.5} />
      </>)
    }

    case 'disc': {
      const col = el.color || '#eab308'
      return wrap(<>
        <ellipse cx={0} cy={0} rx={8} ry={4} fill={col} stroke="rgba(0,0,0,.2)" strokeWidth={0.5} />
        <ellipse cx={0} cy={-1} rx={6} ry={3} fill="rgba(255,255,255,.15)" />
      </>)
    }

    case 'ring': {
      const col = el.color || '#3b82f6'
      return wrap(<>
        <ellipse cx={0} cy={0} rx={10} ry={5} fill="none" stroke={col} strokeWidth={2.5} />
        <ellipse cx={0} cy={-1} rx={10} ry={5} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={1} />
      </>)
    }

    case 'ball':
      return wrap(<>
        <defs><radialGradient id={`bg_${el.id}`} cx="40%" cy="35%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#ccc" /></radialGradient></defs>
        <circle r={7} fill={`url(#bg_${el.id})`} stroke={sel ? hi : '#888'} strokeWidth={sel ? 2 : 0.8} />
        <path d="M 0,-3 L 2.8,-0.9 L 1.7,2.4 L -1.7,2.4 L -2.8,-0.9 Z" fill="none" stroke="#666" strokeWidth={0.6} />
      </>)

    case 'goal': {
      const r = el.rotation || 0
      return (
        <g onMouseDown={onDown} onTouchStart={onDown} style={g_style} transform={`translate(${el.x},${el.y}) rotate(${r})`}>
          {sel && <rect x={-26} y={-18} width={52} height={36} fill="none" stroke="#a3e635" strokeWidth={1.5} strokeDasharray="3 2" rx={3} />}
          <rect x={-22} y={-14} width={44} height={28} fill="rgba(255,255,255,.04)" rx={1} />
          {/* Net */}
          {Array.from({length:9},(_, i)=><line key={`v${i}`} x1={-22+i*5.5} y1={-14} x2={-22+i*5.5} y2={14} stroke="rgba(255,255,255,.12)" strokeWidth={0.3} />)}
          {Array.from({length:5},(_, i)=><line key={`h${i}`} x1={-22} y1={-14+i*7} x2={22} y2={-14+i*7} stroke="rgba(255,255,255,.12)" strokeWidth={0.3} />)}
          {/* Frame */}
          <path d="M -22,-14 L -22,14" stroke="#eee" strokeWidth={3} strokeLinecap="round" />
          <path d="M 22,-14 L 22,14" stroke="#eee" strokeWidth={3} strokeLinecap="round" />
          <path d="M -22,-14 L 22,-14" stroke="#eee" strokeWidth={3} strokeLinecap="round" />
          <rect x={-22} y={-14} width={44} height={28} fill="none" stroke={sel ? hi : 'rgba(255,255,255,.5)'} strokeWidth={sel ? 2 : 0.8} rx={1} />
        </g>
      )
    }

    case 'minigoal':
      return wrap(<>
        <rect x={-13} y={-9} width={26} height={18} fill="rgba(255,255,255,.04)" rx={1} />
        {Array.from({length:5},(_, i)=><line key={`v${i}`} x1={-13+i*6.5} y1={-9} x2={-13+i*6.5} y2={9} stroke="rgba(255,255,255,.1)" strokeWidth={0.3} />)}
        {Array.from({length:3},(_, i)=><line key={`h${i}`} x1={-13} y1={-9+i*9} x2={13} y2={-9+i*9} stroke="rgba(255,255,255,.1)" strokeWidth={0.3} />)}
        <rect x={-13} y={-9} width={26} height={18} fill="none" stroke={sel ? hi : '#ccc'} strokeWidth={1.2} rx={1} />
      </>)

    case 'barrier':
      return wrap(<>
        <rect x={-17} y={-3.5} width={34} height={7} rx={2} fill="#fbbf24"
          stroke={sel ? hi : '#92400e'} strokeWidth={sel ? 2 : 1} />
        <rect x={-17} y={-5} width={34} height={2} rx={1} fill="#fcd34d" />
        <line x1={-11} y1={3.5} x2={-13} y2={10} stroke="#92400e" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={11} y1={3.5} x2={13} y2={10} stroke="#92400e" strokeWidth={1.5} strokeLinecap="round" />
      </>)

    case 'ladder':
      return wrap(<>
        <line x1={-20} y1={-5} x2={20} y2={-5} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
        <line x1={-20} y1={5} x2={20} y2={5} stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
        {[-14,-7,0,7,14].map(dx => <line key={dx} x1={dx} y1={-5} x2={dx} y2={5} stroke="#fbbf24" strokeWidth={1.2} />)}
      </>)

    case 'pole':
      return wrap(<>
        <line x1={0} y1={-14} x2={0} y2={6} stroke={sel ? hi : '#94a3b8'} strokeWidth={2.5} strokeLinecap="round" />
        <circle cy={-14} r={3} fill="#ef4444" />
        <ellipse cx={0} cy={7} rx={4} ry={1.5} fill="rgba(0,0,0,.2)" />
      </>)

    case 'mannequin':
      return wrap(<>
        <ellipse cx={0} cy={14} rx={6} ry={2} fill="rgba(0,0,0,.2)" />
        <circle cy={-11} r={5} fill="none" stroke={sel ? hi : '#94a3b8'} strokeWidth={1.8} />
        <line x1={0} y1={-6} x2={0} y2={5} stroke="#94a3b8" strokeWidth={2} />
        <line x1={-9} y1={-2} x2={9} y2={-2} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
        <line x1={0} y1={5} x2={-7} y2={14} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
        <line x1={0} y1={5} x2={7} y2={14} stroke="#94a3b8" strokeWidth={2} strokeLinecap="round" />
      </>)

    case 'arrow': {
      const x2 = el.x2 ?? el.x + 60, y2 = el.y2 ?? el.y
      const col = el.color || '#fff'
      const dc = sel ? hi : col
      const ang = Math.atan2(y2 - el.y, x2 - el.x) * 180 / Math.PI

      // Wave path for dribbling arrows
      if (el.wave) {
        const dx = x2 - el.x, dy = y2 - el.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const nx = -dy / len, ny = dx / len
        const steps = Math.max(4, Math.round(len / 20))
        let d = `M ${el.x},${el.y}`
        for (let i = 1; i <= steps; i++) {
          const t = i / steps
          const px = el.x + dx * t, py = el.y + dy * t
          const amp = (i % 2 === 0 ? 8 : -8) * (i < steps ? 1 : 0)
          d += ` Q ${el.x + dx * (t - 0.5 / steps) + nx * amp},${el.y + dy * (t - 0.5 / steps) + ny * amp} ${px},${py}`
        }
        return (
          <g onMouseDown={onDown} onTouchStart={onDown} style={g_style}>
            <path d={d} fill="none" stroke={dc} strokeWidth={2} />
            <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
            <polygon points="0,-5 11,0 0,5" fill={dc} transform={`translate(${x2},${y2}) rotate(${ang})`} />
          </g>
        )
      }

      // Curved arrow
      if (el.cx != null && el.cy != null) {
        const ea = Math.atan2(y2 - el.cy!, x2 - el.cx!) * 180 / Math.PI
        return (
          <g onMouseDown={onDown} onTouchStart={onDown} style={g_style}>
            <path d={`M ${el.x},${el.y} Q ${el.cx},${el.cy} ${x2},${y2}`} fill="none" stroke={dc} strokeWidth={2.2}
              strokeDasharray={el.dashed ? '8 4' : 'none'} />
            <path d={`M ${el.x},${el.y} Q ${el.cx},${el.cy} ${x2},${y2}`} fill="none" stroke="transparent" strokeWidth={14} />
            <polygon points="0,-4.5 10,0 0,4.5" fill={dc} transform={`translate(${x2},${y2}) rotate(${ea})`} />
          </g>
        )
      }

      // Straight arrow
      return (
        <g onMouseDown={onDown} onTouchStart={onDown} style={g_style}>
          <line x1={el.x} y1={el.y} x2={x2} y2={y2} stroke={dc} strokeWidth={2.2}
            strokeDasharray={el.dashed ? '8 4' : 'none'} strokeLinecap="round" />
          <line x1={el.x} y1={el.y} x2={x2} y2={y2} stroke="transparent" strokeWidth={14} />
          <polygon points="0,-4.5 10,0 0,4.5" fill={dc} transform={`translate(${x2},${y2}) rotate(${ang})`} />
        </g>
      )
    }

    case 'zone':
      return (
        <g onMouseDown={onDown} onTouchStart={onDown} style={g_style}>
          {sel && <rect x={el.x - 2} y={el.y - 2} width={(el.w || 60) + 4} height={(el.h || 40) + 4} fill="none" stroke="#a3e635" strokeWidth={1.5} strokeDasharray="3 2" rx={4} />}
          <rect x={el.x} y={el.y} width={el.w || 60} height={el.h || 40}
            fill={`${el.color || '#3b82f6'}20`} stroke={`${el.color || '#3b82f6'}77`}
            strokeWidth={1.5} strokeDasharray="5 3" rx={3} />
        </g>
      )

    case 'text':
      return (
        <g onMouseDown={onDown} onTouchStart={onDown} style={g_style} transform={`translate(${el.x},${el.y})`}>
          {sel && <rect x={-3} y={-(el.fontSize || 13)} width={Math.max(30, (el.text?.length || 3) * (el.fontSize || 13) * 0.55 + 6)} height={(el.fontSize || 13) + 4} fill="rgba(163,230,53,.1)" stroke="#a3e635" strokeWidth={1} rx={2} />}
          <text fontSize={el.fontSize || 13} fill="#fff" fontWeight={700} fontFamily="system-ui,-apple-system,sans-serif"
            style={{ pointerEvents: 'none', userSelect: 'none' } as any}>{el.text || ''}</text>
        </g>
      )

    default: return null
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// TOOLBAR BUTTON
// ════════════════════════════════════════════════════════════════════════════════
function TB({ active, onClick, children, title, style: s }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding: '4px 6px', fontSize: 9, fontWeight: 700, borderRadius: 5, cursor: 'pointer',
      border: `1px solid ${active ? '#a3e635' : 'rgba(255,255,255,.06)'}`,
      background: active ? 'rgba(163,230,53,.1)' : 'rgba(255,255,255,.02)',
      color: active ? '#a3e635' : '#8896a8',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
      transition: 'all .1s', minWidth: 36, ...s,
    }}>
      {children}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export default function TacticalBoard({ initialData, onSave, onClose, readOnly }: BoardProps) {
  const [field, setField] = useState<FieldType>(initialData?.field || 'F11')
  const [elements, setElements] = useState<El[]>(initialData?.elements || [])
  const [seriesList, setSeriesList] = useState<El[][]>(initialData?.series || [initialData?.elements || []])
  const [activeSerie, setActiveSerie] = useState(0)
  const [hist, setHist] = useState<El[][]>([initialData?.elements || []])
  const [hIdx, setHIdx] = useState(0)
  const [tool, setTool] = useState<Tool>('select')
  const [selId, setSelId] = useState<string | null>(null)
  const [pColor, setPColor] = useState(COLORS[0])
  const [pNum, setPNum] = useState(1)
  const [matColor, setMatColor] = useState('#f97316')
  const [arrColor, setArrColor] = useState('#ffffff')
  const [zoneColor, setZoneColor] = useState('#3b82f6')
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [draw, setDraw] = useState<{ sx: number; sy: number } | null>(null)
  const [preview, setPreview] = useState<{ x: number; y: number } | null>(null)
  const [txtPos, setTxtPos] = useState<{ x: number; y: number } | null>(null)
  const [txtVal, setTxtVal] = useState('')
  const ref = useRef<SVGSVGElement>(null)

  // Sync series
  useEffect(() => {
    setSeriesList(prev => {
      const copy = [...prev]
      copy[activeSerie] = elements
      return copy
    })
  }, [elements, activeSerie])

  const push = useCallback((els: El[]) => {
    setHist(p => [...p.slice(0, hIdx + 1), els].slice(-50))
    setHIdx(p => p + 1)
    setElements(els)
  }, [hIdx])

  const undo = () => { if (hIdx > 0) { setHIdx(hIdx - 1); setElements(hist[hIdx - 1]) } }
  const redo = () => { if (hIdx < hist.length - 1) { setHIdx(hIdx + 1); setElements(hist[hIdx + 1]) } }

  const pt = useCallback((e: any) => {
    const svg = ref.current; if (!svg) return { x: 0, y: 0 }
    const r = svg.getBoundingClientRect()
    const cx = e.touches?.[0]?.clientX ?? e.clientX
    const cy = e.touches?.[0]?.clientY ?? e.clientY
    return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H }
  }, [])

  const down = (e: any) => {
    if (readOnly) return; const p = pt(e)
    if (tool === 'select') { setSelId(null); return }
    if (tool.startsWith('arrow') || tool === 'zone') { setDraw({ sx: p.x, sy: p.y }); setPreview(p); return }
    if (tool === 'text') { setTxtPos(p); return }
    const el: El = { id: id(), type: tool, x: p.x, y: p.y }
    if (tool === 'player') { el.color = pColor; el.number = pNum; setPNum(n => n + 1) }
    if (['cone', 'disc', 'ring'].includes(tool)) el.color = matColor
    push([...elements, el])
  }

  const move = (e: any) => {
    if (readOnly) return; const p = pt(e)
    if (drag) setElements(prev => prev.map(el => el.id === drag.id ? { ...el, x: p.x - drag.ox, y: p.y - drag.oy } : el))
    if (draw) setPreview(p)
  }

  const up = () => {
    if (drag) { push([...elements]); setDrag(null); return }
    if (draw && preview) {
      const { sx, sy } = draw, { x, y } = preview
      if (Math.abs(x - sx) > 8 || Math.abs(y - sy) > 8) {
        if (tool === 'zone') {
          push([...elements, { id: id(), type: 'zone', x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy), color: zoneColor }])
        } else {
          const el: El = { id: id(), type: 'arrow', x: sx, y: sy, x2: x, y2: y, dashed: tool === 'arrow_dashed', wave: tool === 'arrow_wave', color: arrColor }
          if (tool === 'arrow_dashed' || tool === 'arrow_solid' || tool === 'arrow_wave') {
            // Curved arrows: add control point
          }
          push([...elements, el])
        }
      }
      setDraw(null); setPreview(null)
    }
  }

  const elDown = (e: any, el: El) => {
    e.stopPropagation(); if (readOnly || tool !== 'select') return
    setSelId(el.id); const p = pt(e)
    setDrag({ id: el.id, ox: p.x - el.x, oy: p.y - el.y })
  }

  const addText = () => {
    if (!txtPos || !txtVal.trim()) { setTxtPos(null); return }
    push([...elements, { id: id(), type: 'text', x: txtPos.x, y: txtPos.y, text: txtVal.trim() }])
    setTxtVal(''); setTxtPos(null)
  }

  const del = () => { if (selId) { push(elements.filter(e => e.id !== selId)); setSelId(null) } }
  const dup = () => {
    const el = elements.find(e => e.id === selId)
    if (!el) return
    const ne = { ...el, id: id(), x: el.x + 20, y: el.y + 20 }
    if (ne.x2) ne.x2 += 20
    if (ne.y2) ne.y2 += 20
    push([...elements, ne]); setSelId(ne.id)
  }
  const clear = () => { if (confirm('¿Borrar todo?')) { push([]); setSelId(null) } }

  const addSerie = () => {
    setSeriesList(p => [...p, []])
    setActiveSerie(seriesList.length)
    setElements([]); setSelId(null)
    setHist([[]]); setHIdx(0)
  }
  const switchSerie = (i: number) => {
    setActiveSerie(i)
    const els = seriesList[i] || []
    setElements(els); setSelId(null)
    setHist([els]); setHIdx(0)
  }
  const removeSerie = (i: number) => {
    if (seriesList.length <= 1) return
    const copy = seriesList.filter((_, j) => j !== i)
    setSeriesList(copy)
    const ni = Math.min(i, copy.length - 1)
    setActiveSerie(ni)
    setElements(copy[ni] || [])
  }

  const exportPng = async (): Promise<string> => {
    const svg = ref.current; if (!svg) return ''
    const data = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = W * 2; canvas.height = H * 2
    const ctx = canvas.getContext('2d'); if (!ctx) return ''
    const img = new Image()
    return new Promise(r => {
      img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); r(canvas.toDataURL('image/png', 0.85)) }
      img.onerror = () => r('')
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data)
    })
  }

  const save = async () => {
    const prev = await exportPng()
    onSave?.({ field, elements, series: seriesList, preview: prev })
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { e.preventDefault(); del() }
      if (e.key === 'Escape') { setSelId(null); setDraw(null); setTxtPos(null) }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo() }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo() }
      if (e.ctrlKey && e.key === 'd' && selId) { e.preventDefault(); dup() }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [selId, hIdx, elements])

  if (readOnly) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          <rect width={W} height={H} fill="#1a472a" />
          <Field type={field} />
          {elements.map(el => <Elem key={el.id} el={el} sel={false} onDown={() => {}} />)}
        </svg>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── Top toolbar ── */}
      <div style={{ background: 'rgba(10,15,25,.97)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '8px 12px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Field */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Cancha</div>
          <div style={{ display: 'flex', gap: 2 }}>
            {(['F11','F11_half','F9','F7','F5'] as const).map(f => (
              <TB key={f} active={field===f} onClick={() => setField(f)}>
                <span style={{ fontSize: 11, fontWeight: 900 }}>{f === 'F11_half' ? '½' : f.replace('F','')}</span>
              </TB>
            ))}
          </div>
        </div>

        {/* Select */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Herram.</div>
          <TB active={tool==='select'} onClick={() => setTool('select')}>
            <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 1 L3 13 L7 9 L11 13 L13 11 L9 7 L13 3 Z" fill="currentColor"/></svg>
            <span>Mover</span>
          </TB>
        </div>

        {/* Players */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Jugadores</div>
          <div style={{ display: 'flex', gap: 2 }}>
            <TB active={tool==='player'} onClick={() => setTool('player')}>
              <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="currentColor"/></svg>
              <span>Jugador</span>
            </TB>
            <TB active={tool==='ball'} onClick={() => setTool('ball')}>
              <svg width="14" height="14" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>
              <span>Pelota</span>
            </TB>
          </div>
        </div>

        {/* Materials */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Materiales</div>
          <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {([
              ['cone','Cono','▲'],['disc','Tortuga','◆'],['ring','Aro','○'],['barrier','Valla','▬'],
              ['goal','Arco','⊓'],['minigoal','Mini','⊔'],['ladder','Escalera','≡'],['pole','Pica','|'],['mannequin','Maniquí','♟'],
            ] as [Tool, string, string][]).map(([k,l,ic]) => (
              <TB key={k} active={tool===k} onClick={() => setTool(k)}>
                <span style={{ fontSize: 12 }}>{ic}</span>
                <span>{l}</span>
              </TB>
            ))}
          </div>
        </div>

        {/* Drawing */}
        <div>
          <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Dibujo</div>
          <div style={{ display: 'flex', gap: 2 }}>
            {([
              ['arrow_solid','Flecha','→'],['arrow_dashed','Pase','⇢'],['arrow_wave','Dribling','〰'],['zone','Zona','□'],['text','Texto','T'],
            ] as [Tool, string, string][]).map(([k,l,ic]) => (
              <TB key={k} active={tool===k} onClick={() => setTool(k)}>
                <span style={{ fontSize: 12 }}>{ic}</span>
                <span>{l}</span>
              </TB>
            ))}
          </div>
        </div>

        {/* Color pickers */}
        {tool === 'player' && (
          <div>
            <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Color · #{pNum}</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {COLORS.map((c, i) => (
                <button key={c} onClick={() => setPColor(c)} style={{
                  width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', background: c,
                  border: pColor === c ? '2.5px solid #fff' : '1.5px solid rgba(0,0,0,.4)',
                  fontSize: 9, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}

        {tool.startsWith('arrow') && (
          <div>
            <div style={{ fontSize: 7, fontWeight: 800, color: '#3e4c5e', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Color</div>
            <div style={{ display: 'flex', gap: 2 }}>
              {ARROW_COLORS.map(c => (
                <button key={c} onClick={() => setArrColor(c)} style={{
                  width: 18, height: 18, borderRadius: 3, cursor: 'pointer', background: c,
                  border: arrColor === c ? '2px solid #a3e635' : '1px solid rgba(255,255,255,.15)',
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TB onClick={undo} title="Deshacer (Ctrl+Z)" style={{ opacity: hIdx <= 0 ? .3 : 1 }}><span style={{ fontSize: 13 }}>↩</span></TB>
          <TB onClick={redo} title="Rehacer (Ctrl+Y)" style={{ opacity: hIdx >= hist.length - 1 ? .3 : 1 }}><span style={{ fontSize: 13 }}>↪</span></TB>
          {selId && <TB onClick={dup} title="Duplicar (Ctrl+D)"><span style={{ fontSize: 11 }}>⧉</span></TB>}
          {selId && <TB onClick={del} title="Eliminar" style={{ color: '#f87171', borderColor: 'rgba(239,68,68,.25)' }}><span style={{ fontSize: 11 }}>🗑</span></TB>}
          <TB onClick={clear} style={{ color: '#f87171', borderColor: 'rgba(239,68,68,.15)' }}><span style={{ fontSize: 8 }}>Borrar</span></TB>
          {onSave && <TB active onClick={save} style={{ padding: '5px 14px' }}><span style={{ fontSize: 10 }}>💾 Guardar</span></TB>}
          {onClose && <TB onClick={onClose}><span style={{ fontSize: 10 }}>✕</span></TB>}
        </div>
      </div>

      {/* ── Series tabs ── */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 10 }}>
        <span style={{ color: '#475569', fontWeight: 700, fontSize: 8, textTransform: 'uppercase', letterSpacing: '.1em' }}>Series:</span>
        {seriesList.map((_, i) => (
          <div key={i} style={{ display: 'flex' }}>
            <button onClick={() => switchSerie(i)} style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              borderRadius: seriesList.length > 1 ? '6px 0 0 6px' : 6,
              border: `1px solid ${activeSerie === i ? '#a3e635' : 'rgba(255,255,255,.08)'}`,
              background: activeSerie === i ? 'rgba(163,230,53,.1)' : 'rgba(255,255,255,.02)',
              color: activeSerie === i ? '#a3e635' : '#64748b',
            }}>S{i + 1}</button>
            {seriesList.length > 1 && (
              <button onClick={() => removeSerie(i)} style={{
                padding: '4px 6px', fontSize: 9, cursor: 'pointer', borderRadius: '0 6px 6px 0',
                border: `1px solid rgba(239,68,68,.15)`, borderLeft: 'none',
                background: 'rgba(239,68,68,.05)', color: '#f87171',
              }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addSerie} style={{
          padding: '4px 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
          border: '1px solid rgba(163,230,53,.2)', background: 'rgba(163,230,53,.04)', color: '#a3e635',
        }}>+ Serie</button>
      </div>

      {/* ── Text input ── */}
      {txtPos && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 10px', background: 'rgba(10,15,25,.97)', borderRadius: 8, border: '1px solid #a3e635' }}>
          <input autoFocus value={txtVal} onChange={e => setTxtVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addText()}
            style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,.1)', borderRadius: 4, padding: '3px 8px', fontSize: 12, color: '#fff', outline: 'none' }}
            placeholder="Texto..." />
          <button onClick={addText} style={{ padding: '3px 10px', fontSize: 10, fontWeight: 700, borderRadius: 4, border: '1px solid #a3e635', background: 'rgba(163,230,53,.1)', color: '#a3e635', cursor: 'pointer' }}>OK</button>
          <button onClick={() => setTxtPos(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── Canvas ── */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.05)', boxShadow: '0 6px 30px rgba(0,0,0,.5)' }}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block', cursor: tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
          onMouseDown={down} onMouseMove={move} onMouseUp={up}
          onTouchStart={down} onTouchMove={move} onTouchEnd={up}
          onMouseLeave={() => { setDrag(null); setDraw(null); setPreview(null) }}>
          <rect width={W} height={H} fill="#1a472a" />
          <Field type={field} />
          {/* Draw preview */}
          {draw && preview && tool.startsWith('arrow') && (
            <line x1={draw.sx} y1={draw.sy} x2={preview.x} y2={preview.y}
              stroke="rgba(163,230,53,.35)" strokeWidth={2} strokeDasharray={tool === 'arrow_dashed' ? '6 4' : 'none'} />
          )}
          {draw && preview && tool === 'zone' && (
            <rect x={Math.min(draw.sx, preview.x)} y={Math.min(draw.sy, preview.y)}
              width={Math.abs(preview.x - draw.sx)} height={Math.abs(preview.y - draw.sy)}
              fill="rgba(163,230,53,.06)" stroke="rgba(163,230,53,.3)" strokeWidth={1.5} strokeDasharray="4 3" />
          )}
          {elements.map(el => <Elem key={el.id} el={el} sel={el.id === selId} onDown={(e: any) => elDown(e, el)} />)}
        </svg>
      </div>

      {/* ── Status bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#3e4c5e', padding: '0 2px' }}>
        <span>{elements.length} elementos · {field} · Serie {activeSerie + 1}/{seriesList.length}</span>
        <span>Click colocar · Mover arrastrar · Ctrl+Z deshacer · Ctrl+D duplicar · Del eliminar</span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// PREVIEW (read-only, for library cards and calendar)
// ════════════════════════════════════════════════════════════════════════════════
export function TacticalPreview({ data }: { data: { field: FieldType; elements: El[] } }) {
  if (!data?.elements?.length) return null
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,.05)' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <rect width={W} height={H} fill="#1a472a" />
        <Field type={data.field} />
        {data.elements.map(el => <Elem key={el.id} el={el} sel={false} onDown={() => {}} />)}
      </svg>
    </div>
  )
}
