export const EPS = 'ε'
const EPS_ALIASES = new Set(['', 'ε', 'eps', 'epsilon', 'λ', 'lambda'])

export const isEps = (s) => EPS_ALIASES.has(String(s).trim().toLowerCase())
export const showEps = (s) => (isEps(s) ? EPS : String(s).trim())

export const edgeId = (from, to) => `${from}→${to}`

export function nextStateName(states, prefix = 'q') {
  let i = 0
  while (states.includes(`${prefix}${i}`)) i++
  return `${prefix}${i}`
}

export function groupEdges(transitions, labelOf, separator = ', ') {
  const groups = new Map()
  for (const t of transitions) {
    const id = edgeId(t.from, t.to)
    if (!groups.has(id)) groups.set(id, { id, source: t.from, target: t.to, items: [] })
    groups.get(id).items.push(t)
  }
  return [...groups.values()].map((g) => ({ ...g, label: [...new Set(g.items.map(labelOf))].join(separator) }))
}

export function toCanvas(machine, labelOf, separator) {
  const nodes = machine.states.map((id) => ({
    id,
    start: id === machine.start_state,
    accept: machine.accept_states.includes(id),
  }))
  return { nodes, edges: groupEdges(machine.transitions, labelOf, separator) }
}

export function renameIn(machine, oldName, newName) {
  const r = (s) => (s === oldName ? newName : s)
  return {
    ...machine,
    states: machine.states.map(r),
    start_state: r(machine.start_state),
    accept_states: machine.accept_states.map(r),
    transitions: machine.transitions.map((t) => ({ ...t, from: r(t.from), to: r(t.to) })),
  }
}

export function removeStateIn(machine, name) {
  const states = machine.states.filter((s) => s !== name)
  return {
    ...machine,
    states,
    start_state: machine.start_state === name ? (states[0] ?? '') : machine.start_state,
    accept_states: machine.accept_states.filter((s) => s !== name),
    transitions: machine.transitions.filter((t) => t.from !== name && t.to !== name),
  }
}

export function toggleAcceptIn(machine, name) {
  const accept = machine.accept_states.includes(name)
    ? machine.accept_states.filter((s) => s !== name)
    : [...machine.accept_states, name]
  return { ...machine, accept_states: accept }
}

export function removeEdgeIn(machine, id) {
  return { ...machine, transitions: machine.transitions.filter((t) => edgeId(t.from, t.to) !== id) }
}

export function autoLayout(states, transitions, start) {
  const adjacency = new Map(states.map((s) => [s, []]))
  for (const t of transitions) if (adjacency.has(t.from) && t.from !== t.to) adjacency.get(t.from).push(t.to)
  const level = new Map()
  const order = start && adjacency.has(start) ? [start] : []
  if (order.length) level.set(start, 0)
  for (let i = 0; i < order.length; i++) {
    for (const next of adjacency.get(order[i])) {
      if (!level.has(next)) {
        level.set(next, level.get(order[i]) + 1)
        order.push(next)
      }
    }
  }
  let maxLevel = Math.max(-1, ...level.values())
  for (const s of states) if (!level.has(s)) level.set(s, ++maxLevel)
  const columns = new Map()
  for (const s of states) {
    const l = level.get(s)
    if (!columns.has(l)) columns.set(l, [])
    columns.get(l).push(s)
  }
  const positions = {}
  for (const [l, column] of columns) {
    column.forEach((s, i) => {
      positions[s] = { x: 120 + l * 170, y: 200 + (i - (column.length - 1) / 2) * 130 }
    })
  }
  return positions
}

export function ensurePositions(machine, positions = {}) {
  const missing = machine.states.some((s) => !positions[s])
  if (!missing) return positions
  const hasAny = machine.states.some((s) => positions[s])
  if (!hasAny) return autoLayout(machine.states, machine.transitions, machine.start_state)
  const result = { ...positions }
  let offset = 0
  const maxX = Math.max(...Object.values(positions).map((p) => p.x))
  for (const s of machine.states) {
    if (!result[s]) result[s] = { x: maxX + 170, y: 120 + 130 * offset++ }
  }
  return result
}
