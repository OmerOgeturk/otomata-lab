import { useState } from 'react'
import { Check, Copy, ShieldAlert, Sparkles } from 'lucide-react'
import Markdown from './Markdown'

export default function Explanation({ result }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.regex)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">Kesin düzenli ifade (sunucuda matematiksel olarak türetildi)</p>
        <div className="flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2 ring-1 ring-indigo-100">
          <code className="flex-1 break-all font-mono text-sm text-indigo-900">{result.regex}</code>
          <button type="button" onClick={copy} className="text-indigo-500 hover:text-indigo-700" title="Kopyala" aria-label="Düzenli ifadeyi kopyala">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> Gemini'nin açıklaması
        </p>
        <Markdown source={result.explanation} />
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-400">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Düzenli ifade kesindir; sözel açıklama yapay zeka tarafından yazıldığı için hata içerebilir.
      </p>
    </div>
  )
}
