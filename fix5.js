const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

const targetStr = `return md
  }`;

const newStr = `return md
  }`;

// Actually I will modify the span that renders it:
const targetRender = `<span style={{ fontWeight:700, color:TIPO_COLORES[s.tipo]||'#888', fontSize:13 }}>{TIPO_ICONOS[s.tipo]} {formatMD(s.titulo||s.tipo)}</span>`;
const newRender = `<span style={{ fontWeight:700, color:TIPO_COLORES[s.tipo]||'#888', fontSize:13 }}>{TIPO_ICONOS[s.tipo]} {formatMD(s.titulo||s.tipo)} <span style={{fontSize:9, opacity:0.6}}>({(sessionVolMap.get(s.id)||0).toFixed(1)})</span></span>`;

if (c.includes(targetRender)) {
  c = c.replace(targetRender, newRender);
  c = c.replace(targetRender, newRender); // Replace both occurrences (diario and semanal)
  fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
  console.log('Successfully injected debug volume into UI');
} else {
  console.log('Regex did not match');
}
