// Every yak, reply, vote and delete is signed on the device that made it
// (ECDSA P-256 via WebCrypto). Peers verify before accepting, so nobody in the
// middle, including whoever runs the signalling server, can forge or edit posts.
const subtle = globalThis.crypto.subtle
const ALG = { name: 'ECDSA', namedCurve: 'P-256' }
const SIG = { name: 'ECDSA', hash: 'SHA-256' }
const enc = new TextEncoder()

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

export async function sha(str) {
  return b64u(await subtle.digest('SHA-256', enc.encode(str)))
}

// Deterministic JSON so signer and verifier hash identical bytes.
export function canonical(obj) {
  return JSON.stringify(Object.keys(obj).sort().reduce((o, k) => ((o[k] = obj[k]), o), {}))
}

export async function createIdentity() {
  const pair = await subtle.generateKey(ALG, true, ['sign', 'verify'])
  return importIdentity({
    priv: await subtle.exportKey('jwk', pair.privateKey),
    pub: await subtle.exportKey('jwk', pair.publicKey),
  })
}

export async function importIdentity({ priv, pub }) {
  const key = await subtle.importKey('jwk', priv, ALG, false, ['sign'])
  const pubStr = `${pub.x}.${pub.y}`
  return { key, pub: pubStr, id: (await sha(pubStr)).slice(0, 16), exported: { priv, pub } }
}

export async function loadIdentity(storage, storageKey = 'stikstak-identity') {
  try {
    const saved = JSON.parse(storage.getItem(storageKey))
    if (saved) return await importIdentity(saved)
  } catch { /* corrupt or missing: make a new one */ }
  const idn = await createIdentity()
  try { storage.setItem(storageKey, JSON.stringify(idn.exported)) } catch { /* private mode */ }
  return idn
}

// body -> { ...body, pub, sig, id }. `work` (optional) computes a proof-of-work
// nonce over the unsigned message, which then gets signed along with it.
export async function signMessage(identity, body, work) {
  const unsigned = { ...body, pub: identity.pub }
  if (work) unsigned.pow = await work(unsigned)
  const bytes = enc.encode(canonical(unsigned))
  const sig = b64u(await subtle.sign(SIG, identity.key, bytes))
  return { ...unsigned, sig, id: (await sha(canonical(unsigned) + sig)).slice(0, 20) }
}

const pubCache = new Map()
async function importPub(pub) {
  if (!pubCache.has(pub)) {
    const [x, y] = pub.split('.')
    pubCache.set(pub, subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x, y, ext: true }, ALG, false, ['verify']))
  }
  return pubCache.get(pub)
}

export async function verifyMessage(msg) {
  try {
    const { sig, id, ...unsigned } = msg
    if (typeof sig !== 'string' || typeof unsigned.pub !== 'string') return false
    const ok = await subtle.verify(SIG, await importPub(unsigned.pub), unb64u(sig), enc.encode(canonical(unsigned)))
    return ok && id === (await sha(canonical(unsigned) + sig)).slice(0, 20)
  } catch {
    return false
  }
}

export async function authorId(pub) {
  return (await sha(pub)).slice(0, 16)
}
