// Tonos de lectura sobre la paleta de Gabinete.
// bg = papel, deep = papel-hondo, page = papel de lectura, fg = tinta.
// En PDF: los tonos claros tiñen la página (multiply); los oscuros invierten colores.
const PAPEL_ACC = { accent: '#e2562f', accentText: '#a5341a', accentSoft: '#f6cdb9', onAccent: '#1c1915', cobalto: '#1f4fa3' }
const NOCHE_ACC = { accent: '#ef6a43', accentText: '#f08a66', accentSoft: '#4a2418', onAccent: '#1c1915', cobalto: '#6f95e0' }

export const THEMES = {
  cream: { label: 'Papel', bg: '#f2ebdc', deep: '#e6dcc6', page: '#f2ebdc', fg: '#1c1915', muted: '#5e564a', line: '#cfc2a6', link: '#a5341a', tint: '#f4ecdc', ...PAPEL_ACC },
  light: { label: 'Blanco', bg: '#f6f2ea', deep: '#ebe4d6', page: '#ffffff', fg: '#1c1915', muted: '#5e564a', line: '#d6ccb8', link: null, ...PAPEL_ACC },
  sepia: { label: 'Sepia', bg: '#ece0c5', deep: '#e0d1b0', page: '#f1e5c9', fg: '#2a2016', muted: '#64553f', line: '#cbb994', link: '#8a4b0f', tint: '#f1e5c9', ...PAPEL_ACC },
  green: { label: 'Verde', bg: '#dfe8d6', deep: '#d0dcc4', page: '#e4eedc', fg: '#18241a', muted: '#4f5e4b', line: '#b8c9ab', link: '#25603a', tint: '#e4eedc', ...PAPEL_ACC },
  gray: { label: 'Gris', bg: '#34322e', deep: '#2a2825', page: '#45423d', fg: '#efe6d4', muted: '#b3a995', line: '#55504a', link: '#f08a66', invert: 0.78, ...NOCHE_ACC },
  dark: { label: 'Noche', bg: '#17140f', deep: '#241f18', page: '#1d1913', fg: '#efe6d4', muted: '#a99f8c', line: '#3b342a', link: '#f08a66', invert: 0.9, ...NOCHE_ACC },
  black: { label: 'Negro', bg: '#000000', deep: '#14120e', page: '#000000', fg: '#d9d0bf', muted: '#9a917f', line: '#2e2a24', link: '#f08a66', invert: 1, ...NOCHE_ACC },
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
