import { useEffect, useState } from 'react'
import { Flag, MousePointerClick, Trash2 } from 'lucide-react'
import { edgeId } from '../lib/graph'
import { Button, Field, inputClass } from './ui'

function NodeInspector({ fa, id, onRename, onSetStart, onToggleAccept, onDelete }) {
  const [name, setName] = useState(id)
  useEffect(() => setName(id), [id])
  const commit = () => {
    const next = name.trim()
    if (next && next !== id) onRename(id, next)
    else setName(id)
  }
  return (
    <div className="space-y-3">
      <Field label="Durum adı">
        <input
          className={`${inputClass} w-full`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </Field>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            className="accent-indigo-600"
            checked={fa.start_state === id}
            onChange={() => onSetStart(id)}
          />
          Başlangıç durumu
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-indigo-600"
            checked={fa.accept_states.includes(id)}
            onChange={() => onToggleAccept(id)}
          />
          Kabul durumu (çift daire)
        </label>
      </div>
      <Button variant="danger" icon={Trash2} onClick={() => onDelete({ kind: 'node', id })} className="w-full">
        Durumu sil
      </Button>
    </div>
  )
}

function EdgeInspector({ fa, id, labelFor, onEditEdge, onDelete }) {
  const edge = fa.transitions.find((t) => edgeId(t.from, t.to) === id)
  if (!edge) return null
  return (
    <div className="space-y-3">
      <p className="font-mono text-sm text-slate-600">
        {edge.from} → {edge.to}
      </p>
      <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">{labelFor(id)}</p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => onEditEdge(edge.from, edge.to)}>
          Sembolleri düzenle
        </Button>
        <Button variant="danger" icon={Trash2} onClick={() => onDelete({ kind: 'edge', id })}>
          Sil
        </Button>
      </div>
    </div>
  )
}

export default function FAInspector({ fa, selected, ...handlers }) {
  if (selected?.kind === 'node' && fa.states.includes(selected.id)) return <NodeInspector fa={fa} id={selected.id} {...handlers} />
  if (selected?.kind === 'edge') return <EdgeInspector fa={fa} id={selected.id} {...handlers} />
  return (
    <ul className="space-y-2 text-sm text-slate-500">
      <li className="flex gap-2">
        <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <span>
          <b className="text-slate-600">Durum ekle</b> modunda tuvale tıklayın; <b className="text-slate-600">Geçiş ekle</b> modunda önce
          kaynak, sonra hedef duruma tıklayın.
        </span>
      </li>
      <li className="flex gap-2">
        <Flag className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
        <span>Bir durumu seçerek başlangıç/kabul durumu yapabilir veya yeniden adlandırabilirsiniz.</span>
      </li>
      <li className="pl-6">Seçili öğeyi <kbd className="rounded bg-slate-100 px-1 font-mono text-xs">Delete</kbd> ile silebilirsiniz.</li>
    </ul>
  )
}
