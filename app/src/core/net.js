// Peer-to-peer gossip. Everyone in the same ~20km area joins one Trystero room.
// Trystero uses the signalling service (Firebase Realtime Database, or public
// Nostr relays as a zero-setup fallback) ONLY to swap WebRTC connection offers.
// Yaks, replies and votes travel phone-to-phone over encrypted data channels.
import { encode } from '../lib/geo.js'

const ROOM_PRECISION = 4 // ~39km x 20km, comfortably covers a 5 mile feed
const CHUNK = 40
// A peer may hand us its whole history once, then only a trickle. Past this
// budget per minute we drop its batches (and the store's own limits apply too).
const PEER_BUDGET_PER_MIN = 800

export async function joinStak({ mode, firebaseApp, center, store, onHerd }) {
  const roomId = `stak-${encode(center.lat, center.lng, ROOM_PRECISION)}`
  let room
  if (mode === 'firebase' || mode === 'emulator') {
    const { joinRoom } = await import('@trystero-p2p/firebase')
    room = joinRoom({
      appId: firebaseApp.options.databaseURL,
      relayConfig: { firebaseApp },
      // Headless test browsers hide LAN addresses behind mDNS; let them use loopback.
      ...(mode === 'emulator' ? { _test_only_mdnsHostFallbackToLoopback: true } : {}),
    }, roomId)
  } else {
    const { joinRoom } = await import('@trystero-p2p/nostr')
    room = joinRoom({ appId: 'stikstak-yak-v1' }, roomId)
  }

  const peers = new Set()
  const typing = new Map()
  const msgAction = room.makeAction('msgs')
  const typingAction = room.makeAction('typing')
  const emit = () => onHerd({ count: peers.size + 1, typing: typing.size, roomId, mode })

  const sendAll = async target => {
    const all = store.syncSet(center)
    for (let i = 0; i < all.length; i += CHUNK) {
      await msgAction.send(all.slice(i, i + CHUNK), { target }).catch(() => {})
    }
  }

  room.onPeerJoin = id => { peers.add(id); emit(); sendAll(id) }
  room.onPeerLeave = id => { peers.delete(id); budget.delete(id); clearTimeout(typing.get(id)); typing.delete(id); emit() }
  const budget = new Map() // peerId -> { start, used }
  msgAction.onMessage = async (batch, { peerId }) => {
    if (!Array.isArray(batch)) return
    const now = Date.now()
    let b = budget.get(peerId)
    if (!b || now - b.start > 60e3) budget.set(peerId, (b = { start: now, used: 0 }))
    b.used += batch.length
    if (b.used > PEER_BUDGET_PER_MIN) return
    for (const m of batch.slice(0, CHUNK)) await store.apply(m)
  }
  typingAction.onMessage = (on, { peerId }) => {
    clearTimeout(typing.get(peerId))
    if (on) typing.set(peerId, setTimeout(() => { typing.delete(peerId); emit() }, 6000))
    else typing.delete(peerId)
    emit()
  }
  emit()

  return {
    async publish(m) {
      await store.apply(m, { trusted: true })
      await msgAction.send([m]).catch(() => {})
    },
    setTyping: on => typingAction.send(on).catch(() => {}),
    leave: () => room.leave(),
  }
}
