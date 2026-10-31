// Portadas collage generadas a partir del nombre del archivo (siempre la misma para el mismo nombre).
const PALETTE = ['#e8c23a', '#3f7a4f', '#7fa7c9', '#d9482b', '#e6dfcf', '#c9b9a3', '#2b2b2b', '#d8a6a0', '#a7b89a']
const INK = '#1b1a17'
const DOTS = ['#16a34a', '#dc2626', '#2563eb']

function hash(s) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

function rng(seed) {
  let h = seed
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function coverSVG(name) {
  const seed = hash(name)
  const r = rng(seed)
  const pick = a => a[Math.floor(r() * a.length)]
  const W = 200, H = 260
  const id = 'g' + seed.toString(36)
  const out = []
  const bg = pick(PALETTE)
  out.push(`<rect width="${W}" height="${H}" fill="${bg}"/>`)

  // Bloque de color partido
  if (r() < 0.6) {
    const c = pick(PALETTE.filter(x => x !== bg))
    const k = 40 + r() * 120
    out.push(r() < 0.5
      ? `<rect x="${k}" width="${W - k}" height="${H}" fill="${c}"/>`
      : `<rect y="${k + 40}" width="${W}" height="${H}" fill="${c}"/>`)
  }

  const cx = W / 2, cy = H / 2
  switch (Math.floor(r() * 6)) {
    case 0: { // papel cuadriculado con un punto
      for (let x = 0; x < W; x += 20) out.push(`<path d="M${x} 0V${H}" stroke="${INK}" stroke-opacity=".35" stroke-width=".8"/>`)
      for (let y = 0; y < H; y += 20) out.push(`<path d="M0 ${y}H${W}" stroke="${INK}" stroke-opacity=".35" stroke-width=".8"/>`)
      out.push(`<circle cx="${40 + r() * 120}" cy="${60 + r() * 140}" r="9" fill="${pick(DOTS)}"/>`)
      break
    }
    case 1: { // matriz de cuadrados
      const c = pick(['#111', '#1e3a8a', '#14532d'])
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++)
        if (r() < 0.55) out.push(`<rect x="${44 + i * 16}" y="${70 + j * 16}" width="11" height="11" fill="${c}"/>`)
      break
    }
    case 2: { // brújula / dial
      out.push(`<circle cx="${cx}" cy="${cy}" r="${60 + r() * 20}" fill="none" stroke="${INK}" stroke-width="1.4"/>`)
      for (let a = 0; a < 360; a += 15) {
        const t = a * Math.PI / 180, L = a % 45 ? 62 : 72
        out.push(`<path d="M${cx + Math.cos(t) * 50} ${cy + Math.sin(t) * 50}L${cx + Math.cos(t) * L} ${cy + Math.sin(t) * L}" stroke="${INK}" stroke-width="1"/>`)
      }
      break
    }
    case 3: { // arcos
      for (let i = 0; i < 5; i++) out.push(`<path d="M${20 + i * 36} ${H - 40} q18 -${90 + r() * 60} 36 0" fill="none" stroke="${INK}" stroke-width="1.5"/>`)
      break
    }
    case 4: { // puntos verdes y rojos
      for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++)
        out.push(`<circle cx="${50 + i * 33}" cy="${60 + j * 36}" r="${r() < 0.2 ? 12 : 9}" fill="${r() < 0.15 ? '#dc2626' : '#15803d'}"/>`)
      break
    }
    case 5: { // red de nodos
      const pts = Array.from({ length: 7 }, () => [25 + r() * 150, 30 + r() * 200])
      pts.forEach((p, i) => { const q = pts[(i + 2) % pts.length]; out.push(`<path d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}" stroke="#1d4ed8" stroke-width="1.4"/>`) })
      pts.forEach(p => out.push(`<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="#2563eb"/>`))
      break
    }
  }

  // Grano de papel
  out.push(`<filter id="${id}"><feTurbulence baseFrequency=".9" numOctaves="2" seed="${seed % 100}"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .18 0"/></filter><rect width="${W}" height="${H}" filter="url(#${id})"/>`)
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${out.join('')}</svg>`
}
