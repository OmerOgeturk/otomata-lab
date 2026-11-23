import { useEffect, useState } from 'react'

export function useTemplates(fetcher) {
  const [state, setState] = useState({ templates: [], error: '' })
  useEffect(() => {
    let alive = true
    fetcher()
      .then((templates) => alive && setState({ templates, error: '' }))
      .catch((e) => alive && setState({ templates: [], error: e.message }))
    return () => {
      alive = false
    }
  }, [fetcher])
  return state
}
