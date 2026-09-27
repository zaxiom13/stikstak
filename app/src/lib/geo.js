// Tiny geohash + distance helpers. Feed "cells" are precision-5 geohashes
// (~4.9km x 4.9km); a feed is your cell plus its 8 neighbours, then trimmed
// to FEED_RADIUS_KM by real distance.
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz'

export const CELL_PRECISION = 5
export const FEED_RADIUS_KM = 8 // ~5 miles, like Yik Yak

export function encode(lat, lng, precision = 9) {
  let latLo = -90, latHi = 90, lngLo = -180, lngHi = 180
  let hash = '', bits = 0, ch = 0, evenBit = true
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngLo + lngHi) / 2
      if (lng >= mid) { ch = (ch << 1) | 1; lngLo = mid } else { ch = ch << 1; lngHi = mid }
    } else {
      const mid = (latLo + latHi) / 2
      if (lat >= mid) { ch = (ch << 1) | 1; latLo = mid } else { ch = ch << 1; latHi = mid }
    }
    evenBit = !evenBit
    if (++bits === 5) { hash += BASE32[ch]; bits = 0; ch = 0 }
  }
  return hash
}

export function bounds(hash) {
  let latLo = -90, latHi = 90, lngLo = -180, lngHi = 180, evenBit = true
  for (const c of hash) {
    const n = BASE32.indexOf(c)
    if (n < 0) throw new Error(`bad geohash char ${c}`)
    for (let b = 4; b >= 0; b--) {
      const bit = (n >> b) & 1
      if (evenBit) { const mid = (lngLo + lngHi) / 2; bit ? (lngLo = mid) : (lngHi = mid) }
      else { const mid = (latLo + latHi) / 2; bit ? (latLo = mid) : (latHi = mid) }
      evenBit = !evenBit
    }
  }
  return { latLo, latHi, lngLo, lngHi }
}

// The cell containing (lat,lng) plus its 8 neighbours (deduped near the poles/antimeridian).
export function nearbyCells(lat, lng, precision = CELL_PRECISION) {
  const center = encode(lat, lng, precision)
  const b = bounds(center)
  const dLat = b.latHi - b.latLo, dLng = b.lngHi - b.lngLo
  const cLat = (b.latLo + b.latHi) / 2, cLng = (b.lngLo + b.lngHi) / 2
  const out = new Set()
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
    const la = Math.max(-89.999, Math.min(89.999, cLat + dy * dLat))
    let ln = cLng + dx * dLng
    if (ln > 180) ln -= 360
    if (ln < -180) ln += 360
    out.add(encode(la, ln, precision))
  }
  return [center, ...[...out].filter(h => h !== center)]
}

export function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371, rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Stored coordinates are rounded (~110m) so exact post locations never leave the device.
export const fuzz = v => Math.round(v * 1000) / 1000
