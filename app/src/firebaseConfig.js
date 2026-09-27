// Paste your Firebase web config here (Project settings → Your apps → Web app).
// These values are not secrets; the security rules are what protect the data.
// Leave apiKey empty to run the offline demo instead.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
}
