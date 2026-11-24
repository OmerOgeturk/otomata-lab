import { useMemo } from 'react'

const CELL = 44
const PAD = 12

export default function TapeView({ steps, index, blank }) {
  const range = useMemo(() => {
    let min = 0
    let max = 0
    for (const s of steps) {
      min = Math.min(min, -s.offset, s.absHead)
      max = Math.max(max, s.tape.length - 1 - s.offset, s.absHead)
    }
    return { start: min - PAD, end: max + PAD }
  }, [steps])

  const step = steps[index]
  const prev = steps[index - 1]
  const written = prev && step.transition ? prev.absHead : null
  const cells = []
  for (let abs = range.start; abs <= range.end; abs++) {
    const symbol = step.tape[abs + step.offset] ?? blank
    cells.push({ abs, symbol })
  }
  const shift = (step.absHead - range.start) * CELL + CELL / 2

  return (
    <div className="relative select-none">
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 flex -translate-x-1/2 flex-col items-center">
        <span className="rounded-md bg-indigo-600 px-2 py-0.5 font-mono text-xs font-semibold text-white shadow">{step.state}</span>
        <span className="h-0 w-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-indigo-600" />
      </div>
      <div className="relative h-[104px] overflow-hidden pt-9 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div
          className="absolute left-1/2 flex transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(${-shift}px)` }}
        >
          {cells.map(({ abs, symbol }) => {
            const isHead = abs === step.absHead
            const isWritten = abs === written
            return (
              <div
                key={isWritten ? `${abs}-w${index}` : abs}
                style={{ width: CELL }}
                className={`flex h-12 shrink-0 items-center justify-center border-y-2 border-r border-slate-300 font-mono text-lg first:border-l ${
                  isHead ? 'bg-amber-100 font-bold text-amber-950 ring-2 ring-amber-500 ring-inset' : symbol === blank ? 'bg-white text-slate-300' : 'bg-white text-slate-800'
                } ${isWritten ? 'anim-write' : ''}`}
              >
                {symbol}
              </div>
            )
          })}
        </div>
        <div className="absolute bottom-0 left-1/2 flex transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `translateX(${-shift}px)` }} aria-hidden>
          {cells.map(({ abs }) => (
            <span key={abs} style={{ width: CELL }} className="shrink-0 text-center text-[10px] tabular-nums text-slate-300">
              {abs}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
