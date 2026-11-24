export const emptyTM = () => ({
  type: 'DTM',
  states: [],
  input_alphabet: [],
  tape_alphabet: ['_'],
  blank_symbol: '_',
  start_state: '',
  accept_states: [],
  transitions: [],
})

export function normalizeTM(raw) {
  return {
    type: 'DTM',
    states: [...(raw.states ?? [])],
    input_alphabet: [...(raw.input_alphabet ?? [])],
    tape_alphabet: [...(raw.tape_alphabet ?? [])],
    blank_symbol: raw.blank_symbol || '_',
    start_state: raw.start_state ?? raw.states?.[0] ?? '',
    accept_states: [...(raw.accept_states ?? [])],
    transitions: (raw.transitions ?? []).map((t) => ({ from: t.from, to: t.to, read: t.read, write: t.write, move: t.move })),
  }
}

export const tmRule = (t) => `${t.read} → ${t.write}, ${t.move}`

export function tmTable(tm) {
  const symbols = tm.tape_alphabet.filter((s) => s !== tm.blank_symbol).concat(tm.blank_symbol)
  const rows = tm.states.map((state) => ({
    state,
    start: state === tm.start_state,
    accept: tm.accept_states.includes(state),
    cells: symbols.map((symbol) => tm.transitions.find((t) => t.from === state && t.read === symbol) ?? null),
  }))
  return { symbols, rows }
}

export function withAbsolutePositions(steps) {
  let offset = 0
  return steps.map((step, i) => {
    const prev = steps[i - 1]
    if (prev && step.transition?.move === 'L' && prev.head === 0 && step.tape.length > prev.tape.length) offset++
    return { ...step, offset, absHead: step.head - offset }
  })
}
