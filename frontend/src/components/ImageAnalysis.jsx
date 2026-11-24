import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Camera, FileImage, ImageUp, ListTree, MessageCircleQuestion, ScanSearch, ShieldAlert, Trash2, Wand2, Workflow } from 'lucide-react'
import { FA_TYPES, normalizeFA } from '../lib/fa'
import { autoLayout } from '../lib/graph'
import { prepareImage } from '../lib/image'
import { api } from '../services/api'
import CNFResult from './CNFResult'
import Explanation from './Explanation'
import Markdown from './Markdown'
import RegexText from './Regex'
import MiniCanvas from './MiniCanvas'
import TransitionTable from './TransitionTable'
import { Alert, Badge, Button, Panel, inputClass } from './ui'

const TASKS = [
  { id: 'grammar', label: "Gramer → CNF", icon: ListTree, hint: "Fotoğraftaki bağlamdan bağımsız gramer okunur ve Chomsky normal formuna adım adım dönüştürülür." },
  { id: 'automaton', label: 'Otomat ne iş yapar?', icon: Workflow, hint: 'Fotoğraftaki DFA/NFA diyagramı okunur, tanıdığı dil kesin düzenli ifadeyle bulunur ve açıklanır.' },
  { id: 'question', label: 'Serbest soru', icon: MessageCircleQuestion, hint: 'Fotoğraftaki soru, şekil ya da ifade hakkında istediğinizi sorun.' },
]

const QUESTION_EXAMPLES = ['Bu soruyu adım adım çöz', 'Bu dil düzenli mi? Pompalama lemmasıyla göster', 'Bu PDA hangi dili tanır?']

function DropZone({ onFile, disabled }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFile(e.dataTransfer.files?.[0])
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
        over ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50'
      }`}
    >
      <ImageUp className="h-8 w-8 text-slate-400" aria-hidden />
      <p className="text-sm text-slate-600">Fotoğrafı buraya sürükleyin, Ctrl+V ile yapıştırın ya da seçin</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button icon={FileImage} onClick={() => inputRef.current?.click()} disabled={disabled}>
          Dosya seç
        </Button>
        <label className="sm:hidden">
          <span className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300">
            <Camera className="h-4 w-4" /> Kamera
          </span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Fotoğraf dosyası"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <p className="text-xs text-slate-400">PNG, JPEG, WEBP · büyük görseller otomatik küçültülür</p>
    </div>
  )
}

function GrammarResult({ result, set, onOpenGrammar }) {
  const [text, setText] = useState(result.grammar)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const convert = async (grammar) => {
    setError('')
    setBusy(true)
    try {
      set({ cnf: await api.cfg.cnf(grammar) })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (!result.cnf) convert(result.grammar)
  }, [])
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500">Fotoğraftan okunan gramer (hatalı okunan yeri düzeltebilirsiniz)</p>
        <textarea
          className={`${inputClass} block min-h-32 w-full resize-y font-mono`}
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          aria-label="Okunan gramer"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Wand2} onClick={() => convert(text)} disabled={busy}>
            {busy ? 'Dönüştürülüyor…' : "CNF'ye dönüştür"}
          </Button>
          <Button icon={ArrowRight} onClick={() => onOpenGrammar(text)}>
            Gramer sekmesinde aç
          </Button>
        </div>
        {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      </div>
      <div>{result.cnf ? <CNFResult result={result.cnf} /> : busy && <p className="animate-pulse text-sm text-slate-400">Dönüştürülüyor…</p>}</div>
    </div>
  )
}

function AutomatonResult({ result, set, onImport, onError, keyMissing }) {
  const [busy, setBusy] = useState(false)
  const explain = async () => {
    setBusy(true)
    try {
      set({ explanation: await api.ai.explain(result.automaton) })
    } catch (e) {
      onError(e)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (!result.explanation && !keyMissing) explain()
  }, [])
  const fa = result.automaton
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="indigo">{FA_TYPES.find((t) => t.value === fa.type)?.label ?? fa.type}</Badge>
          <span className="text-sm text-slate-600">
            {fa.states.length} durum · Σ = {`{${fa.alphabet.join(', ')}}`}
          </span>
        </div>
        <MiniCanvas key={result.key} fa={fa} positions={result.positions} fitKey={result.key} />
        <TransitionTable fa={fa} />
        <Button variant="primary" icon={ArrowRight} onClick={() => onImport({ automaton: fa, positions: result.positions, prompt: `Fotoğraf: ${result.source}` })}>
          Tuvale aktar ve dizelerle test et
        </Button>
        <p className="flex items-start gap-1.5 text-xs text-slate-400">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Diyagramın doğru okunduğunu yukarıdaki graftan kontrol edin; yanlış okunan geçişi tuvalde düzeltebilirsiniz.
        </p>
      </div>
      <div className="space-y-3">
        {result.explanation ? (
          <Explanation result={result.explanation} />
        ) : (
          <>
            <div>
              <p className="mb-1 text-xs font-medium text-slate-500">Kesin düzenli ifade</p>
              <p className="break-all rounded-lg bg-indigo-50 px-3 py-2 text-lg text-indigo-900 ring-1 ring-indigo-100"><RegexText value={result.regex} /></p>
            </div>
            {busy ? (
              <p className="animate-pulse text-sm text-slate-400">Dilin açıklaması hazırlanıyor…</p>
            ) : (
              <Button onClick={explain} disabled={keyMissing}>
                Açıklamayı tekrar dene
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ImageAnalysis({ state, setState, keyMissing, onError, onImport, onOpenGrammar }) {
  const { image, task, question, result } = state
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const setResult = (patch) => setState((s) => ({ ...s, result: { ...s.result, ...patch } }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const takeFile = async (file) => {
    if (!file) return
    setError('')
    try {
      set({ image: await prepareImage(file), result: null })
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    const onPaste = (e) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        takeFile(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const analyze = async () => {
    setError('')
    setBusy(true)
    try {
      const data = await api.ai.image({ task, image: image.dataUrl, mime_type: image.mimeType, question })
      const next = { task, notes: data.notes, source: image.name, key: Date.now() }
      if (task === 'grammar') Object.assign(next, { grammar: data.grammar })
      if (task === 'automaton') {
        const automaton = normalizeFA(data.automaton)
        Object.assign(next, { automaton, regex: data.regex, positions: autoLayout(automaton.states, automaton.transitions, automaton.start_state) })
      }
      if (task === 'question') Object.assign(next, { answer: data.answer, question })
      set({ result: next })
    } catch (e) {
      if (e.status === 503) onError(e)
      else setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const current = TASKS.find((t) => t.id === task)

  return (
    <Panel title="Fotoğraftan analiz" icon={ScanSearch}>
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            {image ? (
              <div className="relative overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200">
                <img src={image.dataUrl} alt="Yüklenen fotoğraf" className="mx-auto max-h-72 object-contain" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <Button icon={Trash2} onClick={() => set({ image: null, result: null })} className="bg-white/90">
                    Fotoğrafı kaldır
                  </Button>
                </div>
              </div>
            ) : (
              <DropZone onFile={takeFile} disabled={busy} />
            )}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Analiz türü">
              {TASKS.map((t) => (
                <Button key={t.id} icon={t.icon} active={task === t.id} role="radio" aria-checked={task === t.id} onClick={() => set({ task: t.id })}>
                  {t.label}
                </Button>
              ))}
            </div>
            <p className="text-sm text-slate-500">{current.hint}</p>
            {task === 'question' && (
              <div className="space-y-2">
                <textarea
                  className={`${inputClass} block min-h-20 w-full resize-y`}
                  value={question}
                  maxLength={1000}
                  placeholder="Örn. Bu soruyu adım adım çöz"
                  onChange={(e) => set({ question: e.target.value })}
                  aria-label="Fotoğrafla ilgili soru"
                />
                <div className="flex flex-wrap gap-1.5">
                  {QUESTION_EXAMPLES.map((q) => (
                    <button key={q} type="button" onClick={() => set({ question: q })} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button variant="primary" icon={ScanSearch} onClick={analyze} disabled={!image || busy || keyMissing}>
              {busy ? 'Fotoğraf inceleniyor…' : 'Analiz et'}
            </Button>
            {busy && <p className="animate-pulse text-xs text-slate-400">Gemini yoğunsa yanıt 20–70 saniye sürebilir.</p>}
            {error && <Alert onClose={() => setError('')}>{error}</Alert>}
          </div>
        </div>

        {result && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400">Kaynak: {result.source}</p>
            {result.notes && (
              <Alert tone="info">
                <span className="font-medium">Okuma notu:</span> {result.notes}
              </Alert>
            )}
            {result.task === 'grammar' && <GrammarResult key={result.key} result={result} set={setResult} onOpenGrammar={onOpenGrammar} />}
            {result.task === 'automaton' && <AutomatonResult key={result.key} result={result} set={setResult} onImport={onImport} onError={onError} keyMissing={keyMissing} />}
            {result.task === 'question' && (
              <div className="space-y-2">
                {result.question && <p className="text-sm font-medium text-slate-700">“{result.question}”</p>}
                <Markdown source={result.answer} />
                <p className="flex items-start gap-1.5 text-xs text-slate-400">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Bu yanıt yapay zeka tarafından yazıldı ve hata içerebilir.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  )
}
