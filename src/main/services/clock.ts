export function getServerTime(): number {
  return Date.now()
}

export function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
