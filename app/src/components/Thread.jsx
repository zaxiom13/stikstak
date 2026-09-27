import { useState } from 'react'
import VoteColumn from './VoteColumn.jsx'
import Compose from './Compose.jsx'
import { useStak } from '../hooks.js'
import { timeAgo } from '../lib/format.js'
import { threadIdentity, yakColor, isVisible } from '../lib/yak.js'

export default function Thread({ yakId, app, now, onBack, readOnly }) {
  const { store, identity } = app
  const yak = useStak(store, () => store.yak(yakId), [yakId])
  const replies = useStak(store, () => store.replies(yakId), [yakId])
  const [composing, setComposing] = useState(false)
  const me = threadIdentity(identity.id, yakId)

  if (!yak) {
    return (
      <div className="page thread">
        <header className="topbar"><button className="back" onClick={onBack}>‹</button><strong>Yak</strong><span /></header>
        <p className="empty">This yak was deleted or voted into oblivion.</p>
      </div>
    )
  }

  return (
    <div className="page thread">
      <header className="topbar">
        <button className="back" onClick={onBack} aria-label="Back">‹</button>
        <strong>Yak</strong>
        {yak.mine ? <button className="text-btn danger" onClick={() => { if (confirm('Delete this yak for everyone?')) { app.remove(yak.id); onBack() } }}>Delete</button> : <span />}
      </header>
      <div className="scroll">
        <article className="card yak op" style={{ '--accent': yakColor(yak.id) }}>
          <div className="yak-body">
            <span className="badge-op">OP</span>
            <p className="yak-text big">{yak.text}</p>
            <div className="meta"><span>{timeAgo(yak.createdAt, now)}</span><span className="dot">·</span><span>💬 {yak.replyCount}</span></div>
          </div>
          <VoteColumn score={yak.score} myVote={yak.myVote} onVote={v => app.vote(yak.id, v)} disabled={readOnly} />
        </article>
        <div className="replies-list">
          {replies.length === 0 && <p className="empty small">No replies yet. Be the first.</p>}
          {replies.filter(isVisible).map(r => {
            const isOp = r.authorId === yak.authorId
            return (
              <div className="reply" key={r.id} data-testid="reply">
                <span className="avatar" style={{ background: isOp ? 'var(--brand)' : r.color }}>{isOp ? '🐃' : r.icon}</span>
                <div className="reply-body">
                  <div className="reply-head">
                    {isOp && <span className="badge-op">OP</span>}
                    {r.mine && <span className="badge-me">You</span>}
                    <span className="muted">{timeAgo(r.createdAt, now)}</span>
                  </div>
                  <p>{r.text}</p>
                </div>
                <VoteColumn small score={r.score} myVote={r.myVote} onVote={v => app.vote(r.id, v)} disabled={readOnly} />
              </div>
            )
          })}
        </div>
      </div>
      {!readOnly && (
        <button className="reply-bar" onClick={() => setComposing(true)} data-testid="reply-bar">
          <span className="avatar" style={{ background: yak.mine ? 'var(--brand)' : me.color }}>{yak.mine ? '🐃' : me.icon}</span>
          <span>Add a reply…</span>
        </button>
      )}
      {composing && (
        <Compose
          title="Reply" placeholder="Reply anonymously…" identity={yak.mine ? null : me}
          onTyping={app.setTyping} onClose={() => setComposing(false)}
          onSubmit={text => app.reply(yak.id, text, me)}
        />
      )}
    </div>
  )
}
