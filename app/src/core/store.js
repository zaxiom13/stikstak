// The local "stak": every signed message this device has seen. There is no
// server copy. Feeds, scores and reply counts are all derived from it, and
// the whole thing is re-shared with peers when they connect.
import { verifyMessage, authorId } from '../lib/crypto.js'
import { MAX_LEN, FEED_MAX_AGE_H } from '../lib/yak.js'
import { distanceKm, FEED_RADIUS_KM } from '../lib/geo.js'
import { moderate } from '../lib/moderation.js'
import { checkPow, POW_BITS } from '../lib/pow.js'

const MAX_MESSAGES = 3000
// Per-author limits. Every peer enforces them, so a flooder's extras never spread.
const MAX_POSTS_PER_MIN = 4
const MAX_POSTS_PER_HOUR = 20
const MAX_VOTES_PER_MIN = 60
const MAX_REPORTS_PER_HOUR = 10
export const REPORTS_TO_HIDE = 3
const FUTURE_SLACK_MS = 5 * 60e3

const isStr = (v, max) => typeof v === 'string' && v.length <= max
const validText = t => typeof t === 'string' && t.trim().length > 0 && t.length <= MAX_LEN

export function validShape(m, now = Date.now()) {
  if (!m || typeof m !== 'object' || !isStr(m.id, 40) || typeof m.ts !== 'number') return false
  if (m.ts > now + FUTURE_SLACK_MS || m.ts < now - FEED_MAX_AGE_H * 36e5) return false
  switch (m.t) {
    case 'yak': return validText(m.text) && Number.isFinite(m.lat) && Number.isFinite(m.lng) && Math.abs(m.lat) <= 90 && Math.abs(m.lng) <= 180
    case 'reply': return isStr(m.yakId, 40) && validText(m.text) && isStr(m.icon, 8) && isStr(m.color, 9)
    case 'vote': return isStr(m.target, 40) && [1, 0, -1].includes(m.value)
    case 'del': return isStr(m.target, 40)
    case 'report': return isStr(m.target, 40)
    default: return false
  }
}

export function createStore({ storage = globalThis.localStorage, key = 'stikstak-stak-v1', myId = null, powBits = POW_BITS } = {}) {
  const msgs = new Map() // id -> msg (verified)
  const authors = new Map() // msg id -> author id
  const listeners = new Set()
  let emitQueued = false

  const emit = () => {
    if (emitQueued) return
    emitQueued = true
    queueMicrotask(() => { emitQueued = false; listeners.forEach(fn => fn()) })
  }

  let saveTimer = null
  const save = () => {
    if (!storage) return
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try { storage.setItem(key, JSON.stringify([...msgs.values()])) } catch { /* quota: keep in memory */ }
    }, 250)
  }

  const KIND = { yak: 'post', reply: 'post', vote: 'vote', report: 'report' }
  function countRecent(author, kind, ts, windowMs) {
    let n = 0
    for (const [id, m] of msgs) {
      if (KIND[m.t] === kind && authors.get(id) === author && Math.abs(m.ts - ts) < windowMs) n++
    }
    return n
  }
  function overLimit(m, author) {
    switch (KIND[m.t]) {
      case 'post': return countRecent(author, 'post', m.ts, 60e3) >= MAX_POSTS_PER_MIN || countRecent(author, 'post', m.ts, 36e5) >= MAX_POSTS_PER_HOUR
      case 'vote': return countRecent(author, 'vote', m.ts, 60e3) >= MAX_VOTES_PER_MIN
      case 'report': return countRecent(author, 'report', m.ts, 36e5) >= MAX_REPORTS_PER_HOUR
      default: return false
    }
  }

  // Returns true when the message was new and valid. `trusted` skips the
  // signature and proof-of-work checks (our own disk, our own posts, demo bots),
  // never the content rules or rate limits.
  async function apply(m, { trusted = false } = {}) {
    if (!validShape(m) || msgs.has(m.id)) return false
    if ((m.t === 'yak' || m.t === 'reply') && moderate(m.text)) return false
    if (!trusted && !(await verifyMessage(m))) return false
    if (!trusted && ['yak', 'reply', 'report'].includes(m.t) && !(await checkPow(m, powBits))) return false
    if (msgs.has(m.id)) return false
    const author = await authorId(m.pub)
    if (overLimit(m, author)) return false
    msgs.set(m.id, m)
    authors.set(m.id, author)
    if (msgs.size > MAX_MESSAGES) prune()
    save()
    emit()
    return true
  }

  function prune(now = Date.now()) {
    const cutoff = now - FEED_MAX_AGE_H * 36e5
    for (const [id, m] of msgs) if (m.ts < cutoff) { msgs.delete(id); authors.delete(id) }
    if (msgs.size > MAX_MESSAGES) {
      const sorted = [...msgs.values()].sort((a, b) => a.ts - b.ts)
      for (const m of sorted.slice(0, msgs.size - MAX_MESSAGES)) { msgs.delete(m.id); authors.delete(m.id) }
    }
  }

  async function load() {
    if (!storage) return
    let saved = []
    try { saved = JSON.parse(storage.getItem(key)) || [] } catch { /* fresh start */ }
    // Our own disk is trusted enough to skip re-verifying on every launch.
    for (const m of saved) await apply(m, { trusted: true })
    prune()
  }

  // ---- derived views ----
  function index() {
    const deleted = new Set()
    const votes = new Map() // target -> Map(author -> {value, ts})
    const replies = new Map() // yakId -> [msg]
    const reports = new Map() // target -> Set(author)
    for (const [id, m] of msgs) {
      if (m.t === 'report') {
        if (!reports.has(m.target)) reports.set(m.target, new Set())
        reports.get(m.target).add(authors.get(id))
        continue
      }
      if (m.t === 'del') {
        const target = msgs.get(m.target)
        if (target && authors.get(m.target) === authors.get(id)) deleted.add(m.target)
      } else if (m.t === 'vote') {
        const byAuthor = votes.get(m.target) ?? new Map()
        const prev = byAuthor.get(authors.get(id))
        if (!prev || prev.ts < m.ts || (prev.ts === m.ts && prev.id < m.id)) byAuthor.set(authors.get(id), m)
        votes.set(m.target, byAuthor)
      } else if (m.t === 'reply') {
        if (!replies.has(m.yakId)) replies.set(m.yakId, [])
        replies.get(m.yakId).push(m)
      }
    }
    for (const [target, who] of reports) if (who.size >= REPORTS_TO_HIDE) deleted.add(target)
    const myReports = new Set([...reports].filter(([, who]) => who.has(myId)).map(([t]) => t))
    const score = id => [...(votes.get(id)?.values() ?? [])].reduce((s, v) => s + v.value, 0)
    const myVote = id => (myId && votes.get(id)?.get(myId)?.value) || 0
    return { deleted, score, myVote, replies, myReports }
  }

  function view(m, idx) {
    return {
      id: m.id, text: m.text, authorId: authors.get(m.id), createdAt: m.ts,
      lat: m.lat, lng: m.lng, icon: m.icon, color: m.color, yakId: m.yakId,
      score: idx.score(m.id), myVote: idx.myVote(m.id),
      replyCount: (idx.replies.get(m.id) ?? []).filter(r => !idx.deleted.has(r.id)).length,
      mine: authors.get(m.id) === myId,
      reported: idx.myReports.has(m.id),
    }
  }

  function yaks(filter = () => true) {
    const idx = index()
    return [...msgs.values()].filter(m => m.t === 'yak' && !idx.deleted.has(m.id) && !idx.myReports.has(m.id) && filter(m)).map(m => view(m, idx))
  }

  return {
    apply,
    load,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    setMyId(id) { myId = id; emit() },
    feed({ lat, lng }, radiusKm = FEED_RADIUS_KM) {
      return yaks(m => distanceKm(m.lat, m.lng, lat, lng) <= radiusKm)
    },
    mine() { return yaks(m => authors.get(m.id) === myId) },
    yak(id) {
      const m = msgs.get(id)
      if (!m || m.t !== 'yak') return null
      const idx = index()
      return idx.deleted.has(id) ? null : view(m, idx)
    },
    replies(yakId) {
      const idx = index()
      return (idx.replies.get(yakId) ?? []).filter(r => !idx.deleted.has(r.id) && !idx.myReports.has(r.id)).sort((a, b) => a.ts - b.ts).map(m => view(m, idx))
    },
    // Everything worth handing to a peer who just showed up near `center`.
    syncSet(center, radiusKm = FEED_RADIUS_KM * 3) {
      const near = new Set([...msgs.values()].filter(m => m.t === 'yak' && distanceKm(m.lat, m.lng, center.lat, center.lng) <= radiusKm).map(m => m.id))
      return [...msgs.values()].filter(m =>
        near.has(m.id) || near.has(m.yakId) || near.has(m.target) || near.has(msgs.get(m.target)?.yakId))
    },
    size: () => msgs.size,
  }
}
