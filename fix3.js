const fs = require('fs');

let coachClient = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

const mkBarsImpl = `
const mkBars = (items: {name:string, val:number, sub?:string}[], bars: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
  if (!items.length) return '<p style="color:#aaa;font-size:10px;text-align:center;padding:8px">Sin datos</p>'
  const BAR_H = 200, TOP = 24, BOT = 48, COL_W = Math.max(Math.floor(800/items.length), 60)
  const W = items.length * COL_W
  const allVals = items.flatMap(it => bars.map(b => Number((it as any)[b.key])||0))
  const maxBar = Math.max(...allVals, 1)
  const lineVals = lineKey ? items.map(it => Number((it as any)[lineKey])||0) : []
  const maxLine = Math.max(...lineVals.filter(v=>v>0), 1)
  let svg = \`<svg viewBox="0 0 \${W} \${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">\`
  ;[0,25,50,75,100].forEach(p => {
    const y = TOP + BAR_H - (BAR_H * p / 100)
    svg += \`<line x1="0" y1="\${y}" x2="\${W}" y2="\${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4,4"/>\`
    svg += \`<text x="0" y="\${y-4}" font-size="9" fill="#94a3b8" font-family="monospace">\${p}%</text>\`
  })
  items.forEach((it, i) => {
    const cx = (i + 0.5) * COL_W
    const bW = Math.min(24, Math.max(10, COL_W*0.6 / bars.length))
    const totalW = bW * bars.length
    const startX = cx - totalW/2
    bars.forEach((b, j) => {
      const v = Number((it as any)[b.key])||0
      const pct = v / maxBar
      const h = pct * BAR_H
      const bx = startX + j*bW
      const by = TOP + BAR_H - h
      svg += \`<rect x="\${bx.toFixed(1)}" y="\${by.toFixed(1)}" width="\${bW.toFixed(1)}" height="\${Math.max(h,0).toFixed(1)}" fill="\${b.color}" rx="2"/>\`
      if (h > 10) svg += \`<text x="\${(bx+bW/2).toFixed(1)}" y="\${(by-4).toFixed(1)}" font-size="8" fill="\${b.color}" font-weight="700" text-anchor="middle" font-family="monospace">\${v.toFixed(1)}</text>\`
    })
    svg += \`<text x="\${cx}" y="\${TOP+BAR_H+16}" font-size="10" fill="#333" font-weight="700" text-anchor="middle" font-family="Arial,sans-serif">\${it.name}</text>\`
    if (it.sub) svg += \`<text x="\${cx}" y="\${TOP+BAR_H+28}" font-size="8" fill="#888" text-anchor="middle" font-family="Arial,sans-serif">\${it.sub}</text>\`
  })
  if (lineKey && lineColor) {
    const pts = items.map((it, i) => {
      const v = Number((it as any)[lineKey])||0
      const cx = (i + 0.5) * COL_W
      const cy = TOP + BAR_H - (v / maxLine) * BAR_H
      return {x:cx, y:cy, v}
    })
    const d = pts.map((p,i) => \`\${i===0?'M':'L'}\${p.x.toFixed(1)},\${p.y.toFixed(1)}\`).join(' ')
    svg += \`<path d="\${d}" fill="none" stroke="\${lineColor}" stroke-width="2"/>\`
    pts.forEach(p => {
      if (p.v > 0) {
        svg += \`<circle cx="\${p.x.toFixed(1)}" cy="\${p.y.toFixed(1)}" r="4" fill="#fff" stroke="\${lineColor}" stroke-width="2"/>\`
        svg += \`<text x="\${p.x.toFixed(1)}" y="\${(p.y-10).toFixed(1)}" font-size="9" fill="\${lineColor}" font-weight="700" text-anchor="middle" font-family="monospace">\${p.v.toFixed(1)}</text>\`
      }
    })
  }
  svg += '</svg>'
  return svg
}
\n`;

if (!coachClient.includes('const mkBars = (items: {name:string, val:number,')) {
  coachClient = coachClient.replace('export default function CoachDashboard', mkBarsImpl + 'export default function CoachDashboard');
}

// Fix Navbar
coachClient = coachClient.replace(
  '<Navbar nombre={session.user?.name} rol={session.user?.role} clubNombre={session.user?.club_nombre} onMenuClick={()=>setMenuOpen(true)} />',
  '<Navbar nombre={session.user?.name} rol={session.user?.role} clubNombre={session.user?.club_nombre} onMenuClick={()=>setMenuOpen(true)} activeTab="" onTabChange={()=>{}} tabs={[]} />'
);

// Fix array tuples on line 6619
coachClient = coachClient.replace(
  "{[['nombre','Nombre completo','Juan Pérez',false],['usuario','Usuario','juan.perez',false],['password','Contraseña','Mín. 6 caracteres',true],['edad','Edad','22',false],['peso_kg','Peso (kg)','75.5',false],['estatura_cm','Estatura (cm)','178',false]].map(([k,lbl,ph,pw])=>(",
  "{[ {k:'nombre',lbl:'Nombre completo',ph:'Juan Pérez',pw:false}, {k:'usuario',lbl:'Usuario',ph:'juan.perez',pw:false}, {k:'password',lbl:'Contraseña',ph:'Mín. 6 caracteres',pw:true}, {k:'edad',lbl:'Edad',ph:'22',pw:false}, {k:'peso_kg',lbl:'Peso (kg)',ph:'75.5',pw:false}, {k:'estatura_cm',lbl:'Estatura (cm)',ph:'178',pw:false} ].map(({k,lbl,ph,pw}: any)=>( "
);

// Fix testPush
coachClient = coachClient.replace(
  'onClick={testPush}',
  'onClick={() => testPush()}'
);

fs.writeFileSync('src/app/coach/CoachClient.tsx', coachClient);
