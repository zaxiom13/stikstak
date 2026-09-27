// Shared yak mechanics: limits, ranking, karma, anonymous reply icons.
export const MAX_LEN = 200
export const HIDE_AT_SCORE = -5 // Yik Yak rule: 5 net downvotes and it's gone
export const FEED_MAX_AGE_H = 72
export const POST_COOLDOWN_S = 10

export function isVisible(item) {
  return (item.score ?? 0) > HIDE_AT_SCORE
}

// HN-style gravity so fresh yaks with a few votes beat old big ones.
export function hotRank(yak, now = Date.now()) {
  const ageH = Math.max(0, (now - yak.createdAt) / 36e5)
  return (yak.score + 1 + yak.replyCount * 0.5) / Math.pow(ageH + 2, 1.5)
}

export function sortFeed(yaks, mode, now = Date.now()) {
  const list = yaks.filter(isVisible)
  if (mode === 'hot') return list.sort((a, b) => hotRank(b, now) - hotRank(a, now))
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

// Yakarma: start at 100, plus net votes on everything you've posted, plus 2 per post.
export function yakarma(myYaks) {
  return 100 + myYaks.reduce((k, y) => k + y.score + 2, 0)
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

export const ICONS = ['🦊','🐸','🐙','🦉','🐢','🦄','🐝','🐧','🦖','🐳','🦔','🐼','🦦','🐞','🦩','🐨','🦥','🐯','🦕','🐬','🐿️','🦜','🐌','🦀']
export const COLORS = ['#ff6b6b','#ffa94d','#ffd43b','#69db7c','#38d9a9','#4dabf7','#748ffc','#da77f2','#f783ac','#20c997']

// Same person gets the same icon within one thread, a different one elsewhere.
export function threadIdentity(uid, yakId) {
  const h = hash(`${uid}:${yakId}`)
  return { icon: ICONS[h % ICONS.length], color: COLORS[(h >>> 8) % COLORS.length] }
}

export function yakColor(yakId) {
  return COLORS[hash(yakId) % COLORS.length]
}

export function validateText(text) {
  const t = (text ?? '').trim()
  if (!t) return 'Say something first'
  if (t.length > MAX_LEN) return `Keep it under ${MAX_LEN} characters`
  return null
}
