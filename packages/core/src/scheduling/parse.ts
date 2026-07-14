import { getZonedDateParts, zonedTimeToUtc } from './timezone.js'

export type ScheduleTimeParseResult =
  | {
      ok: true
      input: string
      scheduledFor: number
      timezone: string
      mode: 'exact' | 'relative' | 'local'
      normalized: string
    }
  | { ok: false; input: string; code: 'invalid_schedule_time' }

const WEEKDAYS = new Map([
  ['sun', 0],
  ['sunday', 0],
  ['mon', 1],
  ['monday', 1],
  ['tue', 2],
  ['tuesday', 2],
  ['wed', 3],
  ['wednesday', 3],
  ['thu', 4],
  ['thursday', 4],
  ['fri', 5],
  ['friday', 5],
  ['sat', 6],
  ['saturday', 6],
])
const PERIOD_HOURS = new Map([
  ['morning', 9],
  ['afternoon', 13],
  ['evening', 17],
  ['night', 20],
])
const RELATIVE_UNITS: Record<string, number> = {
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
}

const parseTime = (value: string | undefined, period: string | null) => {
  const trimmed = value?.trim().toLowerCase()
  if (!trimmed)
    return { hour: period ? (PERIOD_HOURS.get(period) ?? 9) : 9, minute: 0 }
  const match = trimmed.match(/^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?$/)
  if (!match) return null
  let hour = Number(match[1])
  const minute = match[2] ? Number(match[2]) : 0
  if (match[3] === 'am' && hour === 12) hour = 0
  if (match[3] === 'pm' && hour < 12) hour += 12
  if (
    !match[3] &&
    period &&
    ['afternoon', 'evening', 'night'].includes(period) &&
    hour > 0 &&
    hour < 12
  )
    hour += 12
  return hour >= 0 && hour <= 23 ? { hour, minute } : null
}

const localTimestamp = (input: {
  daysAhead: number
  hour: number
  minute: number
  now: number
  timezone: string
}) => {
  const current = getZonedDateParts(input.now, input.timezone)
  const date = new Date(
    Date.UTC(current.year, current.month - 1, current.day + input.daysAhead),
  )
  return zonedTimeToUtc(
    {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: input.hour,
      minute: input.minute,
    },
    input.timezone,
  )
}

export const parseScheduleTime = (
  value: string,
  input: { now?: number; timezone: string },
): ScheduleTimeParseResult => {
  const raw = value.trim()
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ')
  const now = input.now ?? Date.now()
  const invalid = (): ScheduleTimeParseResult => ({
    ok: false,
    input: raw,
    code: 'invalid_schedule_time',
  })
  if (!normalized) return invalid()
  if (normalized === 'now')
    return {
      ok: true,
      input: raw,
      scheduledFor: now,
      timezone: input.timezone,
      mode: 'relative',
      normalized,
    }

  const numeric = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : Number.NaN
  const exact = Number.isFinite(numeric) ? numeric : Date.parse(raw)
  if (Number.isFinite(exact) && exact >= 0) {
    const scheduledFor = Math.floor(exact)
    return {
      ok: true,
      input: raw,
      scheduledFor,
      timezone: input.timezone,
      mode: 'exact',
      normalized: new Date(scheduledFor).toISOString(),
    }
  }

  const relative = normalized.match(/^in (\d+(?:\.\d+)?) ([a-z]+)$/)
  if (relative) {
    const unit = RELATIVE_UNITS[relative[2] ?? '']
    if (unit)
      return {
        ok: true,
        input: raw,
        scheduledFor: Math.floor(now + Number(relative[1]) * unit),
        timezone: input.timezone,
        mode: 'relative',
        normalized,
      }
  }

  const day = normalized.match(
    /^(today|tomorrow)(?:\s+(morning|afternoon|evening|night))?(?:\s+(?:at\s+)?(.+))?$/,
  )
  if (day) {
    const time = parseTime(day[3], day[2] ?? null)
    if (!time) return invalid()
    return {
      ok: true,
      input: raw,
      scheduledFor: localTimestamp({
        daysAhead: day[1] === 'tomorrow' ? 1 : 0,
        ...time,
        now,
        timezone: input.timezone,
      }),
      timezone: input.timezone,
      mode: 'local',
      normalized,
    }
  }

  const weekday = normalized.match(
    /^(sun|sunday|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday)(?:\s+(morning|afternoon|evening|night))?(?:\s+(?:at\s+)?(.+))?$/,
  )
  if (!weekday) return invalid()
  const targetWeekday = WEEKDAYS.get(weekday[1] ?? '')
  const time = parseTime(weekday[3], weekday[2] ?? null)
  if (targetWeekday == null || !time) return invalid()
  const current = getZonedDateParts(now, input.timezone)
  let daysAhead = (targetWeekday - current.weekday + 7) % 7
  if (
    daysAhead === 0 &&
    time.hour * 60 + time.minute <= current.hour * 60 + current.minute
  )
    daysAhead = 7
  return {
    ok: true,
    input: raw,
    scheduledFor: localTimestamp({
      daysAhead,
      ...time,
      now,
      timezone: input.timezone,
    }),
    timezone: input.timezone,
    mode: 'local',
    normalized,
  }
}
