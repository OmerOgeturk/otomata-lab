import { useRef, useState } from 'react'
import { ArrowRight, Blend, Info, Plus, Sigma, Trash2, Wand2, X } from 'lucide-react'
import MiniCanvas from '../components/MiniCanvas'
import RegexText from '../components/Regex'
import TransitionTable from '../components/TransitionTable'
import { Alert, Badge, Button, Panel, inputClass } from '../components/ui'
import { normalizeFA } from '../lib/fa'
import { autoLayout } from '../lib/graph'
import { api } from '../services/api'

const KINDS = [
  { value: 'contains', label: 'içerir', placeholder: '00' },
  { value: 'not_contains', label: 'içermez', placeholder: '11' },
  { value: 'starts', label: 'ile başlar', placeholder: '1' },
  { value: 'not_starts', label: 'ile başlamaz', placeholder: '1' },
  { value: 'ends', label: 'ile biter', placeholder: '01' },
  { value: 'not_ends', label: 'ile bitmez', placeholder: '01' },
  { value: 'length_mod', label: 'uzunluk ≡ r (mod k)', placeholder: 'k,r → 2,0' },
  { value: 'count_mod', label: 'sembol sayısı ≡ r (mod k)', placeholder: 'sembol,k,r → 1,3' },
  { value: 'regex', label: 'düzenli ifade', placeholder: '(0∪1)*01' },
  { value: 'automaton', label: 'tuvaldeki otomat', placeholder: '' },
]

const OPERATORS = [
  { text: '∪', title: 'Birleşim (U, |, + da yazılabilir)' },
  { text: '∩', title: 'Kesişim (& da yazılabilir)' },
  { text: '−', title: 'Fark' },
  { text: '*', title: 'Kleene yıldızı' },
  { text: '⁺', title: 'Pozitif kapanış' },
  { text: 'ᶜ', title: "Tümleme (' da yazılabilir)" },
  { text: '(', title: 'Aç parantez' },
  { text: ')', title: 'Kapa parantez' },
  { text: 'Σ*', title: 'Tüm dizeler' },
  { text: 'ε', title: 'Boş dize' },
  { text: '∅', title: 'Boş dil' },
]

const PRESETS = ['(A∪B)*C', 'A∪B', 'AC', 'Aᶜ ∩ C', 'A − C', 'A*']
const NAMES = 'ABCDEFGHKLMNPRST'

function ExpressionText({ text }) {
  return <RegexText value={text.replace(/[∪U+]/g, '|').replace(/&/g, '∩')} className="not-italic" />
}

function ConditionLine({ lang, condition, index, onChange, onRemove, hasCanvas }) {
  const kind = KINDS.find((k) => k.value === condition.kind)
  return (
    <div className="flex items-center gap-2">
      {condition.kind !== 'automaton' && (
        <input
          className={`${inputClass} w-28 font-mono`}
          value={condition.value}
          placeholder={kind.placeholder}
          onChange={(e) => onChange({ value: e.target.value })}
          aria-label={`${lang.name} dili ${index + 1}. koşul değeri`}
        />
      )}
      <select
        className={`${inputClass} min-w-0 flex-1`}
        value={condition.kind}
        onChange={(e) => onChange({ kind: e.target.value })}
        aria-label={`${lang.name} dili ${index + 1}. koşul türü`}
      >
        {KINDS.map((k) => (
          <option key={k.value} value={k.value} disabled={k.value === 'automaton' && !hasCanvas}>
            {k.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        disabled={lang.conditions.length === 1}
        className="text-slate-400 hover:text-red-600 disabled:invisible"
        aria-label={`${lang.name} dili ${index + 1}. koşulu sil`}
        title="Koşulu sil"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function LanguageRow({ lang, onChange, onRemove, hasCanvas }) {
  const setCondition = (i, patch) => onChange({ conditions: lang.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) })
  return (
    <div className="flex items-start gap-2 rounded-lg p-2 ring-1 ring-slate-200">
      <span className="mt-1 w-6 text-center font-serif text-lg font-semibold italic text-indigo-700">{lang.name}</span>
      <span className="mt-1.5 text-slate-400">=</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        {lang.conditions.map((condition, i) => (
          <div key={i} className="space-y-1.5">
            {i > 0 && (
              <select
                className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200"
                value={lang.combine}
                onChange={(e) => onChange({ combine: e.target.value })}
                aria-label={`${lang.name} dili bağlacı`}
              >
                <option value="and">ve</option>
                <option value="or">veya</option>
              </select>
            )}
            <ConditionLine
              lang={lang}
              condition={condition}
              index={i}
              hasCanvas={hasCanvas}
              onChange={(patch) => setCondition(i, patch)}
              onRemove={() => onChange({ conditions: lang.conditions.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ conditions: [...lang.conditions, { kind: 'not_contains', value: '' }] })}
          disabled={lang.conditions.length >= 8}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="h-3.5 w-3.5" /> koşul ekle
        </button>
      </div>
      <button type="button" onClick={onRemove} className="mt-1.5 text-slate-400 hover:text-red-600" aria-label={`${lang.name} dilini sil`} title="Dili sil">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function SetBadges({ item }) {
  if (item.empty) return <Badge tone="amber">∅ boş dil</Badge>
  if (item.universal) return <Badge tone="amber">Σ* tüm dizeler</Badge>
  return null
}

export default function AlgebraPage({ state, setState, faDoc, onImport }) {
  const { alphabet, languages, expression, result } = state
  const set = (patch) => setState((s) => ({ ...s, ...patch }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const exprRef = useRef(null)
  const canvasFa = faDoc.automaton
  const hasCanvas = canvasFa.states.length > 0

  const updateLang = (index, patch) => set({ languages: languages.map((l, i) => (i === index ? { ...l, ...patch } : l)) })
  const addLang = () => {
    const used = new Set(languages.map((l) => l.name))
    const name = [...NAMES].find((n) => !used.has(n))
    if (name) set({ languages: [...languages, { name, combine: 'and', conditions: [{ kind: 'contains', value: '' }] }] })
  }

  const insert = (text) => {
    const el = exprRef.current
    const start = el?.selectionStart ?? expression.length
    const end = el?.selectionEnd ?? expression.length
    set({ expression: expression.slice(0, start) + text + expression.slice(end) })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + text.length, start + text.length)
    })
  }

  const run = async () => {
    setError('')
    setBusy(true)
    try {
      const symbols = alphabet.split(/[\s,;{}]+/).filter(Boolean)
      const payload = Object.fromEntries(
        languages.map((l) => [
          l.name,
          {
            combine: l.combine,
            conditions: l.conditions.map((c) => (c.kind === 'automaton' ? { kind: c.kind, automaton: canvasFa } : { kind: c.kind, value: c.value })),
          },
        ])
      )
      const data = await api.fa.algebra(symbols, payload, expression)
      const automaton = normalizeFA(data.automaton)
      set({ result: { ...data, automaton, expression, positions: autoLayout(automaton.states, automaton.transitions, automaton.start_state), key: Date.now() } })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Blend className="h-5 w-5 text-indigo-500" /> Dil İşlemleri
        </h2>
        <p className="text-sm text-slate-500">Dilleri tanımlayın, birleşim, kesişim, art arda ekleme, yıldız ve tümleme ile birleştirin; sonucu tanıyan minimal DFA çizilsin.</p>
      </div>
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Tanımlar" icon={Sigma}>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Σ =</span>
              <input className={`${inputClass} w-32 font-mono`} value={alphabet} onChange={(e) => set({ alphabet: e.target.value })} aria-label="Alfabe" />
            </label>
            <div className="space-y-2">
              {languages.map((lang, i) => (
                <LanguageRow
                  key={lang.name}
                  lang={lang}
                  hasCanvas={hasCanvas}
                  onChange={(patch) => updateLang(i, patch)}
                  onRemove={() => set({ languages: languages.filter((_, j) => j !== i) })}
                />
              ))}
              <Button icon={Plus} variant="ghost" onClick={addLang} disabled={languages.length >= NAMES.length}>
                Dil ekle
              </Button>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500">İşlem ifadesi</p>
              <input
                ref={exprRef}
                className={`${inputClass} w-full font-mono text-base`}
                value={expression}
                onChange={(e) => set({ expression: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && run()}
                placeholder="(A∪B)*C"
                aria-label="İşlem ifadesi"
              />
              <div className="flex flex-wrap gap-1">
                {OPERATORS.map((op) => (
                  <button
                    key={op.text}
                    type="button"
                    title={op.title}
                    onClick={() => insert(op.text)}
                    className="h-8 min-w-8 rounded-md bg-slate-100 px-2 font-mono text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {op.text}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => set({ expression: p })} className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600 hover:bg-indigo-50 hover:text-indigo-700">
                    {p}
                  </button>
                ))}
              </div>
              <Button variant="primary" icon={Wand2} onClick={run} disabled={busy || !expression.trim()}>
                {busy ? 'Hesaplanıyor…' : 'Otomatı oluştur'}
              </Button>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 ring-1 ring-slate-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Yan yana yazmak art arda eklemedir (<code className="font-mono">AB</code>). Öncelik: yıldız/tümleme → art arda ekleme → kesişim → birleşim/fark.
                Düzenli ifadede <code className="font-mono">+</code> ve <code className="font-mono">∪</code> birleşim demektir. Bir dile <em>koşul ekle</em> ile birden çok koşul verip <em>ve</em>/<em>veya</em> ile bağlayabilirsiniz. Her adım sunucuda kesin olarak hesaplanır, yapay zeka kullanılmaz.
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Sonuç" icon={Blend} actions={result && <Badge tone="indigo">{result.states} durum · minimal DFA</Badge>}>
          {result ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl text-slate-800">
                  <ExpressionText text={result.expression} />
                </span>
                <SetBadges item={result} />
              </div>
              {result.universal && (
                <Alert tone="info">
                  Sonuç dili Σ*: alfabedeki <strong>her dize</strong> kabul ediliyor. Aşağıdaki adımlar hangi işlemde dilin Σ*'a dönüştüğünü gösterir.
                </Alert>
              )}
              {result.empty && <Alert tone="info">Sonuç dili boş: hiçbir dize kabul edilmiyor.</Alert>}
              <MiniCanvas key={result.key} fa={result.automaton} positions={result.positions} fitKey={result.key} />
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Eşdeğer düzenli ifade</p>
                <p className="break-all rounded-lg bg-indigo-50 px-3 py-2 text-lg text-indigo-900 ring-1 ring-indigo-100">
                  <RegexText value={result.regex} />
                </p>
              </div>
              <TransitionTable fa={result.automaton} />
              <Button variant="primary" icon={ArrowRight} onClick={() => onImport({ automaton: result.automaton, positions: result.positions, name: `Dil işlemi: ${result.expression}` })}>
                Tuvale aktar ve dizelerle test et
              </Button>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">Tanımlı diller</p>
                  <ul className="space-y-1 text-sm">
                    {result.languages.map((l) => (
                      <li key={l.name} className="leading-6">
                        <span className="font-serif font-semibold italic text-indigo-700">{l.name}</span>{' '}
                        <span className="text-slate-600">= {l.description}</span>{' '}
                        <span className="whitespace-nowrap text-xs text-slate-400">({l.states} durum)</span> <SetBadges item={l} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">Hesaplama adımları</p>
                  {result.steps.length ? (
                    <ol className="space-y-1 text-sm">
                      {result.steps.map((s, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-400">{i + 1}.</span>
                          <ExpressionText text={s.expression} />
                          <span className="text-xs text-slate-500">
                            {s.operation} · {s.states} durum
                          </span>
                          <SetBadges item={s} />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-slate-400">İşlem yok; tek bir dilin otomatı gösteriliyor.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Dilleri tanımlayıp bir işlem ifadesi yazın, ardından <em>Otomatı oluştur</em>'a basın.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
