// Proof of work: each yak and reply carries a nonce that makes its hash start
// with POW_BITS zero bits (reports too, so fake accounts can't mass-report). ~0.5-1s on a phone for a real person, but it turns
// a bot posting thousands of yaks into thousands of seconds of CPU.
import { canonical } from './crypto.js'

export const POW_BITS = 16
const enc = new TextEncoder()

async function zeroBits(str) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(str)))
  let n = 0
  for (const byte of h) {
    if (byte === 0) { n += 8; continue }
    return n + Math.clz32(byte) - 24
  }
  return n
}

const powInput = body => canonical({ t: body.t, text: body.text, ts: body.ts, yakId: body.yakId ?? '', target: body.target ?? '', pub: body.pub })

export async function solve(body, bits = POW_BITS) {
  for (let nonce = 0; ; nonce++) {
    if (await zeroBits(powInput(body) + nonce) >= bits) return nonce
  }
}

export async function checkPow(msg, bits = POW_BITS) {
  return Number.isInteger(msg.pow) && (await zeroBits(powInput(msg) + msg.pow)) >= bits
}
