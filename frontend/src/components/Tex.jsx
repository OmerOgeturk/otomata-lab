import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export default function Tex({ children, block = false }) {
  const html = useMemo(
    () => katex.renderToString(String(children), { displayMode: block, throwOnError: false, strict: false }),
    [children, block],
  )
  const Tag = block ? 'div' : 'span'
  return <Tag className={block ? 'overflow-x-auto py-1' : ''} dangerouslySetInnerHTML={{ __html: html }} />
}
