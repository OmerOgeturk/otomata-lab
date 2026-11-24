import { useState } from 'react'

function commonPrefix(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

export default function StackView({ stack, initialSymbol }) {
  const [view, setView] = useState({ stack, prev: stack ?? [], version: 0 })
  if (view.stack !== stack) setView({ stack, prev: view.stack ?? stack ?? [], version: view.version + 1 })

  if (!stack) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-slate-400">
        <div className="flex h-9 w-16 items-center justify-center rounded-md bg-slate-100 font-mono text-slate-500 ring-1 ring-slate-200">
          {initialSymbol}
        </div>
        Bir dize test edildiğinde yığıt burada adım adım değişir.
      </div>
    )
  }

  const keep = commonPrefix(view.prev, stack)
  const popped = view.prev.slice(keep).map((symbol, i) => ({ symbol, i: keep + i })).reverse()
  const items = stack.map((symbol, i) => ({ symbol, i, pushed: i >= keep && view.version > 0 })).reverse()

  return (
    <div className="flex flex-col items-center">
      <div className="max-h-[360px] w-full overflow-y-auto px-2 pt-2">
        <ol className="flex flex-col items-center" aria-label="Yığıt (tepe üstte)">
          {popped.map(({ symbol, i }) => (
            <li
              key={`pop-${i}-${view.version}`}
              aria-hidden
              className="anim-pop mt-1 flex h-9 w-20 items-center justify-center overflow-hidden rounded-md bg-red-100 font-mono text-red-700 ring-1 ring-red-300"
            >
              {symbol}
            </li>
          ))}
          {items.map(({ symbol, i, pushed }, k) => (
            <li
              key={pushed ? `s-${i}-${view.version}` : `s-${i}`}
              className={`relative mt-1 flex h-9 w-20 items-center justify-center rounded-md font-mono text-base ring-1 transition-colors ${
                k === 0 ? 'bg-indigo-600 font-bold text-white ring-indigo-700' : 'bg-indigo-50 text-indigo-900 ring-indigo-200'
              } ${pushed ? 'anim-push' : ''}`}
            >
              {symbol}
              {k === 0 && (
                <span className="absolute left-full ml-2 whitespace-nowrap font-sans text-xs font-semibold text-indigo-600">← tepe</span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-300" />
      <p className="mt-2 text-xs text-slate-400">
        {stack.length === 0 ? 'Yığıt boş' : `${stack.length} sembol`} · alt: {initialSymbol}
      </p>
    </div>
  )
}
