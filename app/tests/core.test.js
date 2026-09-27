import { describe, it, expect } from 'vitest'
import { encode, nearbyCells, distanceKm } from '../src/lib/geo.js'
import { sortFeed, yakarma, threadIdentity } from '../src/lib/yak.js'
import { createIdentity, signMessage, verifyMessage } from '../src/lib/crypto.js'
import { createStore } from '../src/core/store.js'

const memStorage = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } }
const HERE = { lat: 37.8719, lng: -122.2585 }
const tick = () => new Promise(r => setTimeout(r, 0))

describe('geo', () => {
  it('encodes known geohash', () => expect(encode(57.64911, 10.40744, 11)).toBe('u4pruydqqvj'))
  it('gives 9 distinct neighbour cells', () => {
    const cells = nearbyCells(HERE.lat, HERE.lng)
    expect(new Set(cells).size).toBe(9)
    expect(cells[0]).toBe(encode(HERE.lat, HERE.lng, 5))
  })
  it('measures distance', () => expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.19, 1))
})

describe('yak mechanics', () => {
  it('hides -5 and ranks hot by votes and age', () => {
    const now = Date.now()
    const yaks = [
      { id: 'old', score: 20, replyCount: 0, createdAt: now - 48 * 36e5 },
      { id: 'fresh', score: 5, replyCount: 2, createdAt: now - 36e5 },
      { id: 'buried', score: -5, replyCount: 0, createdAt: now },
    ]
    expect(sortFeed(yaks, 'hot', now).map(y => y.id)).toEqual(['fresh', 'old'])
    expect(sortFeed(yaks, 'new', now).map(y => y.id)).toEqual(['fresh', 'old'])
  })
  it('karma', () => expect(yakarma([{ score: 3 }, { score: -1 }])).toBe(106))
  it('stable thread identity', () => {
    expect(threadIdentity('a', 'y1')).toEqual(threadIdentity('a', 'y1'))
  })
})

describe('signed messages', () => {
  it('verifies and rejects tampering', async () => {
    const me = await createIdentity()
    const m = await signMessage(me, { t: 'yak', text: 'hi', ...HERE, ts: Date.now() }, W)
    expect(await verifyMessage(m)).toBe(true)
    expect(await verifyMessage({ ...m, text: 'edited' })).toBe(false)
    const other = await createIdentity()
    expect(await verifyMessage({ ...m, pub: other.pub })).toBe(false)
  })
})

const W = u => solve(u, 4)

describe('store', () => {
  it('scores with one vote per author, last write wins', async () => {
    const [a, b] = [await createIdentity(), await createIdentity()]
    const s = createStore({ powBits: 4, storage: memStorage(), myId: a.id })
    const y = await signMessage(b, { t: 'yak', text: 'hello', ...HERE, ts: Date.now() - 1000 }, W)
    expect(await s.apply(y)).toBe(true)
    expect(await s.apply(y)).toBe(false) // dedupe
    await s.apply(await signMessage(a, { t: 'vote', target: y.id, value: 1, ts: Date.now() - 500 }))
    await s.apply(await signMessage(a, { t: 'vote', target: y.id, value: -1, ts: Date.now() }))
    await s.apply(await signMessage(b, { t: 'vote', target: y.id, value: 1, ts: Date.now() }))
    const [view] = s.feed(HERE)
    expect(view.score).toBe(0)
    expect(view.myVote).toBe(-1)
  })

  it('only the author can delete', async () => {
    const [a, b] = [await createIdentity(), await createIdentity()]
    const s = createStore({ powBits: 4, storage: memStorage() })
    const y = await signMessage(a, { t: 'yak', text: 'mine', ...HERE, ts: Date.now() }, W)
    await s.apply(y)
    await s.apply(await signMessage(b, { t: 'del', target: y.id, ts: Date.now() }))
    expect(s.feed(HERE)).toHaveLength(1)
    await s.apply(await signMessage(a, { t: 'del', target: y.id, ts: Date.now() }))
    expect(s.feed(HERE)).toHaveLength(0)
  })

  it('rejects forged, oversized, future and spammy messages', async () => {
    const a = await createIdentity()
    const s = createStore({ powBits: 4, storage: memStorage() })
    const good = await signMessage(a, { t: 'yak', text: 'x', ...HERE, ts: Date.now() }, W)
    expect(await s.apply({ ...good, text: 'forged' })).toBe(false)
    expect(await s.apply(await signMessage(a, { t: 'yak', text: 'x'.repeat(201), ...HERE, ts: Date.now() }, W))).toBe(false)
    expect(await s.apply(await signMessage(a, { t: 'yak', text: 'x', ...HERE, ts: Date.now() + 36e5 }, W))).toBe(false)
    let accepted = 0
    for (let i = 0; i < 8; i++) accepted += await s.apply(await signMessage(a, { t: 'yak', text: `spam ${i}`, ...HERE, ts: Date.now() }, W))
    expect(accepted).toBe(4)
  })

  it('persists and reloads, and filters by distance', async () => {
    const a = await createIdentity()
    const storage = memStorage()
    const s = createStore({ powBits: 4, storage })
    await s.apply(await signMessage(a, { t: 'yak', text: 'near', ...HERE, ts: Date.now() }, W))
    await s.apply(await signMessage(a, { t: 'yak', text: 'far', lat: 40.7, lng: -74, ts: Date.now() }, W))
    expect(s.feed(HERE).map(y => y.text)).toEqual(['near'])
    await new Promise(r => setTimeout(r, 300))
    const s2 = createStore({ powBits: 4, storage }); await s2.load(); await tick()
    expect(s2.size()).toBe(2)
  })
})

import { moderate } from '../src/lib/moderation.js'
import { solve, checkPow } from '../src/lib/pow.js'

describe('moderation', () => {
  it('allows normal yaks and casual swearing', () => {
    expect(moderate('this exam was fucking brutal lol')).toBeNull()
    expect(moderate('Free pizza at the library steps')).toBeNull()
    expect(moderate('meet at 5 by the gym?')).toBeNull()
  })
  it('blocks threats, doxxing, links and slurs', () => {
    expect(moderate("i'm gonna kill jake tomorrow")).toMatch(/threats/)
    expect(moderate('text her 555-123-4567')).toMatch(/phone/)
    expect(moderate('he lives at 42 Maple St')).toMatch(/address/)
    expect(moderate('follow me insta @coolguy99')).toMatch(/handles/)
    expect(moderate('check www.example.com')).toMatch(/links/)
    expect(moderate('kys')).toMatch(/threats/)
    expect(moderate('you f4ggot')).toMatch(/slurs/)
  })
})

describe('bot protection', () => {
  it('peers reject posts without proof of work, accept with it', async () => {
    const a = await createIdentity()
    const s = createStore({ powBits: 4, storage: memStorage() })
    const lazy = await signMessage(a, { t: 'yak', text: 'no work', ...HERE, ts: Date.now() })
    expect(await s.apply(lazy)).toBe(false)
    const worked = await signMessage(a, { t: 'yak', text: 'did work', ...HERE, ts: Date.now() }, u => solve(u, 8))
    expect(await checkPow(worked, 8)).toBe(true)
  })

  it('peers reject offensive content even if signed and worked', async () => {
    const a = await createIdentity()
    const s = createStore({ powBits: 4, storage: memStorage() })
    const bad = await signMessage(a, { t: 'yak', text: 'call me 555-123-4567', ...HERE, ts: Date.now() }, W)
    expect(await s.apply(bad, { trusted: true })).toBe(false)
  })

  it('three reports hide a yak for everyone', async () => {
    const ids = await Promise.all([0, 1, 2, 3].map(createIdentity))
    const s = createStore({ powBits: 4, storage: memStorage() })
    const y = await signMessage(ids[0], { t: 'yak', text: 'meh', ...HERE, ts: Date.now() }, W)
    await s.apply(y, { trusted: true })
    for (const r of ids.slice(1, 3)) await s.apply(await signMessage(r, { t: 'report', target: y.id, ts: Date.now() }), { trusted: true })
    expect(s.feed(HERE)).toHaveLength(1)
    await s.apply(await signMessage(ids[3], { t: 'report', target: y.id, ts: Date.now() }), { trusted: true })
    expect(s.feed(HERE)).toHaveLength(0)
  })
})
