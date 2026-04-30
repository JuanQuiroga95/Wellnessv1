export interface TrainingLog { fecha: string; carga_ua: number; carga_uce?: number | null }
export interface Ausencia { fecha: string }
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

// Ausencias are dates where the player was explicitly absent (carga = 0).
// Days with no log AND no ausencia are treated as rest days (not counted).
export function calcACWR(
  logs: TrainingLog[],
  ref = new Date(),
  metric: ACWRMetric = 'ua',
  ausencias: Ausencia[] = []
): ACWRResult {
  const refMs = ref.getTime()
  const DAY = 86400000
  const ausenciaSet = new Set(ausencias.map(a => a.fecha))

  const sumWeek = (startDay: number, endDay: number) => {
    // Sum training loads for the window
    const trainLoad = logs
      .filter(l => {
        const d = (refMs - new Date(l.fecha + 'T12:00:00').getTime()) / DAY
        return d >= startDay && d < endDay
      })
      .reduce((s, l) => s + resolveLoad(l, metric), 0)
    // Absences contribute 0 (they don't add anything, but they are already
    // counted as 0 by their absence from the logs — the key effect is that
    // the denominator in ACWR reflects them implicitly via the 4-week average).
    // No explicit addition needed; 0 + trainLoad = trainLoad.
    return trainLoad
  }

  const w1 = sumWeek(0, 7)
  const w2 = sumWeek(7, 14)
  const w3 = sumWeek(14, 21)
  const w4 = sumWeek(21, 28)

  const acuteLoad = w1
  const chronicLoad = (w1 + w2 + w3 + w4) / 4

  const noData = { ratio:0, acuteLoad:0, chronicLoad:0, week1:0, week2:0, week3:0, week4:0, status:'sin_datos', label:'Sin datos', color:'#888' }
  if (!chronicLoad) return noData

  const ratio = parseFloat((acuteLoad / chronicLoad).toFixed(2))

  let status = 'peligro_bajo', label = 'Carga Baja', color = '#3b82f6'
  if (ratio >= 0.8 && ratio <= 1.3) { status = 'optimo';    label = 'Estado Óptimo'; color = '#22c55e' }
  else if (ratio > 1.3 && ratio <= 1.5) { status = 'precaucion'; label = 'Precaución';   color = '#f59e0b' }
  else if (ratio > 1.5) { status = 'peligro';    label = 'Riesgo Alto';  color = '#ef4444' }

  return { ratio, acuteLoad: Math.round(acuteLoad), chronicLoad: Math.round(chronicLoad), week1:Math.round(w1), week2:Math.round(w2), week3:Math.round(w3), week4:Math.round(w4), status, label, color }
}

export function buildACWRHistory(logs: TrainingLog[], days = 28, metric: ACWRMetric = 'ua', ausencias: Ausencia[] = []) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const { ratio, status, acuteLoad, chronicLoad } = calcACWR(logs, d, metric, ausencias)
    const dateStr = localDateStr(d)
    return { date: dateStr, label: dateStr.slice(5), ratio, status, acuteLoad, chronicLoad }
  })
}

export function buildDailyDetail(logs: TrainingLog[], metric: ACWRMetric = 'ua', ausencias: Ausencia[] = []) {
  const ausenciaSet = new Set(ausencias.map(a => a.fecha))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = localDateStr(d)
    const dayLog = logs.filter(l => l.fecha === dateStr)
    const carga = dayLog.reduce((s, l) => s + resolveLoad(l, metric), 0)
    const { ratio, status } = calcACWR(logs, d, metric, ausencias)
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    const esAusente = ausenciaSet.has(dateStr)
    return { date: dateStr, dia: dias[d.getDay()], carga, ratio, status, hasSesion: dayLog.length > 0, esAusente }
  })
}
