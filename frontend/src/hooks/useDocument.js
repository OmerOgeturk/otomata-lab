import { useCallback, useEffect, useRef, useState } from 'react'
import { storageService } from '../services/storageService'

export function useDocument(kind, prepare) {
  const prepareRef = useRef(prepare)
  const [doc, setDoc] = useState(() => prepare({}))
  const [fitKey, setFitKey] = useState(0)
  const ready = useRef(false)

  useEffect(() => {
    storageService.loadDraft(kind).then((draft) => {
      if (draft?.automaton) {
        setDoc(prepareRef.current(draft))
        setFitKey((k) => k + 1)
      }
      ready.current = true
    })
  }, [kind])

  useEffect(() => {
    if (!ready.current) return
    const timer = setTimeout(() => storageService.saveDraft(kind, doc).catch(() => {}), 400)
    return () => clearTimeout(timer)
  }, [kind, doc])

  const loadDoc = useCallback((data, { keepView } = {}) => {
    setDoc(prepareRef.current(data))
    if (!keepView) setFitKey((k) => k + 1)
  }, [])

  return { doc, setDoc, loadDoc, fitKey }
}
