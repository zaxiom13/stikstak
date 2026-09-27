// ?demo mode: no network at all. A handful of simulated neighbours (each with
// their own signing key, just like real peers) post, reply and vote so you can
// feel the mechanics alone. Open two tabs and they gossip via BroadcastChannel.
import { createIdentity, signMessage } from '../lib/crypto.js'
import { threadIdentity } from '../lib/yak.js'

const SEED = [
  ['Whoever keeps microwaving fish in the library lounge: I will find you', 14, 3],
  ['The squirrel outside the science building just stole an entire bagel and made eye contact with me', 23, 6],
  ['Is the dining hall open late tonight or am I eating cereal again', 9, 4],
  ['Professor said "this won\'t be on the exam" and then it was the entire exam', 19, 9],
  ['Someone is playing Mr. Brightside on a trumpet in the quad and honestly it slaps', 8, 2],
  ['Rate my plan: nap at 4, wake up at 11pm, finish the essay by sunrise', 5, 5],
  ['Lost a blue hydroflask near the gym. It has a frog sticker. Emotionally attached.', 3, 1],
  ['Hot take: the 8am lecture is the most peaceful part of my day', -3, 3],
  ['The wifi in the dorms has the personality of a sleepy turtle', 6, 0],
  ['Whoever left free donuts in the lobby, you are a hero', 11, 2],
]
const BOT_YAKS = [
  'Anyone else hear that thunder?? My whole building just went silent',
  'Guy in the elevator singing opera. Full volume. Respect.',
  'Need a study buddy for stats, will bring snacks',
  'Coffee shop line is out the door, abandon all hope',
  'Just saw a dog wearing tiny rain boots. Day made.',
  'Fire alarm at 2am again. Cool cool cool.',
]
const BOT_REPLIES = ['lmaooo', 'this is so real', 'no way 😭', 'upvoting for visibility', 'I was literally there', 'W', 'who hurt you', 'same honestly']
const pick = a => a[Math.floor(Math.random() * a.length)]

export async function joinSim({ center, store, onHerd }) {
  const channel = new BroadcastChannel('stikstak-sim')
  channel.onmessage = async e => { for (const m of e.data) await store.apply(m) }

  const bots = await Promise.all(Array.from({ length: 24 }, createIdentity))
  const jitter = () => ({ lat: center.lat + (Math.random() - 0.5) * 0.05, lng: center.lng + (Math.random() - 0.5) * 0.05 })
  const say = async (bot, body) => store.apply(await signMessage(bot, body), { trusted: true })

  if (store.feed(center).length < 5) {
    const now = Date.now()
    for (const [i, [text, score, replies]] of SEED.entries()) {
      const author = bots[i % bots.length]
      const ts = now - (i * 47 + Math.random() * 40) * 60e3
      const yak = await signMessage(author, { t: 'yak', text, ...jitter(), ts })
      await store.apply(yak, { trusted: true })
      for (let v = 0; v < Math.min(Math.abs(score), bots.length); v++) {
        await say(bots[v], { t: 'vote', target: yak.id, value: Math.sign(score), ts: ts + 1000 })
      }
      for (let j = 0; j < replies; j++) {
        const who = j === 1 ? author : bots[(i + j + 3) % bots.length]
        await say(who, { t: 'reply', yakId: yak.id, text: BOT_REPLIES[(i + j) % BOT_REPLIES.length], ...threadIdentity(who.id, yak.id), ts: ts + (j + 1) * 5 * 60e3 })
      }
    }
  }

  let count = 6 + Math.floor(Math.random() * 8), typing = 0
  const emit = () => onHerd({ count, typing, roomId: 'simulated', mode: 'demo' })
  emit()
  const timer = setInterval(async () => {
    if (document.hidden) return
    count = Math.max(3, count + Math.round((Math.random() - 0.45) * 2))
    typing = Math.random() < 0.3 ? 1 : 0
    emit()
    const bot = pick(bots), nearby = store.feed(center), r = Math.random()
    if (r < 0.08) await say(bot, { t: 'yak', text: pick(BOT_YAKS), ...jitter(), ts: Date.now() })
    else if (r < 0.25 && nearby.length) {
      const y = pick(nearby)
      await say(bot, { t: 'reply', yakId: y.id, text: pick(BOT_REPLIES), ...threadIdentity(bot.id, y.id), ts: Date.now() })
    } else if (nearby.length) {
      await say(bot, { t: 'vote', target: pick(nearby).id, value: Math.random() < 0.75 ? 1 : -1, ts: Date.now() })
    }
  }, 3500)

  return {
    async publish(m) { await store.apply(m, { trusted: true }); channel.postMessage([m]) },
    setTyping() {},
    leave() { clearInterval(timer); channel.close() },
  }
}
