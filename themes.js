// Tonos de fondo. "page" = color del papel, "fg" = texto.
// En PDF: los tonos claros tiñen la página (multiply); los oscuros invierten colores.
// La barra superior y las pestañas se derivan de estos colores.
export const THEMES = {
  light: { label: 'Blanco', bg: '#f1f1f3', page: '#ffffff', fg: '#1f1f23', muted: '#6b6b74', border: '#dcdce0', link: null, accent: '#2563eb', accentFg: '#ffffff' },
  cream: { label: 'Crema', bg: '#ece6d6', page: '#faf5e8', fg: '#2b2620', muted: '#7a705e', border: '#ddd3bd', link: '#7c4a12', tint: '#faf5e8', accent: '#9a5b13', accentFg: '#ffffff' },
  sepia: { label: 'Sepia', bg: '#e3d7bd', page: '#f1e5c9', fg: '#3b2f1e', muted: '#7a6a52', border: '#d3c39f', link: '#8a4b0f', tint: '#f1e5c9', accent: '#8a4b0f', accentFg: '#ffffff' },
  green: { label: 'Verde', bg: '#d2e0ca', page: '#e2eedb', fg: '#1f2d1f', muted: '#5d6f58', border: '#c1d4b8', link: '#25603a', tint: '#e2eedb', accent: '#2f6f43', accentFg: '#ffffff' },
  gray: { label: 'Gris', bg: '#3a3d42', page: '#4a4d52', fg: '#e3e3e3', muted: '#b0b3b8', border: '#5d6066', link: '#a5c8ff', invert: 0.78, accent: '#8ab4f8', accentFg: '#10151f' },
  dark: { label: 'Oscuro', bg: '#0f0f12', page: '#1c1c20', fg: '#d4d4d8', muted: '#a1a1aa', border: '#2e2e34', link: '#93c5fd', invert: 0.9, accent: '#60a5fa', accentFg: '#0b1220' },
  black: { label: 'Negro', bg: '#000000', page: '#000000', fg: '#c8c8c8', muted: '#8a8a8a', border: '#262626', link: '#8ab4f8', invert: 1, accent: '#8ab4f8', accentFg: '#000000' },
}

export const DEFAULT_THEME = 'light'

// Mezcla dos colores hex: w = peso de b (0..1)
function mix(a, b, w) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * w).toString(16).padStart(2, '0')).join('')
}

export function applyThemeVars(name) {
  const t = THEMES[name] || THEMES[DEFAULT_THEME]
  const dark = !!t.invert
  const toolbar = t.page
  const chrome = dark && t.bg !== t.page ? t.bg : mix(t.bg, t.fg, dark ? 0.08 : 0.05)
  const vars = {
    '--bg': t.bg, '--page': t.page, '--page-fg': t.fg, '--fg': t.fg,
    '--muted': t.muted, '--border': t.border,
    '--chrome': chrome, '--toolbar': toolbar,
    '--field': mix(toolbar, t.fg, dark ? 0.1 : 0.06),
    '--hover': t.fg + (dark ? '1f' : '14'),
    '--hover-strong': t.fg + (dark ? '33' : '24'),
    '--accent': t.accent, '--accent-fg': t.accentFg,
    '--pdf-tint': t.tint || 'transparent',
    '--pdf-filter': dark ? `invert(${t.invert}) hue-rotate(180deg)` : 'none',
  }
  const s = document.body.style
  for (const [k, v] of Object.entries(vars)) s.setProperty(k, v)
  document.body.dataset.theme = name
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  // Color de la barra de la ventana (en apps instaladas)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chrome)
}
