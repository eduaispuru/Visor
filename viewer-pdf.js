// Visor de PDF basado en pdf.js (componentes de pdf_viewer).
const BASE = new URL('./lib/pdfjs/', import.meta.url).href
let lib, V

async function load() {
  if (V) return
  lib = await import('./lib/pdfjs/build/pdf.min.mjs')
  globalThis.pdfjsLib = lib // pdf_viewer.mjs lo lee del global
  lib.GlobalWorkerOptions.workerSrc = BASE + 'build/pdf.worker.min.mjs'
  V = await import('./lib/pdfjs/web/pdf_viewer.mjs')
}

const mapOutline = items => (items || []).map(it => ({
  label: it.title,
  target: it.dest ?? null,
  url: it.url ?? null,
  subitems: mapOutline(it.items),
}))

export async function openPdf(file, { container, startPage, startScale, onPage, onScale, onFind }) {
  await load()
  const eventBus = new V.EventBus()
  const linkService = new V.PDFLinkService({ eventBus, externalLinkTarget: 2 /* BLANK */ })
  const findController = new V.PDFFindController({ eventBus, linkService })
  const viewer = new V.PDFViewer({ container, eventBus, linkService, findController })
  linkService.setViewer(viewer)

  const data = new Uint8Array(await file.arrayBuffer())
  const task = lib.getDocument({
    data,
    cMapUrl: BASE + 'cmaps/', cMapPacked: true,
    standardFontDataUrl: BASE + 'standard_fonts/',
    wasmUrl: BASE + 'wasm/',
    iccUrl: BASE + 'iccs/',
  })
  const doc = await task.promise
  viewer.setDocument(doc)
  linkService.setDocument(doc, null)

  eventBus.on('pagesinit', () => {
    viewer.currentScaleValue = startScale || 'page-width'
    if (startPage && startPage <= doc.numPages) viewer.currentPageNumber = startPage
    onPage?.(viewer.currentPageNumber, doc.numPages)
  })
  eventBus.on('pagechanging', e => onPage?.(e.pageNumber, doc.numPages))
  eventBus.on('scalechanging', e => onScale?.(e.scale, e.presetValue))
  eventBus.on('updatefindmatchescount', e => onFind?.(e.matchesCount))
  eventBus.on('updatefindcontrolstate', e => onFind?.(e.matchesCount, e.state))

  // Pellizco del touchpad / Ctrl+rueda: zoom del PDF en vez de la página entera
  const onWheel = e => {
    if (!e.ctrlKey) return
    e.preventDefault()
    if (e.deltaY < 0) viewer.increaseScale({ steps: 1 })
    else viewer.decreaseScale({ steps: 1 })
  }
  container.addEventListener('wheel', onWheel, { passive: false })

  let outline = []
  try { outline = mapOutline(await doc.getOutline()) } catch {}

  let title = ''
  try { title = (await doc.getMetadata())?.info?.Title || '' } catch {}

  let lastQuery = ''
  return {
    numPages: doc.numPages,
    outline,
    title,
    get page() { return viewer.currentPageNumber },
    get scaleValue() { return viewer.currentScaleValue },
    goTo(n) { viewer.currentPageNumber = Math.min(Math.max(1, n), doc.numPages) },
    next() { viewer.nextPage() },
    prev() { viewer.previousPage() },
    zoomIn() { viewer.increaseScale({ steps: 1 }) },
    zoomOut() { viewer.decreaseScale({ steps: 1 }) },
    setScale(v) { viewer.currentScaleValue = v },
    goToOutline(item) {
      if (item.target) linkService.goToDestination(item.target)
      else if (item.url) window.open(item.url, '_blank', 'noopener')
    },
    find(query, previous = false) {
      const type = query === lastQuery ? 'again' : ''
      lastQuery = query
      eventBus.dispatch('find', {
        source: null, type, query,
        caseSensitive: false, entireWord: false, highlightAll: true,
        findPrevious: previous, matchDiacritics: false,
      })
    },
    async destroy() {
      container.removeEventListener('wheel', onWheel)
      viewer.setDocument(null)
      linkService.setDocument(null)
      await task.destroy()
    },
  }
}
