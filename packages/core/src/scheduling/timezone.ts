const WEEKDAYS = new Map([
  ['Sun', 0],
  ['Mon', 1],
  ['Tue', 2],
  ['Wed', 3],
  ['Thu', 4],
  ['Fri', 5],
  ['Sat', 6],
])

export type ZonedDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

export const assertTimezone = (timezone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return timezone
  } catch {
    throw new Error('invalid_timezone')
  }
}

export const getZonedDateParts = (
  timestamp: number,
  timezone: string,
): ZonedDateParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: assertTimezone(timezone),
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(timestamp))
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value)
  const weekday = WEEKDAYS.get(
    parts.find((part) => part.type === 'weekday')?.value ?? '',
  )
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    weekday: weekday ?? 0,
  }
}

const timezoneOffsetMs = (timestamp: number, timezone: string) => {
  const parts = getZonedDateParts(timestamp, timezone)
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) -
    timestamp
  )
}

export const zonedTimeToUtc = (
  parts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
  },
  timezone: string,
) => {
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  )
  let utc = localAsUtc - timezoneOffsetMs(localAsUtc, timezone)
  utc = localAsUtc - timezoneOffsetMs(utc, timezone)
  return utc
}
