import { Fragment } from 'react'

export function prettyRegex(regex) {
  return regex.replace(/\|/g, ' ∪ ')
}

export default function Regex({ value, className = '' }) {
  const parts = []
  let text = ''
  const flush = () => {
    if (text) parts.push(<Fragment key={parts.length}>{text}</Fragment>)
    text = ''
  }
  for (const ch of value) {
    if (ch === '*' || ch === '⁺' || ch === '+') {
      flush()
      parts.push(
        <sup key={parts.length} className="ml-px text-[0.75em] font-semibold">
          {ch === '*' ? '*' : '+'}
        </sup>
      )
    } else if (ch === '|') {
      text += ' ∪ '
    } else {
      text += ch
    }
  }
  flush()
  return (
    <span
      className={`tracking-wide [font-variant-numeric:lining-nums] ${className}`}
      style={{ fontFamily: '"Cambria Math", Cambria, "Times New Roman", serif' }}
      aria-label={prettyRegex(value)}
    >
      {parts}
    </span>
  )
}
