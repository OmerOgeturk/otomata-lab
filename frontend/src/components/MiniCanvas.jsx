import { useMemo, useRef, useState } from 'react'
import { faLabel } from '../lib/fa'
import { toCanvas } from '../lib/graph'
import AutomatonCanvas from './AutomatonCanvas'

export default function MiniCanvas({ fa, positions, fitKey }) {
  const graph = useMemo(() => toCanvas(fa, faLabel, ','), [fa])
  const [local, setLocal] = useState(positions)
  const ref = useRef(null)
  return (
    <div className="relative h-72 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
      <AutomatonCanvas
        ref={ref}
        nodes={graph.nodes}
        edges={graph.edges}
        positions={local}
        fitKey={fitKey}
        onMove={(id, pos) => setLocal((p) => ({ ...p, [id]: pos }))}
      />
    </div>
  )
}
