const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// 1. Inject styles
const styleBlock = `
        <style>{\`
          @keyframes growUpAnim { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          @keyframes fadeUpAnim { from { opacity: 0; transform: translateY(10px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
          @keyframes fadeInAnim { from { opacity: 0; } to { opacity: 1; } }
          .anim-grow-up { transform-origin: bottom; animation: growUpAnim 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform: scaleY(0); }
          .anim-fade-up { animation: fadeUpAnim 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
          .anim-fade-in { animation: fadeInAnim 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        \`}</style>
`;
c = c.replace(
  "{/* Header */}",
  styleBlock + "        {/* Header */}"
);

// 2. Add animation to bars
c = c.replace(
  /style={{ position:'relative', width:'100%', maxWidth:18, minWidth:7, height:`\$\{h\}px`,([^]*?)borderRadius:'3px 3px 0 0', overflow:'visible' }}/g,
  `className="anim-grow-up"
                              style={{ position:'relative', width:'100%', maxWidth:18, minWidth:7, height:\`\${h}px\`,$1borderRadius:'3px 3px 0 0', overflow:'visible', animationDelay: \`\${ni * 0.05 + si * 0.02}s\` }}`
);

// 3. Add animation to overlay line values
c = c.replace(
  /style={{ position:'absolute', left:'50%', bottom:dotBottom - 5, transform:'translateX\(-50%\)', zIndex:10, pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'center' }}/g,
  `className="anim-fade-up" style={{ position:'absolute', left:'50%', bottom:dotBottom - 5, zIndex:10, pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'center', animationDelay:\`\${0.5 + ni*0.05}s\` }}`
);

// 4. Add animation to SVG line
c = c.replace(
  /stroke={grupo.lineColor} strokeWidth="2.5" strokeDasharray="10,6" \/>/g,
  `stroke={grupo.lineColor} strokeWidth="2.5" strokeDasharray="10,6" className="anim-fade-in" style={{ animationDelay:\`\${0.5 + i*0.05}s\` }} />`
);

// 5. Replace the Distribucion de Tareas block
const oldDistBlockRegex = /<div style={{ background:'var\(--ink2\)', border:'1px solid var\(--mist\)', borderRadius:16, padding:20 }}>([^]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*\}/;
// Actually replacing the whole block is risky with regex. Let's just find the flex container.
const oldDistContainerStart = `<div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start' }}>`;
const newDistContainerStart = `<div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>`;

c = c.replace(oldDistContainerStart, newDistContainerStart);

// Now for the Pie chart replacement:
c = c.replace(/innerRadius={60}/g, 'innerRadius={0}');

// Reorder flex blocks: we can just change flex basis to arrange them if they wrap, but we really need them in order.
// Since the layout is:
// 1. Torta
// 2. Campo
// 3. Gimnasio
// Let's just use CSS `order`! It's much easier than string replacing HTML structures!
// 1. Torta -> `order: 2`
// 2. Campo -> `order: 1`
// 3. Gimnasio -> `order: 3`

c = c.replace(
  `{/* Gráfico de Torta: Campo vs Gym */}
              <div style={{ flex:1, minWidth:250, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>`,
  `{/* Gráfico de Torta: Campo vs Gym */}
              <div style={{ flex:'0 0 200px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', order: 2 }}>`
);

c = c.replace(
  `{/* Desglose de Tareas de Campo */}
              {campoSorted.length > 0 && (
                <div style={{ flex:2, minWidth:300 }}>`,
  `{/* Desglose de Tareas de Campo */}
              {campoSorted.length > 0 && (
                <div style={{ flex:1, minWidth:250, order: 1 }}>`
);

c = c.replace(
  `{/* Desglose de Tareas de Gimnasio */}
              {gymSorted.length > 0 && (
                <div style={{ flex:2, minWidth:300 }}>`,
  `{/* Desglose de Tareas de Gimnasio */}
              {gymSorted.length > 0 && (
                <div style={{ flex:1, minWidth:250, order: 3 }}>`
);

// Move "Distribución (Minutos Totales)" text to the bottom of the pie or change it
c = c.replace(
  `<p style={{ fontSize:11, color:'var(--fog)', marginBottom:8 }}>Distribución (Minutos Totales: {totalMin}m)</p>`,
  `<p style={{ fontSize:11, color:'var(--fog)', marginBottom:4, textAlign:'center' }}>TOTAL: <strong style={{color:'var(--snow)', fontSize:14}}>{totalMin}m</strong></p>`
);

// Remove the absolute center text in the Pie chart
c = c.replace(
  `<div style={{ position:'absolute', top:0, left:0, width:180, height:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                    <span style={{ fontSize:11, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.05em' }}>TOTAL</span>
                    <span style={{ fontSize:20, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{totalMin}m</span>
                  </div>`,
  ``
);


fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
console.log('Fixed animations and pie layout');
