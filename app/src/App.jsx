import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { startSession } from './core/session.js'
import { signMessage } from './lib/crypto.js'
import { solve } from './lib/pow.js'
import { fuzz } from './lib/geo.js'
import { sortFeed, yakarma } from './lib/yak.js'
import { PLACES } from './lib/places.js'
import { useNow, useStak } from './hooks.js'
import YakCard from './components/YakCard.jsx'
import Compose from './components/Compose.jsx'
import Thread from './components/Thread.jsx'

const LOC_KEY = 'stikstak-location'
const loadLoc = () => { try { return JSON.parse(localStorage.getItem(LOC_KEY)) } catch { return null } }

export default function App() {
  const [session, setSession] = useState(null)
  const [bootError, setBootError] = useState(null)
  const [home, setHome] = useState(loadLoc)
  const [peek, setPeek] = useState(null)
  const [tab, setTab] = useState('home')
  const [openYak, setOpenYak] = useState(null)

  useEffect(() => { startSession().then(setSession, e => setBootError(e.message)) }, [])

  if (bootError) return <Splash><p>Couldn't start: {bootError}</p></Splash>
  if (!session) return <Splash><div className="spinner" /></Splash>
  if (!home) return <LocationGate onPick={loc => { localStorage.setItem(LOC_KEY, JSON.stringify(loc)); setHome(loc) }} />

  const center = peek ?? home
  return (
    <Main
      key={`${center.lat},${center.lng}`}
      session={session} center={center} peek={peek} tab={tab} setTab={setTab}
      openYak={openYak} setOpenYak={setOpenYak}
      onPeek={p => { setPeek(p); setTab('home'); setOpenYak(null) }}
      onRelocate={() => { localStorage.removeItem(LOC_KEY); setHome(null); setPeek(null) }}
    />
  )
}

function Main({ session, center, peek, tab, setTab, openYak, setOpenYak, onPeek, onRelocate }) {
  const { store, identity, mode } = session
  const [herd, setHerd] = useState({ count: 1, typing: 0 })
  const [sort, setSort] = useState('new')
  const [composing, setComposing] = useState(false)
  const netRef = useRef(null)
  const now = useNow()
  const readOnly = !!peek

  useEffect(() => {
    let net, cancelled = false
    session.connect(center, setHerd).then(n => { if (cancelled) n.leave(); else { net = n; netRef.current = n } })
    return () => { cancelled = true; net?.leave(); netRef.current = null }
  }, [session, center])

  const publish = useCallback(async body => {
    const needsWork = ['yak', 'reply', 'report'].includes(body.t)
    const m = await signMessage(identity, { ...body, ts: Date.now() }, needsWork ? solve : undefined)
    if (netRef.current) await netRef.current.publish(m)
    else await store.apply(m, { trusted: true })
    return m
  }, [identity, store])

  const app = useMemo(() => ({
    store, identity,
    vote: (target, value) => publish({ t: 'vote', target, value }),
    reply: (yakId, text, me) => publish({ t: 'reply', yakId, text, icon: me.icon, color: me.color }),
    remove: target => publish({ t: 'del', target }),
    report: target => publish({ t: 'report', target }),
    setTyping: on => netRef.current?.setTyping(on),
  }), [store, identity, publish])

  const yaks = useStak(store, () => store.feed(center), [center])
  const feed = useMemo(() => sortFeed(yaks, sort, now), [yaks, sort, now])

  if (openYak) {
    return <Thread yakId={openYak} app={app} now={now} readOnly={readOnly} onBack={() => setOpenYak(null)} />
  }

  return (
    <div className="page">
      <header className="appbar">
        <div className="brand"><span className="logo">🐃</span><span>StikStak</span></div>
        <div className="herd" title={`Connected ${mode === 'demo' ? '(simulated)' : 'peer-to-peer'}`} data-testid="herd">
          <span className={`pulse ${herd.count > 1 ? 'live' : ''}`} />
          {herd.count} {herd.count === 1 ? 'yakker' : 'yakkers'} here
        </div>
      </header>

      {tab === 'home' && (
        <>
          {peek && (
            <div className="peek-banner">
              <span>👀 Peeking at <b>{peek.name}</b> · read-only</span>
              <button className="text-btn" onClick={() => onPeek(null)}>Go home</button>
            </div>
          )}
          <div className="segmented" role="tablist">
            {['new', 'hot'].map(s => (
              <button key={s} role="tab" aria-selected={sort === s} className={sort === s ? 'on' : ''} onClick={() => setSort(s)}>
                {s === 'new' ? 'New' : '🔥 Hot'}
              </button>
            ))}
          </div>
          <div className="scroll feed" data-testid="feed">
            {herd.typing > 0 && <div className="typing">✍️ Someone nearby is writing a yak…</div>}
            {feed.length === 0 && (
              <div className="empty">
                <div className="empty-emoji">🦗</div>
                <p><b>It's quiet here.</b></p>
                <p>{readOnly ? 'Nobody online near there has yaks to share yet.' : 'Post the first yak. It spreads to every phone nearby that opens StikStak.'}</p>
              </div>
            )}
            {feed.map(y => (
              <YakCard key={y.id} yak={y} center={center} now={now} readOnly={readOnly}
                onOpen={() => setOpenYak(y.id)} onVote={v => app.vote(y.id, v)} />
            ))}
          </div>
          {!readOnly && (
            <button className="fab" aria-label="New yak" onClick={() => setComposing(true)} data-testid="fab">
              <svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" /></svg>
            </button>
          )}
        </>
      )}

      {tab === 'peek' && <Peek onPeek={onPeek} />}
      {tab === 'me' && <Me app={app} session={session} herd={herd} now={now} onOpen={setOpenYak} onRelocate={onRelocate} />}

      <nav className="bottomnav">
        {[['home', '🏠', 'Home'], ['peek', '👀', 'Peek'], ['me', '🐃', 'Me']].map(([k, icon, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span className="nav-icon">{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>

      {composing && (
        <Compose
          title="New yak" placeholder="What's happening nearby?"
          onTyping={app.setTyping} onClose={() => setComposing(false)}
          onSubmit={text => publish({ t: 'yak', text, lat: fuzz(center.lat), lng: fuzz(center.lng) }).then(() => setSort('new'))}
        />
      )}
    </div>
  )
}

function Peek({ onPeek }) {
  return (
    <div className="scroll">
      <h2 className="section-title">Peek at another herd</h2>
      <p className="muted pad">Read what people are yakking about somewhere else. You can look, but you can only post and vote at home.</p>
      <div className="places">
        {PLACES.map(p => (
          <button key={p.name} className="place" onClick={() => onPeek(p)}>
            <span className="place-emoji">{p.emoji}</span><span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Me({ app, session, herd, now, onOpen, onRelocate }) {
  const mine = useStak(app.store, () => app.store.mine(), [])
  const sorted = [...mine].sort((a, b) => b.createdAt - a.createdAt)
  const how = {
    firebase: 'Firebase (handshake only)',
    emulator: 'Firebase emulator (handshake only)',
    nostr: 'public Nostr relays (handshake only)',
    demo: 'offline demo with simulated neighbours',
  }[session.mode]
  return (
    <div className="scroll">
      <div className="karma card">
        <div className="karma-num" data-testid="karma">{yakarma(mine)}</div>
        <div className="muted">Yakarma</div>
      </div>
      <div className="card info">
        <div className="info-row"><span>Your anonymous key</span><code>{session.identity.id.slice(0, 8)}</code></div>
        <div className="info-row"><span>Phones connected</span><b>{herd.count - 1}</b></div>
        <div className="info-row"><span>Messages on this phone</span><b>{app.store.size()}</b></div>
        <div className="info-row"><span>Finding peers via</span><span>{how}</span></div>
        <p className="muted small">No server stores yaks. Each one is signed on the phone that wrote it and passed directly between phones nearby, so nobody can quietly edit or delete someone else's post.</p>
        <button className="text-btn" onClick={onRelocate}>📍 Change location</button>
      </div>
      <h2 className="section-title">Your yaks</h2>
      {sorted.length === 0 && <p className="empty small">You haven't yakked yet.</p>}
      {sorted.map(y => <YakCard key={y.id} yak={y} now={now} onOpen={() => onOpen(y.id)} onVote={v => app.vote(y.id, v)} />)}
    </div>
  )
}

function LocationGate({ onPick }) {
  const [status, setStatus] = useState(null)
  const locate = () => {
    if (!navigator.geolocation) return setStatus('No location on this device, pick a spot below.')
    setStatus('Finding you…')
    navigator.geolocation.getCurrentPosition(
      p => onPick({ lat: p.coords.latitude, lng: p.coords.longitude, name: 'Near you' }),
      () => setStatus('Location blocked. Pick a spot below instead.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    )
  }
  return (
    <div className="gate">
      <div className="gate-hero">
        <div className="gate-logo">🐃</div>
        <h1>StikStak</h1>
        <p>Anonymous yaks from people within 5 miles. No accounts. No server keeping your posts.</p>
      </div>
      <div className="rules">
        <b>House rules.</b> Posts that break these are blocked on every phone, and 3 reports hide a yak.
        <ul>
          <li>No threats, bullying or hate</li>
          <li>No names, numbers, addresses or handles</li>
          <li>No sexual content</li>
        </ul>
        By continuing you agree to these rules.
      </div>
      <button className="big-btn" onClick={locate} data-testid="use-location">📍 Use my location</button>
      {status && <p className="muted center">{status}</p>}
      <p className="muted center small">or drop into a campus</p>
      <div className="places">
        {PLACES.map(p => (
          <button key={p.name} className="place" onClick={() => onPick(p)}>
            <span className="place-emoji">{p.emoji}</span><span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Splash({ children }) {
  return <div className="gate"><div className="gate-hero"><div className="gate-logo">🐃</div>{children}</div></div>
}
