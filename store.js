// Recientes (con el "handle" del archivo para poder reabrirlo) y preferencias.
const DB = 'visor', STORE = 'recent'

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn) {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode)
    const out = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(out?.result ?? out)
    t.onerror = () => reject(t.error)
  })
}

export const fileKey = file => `${file.name}|${file.size}`

export async function addRecent(key, name, handle) {
  try { await tx('readwrite', s => s.put({ key, name, handle, time: Date.now() })) }
  catch (e) { console.warn('No se pudo guardar en recientes', e) }
}

export async function listRecent() {
  try {
    const all = await tx('readonly', s => s.getAll())
    return (all || []).sort((a, b) => b.time - a.time).slice(0, 30)
  } catch { return [] }
}

export async function removeRecent(key) {
  try { await tx('readwrite', s => s.delete(key)) } catch {}
}

export function getPref(name, fallback) {
  try {
    const v = localStorage.getItem('pref:' + name)
    return v == null ? fallback : JSON.parse(v)
  } catch { return fallback }
}

export function setPref(name, value) {
  try { localStorage.setItem('pref:' + name, JSON.stringify(value)) } catch {}
}
