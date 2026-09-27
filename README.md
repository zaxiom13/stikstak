# 🐃 StikStak

Anonymous, location-based yaks, the way the original Yik Yak felt, rebuilt so
that **no server ever holds the posts**.

- **New / 🔥 Hot** feeds of everything posted within ~5 miles
- Up/down votes, **5 net downvotes and a yak disappears**
- Replies with a per-thread anonymous emoji identity, **OP** badge
- **Yakarma**, "N yakkers here" live herd count, "someone nearby is writing…"
- **Peek** at other campuses (read-only)
- 200 character limit, yaks fade out after 72h
- Built phone-first: safe-area aware, bottom nav, thumb-reach compose button, dark mode

Screenshots from the automated test run are in [`app/screenshots/`](app/screenshots).

## How it resists censorship

| What | Where it lives |
| --- | --- |
| Yak text, replies, votes, deletes | Only on phones. Signed on the device that wrote them, sent phone-to-phone over encrypted WebRTC data channels ([Trystero](https://github.com/dmotz/trystero)), kept in each phone's local storage. |
| WebRTC handshake offers | Firebase Realtime Database, briefly, under `__trystero__/` |
| Your identity | A random signing key generated on your phone. No account, no email, no phone number. |

- Every message is signed (ECDSA P-256). Peers reject anything forged or edited,
  so neither Firebase nor another user can alter a post.
- Only the author's key can delete a yak. Downvotes (-5) are the only moderation, and they are the community's.
- When a new phone joins the area, the phones already there hand it the recent history.
- If Firebase ever went away or blocked you, the handshake can move to another
  signalling network (the app already falls back to public Nostr relays when no
  Firebase config is set) and every phone still has its copy of the stak.

The trade-off: a yak lives as long as some phone nearby still has it. If
everyone in an area closes the app for 3 days, that area starts fresh.

## Try it

```bash
cd app
npm install
npm run dev          # open the printed URL on your phone (same Wi-Fi)
```

- `/?demo` offline, with simulated neighbours posting and voting around you (best for playing solo)
- no config: real peer-to-peer via public Nostr relays, open it on two phones
- with your Firebase config: real peer-to-peer with Firebase doing the handshake

## Firebase setup (free, and it can't bill you)

The app only uses **Anonymous Auth** and **Realtime Database**. Both are on the
free **Spark** plan. Spark has no billing account attached, so Google has no way
to charge you: if a quota is ever hit, the service just pauses until the next
day/month. **Do not upgrade to Blaze** and you can never be charged.
(No Firestore, no Cloud Functions, no Storage: nothing here needs a paid plan.)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**. Skip Google Analytics.
   You stay on Spark by default; the console only asks for a card if you choose "Upgrade".
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Realtime Database → Create database** (any region, start in *locked mode*).
4. **Project settings → Your apps → Web (`</>`)**, register an app, copy the config.
5. Create `app/.env.local`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
   VITE_FIREBASE_APP_ID=...
   ```
6. Deploy the database rules and host the app (Firebase Hosting is free on Spark too):
   ```bash
   npx firebase login
   npx firebase use --add          # pick your project
   npm run deploy                  # builds, deploys hosting + database.rules.json
   ```
   Open `https://your-project.web.app` on your phone.

Spark limits that matter here: 100 simultaneous Realtime Database connections,
1 GB stored, 10 GB/month downloaded, 10 GB hosting storage, 360 MB/day hosting
transfer. Handshakes are tiny and deleted after use, so a campus-sized crowd fits
comfortably. `database.rules.json` only allows signed-in users to write under
`__trystero__/<room>`, so nobody can use your database as free storage.

Optional hardening: turn on **App Check** (free) so only your site can use the project.

## Tests

```bash
npm test                          # unit tests: geohash, ranking, signatures, gossip store rules
npm run emulators                 # terminal 1 (needs Java)
npm run dev                       # terminal 2
npm run e2e                       # terminal 3: three emulated iPhones over real WebRTC
```

The e2e run checks: phones discover each other, typing indicator, a yak posted on
phone A shows up on B, B's upvote and reply show on A, a late-joining phone C
receives the history from its peers, and **the Firebase database contains none of
the text**.

## Layout

```
app/src/lib/crypto.js   signing keys, sign/verify
app/src/core/store.js   local stak: validation, dedupe, votes, deletes, rate limits
app/src/core/net.js     Trystero room per area, gossip + typing
app/src/core/sim.js     ?demo simulated neighbours
app/src/core/firebase.js  anonymous auth + RTDB handshake only
app/src/App.jsx, components/  the UI
```
