import { fileKey, addRecent, listRecent, removeRecent, getPref, setPref } from './store.js'

const $ = s => document.querySelector(s)
const BOOK_EXT = ['epub', 'mobi', 'azw', 'azw3', 'fb2', 'fbz', 'cbz']
const THEMES = ['light', 'sepia', 'dark']

let current = null      // { kind: 'pdf'|'book', api, key }
let tocCurrentLabel = null

// ---------- Utilidades de UI ----------
function show(id) {
  for (const s of ['home', 'pdf', 'book']) $('#' + s).hidden = s !== id
  const inViewer = id !== 'home'
  $('#btn-home').hidden = !inViewer
  $('#btn-toc').hidden = !inViewer
  $('#tools-pdf').hidden = id !== 'pdf'
  $('#tools-book').hidden = id !== 'book'
  if (!inViewer) { $('#sidebar').hidden = true; setTitle('Visor') }
}

function setTitle(t) { $('#title').textContent = t; document.title = t }

let msgTimer
function message(text, ms = 0) {
  const el = $('#msg')
  el.textContent = text
  el.hidden = !text
  clearTimeout(msgTimer)
  if (text && ms) msgTimer = setTimeout(() => (el.hidden = true), ms)
}

function applyTheme(theme) {
  document.body.dataset.theme = theme
  setPref('theme', theme)
  if (current?.kind === 'book') current.api.setStyle({ theme })
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
        current?.api.goToOutline(it)
        if (window.innerWidth < 1100) $('#sidebar').hidden = true
      }
      it._el = a
      li.append(a)
      if (it.subitems?.length) li.append(build(it.subitems))
      ul.append(li)
    }
    return ul
  }
  box.append(build(items))
}

function markTocByLabel(label) {
  if (!label || label === tocCurrentLabel) return
  tocCurrentLabel = label
  for (const a of $('#toc-list').querySelectorAll('a'))
    a.classList.toggle('current', a.textContent === label)
}

// ---------- Abrir archivos ----------
async function sniffPdf(file) {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  const text = new TextDecoder('latin1').decode(head)
  return text.includes('%PDF-')
}

async function closeCurrent() {
  if (!current) return
  const c = current
  current = null
  try { await c.api.destroy() } catch (e) { console.warn(e) }
  $('#book-host').replaceChildren()
}

async function openFile(file, handle) {
  await closeCurrent()
  tocCurrentLabel = null
  const key = fileKey(file)
  const ext = file.name.toLowerCase().split('.').pop()
  message('Abriendo…')
  try {
    if (ext === 'pdf' || (!BOOK_EXT.includes(ext) && await sniffPdf(file))) await openPdfFile(file, key)
    else await openBookFile(file, key)
    message('')
    setTitle(current.api.title || file.name)
    renderToc(current.api.outline)
    if (handle) await addRecent(key, file.name, handle)
  } catch (e) {
    console.error(e)
    await closeCurrent()
    show('home')
    message(errorText(e, file), 6000)
    renderRecent()
  }
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

async function openPdfFile(file, key) {
  show('pdf')
  const { openPdf } = await import('./viewer-pdf.js')
  const saved = getPref('pos:' + key, null)
  const api = await openPdf(file, {
    container: $('#pdf-container'),
    startPage: saved?.page,
    startScale: saved?.scale,
    onPage(page, total) {
      $('#pdf-page').value = page
      $('#pdf-page').max = total
      $('#pdf-total').textContent = '/ ' + total
      savePdfPos(key)
    },
    onScale(scale, preset) {
      const sel = $('#pdf-zoom')
      const match = [...sel.options].find(o => o.value === (preset || String(scale)))
      if (match) sel.value = match.value
      else {
        const c = sel.querySelector('[value="custom"]')
        c.textContent = Math.round(scale * 100) + '%'
        sel.value = 'custom'
      }
      savePdfPos(key)
    },
    onFind(count, state) {
      const el = $('#pdf-find-count')
      if (state === 1 /* NOT_FOUND */) el.textContent = 'Sin resultados'
      else if (count?.total) el.textContent = `${count.current} de ${count.total}`
      else el.textContent = ''
    },
  })
  current = { kind: 'pdf', api, key }
}

let pdfSaveTimer
function savePdfPos(key) {
  clearTimeout(pdfSaveTimer)
  pdfSaveTimer = setTimeout(() => {
    if (current?.kind === 'pdf' && current.key === key)
      setPref('pos:' + key, { page: current.api.page, scale: current.api.scaleValue })
  }, 400)
}

async function openBookFile(file, key) {
  show('book')
  const { openBook } = await import('./viewer-book.js')
  const style = {
    fontSize: getPref('fontSize', 100),
    theme: document.body.dataset.theme,
    flow: getPref('flow', 'paginated'),
  }
  $('#book-flow').textContent = style.flow === 'paginated' ? 'Páginas' : 'Scroll'
  const api = await openBook(file, {
    host: $('#book-host'),
    lastLocation: getPref('pos:' + key, null),
    style,
    onKey: handleKey,
    onRelocate(d) {
      const pct = Math.round((d.fraction || 0) * 100)
      $('#book-progress').value = d.fraction || 0
      $('#book-pct').textContent = pct + '%'
      if (d.cfi) setPref('pos:' + key, d.cfi)
      if (d.tocItem?.label) markTocByLabel(d.tocItem.label.trim())
    },
  })
  current = { kind: 'book', api, key, style }
}

async function openFromHandle(handle) {
  try {
    if (handle.queryPermission && (await handle.queryPermission({ mode: 'read' })) !== 'granted') {
      if ((await handle.requestPermission({ mode: 'read' })) !== 'granted') {
        message('Sin permiso para abrir el archivo.', 4000)
        return
      }
    }
    const file = await handle.getFile()
    await openFile(file, handle)
  } catch (e) {
    console.error(e)
    message('No se encontró el archivo (¿se movió o se borró?).', 5000)
  }
}

async function pickFile() {
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          { description: 'PDF', accept: { 'application/pdf': ['.pdf'] } },
          { description: 'Libros', accept: { 'application/octet-stream': BOOK_EXT.map(e => '.' + e) } },
        ],
      })
      await openFromHandle(handle)
    } catch (e) {
      if (e.name !== 'AbortError') { console.error(e); $('#file-input').click() }
    }
  } else $('#file-input').click()
}

// ---------- Recientes ----------
async function renderRecent() {
  const items = await listRecent()
  const ul = $('#recent')
  ul.replaceChildren()
  $('#recent-title').hidden = !items.length
  const fmt = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  for (const it of items) {
    const li = document.createElement('li')
    const b = document.createElement('button')
    b.className = 'open'
    b.textContent = it.name
    b.onclick = () => openFromHandle(it.handle)
    const when = document.createElement('span')
    when.className = 'when'
    when.textContent = fmt.format(it.time)
    const del = document.createElement('button')
    del.className = 'del'
    del.title = 'Quitar de recientes'
    del.textContent = '×'
    del.onclick = async () => { await removeRecent(it.key); renderRecent() }
    li.append(b, when, del)
    ul.append(li)
  }
}

// ---------- Teclado ----------
function handleKey(e) {
  if (e.target?.matches?.('input, select, textarea')) return
  if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); pickFile(); return }
  if (current?.kind === 'book') {
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); current.api.prev() }
    else if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); current.api.next() }
  } else if (current?.kind === 'pdf') {
    if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); $('#pdf-find').focus(); $('#pdf-find').select() }
    else if (e.ctrlKey && (e.key === '+' || e.key === '=')) { e.preventDefault(); current.api.zoomIn() }
    else if (e.ctrlKey && e.key === '-') { e.preventDefault(); current.api.zoomOut() }
  }
}

// ---------- Eventos ----------
$('#btn-open').onclick = pickFile
$('#btn-home').onclick = async () => { await closeCurrent(); show('home'); renderRecent() }
$('#btn-toc').onclick = () => ($('#sidebar').hidden = !$('#sidebar').hidden)
$('#btn-theme').onclick = () => {
  const t = THEMES[(THEMES.indexOf(document.body.dataset.theme) + 1) % THEMES.length]
  applyTheme(t)
}
$('#file-input').onchange = e => { const f = e.target.files[0]; if (f) openFile(f, null); e.target.value = '' }
document.addEventListener('keydown', handleKey)

// PDF
$('#pdf-prev').onclick = () => current?.api.prev()
$('#pdf-next').onclick = () => current?.api.next()
$('#pdf-page').onchange = e => current?.api.goTo(parseInt(e.target.value, 10) || 1)
$('#pdf-zoom-in').onclick = () => current?.api.zoomIn()
$('#pdf-zoom-out').onclick = () => current?.api.zoomOut()
$('#pdf-zoom').onchange = e => { if (e.target.value !== 'custom') current?.api.setScale(e.target.value) }
$('#pdf-find').onkeydown = e => {
  if (e.key === 'Enter' && e.target.value) current?.api.find(e.target.value, e.shiftKey)
  if (e.key === 'Escape') { e.target.value = ''; $('#pdf-find-count').textContent = ''; current?.api.find('') }
}

// Libro
$('#book-prev').onclick = () => current?.api.prev()
$('#book-next').onclick = () => current?.api.next()
$('#book-progress').oninput = e => current?.api.goToFraction(parseFloat(e.target.value))
const setFont = d => {
  const size = Math.min(250, Math.max(60, getPref('fontSize', 100) + d))
  setPref('fontSize', size)
  current?.api.setStyle({ fontSize: size })
}
$('#book-font-down').onclick = () => setFont(-10)
$('#book-font-up').onclick = () => setFont(10)
$('#book-flow').onclick = () => {
  const flow = getPref('flow', 'paginated') === 'paginated' ? 'scrolled' : 'paginated'
  setPref('flow', flow)
  $('#book-flow').textContent = flow === 'paginated' ? 'Páginas' : 'Scroll'
  current?.api.setStyle({ flow })
}

// Arrastrar y soltar
const drop = $('#drop')
document.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over') })
document.addEventListener('dragleave', e => { if (!e.relatedTarget) drop.classList.remove('over') })
document.addEventListener('drop', async e => {
  e.preventDefault()
  drop.classList.remove('over')
  const item = [...e.dataTransfer.items].find(i => i.kind === 'file')
  if (!item) return
  const handle = item.getAsFileSystemHandle ? await item.getAsFileSystemHandle() : null
  if (handle?.kind === 'file') openFromHandle(handle)
  else { const f = item.getAsFile(); if (f) openFile(f, null) }
})

// ---------- Abrir desde la app Archivos (File Handling API) ----------
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(params => {
    if (params.files?.length) openFromHandle(params.files[0])
  })
}

// ---------- Inicio ----------
applyTheme(getPref('theme', 'light'))
show('home')
renderRecent()

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW', e))
}
