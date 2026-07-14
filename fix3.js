const fs = require('fs');
let c = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

const regex = /orderedSesiones\.forEach\(s => \{\s*let volRelativo = 0[\s\S]*?for \(let i = 1; i < validSesiones\.length; i\+\+\) \{/;

const newLogic = `orderedSesiones.forEach(s => {
      let volRelativo = 0
      const mdLabel = (s.titulo || s.tipo).trim()
      
      // Intentar calcular usando datos reales de GPS (gpsPerMD)
      const rows = data?.gpsPerMD?.[mdLabel] || []
      if (rows.length > 0) {
        const getAvg = (k) => {
          const vals = rows.map(p => Number(p[k])||0).filter(x => x > 0)
          return vals.length ? vals.reduce((sum, x) => sum + x, 0) / vals.length : 0
        }
        
        const distPerMin = getAvg('dist_per_min')
        const activeMin = getAvg('duracion_min') || 1
        
        const distV4 = getAvg('dist_v4') || getAvg('dist_hir') || 0
        const v4PerMin = distV4 / activeMin
        
        const distV5 = getAvg('dist_v5') || 0
        const v5PerMin = distV5 / activeMin
        
        const acc2 = getAvg('acc2'); const acc3 = getAvg('acc3')
        const dec2 = getAvg('dec2'); const dec3 = getAvg('dec3')
        const accTotal = getAvg('acc_total'); const decTotal = getAvg('dec_total')
        const accDec = (accTotal + decTotal) > 0 ? (accTotal + decTotal) : (acc2 + acc3 + dec2 + dec3)
        const accDecPerMin = accDec / activeMin
        
        volRelativo = distPerMin + v4PerMin + v5PerMin + accDecPerMin
      }
      
      // Si no hay datos GPS reales, intentar con los datos planificados
      if (volRelativo === 0) {
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
      }
      
      sessionVolMap.set(s.id, volRelativo)
    })
  
    // Arrows logic
    const sessionArrowMap = new Map<number, 'UP'|'DOWN'|'EQUAL'>()
    const validSesiones = orderedSesiones.filter(s => s.tipo !== 'descanso' && s.tipo !== 'partido' && (sessionVolMap.get(s.id) || 0) > 0)
    for (let i = 1; i < validSesiones.length; i++) {`;

if (regex.test(c)) {
  c = c.replace(regex, newLogic);
  fs.writeFileSync('src/app/coach/CoachClient.tsx', c, 'utf8');
  console.log('Successfully replaced arrow logic');
} else {
  console.log('Regex did not match');
}
