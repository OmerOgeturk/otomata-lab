const PREFIX = 'otomata-lab:'
const FORMAT = 'otomata-lab'
const VERSION = 1

const localStorageAdapter = {
  async read(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  async write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      throw new Error('Tarayıcı depolamasına yazılamadı (alan dolu veya engellenmiş olabilir).')
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      /* depolama erişilemezse yapılacak bir şey yok */
    }
  },
}

let adapter = localStorageAdapter

export function setStorageAdapter(next) {
  adapter = next
}

const indexKey = (kind) => `${kind}:index`
const itemKey = (kind, id) => `${kind}:item:${id}`
const draftKey = (kind) => `${kind}:draft`

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function wrap(kind, doc) {
  return { format: FORMAT, version: VERSION, kind, ...doc }
}

export const storageService = {
  async list(kind) {
    const index = (await adapter.read(indexKey(kind))) ?? []
    return [...index].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  async save(kind, name, doc, id = newId()) {
    const entry = { id, name, updatedAt: new Date().toISOString() }
    await adapter.write(itemKey(kind, id), wrap(kind, { ...doc, name }))
    const index = ((await adapter.read(indexKey(kind))) ?? []).filter((e) => e.id !== id)
    await adapter.write(indexKey(kind), [...index, entry])
    return entry
  },

  async load(kind, id) {
    return adapter.read(itemKey(kind, id))
  },

  async remove(kind, id) {
    await adapter.remove(itemKey(kind, id))
    const index = ((await adapter.read(indexKey(kind))) ?? []).filter((e) => e.id !== id)
    await adapter.write(indexKey(kind), index)
  },

  async saveDraft(kind, doc) {
    await adapter.write(draftKey(kind), wrap(kind, doc))
  },

  async loadDraft(kind) {
    return adapter.read(draftKey(kind))
  },

  exportJSON(kind, doc, filename) {
    const blob = new Blob([JSON.stringify(wrap(kind, doc), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(filename || doc.name || kind).replace(/[\\/:*?"<>|]+/g, '_')}.json`
    link.click()
    URL.revokeObjectURL(url)
  },

  async importJSON(file, kind) {
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      throw new Error('Dosya geçerli bir JSON değil.')
    }
    if (data?.format === FORMAT) {
      if (data.kind !== kind) throw new Error(`Bu dosya başka bir modüle ait (${data.kind}).`)
      return data
    }
    if (data?.states && data?.transitions) return { kind, name: file.name.replace(/\.json$/i, ''), automaton: data }
    throw new Error('Dosya tanınan bir otomat biçiminde değil.')
  },
}
