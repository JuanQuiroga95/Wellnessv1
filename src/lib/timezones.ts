// ─── Timezone options for notification preferences ──────────────────────────
// Grouped by country with IANA timezone identifiers

export interface TimezoneOption {
  country: string
  flag: string
  tz: string
  label: string
  utc: string
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  // Sudamérica
  { country: 'Argentina', flag: '🇦🇷', tz: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', utc: 'UTC-3' },
  { country: 'Uruguay', flag: '🇺🇾', tz: 'America/Montevideo', label: 'Montevideo', utc: 'UTC-3' },
  { country: 'Brasil', flag: '🇧🇷', tz: 'America/Sao_Paulo', label: 'São Paulo / Brasilia', utc: 'UTC-3' },
  { country: 'Chile', flag: '🇨🇱', tz: 'America/Santiago', label: 'Santiago', utc: 'UTC-4' },
  { country: 'Paraguay', flag: '🇵🇾', tz: 'America/Asuncion', label: 'Asunción', utc: 'UTC-4' },
  { country: 'Bolivia', flag: '🇧🇴', tz: 'America/La_Paz', label: 'La Paz', utc: 'UTC-4' },
  { country: 'Perú', flag: '🇵🇪', tz: 'America/Lima', label: 'Lima', utc: 'UTC-5' },
  { country: 'Colombia', flag: '🇨🇴', tz: 'America/Bogota', label: 'Bogotá', utc: 'UTC-5' },
  { country: 'Ecuador', flag: '🇪🇨', tz: 'America/Guayaquil', label: 'Guayaquil / Quito', utc: 'UTC-5' },
  { country: 'Venezuela', flag: '🇻🇪', tz: 'America/Caracas', label: 'Caracas', utc: 'UTC-4' },
  // Centroamérica y Caribe
  { country: 'México', flag: '🇲🇽', tz: 'America/Mexico_City', label: 'Ciudad de México', utc: 'UTC-6' },
  { country: 'Costa Rica', flag: '🇨🇷', tz: 'America/Costa_Rica', label: 'San José', utc: 'UTC-6' },
  { country: 'Panamá', flag: '🇵🇦', tz: 'America/Panama', label: 'Panamá', utc: 'UTC-5' },
  { country: 'Rep. Dominicana', flag: '🇩🇴', tz: 'America/Santo_Domingo', label: 'Santo Domingo', utc: 'UTC-4' },
  // Norteamérica
  { country: 'Estados Unidos', flag: '🇺🇸', tz: 'America/New_York', label: 'Este (NY, Miami)', utc: 'UTC-5' },
  { country: 'Estados Unidos', flag: '🇺🇸', tz: 'America/Chicago', label: 'Centro (Chicago, Houston)', utc: 'UTC-6' },
  { country: 'Estados Unidos', flag: '🇺🇸', tz: 'America/Los_Angeles', label: 'Pacífico (LA, SF)', utc: 'UTC-8' },
  // Europa
  { country: 'España', flag: '🇪🇸', tz: 'Europe/Madrid', label: 'Madrid', utc: 'UTC+1' },
  { country: 'Italia', flag: '🇮🇹', tz: 'Europe/Rome', label: 'Roma', utc: 'UTC+1' },
  { country: 'Francia', flag: '🇫🇷', tz: 'Europe/Paris', label: 'París', utc: 'UTC+1' },
  { country: 'Alemania', flag: '🇩🇪', tz: 'Europe/Berlin', label: 'Berlín', utc: 'UTC+1' },
  { country: 'Portugal', flag: '🇵🇹', tz: 'Europe/Lisbon', label: 'Lisboa', utc: 'UTC+0' },
  { country: 'Reino Unido', flag: '🇬🇧', tz: 'Europe/London', label: 'Londres', utc: 'UTC+0' },
  { country: 'Países Bajos', flag: '🇳🇱', tz: 'Europe/Amsterdam', label: 'Ámsterdam', utc: 'UTC+1' },
  // Asia / Otros
  { country: 'Japón', flag: '🇯🇵', tz: 'Asia/Tokyo', label: 'Tokio', utc: 'UTC+9' },
  { country: 'Australia', flag: '🇦🇺', tz: 'Australia/Sydney', label: 'Sídney', utc: 'UTC+11' },
  { country: 'Arabia Saudita', flag: '🇸🇦', tz: 'Asia/Riyadh', label: 'Riad', utc: 'UTC+3' },
  { country: 'Emiratos Árabes', flag: '🇦🇪', tz: 'Asia/Dubai', label: 'Dubái', utc: 'UTC+4' },
]

// Hour options for notification time picker (every 30 minutes)
export const HOUR_OPTIONS: string[] = []
for (let h = 0; h < 24; h++) {
  HOUR_OPTIONS.push(`${String(h).padStart(2, '0')}:00`)
  HOUR_OPTIONS.push(`${String(h).padStart(2, '0')}:30`)
}

/**
 * Get the current time in a specific timezone as HH:MM (rounded to nearest 30 min).
 */
export function getCurrentTimeInTZ(tz: string): string {
  const now = new Date()
  const parts = now.toLocaleString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })
  const [hStr, mStr] = parts.split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  let rounded = m < 15 ? '00' : m < 45 ? '30' : '00'
  if (m >= 45) h = (h + 1) % 24
  return `${String(h).padStart(2, '0')}:${rounded}`
}

/**
 * Get today's date in a specific timezone as YYYY-MM-DD.
 */
export function getTodayInTZ(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz })
}

/**
 * Get tomorrow's date in a specific timezone as YYYY-MM-DD.
 */
export function getTomorrowInTZ(tz: string): string {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: tz })
}
