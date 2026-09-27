export function timeAgo(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 45) return 'now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export function distanceLabel(km) {
  const mi = km * 0.621371
  if (mi < 0.2) return 'right here'
  if (mi < 1) return `${mi.toFixed(1)} mi`
  return `${Math.round(mi)} mi`
}
