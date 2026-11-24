import { Fragment } from 'react'

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<=^|[\s(])\*(?!\s)[^*]+?(?<!\s)\*(?=$|[\s.,;:!?)])|(?<=^|[\s(])_(?!\s)[^_]+?(?<!\s)_(?=$|[\s.,;:!?)]))/g

function inline(text) {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null
    if (part.startsWith('`')) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] text-indigo-700">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith('**') || part.startsWith('__')) return <strong key={i} className="font-semibold text-slate-900">{inline(part.slice(2, -2))}</strong>
    if ((part.startsWith('*') || part.startsWith('_')) && part.length > 2 && part.endsWith(part[0])) return <em key={i}>{inline(part.slice(1, -1))}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

const HEADING = { 1: 'text-lg', 2: 'text-base', 3: 'text-sm', 4: 'text-sm' }

function parse(source) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
    } else if (line.trim().startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++])
      i++
      blocks.push({ type: 'code', text: code.join('\n') })
    } else if (/^#{1,6}\s/.test(line)) {
      const [, hashes, text] = line.match(/^(#{1,6})\s+(.*)$/)
      blocks.push({ type: 'heading', level: Math.min(hashes.length, 4), text })
      i++
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: 'rule' })
      i++
    } else if (/^\s*>/.test(line)) {
      const quote = []
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''))
      blocks.push({ type: 'quote', text: quote.join(' ') })
    } else if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items = []
      while (i < lines.length && lines[i].trim()) {
        const match = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/)
        if (match) items.push({ depth: match[1].length >= 2 ? 1 : 0, text: match[3] })
        else if (items.length) items[items.length - 1].text += ` ${lines[i].trim()}`
        i++
      }
      blocks.push({ type: 'list', ordered, items })
    } else {
      const para = []
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*>|\s*([-*+]|\d+[.)])\s+)/.test(lines[i])) para.push(lines[i++].trim())
      blocks.push({ type: 'paragraph', text: para.join(' ') })
    }
  }
  return blocks
}

export default function Markdown({ source }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
      {parse(source).map((block, i) => {
        switch (block.type) {
          case 'heading':
            return (
              <h4 key={i} className={`${HEADING[block.level]} pt-1 font-semibold text-slate-900`}>
                {inline(block.text)}
              </h4>
            )
          case 'code':
            return (
              <pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
                {block.text}
              </pre>
            )
          case 'rule':
            return <hr key={i} className="border-slate-200" />
          case 'quote':
            return (
              <blockquote key={i} className="border-l-4 border-indigo-200 pl-3 text-slate-600">
                {inline(block.text)}
              </blockquote>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={i} className={`space-y-1 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
                {block.items.map((item, k) => (
                  <li key={k} className={item.depth ? 'ml-5 list-[circle]' : ''}>
                    {inline(item.text)}
                  </li>
                ))}
              </List>
            )
          }
          default:
            return <p key={i}>{inline(block.text)}</p>
        }
      })}
    </div>
  )
}
