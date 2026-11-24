import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpenText, KeyRound, Lightbulb, RefreshCw, Sparkles, Wand2 } from 'lucide-react'
import Explanation from '../components/Explanation'
import ImageAnalysis from '../components/ImageAnalysis'
import MiniCanvas from '../components/MiniCanvas'
import TransitionTable from '../components/TransitionTable'
import { Alert, Badge, Button, Panel, inputClass } from '../components/ui'
import { FA_TYPES, normalizeFA } from '../lib/fa'
import { autoLayout } from '../lib/graph'
import { api } from '../services/api'

const EXAMPLES = [
  'İçinde 101 alt dizesi geçen ikili dizeleri tanıyan DFA',
  "1'lerin sayısı 3'ün katı olan ikili dizeler",
  'Σ={a,b} üzerinde a ile başlayıp b ile biten dizeler',
  '00 ile biten ikili dizeler için NFA',
  'Uzunluğu çift olan ve içinde ardışık iki 1 bulunmayan ikili dizeler',
]

const typeLabel = (type) => FA_TYPES.find((t) => t.value === type)?.label ?? type

function KeyCard({ onRetry, checking }) {
  return (
    <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1 space-y-2 text-sm text-amber-900">
          <p className="font-semibold">Gemini API anahtarı henüz tanımlı değil</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Ücretsiz anahtarı{' '}
              <a className="font-medium text-indigo-700 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>{' '}
              adresinden alın.
            </li>
            <li>
              <code className="rounded bg-white/70 px-1 font-mono">backend/.env</code> dosyasını oluşturup (şablon:{' '}
              <code className="rounded bg-white/70 px-1 font-mono">.env.example</code>) şu satırı ekleyin:
              <pre className="mt-1 rounded-md bg-white/80 px-2 py-1 font-mono text-xs">GEMINI_API_KEY=anahtarınız</pre>
            </li>
            <li>Sunucuyu yeniden başlatmanıza gerek yok; aşağıdaki düğmeyle tekrar kontrol edin.</li>
          </ol>
          <p className="text-xs text-amber-800">Anahtar yalnızca bilgisayarınızdaki .env dosyasında durur; .gitignore sayesinde GitHub'a gönderilmez. Diğer tüm modüller anahtarsız çalışır.</p>
          <Button icon={RefreshCw} onClick={onRetry} disabled={checking}>
            {checking ? 'Kontrol ediliyor…' : 'Tekrar kontrol et'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AIPage({ state, setState, imageState, setImageState, faDoc, onImport, onOpenGrammar, autoExplain, onAutoExplainDone }) {
  const { prompt, generated, explanation, explainSource } = state
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const [status, setStatus] = useState(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const autoStarted = useRef(false)

  const checkStatus = async () => {
    setChecking(true)
    try {
      setStatus(await api.ai.status())
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  const handleError = (e) => {
    if (e.status === 503) setStatus({ configured: false })
    else setError(e.message)
  }

  const generate = async (text = prompt) => {
    if (text.trim().length < 3) return setError('Lütfen dili biraz daha ayrıntılı tarif edin.')
    setError('')
    setBusy('generate')
    try {
      const automaton = normalizeFA(await api.ai.generate(text.trim()))
      set({ generated: { automaton, prompt: text.trim(), positions: autoLayout(automaton.states, automaton.transitions, automaton.start_state), key: Date.now() } })
    } catch (e) {
      handleError(e)
    } finally {
      setBusy('')
    }
  }

  const explain = async (automaton, source) => {
    setError('')
    setBusy('explain')
    try {
      const result = await api.ai.explain(automaton)
      set({ explanation: result, explainSource: source })
    } catch (e) {
      handleError(e)
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    checkStatus()
    if (autoExplain && !autoStarted.current && faDoc.automaton.states.length) {
      autoStarted.current = true
      onAutoExplainDone()
      explain(faDoc.automaton, faDoc.name || 'Sonlu Otomat sekmesindeki otomat')
    }
  }, [])

  const fa = faDoc.automaton
  const keyMissing = status && !status.configured

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-indigo-500" /> Yapay Zeka Asistanı
          </h2>
          <p className="text-sm text-slate-500">Doğal dilden otomat çizdirin, bir otomatın dilini açıklatın ya da fotoğraftaki gramer, diyagram veya soruyu analiz ettirin.</p>
        </div>
        {status?.configured && <Badge tone="green">Gemini bağlı · {status.model}</Badge>}
      </div>

      {keyMissing && <KeyCard onRetry={checkStatus} checking={checking} />}
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Metinden otomat" icon={Wand2}>
          <div className="space-y-3">
            <textarea
              className={`${inputClass} block min-h-24 w-full resize-y`}
              value={prompt}
              maxLength={1000}
              placeholder="Örn. İçinde 11 geçmeyen ikili dizeleri tanıyan DFA"
              onChange={(e) => set({ prompt: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && generate()}
              aria-label="Dilin tarifi"
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => set({ prompt: example })}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {example}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" icon={Wand2} onClick={() => generate()} disabled={!!busy || keyMissing}>
                {busy === 'generate' ? 'Üretiliyor…' : 'Otomat üret'}
              </Button>
              <span className="text-xs text-slate-400">Ctrl+Enter · DFA/NFA/ε-NFA türünü metinde belirtebilirsiniz.</span>
            </div>

            {generated && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="indigo">{typeLabel(generated.automaton.type)}</Badge>
                  <span className="text-sm text-slate-600">
                    {generated.automaton.states.length} durum · Σ = {`{${generated.automaton.alphabet.join(', ')}}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500">“{generated.prompt}”</p>
                <MiniCanvas key={generated.key} fa={generated.automaton} positions={generated.positions} fitKey={generated.key} />
                <TransitionTable fa={generated.automaton} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" icon={ArrowRight} onClick={() => onImport(generated)}>
                    Tuvale aktar
                  </Button>
                  <Button icon={BookOpenText} onClick={() => explain(generated.automaton, 'Üretilen otomat')} disabled={!!busy || keyMissing}>
                    Dilini açıkla
                  </Button>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-slate-400">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Sunucu, üretilen otomatın yapısal geçerliliğini doğrular. Dilin doğru olduğundan emin olmak için tuvale aktarıp birkaç dizeyle test edin.
                </p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Otomatın dilini bul" icon={BookOpenText}>
          <div className="space-y-3">
            {fa.states.length ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <Badge tone="indigo">{typeLabel(fa.type)}</Badge>
                  <span>
                    {faDoc.name || 'Sonlu Otomat sekmesindeki otomat'} · {fa.states.length} durum
                  </span>
                </div>
                <Button
                  variant="primary"
                  icon={BookOpenText}
                  onClick={() => explain(fa, faDoc.name || 'Sonlu Otomat sekmesindeki otomat')}
                  disabled={!!busy || keyMissing}
                >
                  {busy === 'explain' ? 'Açıklanıyor…' : 'Tuvaldeki otomatın dilini açıkla'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Sonlu Otomat sekmesinde bir otomat çizin ya da bir şablon yükleyin; burada dilini açıklatabilirsiniz.</p>
            )}

            {busy === 'explain' && <p className="animate-pulse text-sm text-slate-400">Düzenli ifade türetiliyor ve açıklama hazırlanıyor…</p>}

            {explanation && busy !== 'explain' && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400">Kaynak: {explainSource}</p>
                <Explanation result={explanation} />
              </div>
            )}
          </div>
        </Panel>
      </div>

      <ImageAnalysis
        state={imageState}
        setState={setImageState}
        keyMissing={keyMissing}
        onError={handleError}
        onImport={onImport}
        onOpenGrammar={onOpenGrammar}
      />
    </div>
  )
}
