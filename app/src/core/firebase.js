// Firebase's only jobs: anonymous sign-in (so the database rules can reject
// drive-by writes) and the Realtime Database path Trystero uses to hand WebRTC
// offers between phones. No yak text, reply or vote is ever written to Firebase.
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'

export async function startFirebase(config, { emulator = false } = {}) {
  const app = initializeApp(config)
  const auth = getAuth(app)
  if (emulator) {
    connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true })
    connectDatabaseEmulator(getDatabase(app), location.hostname, 9000)
  }
  await signInAnonymously(auth)
  return app
}

export const EMULATOR_CONFIG = {
  apiKey: 'demo-key',
  projectId: 'demo-stikstak',
  get databaseURL() { return `http://${location.hostname}:9000?ns=demo-stikstak` },
}
