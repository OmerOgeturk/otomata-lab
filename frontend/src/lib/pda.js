import { EPS, edgeId, isEps, showEps } from './graph'

export const emptyPDA = () => ({
  type: 'PDA',
  states: [],
  alphabet: ['a', 'b'],
  stack_alphabet: ['A', '$'],
  initial_stack_symbol: '$',
  start_state: '',
  accept_states: [],
  transitions: [],
})

const showPush = (push) => (isEps(push) ? EPS : String(push).trim())

export function normalizePDA(raw) {
  const initial = raw.initial_stack_symbol || '$'
  const stack = [...(raw.stack_alphabet ?? [])]
  if (!stack.includes(initial)) stack.push(initial)
  return {
    type: 'PDA',
    states: [...(raw.states ?? [])],
    alphabet: [...(raw.alphabet ?? [])],
    stack_alphabet: stack,
    initial_stack_symbol: initial,
    start_state: raw.start_state ?? raw.states?.[0] ?? '',
    accept_states: [...(raw.accept_states ?? [])],
    transitions: (raw.transitions ?? []).map((t) => ({
      from: t.from,
      to: t.to,
      input: showEps(t.input),
      pop: showEps(t.pop),
      push: showPush(t.push),
    })),
  }
}

export const pdaRule = (t) => `${t.input}, ${t.pop} → ${t.push}`

const RULE = /^(.+?)\s*,\s*(.+?)\s*(?:->|→)\s*(.*)$/

export function parseRules(text) {
  const rules = []
  const problems = []
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const match = line.match(RULE)
    if (!match) return problems.push(`${i + 1}. satır “girdi, çek → at” biçiminde değil: ${line}`)
    const [, input, pop, push] = match.map((s) => s.trim())
    const rule = { input: showEps(input), pop: showEps(pop), push: showPush(push) }
    if (rule.input !== EPS && [...rule.input].length !== 1) problems.push(`${i + 1}. satır: girdi tek karakter olmalı ('${input}').`)
    if (rule.pop !== EPS && [...rule.pop].length !== 1) problems.push(`${i + 1}. satır: çekilen sembol tek karakter olmalı ('${pop}').`)
    rules.push(rule)
  })
  const unique = [...new Map(rules.map((r) => [pdaRule(r), r])).values()]
  return { rules: unique, problems }
}

export const pushSymbols = (push) => (push === EPS ? [] : [...push])

export function setEdgeRules(pda, from, to, rules) {
  const others = pda.transitions.filter((t) => edgeId(t.from, t.to) !== edgeId(from, to))
  const alphabet = [...pda.alphabet]
  const stack = [...pda.stack_alphabet]
  for (const r of rules) {
    if (r.input !== EPS && !alphabet.includes(r.input)) alphabet.push(r.input)
    for (const s of [r.pop, ...pushSymbols(r.push)]) if (s !== EPS && !stack.includes(s)) stack.push(s)
  }
  return {
    ...pda,
    alphabet,
    stack_alphabet: stack,
    transitions: [...others, ...rules.map((r) => ({ from, to, ...r }))],
  }
}
