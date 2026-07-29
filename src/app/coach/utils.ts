export const OBJETIVOS_FISICOS = [
  'Introducción Aerobica',
  'Fuerza - Tensión',
  'Fuerza - Resistencia',
  'Resistencia - Duración',
  'Equilibrio - Regeneración',
  'Velocidad - Tappering',
  'Recuperación - Compensación',
  'Competición'
]
export const OBJETIVOS_SECUNDARIOS = ['Táctico','Técnico','Técnico-Táctico']
export const TITULOS_SESION = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD','No MD']
export const ENTRENAMIENTO_OPTIMIZADOR = {
  COMPETITIVO: ['PARTIDO COMPETICIÓN', 'PARTIDO AMISTOSO', 'PARTIDO ENTRENAMIENTO', 'PARTIDO SITUACIÓN 11c11-8c8', 'PARTIDO REDUCIDO 7c7-3c3'],
  ESPECIAL: ['JUEGO POSICIÓN GRANDE 8c8-11c11', 'JUEGO POSICIÓN REDUCIDO 7c7-3c3', 'EVOLUCIÓN CON OPOSICIÓN', 'ABP CON OPOSICIÓN', 'EVOLUCIÓN SIN OPOSICIÓN', 'ABP SIN OPOSICIÓN', 'RONDOS', 'TRANSICIONES']
}

export const ENTRENAMIENTO_COADYUVANTE = {
  DIRIGIDO: ['CIRCUITO TÉCNICO CON FINALIZACIÓN', 'CIRCUITO DIRIGIDO CON FINALIZACIÓN', 'CIRCUITO TÉCNICO', 'CIRCUITO DIRIGIDO', 'JUEGO LÚDICO'],
  GENERAL: ['DOMINIO BALÓN', 'CIRCUITO PROPIOCEPCIÓN', 'CIRCUITO CONDICIONAL', 'ACTIVACIÓN NEUROMUSCULAR', 'CUALIDADES ESPECÍFICAS', 'PREVENTIVO', 'ESTRUCTURAL', 'RESTAURACIÓN']
}

export const SUBTAREAS: Record<string, string[]> = {
  'PREVENTIVO': ['TRABAJO GRUPAL', 'TRABAJO INDIVIDUAL'],
  'ESTRUCTURAL': ['Adaptacion Anatómica', 'Hipertrofia Aplicada', 'Metabólico'],
  'CUALIDADES ESPECÍFICAS': ['Desplazamiento', 'Salto', 'Lucha', 'Acción de Juego']
}

export const TODAS_LAS_NUEVAS = [...Object.values(ENTRENAMIENTO_OPTIMIZADOR).flat(), ...Object.values(ENTRENAMIENTO_COADYUVANTE).flat()]
export const TAREAS_CON_ESPACIO = TODAS_LAS_NUEVAS
export const TAREAS_CON_EQUIPO = TODAS_LAS_NUEVAS
export const TAREAS_PARTIDO_SIMPLE = ['PARTIDO AMISTOSO','PARTIDO COMPETICIÓN','PARTIDO ENTRENAMIENTO']
export const TAREAS_MOSTRAR_FORM = TODAS_LAS_NUEVAS

export const NE_DEFAULT: Record<string, number> = {
  'PARTIDO COMPETICIÓN': 10, 'PARTIDO AMISTOSO': 9.5, 'PARTIDO ENTRENAMIENTO': 9, 'PARTIDO SITUACIÓN 11c11-8c8': 8.5, 'PARTIDO REDUCIDO 7c7-3c3': 8,
  'JUEGO POSICIÓN GRANDE 8c8-11c11': 7.5, 'JUEGO POSICIÓN REDUCIDO 7c7-3c3': 7, 'EVOLUCIÓN CON OPOSICIÓN': 6.5, 'ABP CON OPOSICIÓN': 6, 'EVOLUCIÓN SIN OPOSICIÓN': 5.5, 'ABP SIN OPOSICIÓN': 5, 'TRANSICIONES': 5, 'RONDOS': 4.5,
  'CIRCUITO TÉCNICO CON FINALIZACIÓN': 4, 'CIRCUITO DIRIGIDO CON FINALIZACIÓN': 3.5, 'CIRCUITO TÉCNICO': 3, 'CIRCUITO DIRIGIDO': 2.5, 'JUEGO LÚDICO': 2,
  'DOMINIO BALÓN': 1.5, 'CIRCUITO PROPIOCEPCIÓN': 1, 'CIRCUITO CONDICIONAL': 1, 'ACTIVACIÓN NEUROMUSCULAR': 1, 'CUALIDADES ESPECÍFICAS': 0.8, 'PREVENTIVO': 0.6, 'ESTRUCTURAL': 0.4, 'RESTAURACIÓN': 0.2
}

export function getCuadrante(densidad: number, jugadores?: number) {
  // Sangnier et al (2018) — clasificación EXACTA del Excel
  // Eje Y (densidad m²/jug): <50 | 50-100 | 100-200 | >=200
  // Eje X (total jugadores): <=4 | <=8 | <=14 | <=20
  //
  // Tabla completa:
  // densidad\jug  | <=4           | <=8           | <=14          | <=20
  // <50           | Fuerza 1      | Fuerza 2      | Act./Rec. 2   | Act./Rec. 4
  // 50-100        | Fuerza 3      | Fuerza 4      | Act./Rec. 1   | Act./Rec. 3
  // 100-200       | Resistencia 2 | Resistencia 4 | Velocidad 4   | Velocidad 2
  // >=200         | Resistencia 1 | Resistencia 3 | Velocidad 3   | Velocidad 1

  const d = densidad
  const n = jugadores || 0

  // Tabla completa incluyendo número de intensidad (Sangnier et al 2018)
  // densidad\jug  | <=4              | <=8              | <=14             | <=20
  // <50           | Fuerza 1         | Fuerza 2         | Act./Rec. 2      | Act./Rec. 4
  // 50-100        | Fuerza 3         | Fuerza 4         | Act./Rec. 1      | Act./Rec. 3
  // 100-200       | Resistencia 2    | Resistencia 4    | Velocidad 4      | Velocidad 2
  // >=200         | Resistencia 1    | Resistencia 3    | Velocidad 3      | Velocidad 1
  // Número: 1 = más intenso, 4 = menos intenso (dentro de su categoría)

  let objetivo = 'Resistencia'
  let intensidad = 1

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
