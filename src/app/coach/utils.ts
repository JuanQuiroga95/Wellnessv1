export const OBJETIVOS_FISICOS = [
  'Introducción Aerobica',
  'Fuerza - Tensión',
  'Fuerza - Resistencia',
  'Resistencia - Duración',
  'Equilibrio - Regeneración',
  'Velocidad - Tappering',
  'Recuperación - Compensación',
  'Competición',
  'Amistoso'
]
export const OBJETIVOS_SECUNDARIOS = ['Táctico','Técnico','Técnico-Táctico']
export const TITULOS_SESION = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD','No MD']
export const ENTRENAMIENTO_OPTIMIZADOR = {
  COMPETITIVO: ["PARTIDO COMPETICIÓN","PARTIDO AMISTOSO","PARTIDO ENTRENAMIENTO","PARTIDO SITUACIÓN 11c11-8c8","PARTIDO REDUCIDO 7c7-3c3","PARTIDO DE ENTRENAMIENTO","PARTIDO SITUACIÓN 9V9 +2P","PARTIDO SITUACIÓN 8V8 +2P","PARTIDO SITUACIÓN 7V7 +2P","PARTIDO SITUACIÓN 9V7 +2P","JUEGO POSICIÓN GRANDE 10V10+2","PARTIDO SITUACIÓN 8V8+2 +2P","PARTIDO REDUCIDO 5V5 +2P","PARTIDO SITUACIÓN 10V10","PARTIDO REDUCIDO 6+4V6+2 +2P","PARTIDO REDUCIDO 4V4+1 +2P","JUEGO POSICIÓN GRANDE","PARTIDO REDUCIDO 3V3 +2P","PARTIDO REDUCIDO ALTERNO 6+4V6+4 +2P"],
  ESPECIAL: ["JUEGO POSICIÓN GRANDE 8c8-11c11","JUEGO POSICIÓN REDUCIDO 7c7-3c3","EVOLUCIÓN CON OPOSICIÓN","ABP CON OPOSICIÓN","EVOLUCIÓN SIN OPOSICIÓN","ABP SIN OPOSICIÓN","TRANSICIONES","RONDOS","PARTIDO SITUACIÓN 7V7+1 +2P","PARTIDO REDUCIDO 6V6+1 +2P","PARTIDO REDUCIDO 5V3+2 +2P","JUEGO POSICIÓN GRANDE 10V10 +PP","JUEGO POSICIÓN GRANDE 10V10","PARTIDO SITUACIÓN 10V8 +1P+PP","PARTIDO SITUACIÓN 8V7 +1P+PP","PARTIDO REDUCIDO 4V4+1(3V2/3V2) +2P","PARTIDO REDUCIDO ALTERNO 5+4V5+4 +2P","PARTIDO REDUCIDO 2+4V2+4 +2P","PARTIDO SITUACIÓN 9V10 +2P","PARTIDO SITUACIÓN 10V8 +1P","PARTIDO REDUCIDO 4+1V4+1 +2P","JUEGO POSICIÓN GRANDE 9V9+1 +2P","PARTIDO REDUCIDO 3+1V2V1 +2P","PARTIDO REDUCIDO 2V2+1 +2P","PARTIDO REDUCIDO ALTERNO 5V5+4+1 +2P","PARTIDO REDUCIDO 2V2 +PP","JUEGO POSICIÓN MEDIO 5V5 +PP","JUEGO DE CALENTAMIENTO","PARTIDO CORTO 3V2+1 +2P","PARTIDO REDUCIDO 5V5 (2V1/2V2/1V2)","JUEGO DE CALENTAMIENTO GIRADAS","JUEGO DE LÍNEAS 4+2V4+2","JUEGO POSICIÓN MEDIO 5V5+1 +2P","PARTIDO REDUCIDO 3+1V3+1 +2P","PARTIDO REDUCIDO 3V2/2V1 +2P","PARTIDO REDUCIDO 2+1V2+1 +2P","PARTIDO REDUCIDO 6V5","PARTIDO REDUCIDO 2V1+1 +PP","PARTIDO REDUCIDO 6V6+6 +2P","JUEGO DE POSICIÓN PEQUEÑO 4V4+4 +PP","PARTIDO BÁSQUET","JUEGO POSICIÓN MEDIO 6V6+3(3V2/3V2/3V2)","EVOLUCIONES OFENSIVAS","PARTIDO REDUCIDO 4+2V4+2 +2P","PARTIDO REDUCIDO 1V1 +PP","PARTIDO REDUCIDO 1V2/2V1 +PP","JUEGO POSICIÓN GRANDE 8V8+2(3V2/4V4/3V2)","JUEGO POSICIÓN PEQUEÑO 4V4+3(2V1/3V2/2V1)","JUEGO OLEADAS 3V2/2V1 +PP","JUEGO POSICIÓN GRANDE 9V9+1","JUEGO POSICIÓN GRANDE 9V9+2","CONSERVACIÓN 5+4V5+4","JUEGO POSICIÓN GRANDE 7V7+3","JUEGO POSICIÓN GRANDE 7V7+3(3V2/4V3/3V2)","JUEGO POSICIÓN GRANDE 8V8+4","JUEGO POSICIÓN MEDIO 6V6+2","RONDO 2 ESPACIOS 10V4/10V4","JUEGO POSICIÓN MEDIA 6V6+4","JUEGO POSICIÓN PEQUEÑO 4V4+3","CONSERVACIÓN 5V3 A 2 ESPACIOS","CONSERVACIÓN 6V3 A 2 ESPACIOS","CIRCUITO DIRIGIDO + 2V1","JUEGO POSICIÓN MEDIO 5V5+2","CONSERVACIÓN 5+5V5+5","FUTBOL TENIS","CONSERVACIÓN 10V10+3","JUEGO POSICIÓN 4V4+2","RONDO 6V2 A 2 ESPACIOS","JUEGO POSICIÓN PEQUEÑO 3V3+2","CONSERVACIÓN 11V11+4","JUEGO POSICIÓN PEQUEÑO 4V4+3 CIRCULAR","CIRCUITO DIRIGIDO CENTRO/REMATE","CIRCUITO DIRIGIDO FINALIZACIÓN","JUEGO POSICIÓN 3V3+3","RONDO 4V2","RONDO 6V2","RONDO 8V2","CIRCUITO DIRIGIDO CENTRO/REMATE 2","RONDO 5V2","RONDO 7V3 A 2 ESPACIOS","RONDO CIRCULAR CENTRAL","RONDOS VACIOS 4V2/4V2/4V2/4V0","RONDO 4V1"]
}

export const ENTRENAMIENTO_COADYUVANTE = {
  DIRIGIDO: ["CIRCUITO TÉCNICO CON FINALIZACIÓN","CIRCUITO DIRIGIDO CON FINALIZACIÓN","CIRCUITO TÉCNICO","CIRCUITO DIRIGIDO","JUEGO LÚDICO","JUEGO DE CALENTAMIENTO KINDBALL","CIRCUITO TÉCNICO 10 JUG.","CIRCUITO TÉCNICO 7 JUG.","CIRCUITO TÉCNICO Y","CIRCUITO TÉCNICO 6 JUG."],
  GENERAL: ["DOMINIO BALÓN","CIRCUITO PROPIOCEPCIÓN","CIRCUITO CONDICIONAL","ACTIVACIÓN NEUROMUSCULAR","CUALIDADES ESPECÍFICAS","PREVENTIVO","ESTRUCTURAL","RESTAURACIÓN","CIRCUITO TÉCNICO CARRERA","TRABAJO DE FUERZA EN EL GIMNASIO"]
}

export const TODAS_LAS_NUEVAS = [...Object.values(ENTRENAMIENTO_OPTIMIZADOR).flat(), ...Object.values(ENTRENAMIENTO_COADYUVANTE).flat()]

export const ENTRENAMIENTO_BASQUET_OPTIMIZADOR = {
  COMPETITIVO: ["JUEGO COMPETICIÓN", "JUEGO AMISTOSO", "JUEGO ENTRENAMIENTO", "JUEGO 5V5 CONDICIONADO", "JUEGO 4V4", "JUEGO 3V3"],
  ESPECIAL: ["TRANSICIONES OFENSIVAS", "TRANSICIONES DEFENSIVAS", "SISTEMAS OFENSIVOS (5V0/5V5)", "DEFENSA INDIVIDUAL/ZONAL", "SITUACIONES ESPECIALES (SAQUES)", "SUPERIORIDADES/INFERIORIDADES (3V2/2V1)", "RONDOS BÁSQUET", "TÉCNICA INDIVIDUAL (TIRO/DRIBLING/PASE) OPOSICIÓN"]
}

export const ENTRENAMIENTO_BASQUET_COADYUVANTE = {
  DIRIGIDO: ["CIRCUITO TÉCNICO", "CIRCUITO DIRIGIDO CON FINALIZACIÓN", "TRABAJO DE PIES", "ESTACIONES FUNDAMENTOS"],
  GENERAL: ["ACTIVACIÓN NEUROMUSCULAR", "TRABAJO DE FUERZA EN GIMNASIO", "PREVENTIVO", "ESTRUCTURAL", "RESTAURACIÓN", "PROPIOCEPCIÓN"]
}

export const TODAS_LAS_NUEVAS_BASQUET = [...Object.values(ENTRENAMIENTO_BASQUET_OPTIMIZADOR).flat(), ...Object.values(ENTRENAMIENTO_BASQUET_COADYUVANTE).flat()]

export const TAREAS_CON_ESPACIO = TODAS_LAS_NUEVAS
export const TAREAS_CON_EQUIPO = TODAS_LAS_NUEVAS
export const TAREAS_PARTIDO_SIMPLE = ['PARTIDO AMISTOSO','PARTIDO COMPETICIÓN','PARTIDO ENTRENAMIENTO', 'JUEGO AMISTOSO', 'JUEGO COMPETICIÓN', 'JUEGO ENTRENAMIENTO']
export const TAREAS_MOSTRAR_FORM = TODAS_LAS_NUEVAS

export const NE_DEFAULT: Record<string, number> = {
  "PARTIDO COMPETICIÓN": 10,
  "PARTIDO AMISTOSO": 9.5,
  "PARTIDO ENTRENAMIENTO": 9,
  "PARTIDO SITUACIÓN 11c11-8c8": 8.5,
  "PARTIDO REDUCIDO 7c7-3c3": 8,
  "JUEGO POSICIÓN GRANDE 8c8-11c11": 7.5,
  "JUEGO POSICIÓN REDUCIDO 7c7-3c3": 7,
  "EVOLUCIÓN CON OPOSICIÓN": 6.5,
  "ABP CON OPOSICIÓN": 6,
  "EVOLUCIÓN SIN OPOSICIÓN": 5.5,
  "ABP SIN OPOSICIÓN": 5,
  "TRANSICIONES": 5,
  "RONDOS": 4.5,
  "CIRCUITO TÉCNICO CON FINALIZACIÓN": 4,
  "CIRCUITO DIRIGIDO CON FINALIZACIÓN": 3.5,
  "CIRCUITO TÉCNICO": 3,
  "CIRCUITO DIRIGIDO": 2.5,
  "JUEGO LÚDICO": 2,
  "DOMINIO BALÓN": 1.5,
  "CIRCUITO PROPIOCEPCIÓN": 1,
  "CIRCUITO CONDICIONAL": 1,
  "ACTIVACIÓN NEUROMUSCULAR": 1,
  "CUALIDADES ESPECÍFICAS": 0.8,
  "PREVENTIVO": 0.6,
  "ESTRUCTURAL": 0.4,
  "RESTAURACIÓN": 0.2,
  "PARTIDO DE ENTRENAMIENTO": 10,
  "PARTIDO SITUACIÓN 9V9 +2P": 8.9,
  "PARTIDO SITUACIÓN 8V8 +2P": 8.9,
  "PARTIDO SITUACIÓN 7V7 +2P": 8.4,
  "PARTIDO SITUACIÓN 9V7 +2P": 8.1,
  "PARTIDO SITUACIÓN 7V7+1 +2P": 6.3,
  "JUEGO POSICIÓN GRANDE 10V10+2": 8.1,
  "PARTIDO SITUACIÓN 8V8+2 +2P": 8,
  "PARTIDO REDUCIDO 5V5 +2P": 7.9,
  "PARTIDO SITUACIÓN 10V10": 7.8,
  "PARTIDO REDUCIDO 6+4V6+2 +2P": 7.8,
  "PARTIDO REDUCIDO 4V4+1 +2P": 7.8,
  "JUEGO POSICIÓN GRANDE": 7.8,
  "PARTIDO REDUCIDO 6V6+1 +2P": 7.3,
  "PARTIDO REDUCIDO 3V3 +2P": 7.6,
  "PARTIDO REDUCIDO ALTERNO 6+4V6+4 +2P": 7.6,
  "PARTIDO REDUCIDO 5V3+2 +2P": 7.5,
  "JUEGO POSICIÓN GRANDE 10V10 +PP": 7.5,
  "JUEGO POSICIÓN GRANDE 10V10": 7.5,
  "PARTIDO SITUACIÓN 10V8 +1P+PP": 7.4,
  "PARTIDO SITUACIÓN 8V7 +1P+PP": 7.4,
  "PARTIDO REDUCIDO 4V4+1(3V2/3V2) +2P": 7.4,
  "PARTIDO REDUCIDO ALTERNO 5+4V5+4 +2P": 7.3,
  "PARTIDO REDUCIDO 2+4V2+4 +2P": 7.3,
  "PARTIDO SITUACIÓN 9V10 +2P": 7.2,
  "PARTIDO SITUACIÓN 10V8 +1P": 7.2,
  "PARTIDO REDUCIDO 4+1V4+1 +2P": 7.2,
  "JUEGO POSICIÓN GRANDE 9V9+1 +2P": 7.2,
  "PARTIDO REDUCIDO 3+1V2V1 +2P": 7.1,
  "PARTIDO REDUCIDO 2V2+1 +2P": 7.1,
  "PARTIDO REDUCIDO ALTERNO 5V5+4+1 +2P": 7.1,
  "PARTIDO REDUCIDO 2V2 +PP": 7.1,
  "JUEGO POSICIÓN MEDIO 5V5 +PP": 7.1,
  "JUEGO DE CALENTAMIENTO": 7.1,
  "PARTIDO CORTO 3V2+1 +2P": 7,
  "PARTIDO REDUCIDO 5V5 (2V1/2V2/1V2)": 6.9,
  "JUEGO DE CALENTAMIENTO GIRADAS": 6.9,
  "JUEGO DE LÍNEAS 4+2V4+2": 6.9,
  "JUEGO POSICIÓN MEDIO 5V5+1 +2P": 6.7,
  "PARTIDO REDUCIDO 3+1V3+1 +2P": 6.6,
  "PARTIDO REDUCIDO 3V2/2V1 +2P": 6.6,
  "PARTIDO REDUCIDO 2+1V2+1 +2P": 6.5,
  "PARTIDO REDUCIDO 6V5": 6.4,
  "PARTIDO REDUCIDO 2V1+1 +PP": 6.3,
  "PARTIDO REDUCIDO 6V6+6 +2P": 6.2,
  "JUEGO DE POSICIÓN PEQUEÑO 4V4+4 +PP": 6.2,
  "PARTIDO BÁSQUET": 6.2,
  "JUEGO POSICIÓN MEDIO 6V6+3(3V2/3V2/3V2)": 6.1,
  "EVOLUCIONES OFENSIVAS": 6.1,
  "PARTIDO REDUCIDO 4+2V4+2 +2P": 6,
  "PARTIDO REDUCIDO 1V1 +PP": 5.8,
  "PARTIDO REDUCIDO 1V2/2V1 +PP": 5.8,
  "JUEGO POSICIÓN GRANDE 8V8+2(3V2/4V4/3V2)": 5.8,
  "JUEGO POSICIÓN PEQUEÑO 4V4+3(2V1/3V2/2V1)": 5.8,
  "JUEGO OLEADAS 3V2/2V1 +PP": 5.8,
  "JUEGO POSICIÓN GRANDE 9V9+1": 5.7,
  "JUEGO POSICIÓN GRANDE 9V9+2": 5.7,
  "CONSERVACIÓN 5+4V5+4": 5.7,
  "JUEGO POSICIÓN GRANDE 7V7+3": 5.6,
  "JUEGO POSICIÓN GRANDE 7V7+3(3V2/4V3/3V2)": 5.6,
  "JUEGO POSICIÓN GRANDE 8V8+4": 5.6,
  "JUEGO POSICIÓN MEDIO 6V6+2": 5.6,
  "RONDO 2 ESPACIOS 10V4/10V4": 5.6,
  "JUEGO POSICIÓN MEDIA 6V6+4": 5.5,
  "JUEGO POSICIÓN PEQUEÑO 4V4+3": 5.5,
  "CONSERVACIÓN 5V3 A 2 ESPACIOS": 5.5,
  "CONSERVACIÓN 6V3 A 2 ESPACIOS": 5.5,
  "CIRCUITO DIRIGIDO + 2V1": 5.5,
  "JUEGO POSICIÓN MEDIO 5V5+2": 5.5,
  "CONSERVACIÓN 5+5V5+5": 5.5,
  "FUTBOL TENIS": 5.3,
  "CONSERVACIÓN 10V10+3": 5.2,
  "JUEGO POSICIÓN 4V4+2": 5.1,
  "RONDO 6V2 A 2 ESPACIOS": 4.7,
  "JUEGO POSICIÓN PEQUEÑO 3V3+2": 5.1,
  "CONSERVACIÓN 11V11+4": 5,
  "JUEGO POSICIÓN PEQUEÑO 4V4+3 CIRCULAR": 5,
  "CIRCUITO DIRIGIDO CENTRO/REMATE": 5,
  "CIRCUITO DIRIGIDO FINALIZACIÓN": 5,
  "JUEGO POSICIÓN 3V3+3": 5,
  "RONDO 4V2": 4.9,
  "RONDO 6V2": 4.9,
  "RONDO 8V2": 4.9,
  "CIRCUITO DIRIGIDO CENTRO/REMATE 2": 4.9,
  "RONDO 5V2": 4.8,
  "RONDO 7V3 A 2 ESPACIOS": 4.8,
  "RONDO CIRCULAR CENTRAL": 4.8,
  "RONDOS VACIOS 4V2/4V2/4V2/4V0": 4.7,
  "RONDO 4V1": 4.7,
  "JUEGO DE CALENTAMIENTO KINDBALL": 3.6,
  "CIRCUITO TÉCNICO 10 JUG.": 3.2,
  "CIRCUITO TÉCNICO 7 JUG.": 3.2,
  "CIRCUITO TÉCNICO Y": 3.2,
  "CIRCUITO TÉCNICO 6 JUG.": 3,
  "CIRCUITO TÉCNICO CARRERA": 1.1,
  "TRABAJO DE FUERZA EN EL GIMNASIO": 1
};

export function getCuadrante(densidad: number, jugadores?: number, deporte?: string) {
  const d = densidad
  const n = jugadores || 0

  let objetivo = 'Resistencia'
  let intensidad = 1

  if (deporte === 'BASQUET') {
    // Básquet: Cancha FIBA 420m2 (28x15).
    // Densidad: <10m2 = Pequeño, 10-20m2 = Medio, >20m2 = Grande
    if (d < 10) {
      objetivo = 'Fuerza'; intensidad = 1;
    } else if (d <= 20) {
      objetivo = 'Resistencia'; intensidad = 2;
    } else {
      objetivo = 'Velocidad'; intensidad = 3;
    }

    const colorMap: Record<string,{color:string,bg:string,border:string}> = {
      'Fuerza':      { color:'#a855f7', bg:'rgba(168,85,247,.1)',  border:'rgba(168,85,247,.3)' },
      'Resistencia': { color:'#f59e0b', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.3)' },
      'Velocidad':   { color:'#3b82f6', bg:'rgba(59,130,246,.1)',  border:'rgba(59,130,246,.3)' },
    }
    const { color, bg, border } = colorMap[objetivo] ?? { color:'#888', bg:'rgba(128,128,128,.1)', border:'rgba(128,128,128,.3)' }
    const espacioLabel = d < 10 ? 'Espacio Pequeño' : d <= 20 ? 'Espacio Medio' : 'Espacio Grande'
    const descs: Record<string,string> = {
      'Fuerza':      'Alta fricción · Contacto frecuente · SSG Alta Densidad',
      'Resistencia': 'Equilibrio técnico-táctico · Ritmo continuo',
      'Velocidad':   'Transiciones amplias · Alta intensidad de aceleración',
    }
    return { label: espacioLabel, objetivo, intensidad, color, bg, border, desc: descs[objetivo] }
  }

  // Fútbol (Sangnier et al 2018)
  if (d < 50) {
    if (n <= 4)       { objetivo = 'Fuerza';     intensidad = 1 }
    else if (n <= 8)  { objetivo = 'Fuerza';     intensidad = 2 }
    else if (n <= 14) { objetivo = 'Activación/Recuperación'; intensidad = 2 }
    else              { objetivo = 'Activación/Recuperación'; intensidad = 4 }
  } else if (d < 100) {
    if (n <= 4)       { objetivo = 'Fuerza';     intensidad = 3 }
    else if (n <= 8)  { objetivo = 'Fuerza';     intensidad = 4 }
    else if (n <= 14) { objetivo = 'Activación/Recuperación'; intensidad = 1 }
    else              { objetivo = 'Activación/Recuperación'; intensidad = 3 }
  } else if (d < 200) {
    if (n <= 4)       { objetivo = 'Resistencia'; intensidad = 2 }
    else if (n <= 8)  { objetivo = 'Resistencia'; intensidad = 4 }
    else if (n <= 14) { objetivo = 'Velocidad';   intensidad = 4 }
    else              { objetivo = 'Velocidad';   intensidad = 2 }
  } else {
    if (n <= 4)       { objetivo = 'Resistencia'; intensidad = 1 }
    else if (n <= 8)  { objetivo = 'Resistencia'; intensidad = 3 }
    else if (n <= 14) { objetivo = 'Velocidad';   intensidad = 3 }
    else              { objetivo = 'Velocidad';   intensidad = 1 }
  }

  const colorMap: Record<string,{color:string,bg:string,border:string}> = {
    'Fuerza':                  { color:'#a855f7', bg:'rgba(168,85,247,.1)',  border:'rgba(168,85,247,.3)' },
    'Activación':              { color:'#22c55e', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.3)'  },
    'Activación/Recuperación': { color:'#22c55e', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.3)'  },
    'Resistencia':             { color:'#f59e0b', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.3)' },
    'Velocidad':               { color:'#3b82f6', bg:'rgba(59,130,246,.1)',  border:'rgba(59,130,246,.3)' },
  }
  const { color, bg, border } = colorMap[objetivo] ?? { color:'#888', bg:'rgba(128,128,128,.1)', border:'rgba(128,128,128,.3)' }

  // Etiqueta de espacio relativa a la densidad
  const espacioLabel = d < 100 ? 'Espacio Reducido' : d < 200 ? 'Espacio Medio' : 'Espacio Grande'

  const descs: Record<string,string> = {
    'Fuerza':                  'Acciones neuromusculares · Contactos frecuentes · Espacio limitado',
    'Resistencia':             'Alta demanda aeróbica (FC) · Balance técnico-táctico · Densidad moderada',
    'Activación':              'Activación y recuperación · Baja exigencia · SSG de alta densidad',
    'Activación/Recuperación': 'Activación y recuperación · Baja exigencia · SSG de alta densidad',
    'Velocidad':               'Demanda HSR y VHSR · Sprints frecuentes · Espacios amplios',
  }

  return { label: espacioLabel, objetivo, intensidad, color, bg, border, desc: descs[objetivo] }
}


export const mkBars = (items: {name:string, val:number, sub?:string}[], bars: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
  if (!items.length) return '<p style="color:#aaa;font-size:10px;text-align:center;padding:8px">Sin datos</p>'
  const BAR_H = 200, TOP = 24, BOT = 48, COL_W = Math.max(Math.floor(800/items.length), 60)
  const W = items.length * COL_W
  const allVals = items.flatMap(it => bars.map(b => Number((it as any)[b.key])||0))
  const maxBar = Math.max(...allVals, 1)
  const lineVals = lineKey ? items.map(it => Number((it as any)[lineKey])||0) : []
  const maxLine = Math.max(...lineVals.filter(v=>v>0), 1)
  let svg = `<svg viewBox="0 0 ${W} ${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">`
  // grid lines
  ;[0,25,50,75,100].forEach(p => {
    const y = TOP + BAR_H - (p/100)*BAR_H
    svg += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>`
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
      svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" fill="${b.color}" rx="2"/>`
      if (val > 0) {
        if (h > 16) svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by+h/2+3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" transform="rotate(-90,${(bx+bw/2).toFixed(1)},${(by+h/2).toFixed(1)})">${val}</text>`
        else svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by-2).toFixed(1)}" text-anchor="middle" fill="${b.color}" font-size="7" font-weight="700">${val}</text>`
      }
    })
    // x label
    const cx = x0 + (COL_W-4)/2
    svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+12).toFixed(1)}" text-anchor="middle" fill="#333" font-size="8" font-weight="600">${it.name}</text>`
    if (it.sub) svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+22).toFixed(1)}" text-anchor="middle" fill="#888" font-size="7">${it.sub}</text>`
  })
  // line overlay
  if (lineKey && lineVals.some(v=>v>0)) {
    const pts = items.map((it,pi) => {
      const val = Number((it as any)[lineKey])||0
      const cx = pi*COL_W + 2 + (COL_W-4)/2
      const cy = val > 0 ? TOP + BAR_H - (val/maxLine)*BAR_H*0.85 : null
      return {cx, cy, val}
    }).filter(pt => pt.cy !== null)
    if (pts.length > 1) svg += `<polyline points="${pts.map(p=>`${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ')}" fill="none" stroke="${lineColor||'#34d399'}" stroke-width="1.5" stroke-dasharray="4,2"/>`
    pts.forEach(pt => {
      svg += `<circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="3" fill="${lineColor||'#34d399'}" stroke="#fff" stroke-width="1"/>`
      svg += `<text x="${pt.cx.toFixed(1)}" y="${(pt.cy-5).toFixed(1)}" text-anchor="middle" fill="${lineColor||'#34d399'}" font-size="7" font-weight="700">${pt.val}</text>`
    })
  }
  svg += '</svg>'
  return svg
}
