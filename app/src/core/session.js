import { createStore } from './store.js'
import { joinStak } from './net.js'
import { joinSim } from './sim.js'
import { startFirebase, EMULATOR_CONFIG } from './firebase.js'
import { loadIdentity } from '../lib/crypto.js'
import { firebaseConfig } from '../firebaseConfig.js'

// ?demo = offline simulation, ?emulator = local Firebase emulator,
// a filled-in firebaseConfig = your Firebase project, otherwise public Nostr relays.
export function pickMode(search = location.search) {
  const p = new URLSearchParams(search)
  if (p.has('demo')) return 'demo'
  if (p.has('emulator')) return 'emulator'
  if (firebaseConfig?.apiKey && firebaseConfig?.databaseURL) return 'firebase'
  return 'nostr'
}

export async function startSession() {
  const mode = pickMode()
  // Separate identity + stak per mode so demo bots never leak into the real network.
  const ns = mode === 'firebase' || mode === 'nostr' ? '' : `-${mode}`
  const storage = mode === 'emulator' ? sessionStorage : localStorage
  const identity = await loadIdentity(storage, `stikstak-identity${ns}`)
  const store = createStore({ storage, key: `stikstak-stak-v1${ns}`, myId: identity.id })
  await store.load()
  let firebaseApp = null
  if (mode === 'firebase') firebaseApp = await startFirebase(firebaseConfig)
  if (mode === 'emulator') firebaseApp = await startFirebase(EMULATOR_CONFIG, { emulator: true })

  return {
    mode, identity, store,
    connect: (center, onHerd) => mode === 'demo'
      ? joinSim({ center, store, onHerd })
      : joinStak({ mode, firebaseApp, center, store, onHerd }),
  }
}
