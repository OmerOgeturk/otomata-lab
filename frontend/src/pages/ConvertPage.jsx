import { useState } from 'react'
import { ArrowRight, Copy, Minimize2, Regex, Shuffle, Table2, Upload } from 'lucide-react'
import MiniCanvas from '../components/MiniCanvas'
import TransitionTable from '../components/TransitionTable'
import { Alert, Badge, Button, Panel } from '../components/ui'
import { normalizeFA } from '../lib/fa'
import { autoLayout } from '../lib/graph'
import { api } from '../services/api'

const OPERATIONS = [
  {
    id: 'nfa-to-dfa',
    title: 'NFA → DFA',
    icon: Shuffle,
    description: 'Alt küme yapısı (subset construction): her DFA durumu, NFA durumlarının bir kümesidir. ε-kapanışları otomatik hesaplanır.',
    run: api.fa.nfaToDfa,
  },
  {
    id: 'minimize',
    title: 'DFA minimizasyonu',
    icon: Minimize2,
    description: 'Erişilemeyen durumlar atılır, ayırt edilemeyen durumlar birleştirilir. Gerekirse ∅ tuzak durumu eklenir.',
    run: api.fa.minimize,
  },
  {
    id: 'regex',
    title: 'Düzenli ifade',
    icon: Regex,
    description: 'Durum eleme (GNFA) yöntemiyle otomatın tanıdığı dili düzenli ifadeye çevirir.',
    run: api.fa.toRegex,
  },
]

export default function ConvertPage({ doc, loadDoc, onGoEditor }) {
  const fa = doc.automaton
  const [rawResult, setResult] = useState(null)
  const result = rawResult?.source === fa ? rawResult : null
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)

  const execute = async (op) => {
    setError('')
    setBusy(op.id)
    try {
      const data = await op.run(fa)
      if (op.id === 'regex') setResult({ op, source: fa, regex: data.regex, key: Date.now() })
      else {
        const automaton = normalizeFA(data)
        setResult({
          op,
          source: fa,
          automaton,
          positions: autoLayout(automaton.states, automaton.transitions, automaton.start_state),
          key: Date.now(),
        })
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  const copyRegex = async () => {
    try {
      await navigator.clipboard.writeText(result.regex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Panoya kopyalanamadı.')
    }
  }

  const sendToEditor = () => {
    loadDoc({ name: `${doc.name || 'Otomat'} (${result.op.title})`, automaton: result.automaton, positions: result.positions })
    onGoEditor()
  }

  if (!fa.states.length) {
    return (
      <Alert tone="info">
        Dönüştürülecek bir otomat yok. Önce <b>Sonlu Otomat</b> sekmesinde bir otomat çizin veya şablon yükleyin.
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {OPERATIONS.map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => execute(op)}
            disabled={!!busy}
            className={`group rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition hover:ring-indigo-400 disabled:opacity-60 ${
              result?.op.id === op.id ? 'ring-2 ring-indigo-500' : 'ring-slate-200'
            }`}
          >
            <span className="flex items-center gap-2 font-semibold text-slate-800">
              <op.icon className="h-5 w-5 text-indigo-500" />
              {op.title}
              <ArrowRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </span>
            <span className="mt-1.5 block text-sm text-slate-500">{busy === op.id ? 'Hesaplanıyor…' : op.description}</span>
          </button>
        ))}
      </div>

      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={`Kaynak: ${doc.name || 'Mevcut otomat'}`}
          actions={<Badge tone="slate">{`${fa.type} • ${fa.states.length} durum`}</Badge>}
        >
          <MiniCanvas key={doc.id ?? 'src'} fa={fa} positions={doc.positions} fitKey={fa} />
          <div className="mt-4">
            <TransitionTable fa={fa} />
          </div>
        </Panel>

        {result ? (
          <Panel
            title={`Sonuç: ${result.op.title}`}
            actions={
              result.automaton && <Badge tone="indigo">{`${result.automaton.states.length} durum`}</Badge>
            }
          >
            {result.regex !== undefined ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3">
                  <code className="flex-1 break-all font-mono text-lg text-emerald-300">{result.regex}</code>
                  <Button variant="ghost" icon={Copy} onClick={copyRegex} className="text-slate-300 hover:bg-slate-700">
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </Button>
                </div>
                <p className="text-sm text-slate-500">
                  Notasyon: <code className="font-mono">|</code> birleşim (∪), <code className="font-mono">*</code> Kleene yıldızı,{' '}
                  <code className="font-mono">?</code> isteğe bağlı (r|ε), <code className="font-mono">∅</code> boş dil.
                </p>
              </div>
            ) : (
              <>
                <MiniCanvas key={result.key} fa={result.automaton} positions={result.positions} fitKey={result.key} />
                <div className="mt-4">
                  <TransitionTable fa={result.automaton} />
                </div>
                <Button variant="primary" icon={Upload} onClick={sendToEditor} className="mt-4 w-full">
                  Sonucu tuvale aktar
                </Button>
              </>
            )}
          </Panel>
        ) : (
          <Panel title="Sonuç" icon={Table2}>
            <p className="py-10 text-center text-sm text-slate-400">Yukarıdan bir dönüşüm seçin.</p>
          </Panel>
        )}
      </div>
      <button type="button" onClick={onGoEditor} className="text-sm text-indigo-600 hover:underline">
        ← Düzenleyiciye dön
      </button>
    </div>
  )
}
