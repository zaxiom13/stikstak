export default function VoteColumn({ score, myVote, onVote, disabled, small }) {
  const cast = v => e => { e.stopPropagation(); if (!disabled) onVote(myVote === v ? 0 : v) }
  return (
    <div className={`votes ${small ? 'small' : ''}`} onClick={e => e.stopPropagation()}>
      <button aria-label="Upvote" className={`vote up ${myVote === 1 ? 'on' : ''}`} onClick={cast(1)} disabled={disabled}>
        <svg viewBox="0 0 24 24"><path d="M12 5l7 9h-4.5v5h-5v-5H5z" /></svg>
      </button>
      <span className={`score ${myVote === 1 ? 'up' : myVote === -1 ? 'down' : ''}`} data-testid="score">{score}</span>
      <button aria-label="Downvote" className={`vote down ${myVote === -1 ? 'on' : ''}`} onClick={cast(-1)} disabled={disabled}>
        <svg viewBox="0 0 24 24"><path d="M12 19l-7-9h4.5V5h5v5H19z" /></svg>
      </button>
    </div>
  )
}
