import { useRef, useState } from 'react'
import { Download, FolderOpen, Save, Trash2, Upload } from 'lucide-react'
import { storageService } from '../services/storageService'
import { Alert, Button, Dialog, IconButton, inputClass } from './ui'

export default function FileMenu({ kind, doc, onLoad, onError }) {
  const [saveOpen, setSaveOpen] = useState(false)
  const [openOpen, setOpenOpen] = useState(false)
  const [name, setName] = useState('')
  const [entries, setEntries] = useState([])
  const [notice, setNotice] = useState('')
  const fileRef = useRef(null)

  const report = (e) => onError?.(e.message ?? String(e))

  const startSave = () => {
    setName(doc.name || '')
    setSaveOpen(true)
  }

  const save = async () => {
    try {
      const entry = await storageService.save(kind, name.trim() || 'Adsız', doc, doc.id)
      onLoad({ ...doc, id: entry.id, name: entry.name }, { keepView: true })
      setSaveOpen(false)
    } catch (e) {
      report(e)
    }
  }

  const startOpen = async () => {
    setEntries(await storageService.list(kind))
    setNotice('')
    setOpenOpen(true)
  }

  const open = async (id) => {
    const data = await storageService.load(kind, id)
    if (!data) return setNotice('Kayıt bulunamadı.')
    onLoad(data)
    setOpenOpen(false)
  }

  const remove = async (id) => {
    await storageService.remove(kind, id)
    setEntries(await storageService.list(kind))
  }

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const data = await storageService.importJSON(file, kind)
      onLoad({ ...data, id: undefined })
    } catch (e) {
      report(e)
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <IconButton icon={Save} label="Tarayıcıya kaydet" onClick={startSave} />
      <IconButton icon={FolderOpen} label="Kayıtlı otomatı aç" onClick={startOpen} />
      <IconButton icon={Download} label="JSON olarak indir" onClick={() => storageService.exportJSON(kind, doc)} />
      <IconButton icon={Upload} label="JSON dosyası yükle" onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />

      <Dialog
        open={saveOpen}
        title="Kaydet"
        onClose={() => setSaveOpen(false)}
        footer={
          <>
            <Button onClick={() => setSaveOpen(false)}>Vazgeç</Button>
            <Button variant="primary" icon={Save} onClick={save}>
              Kaydet
            </Button>
          </>
        }
      >
        <input
          className={`${inputClass} w-full`}
          value={name}
          placeholder="Örn. 11 içermeyen dizeler"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <p className="text-xs text-slate-500">Kayıtlar bu tarayıcıda saklanır. Başka cihaza taşımak için JSON olarak indirin.</p>
      </Dialog>

      <Dialog open={openOpen} title="Kayıtlı otomatlar" onClose={() => setOpenOpen(false)}>
        {notice && <Alert>{notice}</Alert>}
        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">Henüz kayıt yok.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5">
                <button
                  type="button"
                  onClick={() => open(e.id)}
                  className="flex-1 rounded-md px-2 py-1 text-left hover:bg-slate-50"
                >
                  <span className="block text-sm font-medium text-slate-700">{e.name}</span>
                  <span className="block text-xs text-slate-400">{new Date(e.updatedAt).toLocaleString('tr-TR')}</span>
                </button>
                <IconButton icon={Trash2} label="Sil" onClick={() => remove(e.id)} className="hover:text-red-600" />
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  )
}
