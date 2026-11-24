import { useLayoutEffect, useRef } from 'react'
import { inputClass } from './ui'

// Gramer yazarken klavyede bulunmayan simgeler için butonlar ve kısayollar.
// Kısayollar e.code ile eşlenir; Türkçe Q/F klavyede de aynı tuşlar çalışır.
const SYMBOLS = [
  { code: 'Digit1', text: ' → ', label: '→', title: 'Ok (türetme)' },
  { code: 'Digit2', text: ' | ', label: '|', title: 'Ayırma (veya)' },
  { code: 'Digit3', text: 'ε', label: 'ε', title: 'Boş dize (epsilon)' },
]

const AUTO = [
  ['->', '→'],
  ['=>', '→'],
]

export default function GrammarInput({ value, onChange, onSubmit, className = '', ...props }) {
  const ref = useRef(null)
  const caretRef = useRef(null)

  // Değer güncellendikten hemen sonra (aynı karede) imleci yerleştir.
  useLayoutEffect(() => {
    if (caretRef.current === null || !ref.current) return
    const c = caretRef.current
    caretRef.current = null
    ref.current.focus()
    ref.current.setSelectionRange(c, c)
  }, [value])

  const insert = (text, replaceBefore = 0) => {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart - replaceBefore
    const end = el.selectionEnd
    // Ardışık boşlukları önlemek için: imleç öncesi boşluksa baştaki boşluğu at.
    let piece = text
    if (piece.startsWith(' ') && (start === 0 || /\s/.test(value[start - 1]))) piece = piece.slice(1)
    if (piece.endsWith(' ') && /\s/.test(value[end] ?? '')) piece = piece.slice(0, -1)
    const next = value.slice(0, start) + piece + value.slice(end)
    onChange(next)
    caretRef.current = start + piece.length
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
      e.preventDefault()
      onSubmit()
      return
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const sym = SYMBOLS.find((s) => s.code === e.code)
      if (sym) {
        e.preventDefault()
        insert(sym.text)
      }
    }
  }

  const onInput = (e) => {
    const el = e.target
    const pos = el.selectionStart
    const text = el.value
    for (const [from, to] of AUTO) {
      if (pos >= from.length && text.slice(pos - from.length, pos) === from) {
        const before = text.slice(0, pos - from.length)
        const piece = (before && !/\s$/.test(before) ? ' ' : '') + to + (/^\s/.test(text.slice(pos)) ? '' : ' ')
        onChange(before + piece + text.slice(pos))
        caretRef.current = before.length + piece.length
        return
      }
    }
    onChange(text)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Gramer simgeleri">
        {SYMBOLS.map((s, i) => (
          <button
            key={s.code}
            type="button"
            title={`${s.title} — Alt+${i + 1}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(s.text)}
            className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-sm ring-1 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-300"
          >
            <span className="font-mono text-base leading-none text-slate-800">{s.label}</span>
            <kbd className="rounded bg-slate-100 px-1 text-[10px] font-medium text-slate-500">Alt+{i + 1}</kbd>
          </button>
        ))}
        <span className="text-xs text-slate-400">
          <code className="font-mono">-&gt;</code> yazınca otomatik → olur
        </span>
      </div>
      <textarea
        ref={ref}
        className={`${inputClass} block w-full resize-y font-mono ${className}`}
        value={value}
        spellCheck={false}
        onChange={onInput}
        onKeyDown={onKeyDown}
        {...props}
      />
    </div>
  )
}
