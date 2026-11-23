import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import cytoscape from 'cytoscape'

const ANCHOR = '__start_anchor__'
const ANCHOR_EDGE = '__start_edge__'
const EDGE_PREFIX = 'e:'

const nodeWidth = (ele) => Math.max(52, String(ele.data('label')).length * 8.5 + 22)

const STYLE = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      width: nodeWidth,
      height: 52,
      'background-color': '#ffffff',
      'border-width': 2,
      'border-color': '#475569',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 14,
      'font-family': 'Inter, Segoe UI, sans-serif',
      color: '#0f172a',
      'transition-property': 'background-color, border-color',
      'transition-duration': '180ms',
    },
  },
  { selector: 'node.accept', style: { 'border-style': 'double', 'border-width': 7 } },
  { selector: 'node.pending', style: { 'border-color': '#4f46e5', 'background-color': '#e0e7ff' } },
  { selector: 'node:selected', style: { 'border-color': '#4f46e5', 'overlay-color': '#4f46e5', 'overlay-opacity': 0.1, 'overlay-shape': 'ellipse', 'overlay-padding': 5 } },
  { selector: 'node.active', style: { 'background-color': '#fde68a', 'border-color': '#d97706' } },
  { selector: 'node.result-accept', style: { 'background-color': '#bbf7d0', 'border-color': '#15803d' } },
  { selector: 'node.result-reject', style: { 'background-color': '#fecaca', 'border-color': '#b91c1c' } },
  {
    selector: 'edge',
    style: {
      label: 'data(label)',
      width: 2,
      'curve-style': 'bezier',
      'control-point-step-size': 46,
      'line-color': '#94a3b8',
      'target-arrow-color': '#94a3b8',
      'target-arrow-shape': 'triangle',
      'arrow-scale': 1.2,
      'font-size': 13,
      'font-family': 'JetBrains Mono, Consolas, monospace',
      color: '#334155',
      'text-wrap': 'wrap',
      'text-background-color': '#ffffff',
      'text-background-opacity': 1,
      'text-background-padding': 3,
      'text-background-shape': 'roundrectangle',
      'loop-direction': '-30deg',
      'loop-sweep': '-50deg',
      'transition-property': 'line-color, target-arrow-color, width',
      'transition-duration': '180ms',
    },
  },
  { selector: 'edge:selected', style: { 'line-color': '#4f46e5', 'target-arrow-color': '#4f46e5', color: '#4338ca' } },
  { selector: 'edge.active', style: { 'line-color': '#d97706', 'target-arrow-color': '#d97706', width: 4, color: '#b45309' } },
  { selector: `#${ANCHOR}`, style: { width: 1, height: 1, opacity: 0, events: 'no' } },
  {
    selector: `#${ANCHOR_EDGE}`,
    style: { label: '', 'line-color': '#334155', 'target-arrow-color': '#334155', width: 2.5, events: 'no', 'curve-style': 'straight' },
  },
]

function placeAnchor(cy, startId) {
  const start = cy.getElementById(startId)
  const anchor = cy.getElementById(ANCHOR)
  if (start.nonempty() && anchor.nonempty()) {
    const p = start.position()
    anchor.position({ x: p.x - start.width() / 2 - 48, y: p.y })
  }
}

const AutomatonCanvas = forwardRef(function AutomatonCanvas(
  { nodes, edges, positions, highlight, mode = 'select', selected, fitKey, onAddState, onConnect, onSelect, onDelete, onMove },
  ref,
) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)
  const [pending, setPending] = useState(null)
  const live = useRef({})
  live.current = { mode, pending, onAddState, onConnect, onSelect, onDelete, onMove, setPending }

  useImperativeHandle(ref, () => ({
    fit: () => cyRef.current?.fit(undefined, 50),
  }))

  useEffect(() => {
    const cy = cytoscape({
      container: containerRef.current,
      style: STYLE,
      minZoom: 0.25,
      maxZoom: 2.5,
      boxSelectionEnabled: false,
      selectionType: 'single',
    })

    cy.on('tap', (event) => {
      const h = live.current
      const target = event.target
      if (target === cy) {
        h.setPending(null)
        if (h.mode === 'addState') h.onAddState?.({ ...event.position })
        else h.onSelect?.(null)
        return
      }
      const kind = target.isNode() ? 'node' : 'edge'
      const id = kind === 'edge' ? target.id().slice(EDGE_PREFIX.length) : target.id()
      if (h.mode === 'delete') {
        h.onDelete?.({ kind, id })
      } else if (h.mode === 'addEdge' && kind === 'node') {
        if (!h.pending) h.setPending(id)
        else {
          h.onConnect?.(h.pending, id)
          h.setPending(null)
        }
      } else {
        h.onSelect?.({ kind, id })
      }
    })

    cy.on('dragfree', 'node', (event) => live.current.onMove?.(event.target.id(), { ...event.target.position() }))
    cy.on('position', 'node', (event) => {
      if (event.target.id() === ANCHOR) return
      const edge = cy.getElementById(ANCHOR_EDGE)
      if (edge.nonempty()) placeAnchor(cy, edge.target().id())
    })

    cyRef.current = cy
    return () => cy.destroy()
  }, [])

  useEffect(() => {
    if (mode !== 'addEdge') setPending(null)
  }, [mode])

  useEffect(() => {
    const cy = cyRef.current
    const wanted = new Set([...nodes.map((n) => n.id), ...edges.map((e) => EDGE_PREFIX + e.id)])
    const start = nodes.find((n) => n.start)
    cy.batch(() => {
      cy.elements().forEach((el) => {
        if (el.id() !== ANCHOR && el.id() !== ANCHOR_EDGE && !wanted.has(el.id())) el.remove()
      })
      for (const n of nodes) {
        let el = cy.getElementById(n.id)
        const position = positions[n.id] ?? { x: 0, y: 0 }
        if (el.empty()) {
          el = cy.add({ group: 'nodes', data: { id: n.id, label: n.label ?? n.id }, position })
        } else {
          el.data('label', n.label ?? n.id)
          const p = el.position()
          if (!el.grabbed() && (p.x !== position.x || p.y !== position.y)) el.position(position)
        }
        el.toggleClass('accept', !!n.accept)
        el.grabify()
      }
      for (const e of edges) {
        const id = EDGE_PREFIX + e.id
        const el = cy.getElementById(id)
        if (el.empty()) cy.add({ group: 'edges', data: { id, source: e.source, target: e.target, label: e.label } })
        else el.data('label', e.label)
      }
      cy.getElementById(ANCHOR_EDGE).remove()
      cy.getElementById(ANCHOR).remove()
      if (start) {
        cy.add({ group: 'nodes', data: { id: ANCHOR, label: '' }, position: { x: 0, y: 0 }, grabbable: false, selectable: false })
        cy.add({ group: 'edges', data: { id: ANCHOR_EDGE, source: ANCHOR, target: start.id }, selectable: false })
        placeAnchor(cy, start.id)
      }
    })
  }, [nodes, edges, positions])

  useEffect(() => {
    const cy = cyRef.current
    cy.batch(() => {
      cy.elements().removeClass('active result-accept result-reject pending')
      for (const id of highlight?.nodes ?? []) cy.getElementById(id).addClass('active')
      for (const id of highlight?.edges ?? []) cy.getElementById(EDGE_PREFIX + id).addClass('active')
      if (highlight?.result) {
        for (const id of highlight.nodes ?? []) {
          cy.getElementById(id).addClass(highlight.result === 'accept' ? 'result-accept' : 'result-reject')
        }
      }
      if (pending) cy.getElementById(pending).addClass('pending')
    })
  }, [highlight, pending, nodes, edges])

  useEffect(() => {
    const cy = cyRef.current
    cy.elements().unselect()
    if (selected) {
      const id = selected.kind === 'edge' ? EDGE_PREFIX + selected.id : selected.id
      cy.getElementById(id).select()
    }
  }, [selected, nodes, edges])

  useEffect(() => {
    const cy = cyRef.current
    if (cy.nodes().length) cy.fit(undefined, 50)
    if (cy.zoom() > 1.4) {
      cy.zoom(1.4)
      cy.center()
    }
  }, [fitKey])

  const cursor = mode === 'addState' ? 'cursor-crosshair' : mode === 'delete' ? 'cursor-not-allowed' : ''
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className={`h-full w-full ${cursor}`} />
      {mode === 'addEdge' && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-indigo-600/90 px-2.5 py-1 text-xs font-medium text-white shadow">
          {pending ? `${pending} → hedef durumu seçin` : 'Kaynak durumu seçin'}
        </div>
      )}
    </div>
  )
})

export default AutomatonCanvas
