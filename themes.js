// Tonos de lectura sobre la paleta de Gabinete.
// bg = papel, deep = papel-hondo, page = papel de lectura, fg = tinta.
// En PDF: los tonos claros tiñen la página (multiply); los oscuros invierten colores.
const PAPEL_ACC = { accent: '#e2562f', accentText: '#a5341a', accentSoft: '#f6cdb9', onAccent: '#1c1915', cobalto: '#1f4fa3' }
const NOCHE_ACC = { accent: '#ef6a43', accentText: '#f08a66', accentSoft: '#4a2418', onAccent: '#1c1915', cobalto: '#6f95e0' }

export const THEMES = {
  cream: { label: 'Gris claro', bg: '#f3f3f1', deep: '#e6e6e2', page: '#f6f6f4', fg: '#1c1b19', muted: '#5c5b57', line: '#d2d2cd', link: '#a5341a', tint: '#f7f7f5', ...PAPEL_ACC },
  light: { label: 'Blanco', bg: '#f7f7f6', deep: '#ebebe8', page: '#ffffff', fg: '#1c1b19', muted: '#5c5b57', line: '#d8d8d3', link: null, ...PAPEL_ACC },
  sepia: { label: 'Sepia', bg: '#ece0c5', deep: '#e0d1b0', page: '#f1e5c9', fg: '#2a2016', muted: '#64553f', line: '#cbb994', link: '#8a4b0f', tint: '#f1e5c9', ...PAPEL_ACC },
  green: { label: 'Verde', bg: '#dfe8d6', deep: '#d0dcc4', page: '#e4eedc', fg: '#18241a', muted: '#4f5e4b', line: '#b8c9ab', link: '#25603a', tint: '#e4eedc', ...PAPEL_ACC },
  gray: { label: 'Grafito', bg: '#323232', deep: '#282828', page: '#424242', fg: '#ecebe8', muted: '#b0afaa', line: '#4f4f4f', link: '#f08a66', invert: 0.78, ...NOCHE_ACC },
  dark: { label: 'Noche', bg: '#161616', deep: '#212121', page: '#1b1b1b', fg: '#ecebe8', muted: '#a3a29d', line: '#363636', link: '#f08a66', invert: 0.9, ...NOCHE_ACC },
  black: { label: 'Negro', bg: '#000000', deep: '#141414', page: '#000000', fg: '#dcdbd7', muted: '#9a9994', line: '#2c2c2c', link: '#f08a66', invert: 1, ...NOCHE_ACC },
}

export const DEFAULT_THEME = 'cream'

export function applyThemeVars(name) {
  const t = THEMES[name] || THEMES[DEFAULT_THEME]
  const dark = !!t.invert
  const vars = {
    '--papel': t.bg, '--papel-hondo': t.deep, '--page': t.page, '--tinta': t.fg, '--tinta-suave': t.muted,
    '--linea': t.line, '--bermellon': t.accent, '--bermellon-hondo': t.accentText, '--bermellon-claro': t.accentSoft,
    '--sobre-bermellon': t.onAccent, '--cobalto': t.cobalto,
    '--pdf-tint': t.tint || 'transparent',
    '--pdf-filter': dark ? `invert(${t.invert}) hue-rotate(180deg)` : 'none',
    '--sombra-papel': dark
      ? '0 1px 0 rgba(0,0,0,0.4), 0 8px 16px -10px rgba(0,0,0,0.7)'
      : '0 1px 0 rgba(28,25,21,0.10), 0 8px 16px -10px rgba(28,25,21,0.35)',
  }
  const s = document.body.style
  for (const [k, v] of Object.entries(vars)) s.setProperty(k, v)
  document.body.dataset.theme = name
  document.body.dataset.mode = dark ? 'noche' : 'papel'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.deep)
}
