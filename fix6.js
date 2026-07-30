const fs = require('fs');

const utils = fs.readFileSync('src/app/coach/utils.ts', 'utf8');
const mkBarsCode = `
export const mkBars = (items: {name:string, val:number, sub?:string}[], bars: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
  if (!items.length) return '<p style=\"color:#aaa;font-size:10px;text-align:center;padding:8px\">Sin datos</p>'
  const BAR_H = 200, TOP = 24, BOT = 48, COL_W = Math.max(Math.floor(800/items.length), 60)
  const W = items.length * COL_W
  const allVals = items.flatMap(it => bars.map(b => Number((it as any)[b.key])||0))
  const maxBar = Math.max(...allVals, 1)
  const lineVals = lineKey ? items.map(it => Number((it as any)[lineKey])||0) : []
  const maxLine = Math.max(...lineVals.filter(v=>v>0), 1)
  let svg = \`<svg viewBox="0 0 \${W} \${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">\`
  // grid lines
  ;[0,25,50,75,100].forEach(p => {
    const y = TOP + BAR_H - (p/100)*BAR_H
    svg += \`<line x1="0" y1="\${y.toFixed(1)}" x2="\${W}" y2="\${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>\`
  })
  // bars
  items.forEach((it, pi) => {
    const x0 = pi * COL_W + 2
    const bw = Math.max((COL_W - 4) / bars.length - 1, 6)
    bars.forEach((b, bi) => {
      const val = Number((it as any)[b.key])||0
      const h = val > 0 ? Math.max((val/maxBar)*BAR_H, 4) : 0
      const bx = x0 + bi*(bw+1)
      const by = TOP + BAR_H - h
      svg += \`<rect x="\${bx.toFixed(1)}" y="\${by.toFixed(1)}" width="\${bw.toFixed(1)}" height="\${Math.max(h,0).toFixed(1)}" fill="\${b.color}" rx="2"/>\`
      if (val > 0) {
        if (h > 16) svg += \`<text x="\${(bx+bw/2).toFixed(1)}" y="\${(by+h/2+3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" transform="rotate(-90,\${(bx+bw/2).toFixed(1)},\${(by+h/2).toFixed(1)})">\${val}</text>\`
        else svg += \`<text x="\${(bx+bw/2).toFixed(1)}" y="\${(by-2).toFixed(1)}" text-anchor="middle" fill="\${b.color}" font-size="7" font-weight="700">\${val}</text>\`
      }
    })
    // x label
    const cx = x0 + (COL_W-4)/2
    svg += \`<text x="\${cx.toFixed(1)}" y="\${(TOP+BAR_H+12).toFixed(1)}" text-anchor="middle" fill="#333" font-size="8" font-weight="600">\${it.name}</text>\`
    if (it.sub) svg += \`<text x="\${cx.toFixed(1)}" y="\${(TOP+BAR_H+22).toFixed(1)}" text-anchor="middle" fill="#888" font-size="7">\${it.sub}</text>\`
  })
  // line overlay
  if (lineKey && lineVals.some(v=>v>0)) {
    const pts = items.map((it,pi) => {
      const val = Number((it as any)[lineKey])||0
      const cx = pi*COL_W + 2 + (COL_W-4)/2
      const cy = val > 0 ? TOP + BAR_H - (val/maxLine)*BAR_H*0.85 : null
      return {cx, cy, val}
    }).filter(pt => pt.cy !== null)
    if (pts.length > 1) svg += \`<polyline points="\${pts.map(p=>\`\${p.cx.toFixed(1)},\${p.cy.toFixed(1)}\`).join(' ')}" fill="none" stroke="\${lineColor||'#34d399'}" stroke-width="1.5" stroke-dasharray="4,2"/>\`
    pts.forEach(pt => {
      svg += \`<circle cx="\${pt.cx.toFixed(1)}" cy="\${pt.cy.toFixed(1)}" r="3" fill="\${lineColor||'#34d399'}" stroke="#fff" stroke-width="1"/>\`
      svg += \`<text x="\${pt.cx.toFixed(1)}" y="\${(pt.cy-5).toFixed(1)}" text-anchor="middle" fill="\${lineColor||'#34d399'}" font-size="7" font-weight="700">\${pt.val}</text>\`
    })
  }
  svg += '</svg>'
  return svg
}
`;

fs.writeFileSync('src/app/coach/utils.ts', utils + '\n\n' + mkBarsCode);

let cc = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');
cc = cc.replace('import { ENTRENAMIENTO_OPTIMIZADOR', 'import { mkBars, ENTRENAMIENTO_OPTIMIZADOR');

const lines = cc.split('\n');
const mkBarsStart = lines.findIndex(l => l.includes('const mkBars = (items: {name:string,'));
if (mkBarsStart > -1) {
  let open = 0;
  let mkBarsEnd = mkBarsStart;
  let started = false;
  for (let i = mkBarsStart; i < lines.length; i++) {
    for (let c of lines[i]) {
      if (c === '{') { open++; started = true; }
      if (c === '}') { open--; }
    }
    if (started && open === 0) {
      mkBarsEnd = i;
      break;
    }
  }
  lines.splice(mkBarsStart, mkBarsEnd - mkBarsStart + 1);
}

fs.writeFileSync('src/app/coach/CoachClient.tsx', lines.join('\n'));
console.log('Fixed mkBars in CoachClient.tsx');
