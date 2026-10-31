// Tonos de fondo. "bg" = papel de la interfaz, "page" = papel de lectura, "fg" = tinta.
// En PDF: los tonos claros tiñen la página (multiply); los oscuros invierten colores.
const RED = '#d9482b', RED_DARK = '#ff6a3d'
export const THEMES = {
  light: { label: 'Blanco', bg: '#f4f3ef', page: '#ffffff', fg: '#1b1a17', muted: '#6b675f', link: null, accent: RED, accentFg: '#ffffff' },
  cream: { label: 'Crema', bg: '#efe9dc', page: '#faf5e8', fg: '#1b1a17', muted: '#6e675a', link: '#7c4a12', tint: '#faf5e8', accent: RED, accentFg: '#ffffff' },
  sepia: { label: 'Sepia', bg: '#e6dbc2', page: '#f1e5c9', fg: '#2a2016', muted: '#6f604a', link: '#8a4b0f', tint: '#f1e5c9', accent: RED, accentFg: '#ffffff' },
  green: { label: 'Verde', bg: '#d6e2cf', page: '#e2eedb', fg: '#18241a', muted: '#566652', link: '#25603a', tint: '#e2eedb', accent: RED, accentFg: '#ffffff' },
  gray: { label: 'Gris', bg: '#3a3d42', page: '#4a4d52', fg: '#e8e6e1', muted: '#b0b0aa', link: '#a5c8ff', invert: 0.78, accent: RED_DARK, accentFg: '#141414' },
  dark: { label: 'Oscuro', bg: '#141414', page: '#1c1c1e', fg: '#e6e3dc', muted: '#9c988f', link: '#93c5fd', invert: 0.9, accent: RED_DARK, accentFg: '#141414' },
  black: { label: 'Negro', bg: '#000000', page: '#000000', fg: '#d6d2ca', muted: '#8a867f', link: '#8ab4f8', invert: 1, accent: RED_DARK, accentFg: '#000000' },
}

export const DEFAULT_THEME = 'cream'

// Mezcla dos colores hex: w = peso de b (0..1)
function mix(a, b, w) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [x, y] = [p(a), p(b)]
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * w).toString(16).padStart(2, '0')).join('')
}

export function applyThemeVars(name) {
  const t = THEMES[name] || THEMES[DEFAULT_THEME]
  const dark = !!t.invert
  const vars = {
    '--bg': t.bg, '--page': t.page, '--page-fg': t.fg, '--fg': t.fg, '--muted': t.muted,
    '--line': mix(t.bg, t.fg, dark ? 0.55 : 0.85),          // líneas de la grilla
    '--line-soft': mix(t.bg, t.fg, dark ? 0.22 : 0.18),     // líneas secundarias
    '--border': mix(t.bg, t.fg, dark ? 0.3 : 0.25),
    '--chrome': t.bg, '--toolbar': t.bg,
    '--field': mix(t.bg, t.fg, dark ? 0.1 : 0.06),
    '--hover': mix(t.bg, t.fg, dark ? 0.14 : 0.08),
    '--hover-strong': mix(t.bg, t.fg, dark ? 0.22 : 0.14),
    '--accent': t.accent, '--accent-fg': t.accentFg,
    '--pdf-tint': t.tint || 'transparent',
    '--pdf-filter': dark ? `invert(${t.invert}) hue-rotate(180deg)` : 'none',
  }
  const s = document.body.style
  for (const [k, v] of Object.entries(vars)) s.setProperty(k, v)
  document.body.dataset.theme = name
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
}
