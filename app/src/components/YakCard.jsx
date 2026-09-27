import VoteColumn from './VoteColumn.jsx'
import { timeAgo, distanceLabel } from '../lib/format.js'
import { distanceKm } from '../lib/geo.js'
import { yakColor } from '../lib/yak.js'

export default function YakCard({ yak, center, now, onOpen, onVote, readOnly }) {
  const km = center ? distanceKm(yak.lat, yak.lng, center.lat, center.lng) : null
  return (
    <article className="card yak" style={{ '--accent': yakColor(yak.id) }} onClick={onOpen} data-testid="yak">
      <div className="yak-body">
        {yak.mine && <span className="badge-me">You</span>}
        <p className="yak-text">{yak.text}</p>
        <div className="meta">
          <span>{timeAgo(yak.createdAt, now)}</span>
          <span className="dot">·</span>
          <span className="replies">💬 {yak.replyCount}</span>
          {km != null && <><span className="dot">·</span><span>📍 {distanceLabel(km)}</span></>}
        </div>
      </div>
      <VoteColumn score={yak.score} myVote={yak.myVote} onVote={onVote} disabled={readOnly} />
    </article>
  )
}
