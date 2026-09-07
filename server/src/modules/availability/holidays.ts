const FIXED_HOLIDAYS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia Nacional de Zumbi e da Consciência Negra
  '12-25', // Natal
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

// Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for the date of Easter Sunday.
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

function movableHolidaysForYear(year: number): Set<string> {
  const easter = easterSunday(year)
  const easterUtc = Date.UTC(year, easter.month - 1, easter.day)
  const DAY_MS = 24 * 60 * 60 * 1000
  const offset = (days: number) => {
    const d = new Date(easterUtc + days * DAY_MS)
    return toDateStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  return new Set([
    offset(-47), // Carnaval (terça-feira)
    offset(-2), // Sexta-feira Santa
    offset(60), // Corpus Christi
  ])
}

export function isNationalHoliday(date: string): boolean {
  const [year, monthDay] = [date.slice(0, 4), date.slice(5)]
  if (FIXED_HOLIDAYS.includes(monthDay)) return true
  return movableHolidaysForYear(Number(year)).has(date)
}
