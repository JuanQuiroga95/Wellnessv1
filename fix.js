const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

if (!c.includes('import { PieChart')) {
  c = c.replace(
    "import { PanelHeader, CuadroHeader, Icons } from './Headers'",
    "import { PanelHeader, CuadroHeader, Icons } from './Headers'\nimport { PieChart, Pie, Cell } from 'recharts'"
  );
}

const pBar = `{/* Barras Globales: Campo vs Gym */}`;
const pDesglose = `{/* Desglose de Tareas de Campo */}`;
const rBarRegex = new RegExp(pBar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?' + pDesglose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 's');

const pieChartHtml = `{/* Gráfico de Torta: Campo vs Gym */}
            <div style={{ flex:1, minWidth:250, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <p style={{ fontSize:11, color:'var(--fog)', marginBottom:8 }}>Distribución (Minutos Totales: {totalMin}m)</p>
              <div style={{ position:'relative', width:180, height:180 }}>
                <PieChart width={180} height={180}>
                  <Pie
                    data={[
                      { name: 'Campo', value: totalCampoMin, color: '#c8f135' },
                      { name: 'Gimnasio', value: totalGymMin, color: '#60a5fa' }
                    ].filter(d => d.value > 0)}
                    cx={90}
                    cy={90}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={1200}
                  >
                    { [
                        { name: 'Campo', value: totalCampoMin, color: '#c8f135' },
                        { name: 'Gimnasio', value: totalGymMin, color: '#60a5fa' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div style={{ position:'absolute', top:0, left:0, width:180, height:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <span style={{ fontSize:11, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.05em' }}>TOTAL</span>
                  <span style={{ fontSize:20, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{totalMin}m</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:20, fontSize:12, marginTop:12 }}>
                <span style={{ color:'#c8f135', fontWeight:700 }}>🌿 Campo ({pctCampo}%)</span>
                <span style={{ color:'#60a5fa', fontWeight:700 }}>🏋️ Gim ({pctGym}%)</span>
              </div>
            </div>

            ` + pDesglose;

c = c.replace(rBarRegex, pieChartHtml);

c = c.replaceAll("<div style={{ width:`${p}%`, height:'100%', background:'#c8f135' }}></div>", "<div className=\"anim-bar\" style={{ width:`${p}%`, height:'100%', background:'#c8f135' }}></div>");
c = c.replaceAll("<div style={{ width:`${p}%`, height:'100%', background:'#60a5fa' }}></div>", "<div className=\"anim-bar\" style={{ width:`${p}%`, height:'100%', background:'#60a5fa' }}></div>");

c = c.replaceAll("style={{ width:'55%'", "className=\"anim-bar-v\" style={{ width:'55%'");
c = c.replaceAll("style={{ width:'100%', maxWidth:24", "className=\"anim-bar-v\" style={{ width:'100%', maxWidth:24");
c = c.replaceAll("style={{ position:'relative', width:'100%', maxWidth:24", "className=\"anim-bar-v\" style={{ position:'relative', width:'100%', maxWidth:24");
c = c.replaceAll("style={{ position:'relative', width:'60%'", "className=\"anim-bar-v\" style={{ position:'relative', width:'60%'");

const arrowLogicStart = "orderedSesiones.forEach(s => {\n      let volRelativo = 0";
const arrowLogicEnd = "for (let i = 1; i < validSesiones.length; i++) {";
const arrowLogicRegex = new RegExp(arrowLogicStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?' + arrowLogicEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 's');

const newArrowLogic = `orderedSesiones.forEach(s => {
      let volRelativo = 0
      const mdLabel = (s.titulo || s.tipo).trim()
      const m = data?.perSession?.[mdLabel] || {}
      const mt = data?.perSessionTeamAvg?.[mdLabel] || {}
      const dTotal = Number(m.distTotal)||Number(mt.distTotal)||0
      const dPerMin = Number(m.distPerMin)||Number(mt.distPerMin)||0
      const activeMin = (dTotal>0 && dPerMin>0) ? (dTotal/dPerMin) : (Number(m.minActivo)||Number(mt.minActivo)||1)
      
      const distTot = Number(m.distTotal)||Number(mt.distTotal)||0
      const v4 = Number(m.distV4)||Number(mt.distV4)||0
      const v5 = Number(m.distV5)||Number(mt.distV5)||0
      const nSprints = Number(m.nSprints)||Number(mt.nSprints)||0
      const accDec = (Number(m.nAcel)||Number(mt.nAcel)||0) + (Number(m.nDecel)||Number(mt.nDecel)||0) + (Number(m.nAcel3)||Number(mt.nAcel3)||0) + (Number(m.nDecel3)||Number(mt.nDecel3)||0)
  
      if (activeMin > 0) {
        volRelativo = (distTot + v4 + v5 + nSprints + accDec) / activeMin
      }
      
      sessionVolMap.set(s.id, volRelativo)
    })
  
    // Arrows logic
    const sessionArrowMap = new Map<number, 'UP'|'DOWN'|'EQUAL'>()
    const validSesiones = orderedSesiones.filter(s => s.tipo !== 'descanso' && s.tipo !== 'partido' && (sessionVolMap.get(s.id) || 0) > 0)
    for (let i = 1; i < validSesiones.length; i++) {`;

c = c.replace(arrowLogicRegex, newArrowLogic);

fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
console.log('Fixed CoachClient.tsx successfully');
