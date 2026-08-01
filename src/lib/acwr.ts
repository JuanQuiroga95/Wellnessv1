export interface TrainingLog { fecha: string; carga_ua: number; carga_uce?: number | null }
export type ACWRMetric = 'ua' | 'uce'
export interface ACWRResult {
  ratio: number
  acuteLoad: number
  chronicLoad: number
  week1: number; week2: number; week3: number; week4: number
  status: string
  label: string
  color: string
}

// Fechas donde el jugador faltó explícitamente (carga = 0, no es día libre)
export type AusenciaSet = Set<string>

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function resolveLoad(log: TrainingLog, metric: ACWRMetric): number {
  if (metric === 'uce') {
    return log.carga_uce != null ? Number(log.carga_uce) : Number(log.carga_ua)
  }
  return Number(log.carga_ua)
}

export function calcACWR(logs: TrainingLog[], ref = new Date(), metric: ACWRMetric = 'ua', ausencias: AusenciaSet = new Set()): ACWRResult {
  const refMs = ref.getTime()
  const DAY = 86400000

  const noData = { ratio:0, acuteLoad:0, chronicLoad:0, week1:0, week2:0, week3:0, week4:0, status:'sin_datos', label:'Sin datos', color:'#888' }
  if (logs.length === 0) return noData

  let minTime = refMs
  for (const l of logs) {
    const t = new Date(l.fecha + 'T12:00:00').getTime()
    if (t < minTime) minTime = t
  }

  // Determine number of days to iterate (from minTime to refMs)
  // Max 365 days warmup to avoid massive loops if old data exists
  const maxDays = 365
  const startMs = Math.max(minTime, refMs - maxDays * DAY)
  const totalDays = Math.floor((refMs - startMs) / DAY) + 1

  const loadByDay = new Map<number, number>()
  for (const l of logs) {
    const t = new Date(l.fecha + 'T12:00:00').getTime()
    const d = Math.floor((t - startMs) / DAY)
    if (d >= 0 && d < totalDays) {
      loadByDay.set(d, (loadByDay.get(d) || 0) + resolveLoad(l, metric))
    }
  }

  const lambdaA = 2 / (7 + 1)
  const lambdaC = 2 / (28 + 1)

  const firstLoad = loadByDay.get(0) || 0
  let ewmaA = firstLoad
  let ewmaC = firstLoad

  for (let d = 1; d < totalDays; d++) {
    const load = loadByDay.get(d) || 0
    ewmaA = (load * lambdaA) + (ewmaA * (1 - lambdaA))
    ewmaC = (load * lambdaC) + (ewmaC * (1 - lambdaC))
  }

  const acuteLoad = ewmaA
  const chronicLoad = ewmaC

  if (chronicLoad < 1) return noData

  const ratio = parseFloat((acuteLoad / chronicLoad).toFixed(2))

  let status = 'insuficiente', label = 'Carga Insuficiente', color = '#38bdf8'
  if (ratio >= 0.8 && ratio < 1.3) { status = 'optimo';    label = 'Zona Segura'; color = '#22c55e' }
  else if (ratio >= 1.3 && ratio < 1.5) { status = 'precaucion'; label = 'Zona de Alerta';   color = '#f59e0b' }
  else if (ratio >= 1.5) { status = 'peligro';    label = 'Zona de Peligro';  color = '#ef4444' }

  return { ratio, acuteLoad: Math.round(acuteLoad), chronicLoad: Math.round(chronicLoad), week1:0, week2:0, week3:0, week4:0, status, label, color }
}

export function buildACWRHistory(logs: TrainingLog[], days = 28, metric: ACWRMetric = 'ua', ausencias: AusenciaSet = new Set()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const { ratio, status, acuteLoad, chronicLoad } = calcACWR(logs, d, metric, ausencias)
    const dateStr = localDateStr(d)
    return { date: dateStr, label: dateStr.slice(5), ratio, status, acuteLoad, chronicLoad, ausente: ausencias.has(dateStr) }
  })
}

export function buildDailyDetail(logs: TrainingLog[], metric: ACWRMetric = 'ua', ausencias: AusenciaSet = new Set()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = localDateStr(d)
    const dayLog = logs.filter(l => l.fecha === dateStr)
    const carga = dayLog.reduce((s, l) => s + resolveLoad(l, metric), 0)
    const { ratio, status } = calcACWR(logs, d, metric, ausencias)
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const ausente = ausencias.has(dateStr)
    return { date: dateStr, dia: dias[d.getDay()], carga, ratio, status, hasSesion: dayLog.length > 0, ausente }
  })
}
