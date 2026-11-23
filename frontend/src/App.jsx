import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRightLeft, BookOpen, Cpu, Layers, Sparkles, Workflow } from 'lucide-react'
import { Placeholder } from './components/ui'
import { emptyFA, normalizeFA } from './lib/fa'
import { ensurePositions } from './lib/graph'
import ConvertPage from './pages/ConvertPage'
import FAPage from './pages/FAPage'
import { storageService } from './services/storageService'

const TABS = [
  { id: 'fa', label: 'Sonlu Otomat', icon: Workflow },
  { id: 'convert', label: 'Dönüşümler', icon: ArrowRightLeft },
  { id: 'pda', label: 'Yığıtlı Otomat', icon: Layers },
  { id: 'tm', label: 'Turing Makinesi', icon: Cpu },
  { id: 'ai', label: 'Yapay Zeka', icon: Sparkles },
  { id: 'theory', label: 'Konu Anlatımı', icon: BookOpen },
]

const emptyDoc = () => ({ name: '', automaton: emptyFA(), positions: {} })

function prepareDoc(data) {
  const automaton = normalizeFA(data.automaton ?? emptyFA())
  return { id: data.id, name: data.name ?? '', automaton, positions: ensurePositions(automaton, data.positions ?? {}) }
}

export default function App() {
  const [tab, setTab] = useState('fa')
  const [faDoc, setFaDoc] = useState(emptyDoc)
  const [fitKey, setFitKey] = useState(0)
  const draftReady = useRef(false)

  useEffect(() => {
    storageService.loadDraft('fa').then((draft) => {
      if (draft?.automaton) {
        setFaDoc(prepareDoc(draft))
        setFitKey((k) => k + 1)
      }
      draftReady.current = true
    })
  }, [])

  useEffect(() => {
    if (!draftReady.current) return
    const timer = setTimeout(() => storageService.saveDraft('fa', faDoc).catch(() => {}), 400)
    return () => clearTimeout(timer)
  }, [faDoc])

  const loadFaDoc = useCallback((data, { keepView } = {}) => {
    setFaDoc(prepareDoc(data))
    if (!keepView) setFitKey((k) => k + 1)
  }, [])

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
              <circle cx="16" cy="16" r="13" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="8.5" fill="none" stroke="#4f46e5" strokeWidth="2" />
            </svg>
            <div className="leading-tight">
              <h1 className="font-semibold text-slate-900">Otomata Teorisi Laboratuvarı</h1>
              <p className="text-xs text-slate-500">Biçimsel diller ve otomatlar için interaktif çalışma alanı</p>
            </div>
          </div>
          <nav className="-mb-px flex flex-wrap gap-1" aria-label="Modüller">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4">
        {tab === 'fa' && (
          <FAPage
            doc={faDoc}
            setDoc={setFaDoc}
            loadDoc={loadFaDoc}
            fitKey={fitKey}
            onGoConvert={() => setTab('convert')}
          />
        )}
        {tab === 'convert' && <ConvertPage doc={faDoc} loadDoc={loadFaDoc} onGoEditor={() => setTab('fa')} />}
        {tab === 'pda' && (
          <Placeholder icon={Layers} title="Yığıtlı Otomat (PDA)">
            Canlı yığıt görselleştirmeli PDA modülü Faz 3'te eklenecek.
          </Placeholder>
        )}
        {tab === 'tm' && (
          <Placeholder icon={Cpu} title="Turing Makinesi">
            Canlı şerit ve okuma/yazma kafası simülatörü Faz 3'te eklenecek.
          </Placeholder>
        )}
        {tab === 'ai' && (
          <Placeholder icon={Sparkles} title="Yapay Zeka Asistanı">
            Metinden otomat çizimi ve dil açıklama Faz 4'te eklenecek.
          </Placeholder>
        )}
        {tab === 'theory' && (
          <Placeholder icon={BookOpen} title="Konu Anlatımı">
            Pompalama lemması, düzenli diller ve Chomsky hiyerarşisi kartları Faz 4'te eklenecek.
          </Placeholder>
        )}
      </main>
    </div>
  )
}
