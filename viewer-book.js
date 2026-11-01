// Lector de libros (EPUB, MOBI, AZW3, FB2, CBZ) basado en foliate-js.
import { makeBook } from './lib/foliate/view.js'
import { THEMES } from './themes.js'

const getCSS = ({ fontSize, theme }) => {
  const t = THEMES[theme]
  const colored = t && theme !== 'light'
  return `
    @namespace epub "http://www.idpf.org/2007/ops";
    html { font-size: ${fontSize}% !important; }
    p, li, blockquote, dd {
      line-height: 1.5;
      text-align: justify;
      hyphens: auto;
      widows: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    pre { white-space: pre-wrap !important; }
    aside[epub|type~="footnote"], aside[epub|type~="endnote"],
    aside[epub|type~="note"], aside[epub|type~="rearnote"] { display: none; }
    ${colored ? `
    html, body { background: ${t.page} !important; color: ${t.fg} !important; }
    body *:not(img):not(svg):not(svg *) { color: inherit !important; background-color: transparent !important; }
    a:link, a:visited, a:link *, a:visited * { color: ${t.link} !important; }
    ${t.invert ? `img { filter: brightness(.85); }` : ''}
    ` : ''}
  `
}

async function coverToJpeg(blob, width) {
  if (!blob) return null
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, width / bmp.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.82))
}

// Tapa del libro sin abrir el lector (para la biblioteca)
export async function bookThumb(file, width = 300) {
  const book = await makeBook(file)
  try { return await coverToJpeg(await book.getCover?.(), width) }
  finally { book.destroy?.() }
}

const formatLang = x => !x ? '' : typeof x === 'string' ? x : x[Object.keys(x)[0]]

export async function openBook(file, { host, lastLocation, style, onRelocate, onKey }) {
  const view = document.createElement('foliate-view')
  host.append(view)
  await view.open(file)
  const { book } = view

  // Si falla un recurso interno, que no rompa todo el libro
  book.transformTarget?.addEventListener('data', ({ detail }) => {
    detail.data = Promise.resolve(detail.data).catch(e => {
      console.error(`No se pudo cargar ${detail.name}`, e)
      return ''
    })
  })

  view.addEventListener('relocate', e => onRelocate?.(e.detail))
  view.addEventListener('load', e => e.detail.doc.addEventListener('keydown', onKey))

  let current = { ...style }
  view.renderer.setStyles?.(getCSS(current))
  view.renderer.setAttribute('flow', current.flow || 'paginated')
  // Una sola columna centrada, con márgenes a los costados (no a todo el ancho)
  view.renderer.setAttribute('max-column-count', '1')
  view.renderer.setAttribute('max-inline-size', '760px')

  try {
    await view.init({ lastLocation })
  } catch (e) {
    console.warn('No se pudo restaurar la posición', e)
    await view.init({})
  }

  const mapToc = items => (items || []).map(it => ({
    label: (it.label || '').trim(), target: it.href, subitems: mapToc(it.subitems),
  }))

  return {
    title: formatLang(book.metadata?.title),
    outline: mapToc(book.toc),
    next: () => view.goRight(),
    prev: () => view.goLeft(),
    goToFraction: f => view.goToFraction(f),
    // Miniatura de la tapa (para la biblioteca)
    async thumbnail(width = 300) { return coverToJpeg(await book.getCover?.(), width) },
    goToOutline: item => item.target && view.goTo(item.target).catch(console.error),
    setStyle(patch) {
      current = { ...current, ...patch }
      view.renderer.setStyles?.(getCSS(current))
      if (patch.flow) view.renderer.setAttribute('flow', patch.flow)
    },
    destroy() {
      view.close?.()
      view.remove()
    },
  }
}
