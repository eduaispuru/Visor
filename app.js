import { fileKey, addRecent, listRecent, removeRecent, getPref, setPref, saveSession, takeSession, saveLastSession, getLastSession } from './store.js'
import { THEMES, DEFAULT_THEME, applyThemeVars } from './themes.js'
import { coverSVG } from './cover.js'

const $ = s => document.querySelector(s)
const BOOK_EXT = ['epub', 'mobi', 'azw', 'azw3', 'fb2', 'fbz', 'cbz']

// Cada pestaña: { id, kind: 'pdf'|'book', key, name, title, api, section, tab, outline, state }
const docs = []
let active = null // pestaña activa (null = Inicio)
let nextId = 1

// ---------- Utilidades ----------
let msgTimer
function message(text, ms = 0) {
  const el = $('#msg')
  el.textContent = text
  el.hidden = !text
  clearTimeout(msgTimer)
  if (text && ms) msgTimer = setTimeout(() => (el.hidden = true), ms)
}

function setTitle(t) { document.title = t }

function applyTheme(theme) {
  if (!THEMES[theme]) theme = DEFAULT_THEME
  applyThemeVars(theme)
  $('#theme-select').value = theme
  setPref('theme', theme)
  for (const d of docs) if (d.kind === 'book') d.api?.setStyle({ theme })
}

// ---------- Pestañas ----------
// ---------- Última sesión ----------
let canPersist = false   // no guardar hasta haber leído la sesión anterior
let prevSession = null   // sesión de la vez anterior (para el botón "Restaurar")
let persistTimer
function persistSession() {
  if (!canPersist) return
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    const open = docs.filter(d => d.handle && d.api)
    saveLastSession({
      handles: open.map(d => d.handle),
      names: open.map(d => d.title || d.name),
      active: open.indexOf(active),
      time: Date.now(),
    })
  }, 300)
}

function activate(doc) {
  active = doc
  persistSession()
  for (const d of docs) {
    d.section.classList.toggle('inactive', d !== doc)
    d.tab.classList.toggle('active', d === doc)
  }
  $('#tab-home').classList.toggle('active', !doc)
  $('#home').hidden = !!doc
  $('#btn-toc').hidden = !doc
  $('#tools-pdf').hidden = doc?.kind !== 'pdf'
  $('#tools-book').hidden = doc?.kind !== 'book'
  $('#sidebar').hidden = true

  if (!doc) { setTitle('Visor'); renderRecent(); return }
  setTitle(doc.title)
  renderToc(doc.outline)
  markToc(doc.state.tocLabel)
  if (doc.kind === 'pdf') refreshPdfTools(doc)
  doc.tab.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function createTab(doc) {
  const tab = document.createElement('div')
  tab.className = 'tab'
  tab.draggable = true
  tab.title = doc.name
  const name = document.createElement('span')
  name.className = 'name'
  name.textContent = doc.name
  const close = document.createElement('button')
  close.className = 'close'
  close.title = 'Cerrar pestaña'
  close.innerHTML = '<svg class="ic"><use href="#i-x"/></svg>'
  close.onclick = e => { e.stopPropagation(); closeDoc(doc) }
  tab.append(name, close)
  tab.onclick = () => activate(doc)
  tab.onauxclick = e => { if (e.button === 1) closeDoc(doc) } // clic con la rueda
  // Reordenar arrastrando
  tab.ondragstart = e => { e.dataTransfer.setData('text/x-visor-tab', String(doc.id)); tab.classList.add('dragging') }
  tab.ondragend = () => tab.classList.remove('dragging')
  tab.ondragover = e => { if (e.dataTransfer.types.includes('text/x-visor-tab')) e.preventDefault() }
  tab.ondrop = e => {
    const id = Number(e.dataTransfer.getData('text/x-visor-tab'))
    if (!id) return
    e.preventDefault(); e.stopPropagation()
    const moved = docs.find(d => d.id === id)
    if (!moved || moved === doc) return
    const from = docs.indexOf(moved)
    docs.splice(from, 1)
    const to = docs.indexOf(doc) + (from <= docs.indexOf(doc) ? 1 : 0)
    docs.splice(to, 0, moved)
    $('#tab-list').replaceChildren(...docs.map(d => d.tab))
    persistSession()
  }
  doc.tab = tab
  doc.setName = n => { name.textContent = n; tab.title = n }
  $('#tab-list').append(tab)
}

async function closeDoc(doc) {
  const i = docs.indexOf(doc)
  if (i < 0) return
  docs.splice(i, 1)
  persistSession()
  doc.flush?.()
  doc.tab.remove()
  doc.section.remove()
  try { await doc.api?.destroy() } catch (e) { console.warn(e) }
  if (active === doc) activate(docs[i] || docs[i - 1] || null)
}

// ---------- Índice ----------
function renderToc(items) {
  const box = $('#toc-list')
  box.replaceChildren()
  if (!items?.length) {
    box.innerHTML = '<div class="empty">Este archivo no tiene índice.</div>'
    return
  }
  const build = list => {
    const ul = document.createElement('ul')
    for (const it of list) {
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = '#'
      a.textContent = it.label || '(sin título)'
      a.onclick = e => {
        e.preventDefault()
        active?.api.goToOutline(it)
        if (window.innerWidth < 1100) $('#sidebar').hidden = true
      }
      li.append(a)
      if (it.subitems?.length) li.append(build(it.subitems))
      ul.append(li)
    }
    return ul
  }
  box.append(build(items))
}

function markToc(label) {
  for (const a of $('#toc-list').querySelectorAll('a'))
    a.classList.toggle('current', !!label && a.textContent === label)
}

// ---------- Abrir archivos ----------
async function sniffPdf(file) {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  return new TextDecoder('latin1').decode(head).includes('%PDF-')
}

function errorText(e, file) {
  const n = e?.name || ''
  if (n === 'PasswordException') return 'El PDF está protegido con contraseña.'
  if (n === 'InvalidPDFException') return 'El PDF está dañado o no es válido.'
  if (n === 'UnsupportedTypeError' || /not supported/i.test(e?.message))
    return `No se reconoce el formato de "${file.name}".`
  if (/DRM|encrypt/i.test(e?.message)) return 'Este libro tiene DRM y no se puede abrir.'
  return `No se pudo abrir "${file.name}". (${e?.message || e})`
}

async function openFile(file, handle) {
  const key = fileKey(file)
  const existing = docs.find(d => d.key === key)
  if (existing) { activate(existing); return }

  const ext = file.name.toLowerCase().split('.').pop()
  const kind = ext === 'pdf' || (!BOOK_EXT.includes(ext) && await sniffPdf(file)) ? 'pdf' : 'book'
  const section = $(kind === 'pdf' ? '#tpl-pdf' : '#tpl-book').content.firstElementChild.cloneNode(true)
  $('main').insertBefore(section, $('#msg'))
  const doc = { id: nextId++, kind, key, name: file.name, title: file.name, section, outline: [], state: {}, handle }
  docs.push(doc)
  createTab(doc)
  activate(doc)
  message('Abriendo…')
  try {
    if (kind === 'pdf') await openPdfDoc(doc, file)
    else await openBookDoc(doc, file)
    message('')
    if (!docs.includes(doc)) { doc.api?.destroy(); return } // se cerró mientras cargaba
    doc.title = doc.api.title || file.name
    doc.outline = doc.api.outline
    doc.setName(doc.title)
    if (active === doc) activate(doc)
    persistSession()
    if (handle) await addRecent(key, file.name, handle)
  } catch (e) {
    console.error(e)
    message(errorText(e, file), 6000)
    await closeDoc(doc)
  }
}

// ----- PDF -----
function refreshPdfTools(doc) {
  const s = doc.state
  $('#pdf-page').value = s.page || 1
  $('#pdf-page').max = s.total || 1
  $('#pdf-total').textContent = '/ ' + (s.total || 0)
  const sel = $('#pdf-zoom')
  if (s.zoomValue) {
    if (s.zoomValue === 'custom') sel.querySelector('[value="custom"]').textContent = s.zoomLabel
    sel.value = s.zoomValue
  }
  $('#pdf-find').value = s.findQuery || ''
  $('#pdf-find-count').textContent = s.findText || ''
}

async function openPdfDoc(doc, file) {
  const { openPdf } = await import('./viewer-pdf.js')
  const saved = getPref('pos:' + doc.key, null)
  const s = doc.state
  // Guarda página, zoom y posición dentro de la página (con una pequeña demora para no escribir en cada scroll)
  let saveTimer, ready = false
  const write = () => {
    clearTimeout(saveTimer); saveTimer = null
    const loc = doc.api?.location
    if (!ready || !loc) return
    setPref('pos:' + doc.key, { page: loc.pageNumber, top: loc.top, left: loc.left, scale: doc.api.scaleValue })
  }
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(write, 500) }
  doc.flush = () => { if (saveTimer) write() }
  doc.api = await openPdf(file, {
    container: doc.section.querySelector('.pdf-container'),
    start: saved,
    onLocation: save,
    onPage(page, total) {
      s.page = page; s.total = total
      setPref('prog:' + doc.key, total > 1 ? (page - 1) / (total - 1) : 1)
      if (active === doc) refreshPdfTools(doc)
      save()
    },
    onScale(scale, preset) {
      const sel = $('#pdf-zoom')
      const v = preset || String(scale)
      if ([...sel.options].some(o => o.value === v && v !== 'custom')) s.zoomValue = v
      else { s.zoomValue = 'custom'; s.zoomLabel = Math.round(scale * 100) + '%' }
      if (active === doc) refreshPdfTools(doc)
      save()
    },
    onFind(count, state) {
      if (state === 1 /* NOT_FOUND */) s.findText = 'Sin resultados'
      else if (count?.total) s.findText = `${count.current} de ${count.total}`
      else s.findText = ''
      if (active === doc) $('#pdf-find-count').textContent = s.findText
    },
  })
  setTimeout(() => { ready = true }, 300)
}

// ----- Libros -----
async function openBookDoc(doc, file) {
  const { openBook } = await import('./viewer-book.js')
  const sec = doc.section
  const flow = getPref('flow', 'paginated')
  showFlow(flow)
  doc.api = await openBook(file, {
    host: sec.querySelector('.book-host'),
    lastLocation: getPref('pos:' + doc.key, null),
    style: { fontSize: getPref('fontSize', 100), theme: document.body.dataset.theme, flow },
    onKey: handleKey,
    onRelocate(d) {
      sec.querySelector('.progress').value = d.fraction || 0
      sec.querySelector('.pct').textContent = Math.round((d.fraction || 0) * 100) + '%'
      if (d.cfi) setPref('pos:' + doc.key, d.cfi)
      if (d.fraction != null) setPref('prog:' + doc.key, d.fraction)
      const label = d.tocItem?.label?.trim()
      if (label) { doc.state.tocLabel = label; if (active === doc) markToc(label) }
    },
  })
  sec.querySelector('.prev').onclick = () => doc.api.prev()
  sec.querySelector('.next').onclick = () => doc.api.next()
  sec.querySelector('.progress').oninput = e => doc.api.goToFraction(parseFloat(e.target.value))
}

// ----- Desde handles (Archivos, selector, recientes) -----
async function openFromHandle(handle) {
  try {
    if (handle.queryPermission && (await handle.queryPermission({ mode: 'read' })) !== 'granted') {
      if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') {
        message('Sin permiso para abrir el archivo.', 4000)
        return
      }
    }
    await openFile(await handle.getFile(), handle)
  } catch (e) {
    console.error(e)
    message('No se encontró el archivo (¿se movió o se borró?).', 5000)
  }
}

async function pickFiles() {
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple: true,
        types: [
          { description: 'PDF', accept: { 'application/pdf': ['.pdf'] } },
          { description: 'Libros', accept: { 'application/octet-stream': BOOK_EXT.map(e => '.' + e) } },
        ],
      })
      for (const h of handles) await openFromHandle(h)
    } catch (e) {
      if (e.name !== 'AbortError') { console.error(e); $('#file-input').click() }
    }
  } else $('#file-input').click()
}

// ---------- Recientes ----------
function renderRestore() {
  const box = $('#restore')
  const n = prevSession?.handles?.length || 0
  box.hidden = !n
  if (!n) return
  $('#restore-count').textContent = n === 1 ? '1 pestaña' : `${n} pestañas`
  $('#restore-names').textContent = (prevSession.names || []).join(' · ')
}

async function restoreLast() {
  const session = prevSession
  prevSession = null
  renderRestore()
  if (!session) return
  const opened = []
  for (const h of session.handles) {
    let doc = null
    try {
      // Pedir permiso si hace falta (el clic en "Restaurar" lo habilita)
      if (h.queryPermission && (await h.queryPermission({ mode: 'read' })) !== 'granted'
        && (await h.requestPermission({ mode: 'read' })) !== 'granted') { opened.push(null); continue }
      const file = await h.getFile()
      await openFile(file, h)
      doc = docs.find(d => d.key === fileKey(file)) || null
    } catch (e) { console.warn('No se pudo reabrir', e) }
    opened.push(doc)
  }
  const target = opened[session.active] || opened.find(Boolean)
  if (target) activate(target)
  if (opened.some(d => !d)) message('Algunos archivos no se pudieron reabrir (¿se movieron o borraron?).', 5000)
}

async function renderRecent() {
  renderRestore()
  const items = await listRecent()
  const box = $('#recent')
  box.replaceChildren()
  $('#recent-title').hidden = !items.length
  $('#empty').hidden = !!items.length
  const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
  let reading = 0
  for (const it of items) {
    const prog = getPref('prog:' + it.key, null)
    if (prog != null && prog > 0.01 && prog < 0.99) reading++
    const ext = (it.name.split('.').pop() || '').toUpperCase()
    const title = it.name.replace(/\.[^.]+$/, '')
    const card = document.createElement('button')
    card.className = 'card'
    card.title = it.name
    card.innerHTML = `
      <div class="cv">${coverSVG(it.name)}</div>
      <div class="meta"><span>${ext}</span><span>${prog == null ? fmt.format(it.time) : String(Math.round(prog * 100)).padStart(2, '0') + '%'}</span></div>
      <div class="ttl"></div>
      <div class="pg"><div style="width:${Math.round((prog || 0) * 100)}%"></div></div>
      <span class="del" title="Quitar de recientes"><svg class="ic"><use href="#i-x"/></svg></span>`
    card.querySelector('.ttl').textContent = title
    card.onclick = e => {
      if (e.target.closest('.del')) { removeRecent(it.key).then(renderRecent); return }
      openFromHandle(it.handle)
    }
    box.append(card)
  }
  const n = items.length
  $('#lib-stats').innerHTML = n
    ? `${n} ${n === 1 ? 'documento' : 'documentos'} · ${reading} en lectura<br>Último: <span></span>`
    : 'Sin documentos todavía.'
  if (n) $('#lib-stats span').textContent = items[0].name.replace(/\.[^.]+$/, '')
}

// ---------- Teclado ----------
function handleKey(e) {
  if (e.target?.matches?.('input, select, textarea')) return
  const k = e.key.toLowerCase()
  if (e.ctrlKey && k === 'o') { e.preventDefault(); pickFiles(); return }
  // Cambiar de pestaña: Ctrl+RePág / Ctrl+AvPág (como Chrome)
  if (e.ctrlKey && (e.key === 'PageUp' || e.key === 'PageDown')) {
    e.preventDefault()
    const list = [null, ...docs]
    const i = list.indexOf(active)
    const n = list.length
    activate(list[(i + (e.key === 'PageDown' ? 1 : -1) + n) % n])
    return
  }
  if (active?.kind === 'book') {
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); active.api?.prev() }
    else if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); active.api?.next() }
  } else if (active?.kind === 'pdf') {
    if (e.ctrlKey && k === 'f') { e.preventDefault(); $('#pdf-find').focus(); $('#pdf-find').select() }
    else if (e.ctrlKey && (e.key === '+' || e.key === '=')) { e.preventDefault(); active.api?.zoomIn() }
    else if (e.ctrlKey && e.key === '-') { e.preventDefault(); active.api?.zoomOut() }
  }
}

// ---------- Eventos ----------
$('#btn-open').onclick = pickFiles
$('#tab-add').onclick = pickFiles
$('#tab-home').onclick = () => activate(null)
$('#btn-toc').onclick = () => ($('#sidebar').hidden = !$('#sidebar').hidden)
for (const [value, t] of Object.entries(THEMES)) $('#theme-select').add(new Option(t.label, value))
$('#theme-select').onchange = e => applyTheme(e.target.value)
$('#file-input').onchange = async e => {
  for (const f of [...e.target.files]) await openFile(f, null)
  e.target.value = ''
}
document.addEventListener('keydown', handleKey)
// Guardar posiciones pendientes al minimizar o cerrar la app
const flushAll = () => docs.forEach(d => d.flush?.())
window.addEventListener('pagehide', flushAll)
document.addEventListener('visibilitychange', () => { if (document.hidden) flushAll() })

// PDF (barra superior, actúa sobre la pestaña activa)
const pdf = () => (active?.kind === 'pdf' ? active.api : null)
$('#pdf-prev').onclick = () => pdf()?.prev()
$('#pdf-next').onclick = () => pdf()?.next()
$('#pdf-page').onchange = e => pdf()?.goTo(parseInt(e.target.value, 10) || 1)
$('#pdf-zoom-in').onclick = () => pdf()?.zoomIn()
$('#pdf-zoom-out').onclick = () => pdf()?.zoomOut()
$('#pdf-zoom').onchange = e => { if (e.target.value !== 'custom') pdf()?.setScale(e.target.value) }
$('#pdf-find').onkeydown = e => {
  if (!active || active.kind !== 'pdf') return
  if (e.key === 'Enter' && e.target.value) {
    active.state.findQuery = e.target.value
    pdf()?.find(e.target.value, e.shiftKey)
  }
  if (e.key === 'Escape') {
    e.target.value = ''
    active.state.findQuery = ''
    active.state.findText = ''
    $('#pdf-find-count').textContent = ''
    pdf()?.find('')
  }
}

// Libros (preferencias globales: se aplican a todas las pestañas de libros)
function showFlow(flow) {
  const b = $('#book-flow')
  b.querySelector('use').setAttribute('href', flow === 'paginated' ? '#i-pages' : '#i-scroll')
  b.title = flow === 'paginated' ? 'Modo páginas (clic para desplazamiento continuo)' : 'Modo desplazamiento (clic para páginas)'
}
const books = () => docs.filter(d => d.kind === 'book' && d.api)
const setFont = d => {
  const size = Math.min(250, Math.max(60, getPref('fontSize', 100) + d))
  setPref('fontSize', size)
  for (const b of books()) b.api.setStyle({ fontSize: size })
}
$('#book-font-down').onclick = () => setFont(-10)
$('#book-font-up').onclick = () => setFont(10)
$('#book-flow').onclick = () => {
  const flow = getPref('flow', 'paginated') === 'paginated' ? 'scrolled' : 'paginated'
  setPref('flow', flow)
  showFlow(flow)
  for (const b of books()) b.api.setStyle({ flow })
}

// Arrastrar y soltar archivos (uno o varios)
const drop = $('#drop')
const isFileDrag = e => e.dataTransfer?.types?.includes('Files')
document.addEventListener('dragover', e => { if (isFileDrag(e)) { e.preventDefault(); drop.classList.add('over') } })
document.addEventListener('dragleave', e => { if (!e.relatedTarget) drop.classList.remove('over') })
document.addEventListener('drop', async e => {
  if (!isFileDrag(e)) return
  e.preventDefault()
  drop.classList.remove('over')
  const items = [...e.dataTransfer.items].filter(i => i.kind === 'file')
  // Hay que pedir todos los handles antes del primer await
  const pending = items.map(i => i.getAsFileSystemHandle ? i.getAsFileSystemHandle() : Promise.resolve(null))
  const files = items.map(i => i.getAsFile())
  for (let j = 0; j < items.length; j++) {
    const h = await pending[j].catch(() => null)
    if (h?.kind === 'file') await openFromHandle(h)
    else if (files[j]) await openFile(files[j], null)
  }
})

// ---------- Abrir desde la app Archivos (File Handling API) ----------
// Con launch_handler "focus-existing", los archivos llegan a la ventana ya abierta
// y se agregan como pestañas nuevas.
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async params => {
    for (const h of params.files || []) await openFromHandle(h)
  })
}

// ---------- Actualizaciones ----------
// Busca una versión nueva al abrir la app, al volver a ella y cada 30 minutos.
// Cuando llega, muestra un aviso; al tocar "Actualizar" recarga y reabre las pestañas.
function watchUpdates() {
  if (!('serviceWorker' in navigator)) return
  const hadController = !!navigator.serviceWorker.controller
  const showBar = () => { if (hadController) $('#update-bar').hidden = false }
  // Versión visible en Inicio (sale del nombre de la caché que arma sw.js)
  const showVersion = () => caches.keys().then(keys => {
    const v = keys.map(k => k.match(/^visor-v(\d+)$/)).filter(Boolean).map(m => +m[1]).sort((x, y) => y - x)[0]
    if (v) $('#app-version').textContent = 'Versión ' + v
  }).catch(() => {})
  showVersion()
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
    // Si ya se está bajando o esperando una versión nueva, avisar
    if (reg.installing || reg.waiting) showBar()
    reg.addEventListener('updatefound', showBar)
    let last = 0
    const check = () => {
      if (Date.now() - last < 60 * 1000) return // como mucho una vez por minuto
      last = Date.now()
      reg.update().catch(() => {})
    }
    check()
    // En una ventana de app, cambiar a otra ventana no la "oculta": por eso también al enfocarla
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check() })
    window.addEventListener('focus', check)
    setInterval(check, 5 * 60 * 1000)
  }).catch(e => console.warn('SW', e))
  navigator.serviceWorker.addEventListener('controllerchange', () => { showBar(); showVersion() })
  $('#update-btn').onclick = async () => {
    const open = docs.filter(d => d.handle)
    await saveSession({ handles: open.map(d => d.handle), active: open.indexOf(active) })
    location.reload()
  }
  $('#update-later').onclick = () => ($('#update-bar').hidden = true)
}

async function restoreSession() {
  const session = await takeSession()
  if (!session?.handles?.length) return false
  const opened = []
  for (const h of session.handles) {
    let doc = null
    try {
      // Solo si el permiso sigue vigente (no se puede pedir sin un clic)
      if (!h.queryPermission || (await h.queryPermission({ mode: 'read' })) === 'granted') {
        const file = await h.getFile()
        await openFile(file, h)
        doc = docs.find(d => d.key === fileKey(file)) || null
      }
    } catch (e) { console.warn('No se pudo reabrir', e) }
    opened.push(doc)
  }
  const target = opened[session.active]
  if (target) activate(target)
}

// ---------- Inicio ----------
applyTheme(getPref('theme', DEFAULT_THEME))
$('#restore-btn').onclick = restoreLast
activate(null)
;(async () => {
  prevSession = await getLastSession()
  canPersist = true
  // Si venimos de "Actualizar", las pestañas se reabren solas y no hace falta ofrecerlo.
  // (Abrir un archivo desde la app Archivos NO cancela la opción de restaurar.)
  if (await restoreSession()) prevSession = null
  renderRestore()
})()
watchUpdates()
