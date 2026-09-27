import { useEffect, useRef, useState } from 'react'
import { MAX_LEN, validateText } from '../lib/yak.js'
import { moderate } from '../lib/moderation.js'

export default function Compose({ title, placeholder, onSubmit, onClose, onTyping, identity }) {
  const [text, setText] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => {
    if (!text) return
    onTyping?.(true)
    const t = setTimeout(() => onTyping?.(false), 4000)
    return () => clearTimeout(t)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onTyping?.(false), []) // eslint-disable-line react-hooks/exhaustive-deps

  const left = MAX_LEN - text.length
  const pct = Math.min(1, text.length / MAX_LEN)
  const submit = async () => {
    const problem = validateText(text) ?? moderate(text)
    if (problem) return setErr(problem)
    setBusy(true)
    try { await onSubmit(text.trim()); onClose() } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className="sheet-head">
          <button className="text-btn" onClick={onClose}>Cancel</button>
          <strong>{title}</strong>
          <button className="pill-btn" onClick={submit} disabled={busy || !text.trim() || left < 0} data-testid="send">
            {busy ? 'Sending…' : 'Yak it'}
          </button>
        </header>
        {identity && <div className="as-identity"><span className="avatar" style={{ background: identity.color }}>{identity.icon}</span> replying anonymously as this icon</div>}
        <textarea
          ref={ref} value={text} maxLength={MAX_LEN + 20} placeholder={placeholder}
          onChange={e => { setText(e.target.value); setErr(null) }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
          data-testid="compose-input"
        />
        <footer className="sheet-foot">
          <span className={`hint ${err ? 'err' : ''}`} data-testid="compose-hint">{err ?? 'Anonymous. Signed on your phone, shared phone-to-phone.'}</span>
          <svg className={`ring ${left < 20 ? 'warn' : ''}`} viewBox="0 0 36 36" aria-label={`${left} characters left`}>
            <circle cx="18" cy="18" r="15" className="ring-bg" />
            <circle cx="18" cy="18" r="15" className="ring-fg" strokeDasharray={`${pct * 94.2} 94.2`} />
            {left < 20 && <text x="18" y="22" textAnchor="middle">{left}</text>}
          </svg>
        </footer>
      </div>
    </div>
  )
}
