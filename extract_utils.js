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