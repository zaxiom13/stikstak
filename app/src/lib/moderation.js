// Content rules, enforced on every phone: your composer refuses to send a
// violating yak, and every peer refuses to store or show one it receives.
// A hacked client can still *send* anything, but no honest copy of the app
// will display it. Casual swearing is fine (it's Yik Yak); slurs, sexual
// content, threats and personal info are not.
import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity'

const ALLOWED_SWEARS = new Set(['fuck', 'shit', 'ass', 'arse', 'bitch', 'bastard', 'piss', 'bollocks', 'turd', 'prick', 'dick', 'cock', 'boob', 'tit', 'twat', 'wank', 'jerk off', 'cuck', 'sex'])

const matcher = new RegExpMatcher({
  ...englishDataset.removePhrasesIf(p => ALLOWED_SWEARS.has(p.metadata?.originalWord)).build(),
  ...englishRecommendedTransformers,
})

const RULES = [
  { reason: 'No threats or violence against people', re: /\b(i('| a)?m (gonna|going to)|i will|i'll|we('| a)?re (gonna|going to)|someone should)\s+(kill|shoot|stab|murder|hurt|beat up|jump)\b|\b(shoot|bomb)\s+(up\s+)?(the|this)\s+(school|campus|class|library|dorm)|\bkill\s+(yo|ur|your)sel(f|ves)\b|\bkys\b/i },
  { reason: 'No phone numbers', re: /(\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/ },
  { reason: 'No email addresses', re: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { reason: 'No street addresses', re: /\b\d{1,5}\s+(\w+\s){0,3}(st|street|ave|avenue|rd|road|blvd|dr|drive|ln|lane|ct|court|way|apt)\b\.?/i },
  { reason: 'No social handles (keep it anonymous)', re: /(^|\s)@[a-z0-9_.]{3,}|\b(insta|ig|snap|sc|tiktok|venmo|cashapp)\s*[:\-]?\s*@?[a-z0-9_.]{3,}\b/i },
  { reason: 'No links', re: /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|net|org|io|gg|ly|me|co)\b/i },
  { reason: 'No sexual content involving minors', re: /\b(child|kid|minor|underage|teen|\d{1,2}\s?(yo|y\/o|year old))\b.*\b(nude|nudes|naked|porn|sex)|\b(nude|nudes|naked|porn|sex)\b.*\b(child|kid|minor|underage|\d{1,2}\s?(yo|y\/o|year old))\b/i },
]

// Returns null when the text is fine, otherwise a short reason to show the writer.
export function moderate(text) {
  if (typeof text !== 'string') return 'Invalid text'
  for (const { reason, re } of RULES) if (re.test(text)) return reason
  if (matcher.hasMatch(text)) return 'No slurs or sexual content'
  // Walls of repeated characters / shouting are almost always spam.
  if (/(.)\1{9,}/.test(text)) return 'Looks like spam'
  if (text.length > 30 && text === text.toUpperCase() && /[A-Z]{20,}/.test(text)) return 'Easy on the caps'
  return null
}
