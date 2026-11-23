import { transitionTable } from '../lib/fa'

export default function TransitionTable({ fa, activeStates = [] }) {
  const { symbols, rows } = transitionTable(fa)
  if (!rows.length) return <p className="text-sm text-slate-400">Henüz durum yok.</p>
  const active = new Set(activeStates)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="border-b border-slate-200 px-2 py-1.5 text-left font-sans text-xs font-semibold">δ</th>
            {symbols.map((s) => (
              <th key={s} className="border-b border-slate-200 px-2 py-1.5 text-center font-semibold">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.state} className={active.has(row.state) ? 'bg-amber-50' : ''}>
              <th className="whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-left font-medium text-slate-700">
                <span className="inline-block w-4 text-indigo-500">{row.start ? '→' : ''}</span>
                <span className="inline-block w-3 text-emerald-600">{row.accept ? '*' : ''}</span>
                {row.state}
              </th>
              {row.cells.map((cell, i) => (
                <td
                  key={symbols[i]}
                  className={`whitespace-nowrap border-b border-slate-100 px-2 py-1.5 text-center ${
                    cell.length ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {cell.length === 0 ? '∅' : fa.type === 'DFA' && cell.length === 1 ? cell[0] : `{${cell.join(', ')}}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-400">→ başlangıç, * kabul durumu</p>
    </div>
  )
}
