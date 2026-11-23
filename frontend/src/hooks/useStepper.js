import { useCallback, useEffect, useState } from 'react'

export const SPEEDS = [
  { label: '0.5×', ms: 1400 },
  { label: '1×', ms: 800 },
  { label: '2×', ms: 400 },
  { label: '4×', ms: 180 },
]

export function useStepper(total, resetKey) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const last = Math.max(0, total - 1)

  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [total, resetKey])

  useEffect(() => {
    if (!playing) return
    if (index >= last) {
      setPlaying(false)
      return
    }
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), SPEEDS[speed].ms)
    return () => clearTimeout(timer)
  }, [playing, index, last, speed])

  const go = useCallback((i) => setIndex(Math.max(0, Math.min(i, last))), [last])

  return {
    index,
    last,
    playing,
    speed,
    setSpeed,
    atEnd: index >= last,
    first: () => go(0),
    prev: () => go(index - 1),
    next: () => go(index + 1),
    end: () => go(last),
    go,
    toggle: () => {
      if (!playing && index >= last) setIndex(0)
      setPlaying((p) => !p)
    },
    stop: () => setPlaying(false),
  }
}
