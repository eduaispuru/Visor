// Tonos de fondo. "page" = color del papel, "fg" = texto.
// En PDF: los tonos claros tiñen la página (multiply); los oscuros invierten colores.
export const THEMES = {
  light: { label: 'Blanco', bg: '#f4f4f5', page: '#ffffff', fg: '#18181b', muted: '#71717a', border: '#d4d4d8', link: null },
  cream: { label: 'Crema', bg: '#ece6d6', page: '#faf5e8', fg: '#2b2620', muted: '#7a705e', border: '#d8cfba', link: '#7c4a12', tint: '#faf5e8' },
  sepia: { label: 'Sepia', bg: '#e3d7bd', page: '#f1e5c9', fg: '#3b2f1e', muted: '#7a6a52', border: '#c9b993', link: '#8a4b0f', tint: '#f1e5c9' },
  green: { label: 'Verde', bg: '#d2e0ca', page: '#e2eedb', fg: '#1f2d1f', muted: '#5d6f58', border: '#b9cdb0', link: '#25603a', tint: '#e2eedb' },
  gray: { label: 'Gris', bg: '#3a3d42', page: '#4a4d52', fg: '#e3e3e3', muted: '#b0b3b8', border: '#5d6066', link: '#a5c8ff', invert: 0.78 },
  dark: { label: 'Oscuro', bg: '#0f0f12', page: '#1c1c20', fg: '#d4d4d8', muted: '#a1a1aa', border: '#3f3f46', link: '#93c5fd', invert: 0.9 },
  black: { label: 'Negro', bg: '#000000', page: '#000000', fg: '#c8c8c8', muted: '#8a8a8a', border: '#262626', link: '#8ab4f8', invert: 1 },
}

export const DEFAULT_THEME = 'light'

export function applyThemeVars(name) {
  const t = THEMES[name] || THEMES[DEFAULT_THEME]
  const s = document.body.style
  s.setProperty('--bg', t.bg)
  s.setProperty('--page', t.page)
  s.setProperty('--page-fg', t.fg)
  s.setProperty('--fg', t.fg)
  s.setProperty('--muted', t.muted)
  s.setProperty('--border', t.border)
  s.setProperty('--pdf-tint', t.tint || 'transparent')
  s.setProperty('--pdf-filter', t.invert ? `invert(${t.invert}) hue-rotate(180deg)` : 'none')
  document.body.dataset.theme = name
  document.documentElement.style.colorScheme = t.invert ? 'dark' : 'light'
}
