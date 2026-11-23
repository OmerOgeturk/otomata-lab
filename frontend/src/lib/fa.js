import { EPS, edgeId, isEps, showEps } from './graph'

export const FA_TYPES = [
  { value: 'DFA', label: 'DFA' },
  { value: 'NFA', label: 'NFA' },
  { value: 'ENFA', label: 'ε-NFA' },
]

export const emptyFA = () => ({
  type: 'DFA',
  states: [],
  alphabet: ['0', '1'],
  start_state: '',
  accept_states: [],
  transitions: [],
})

export const faLabel = (t) => showEps(t.symbol)

export function parseSymbols(text) {
  const symbols = text.split(',').map((s) => s.trim()).filter(Boolean).map(showEps)
  return [...new Set(symbols)]
}

export function parseAlphabet(text) {
  return [...new Set(text.split(',').map((s) => s.trim()).filter((s) => s && !isEps(s)))]
}

export function setEdgeSymbols(fa, from, to, symbols) {
  const others = fa.transitions.filter((t) => edgeId(t.from, t.to) !== edgeId(from, to))
  const added = symbols.map((symbol) => ({ from, to, symbol }))
  const alphabet = [...fa.alphabet]
  for (const s of symbols) if (s !== EPS && !alphabet.includes(s)) alphabet.push(s)
  return { ...fa, alphabet, transitions: [...others, ...added] }
}

export function symbolProblems(symbols, fa) {
  const problems = []
  for (const s of symbols) {
    if (s === EPS && fa.type !== 'ENFA') problems.push('ε-geçişi yalnızca ε-NFA türünde kullanılabilir.')
    if (s !== EPS && [...s].length !== 1) problems.push(`'${s}' tek karakter olmalı.`)
  }
  return problems
}

export function dfaWarnings(fa) {
  if (fa.type !== 'DFA') return []
  const warnings = []
  for (const state of fa.states) {
    for (const symbol of fa.alphabet) {
      const count = fa.transitions.filter((t) => t.from === state && t.symbol === symbol).length
      if (count > 1) warnings.push(`${state} durumunda '${symbol}' için ${count} geçiş var (DFA'da en fazla 1).`)
    }
  }
  return warnings
}

export function normalizeFA(raw) {
  return {
    type: ['DFA', 'NFA', 'ENFA'].includes(raw.type) ? raw.type : 'DFA',
    states: [...(raw.states ?? [])],
    alphabet: [...(raw.alphabet ?? [])],
    start_state: raw.start_state ?? raw.states?.[0] ?? '',
    accept_states: [...(raw.accept_states ?? [])],
    transitions: (raw.transitions ?? []).map((t) => ({ from: t.from, to: t.to, symbol: showEps(t.symbol) })),
  }
}

export function transitionTable(fa) {
  const symbols = [...fa.alphabet]
  if (fa.transitions.some((t) => t.symbol === EPS)) symbols.push(EPS)
  const rows = fa.states.map((state) => ({
    state,
    start: state === fa.start_state,
    accept: fa.accept_states.includes(state),
    cells: symbols.map((symbol) =>
      [...new Set(fa.transitions.filter((t) => t.from === state && t.symbol === symbol).map((t) => t.to))].sort(),
    ),
  }))
  return { symbols, rows }
}
