export default function InputTape({ input, position }) {
  if (!input) return <span className="font-mono text-sm text-slate-400">ε (boş dize)</span>
  return (
    <div className="flex flex-wrap gap-0.5 font-mono text-sm" aria-label="Girdi dizesi">
      {[...input].map((ch, i) => {
        const state = i < position - 1 ? 'done' : i === position - 1 ? 'current' : 'todo'
        return (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              state === 'current'
                ? 'bg-amber-400 font-bold text-amber-950 shadow-sm'
                : state === 'done'
                  ? 'bg-slate-100 text-slate-400'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200'
            }`}
          >
            {ch}
          </span>
        )
      })}
    </div>
  )
}
