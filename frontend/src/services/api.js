const BASE = import.meta.env.VITE_API_URL ?? ''

function formatDetail(detail) {
  if (!detail) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d) => d.msg ?? JSON.stringify(d)).join(' • ')
  return JSON.stringify(detail)
}

async function request(path, body) {
  const options =
    body === undefined
      ? {}
      : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  let response
  try {
    response = await fetch(BASE + path, options)
  } catch {
    throw new Error('Sunucuya ulaşılamadı. Backend çalışıyor mu? (uvicorn app.main:app --reload)')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(formatDetail(data?.detail) || `İstek başarısız oldu (${response.status}).`)
    error.status = response.status
    throw error
  }
  return data
}

export const api = {
  fa: {
    simulate: (automaton, input) => request('/api/fa/simulate', { automaton, input }),
    nfaToDfa: (automaton) => request('/api/fa/nfa-to-dfa', automaton),
    minimize: (automaton) => request('/api/fa/minimize', automaton),
    toRegex: (automaton) => request('/api/fa/to-regex', automaton),
    templates: () => request('/api/fa/templates'),
  },
  pda: {
    simulate: (automaton, input) => request('/api/pda/simulate', { automaton, input }),
    templates: () => request('/api/pda/templates'),
  },
  tm: {
    simulate: (machine, input, maxSteps) => request('/api/tm/simulate', { machine, input, max_steps: maxSteps }),
    templates: () => request('/api/tm/templates'),
  },
  ai: {
    status: () => request('/api/ai/status'),
    generate: (prompt) => request('/api/ai/generate', { prompt }),
    explain: (automaton) => request('/api/ai/explain', automaton),
  },
}
