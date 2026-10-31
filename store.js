// Recientes (con el "handle" del archivo para poder reabrirlo) y preferencias.
const DB = 'visor', STORE = 'recent', KV = 'kv'

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'key' })
      if (!d.objectStoreNames.contains(KV)) d.createObjectStore(KV)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx(mode, fn, store = STORE) {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode)
    const out = fn(t.objectStore(store))
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

// Pestañas abiertas, para reabrirlas después de actualizar la app
export async function saveSession(session) {
  try { await tx('readwrite', s => s.put(session, 'session'), KV) } catch (e) { console.warn(e) }
}

export async function takeSession() {
  try {
    const session = await tx('readonly', s => s.get('session'), KV)
    await tx('readwrite', s => s.delete('session'), KV)
    return session || null
  } catch { return null }
}

// Última sesión (pestañas abiertas), para ofrecer restaurarla al abrir la app
export async function saveLastSession(session) {
  try { await tx('readwrite', s => s.put(session, 'last'), KV) } catch (e) { console.warn(e) }
}

export async function getLastSession() {
  try { return (await tx('readonly', s => s.get('last'), KV)) || null } catch { return null }
}
