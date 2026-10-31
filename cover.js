// Portadas "afiche" en el estilo Gabinete, generadas a partir del nombre del archivo
// (siempre la misma para el mismo nombre). Formas grandes y planas que se cortan en el borde,
// trazo de tinta de 1,5 px y trama de imprenta sobre los bloques grandes de cobalto o bermellón.
const C = {
  papel: '#f2ebdc', papelHondo: '#e6dcc6', tinta: '#1c1915',
  bermellon: '#e2562f', bermellonClaro: '#f6cdb9', cobalto: '#1f4fa3', cobaltoClaro: '#c5d4ee',
  mostaza: '#e3c13b', oliva: '#5f6b3a', rosa: '#efa49b',
}
const W = 200, H = 260

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

const line = (d, color = C.tinta) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`

// Cada motivo devuelve las capas del afiche
const MOTIFS = [
  // Sol sobre cielo cobalto, sierra y horizonte mostaza
  (r, id) => {
    const sx = 120 + r() * 60, sy = 50 + r() * 40
    return `<rect width="${W}" height="${H}" fill="${C.cobalto}"/><rect width="${W}" height="${H}" fill="url(#t${id})"/>
      <circle cx="${sx}" cy="${sy}" r="${46 + r() * 16}" fill="${C.bermellon}"/>
      <path d="M0 ${170 + r() * 10} L40 ${128 + r() * 16} L70 150 L110 ${110 + r() * 20} L150 156 L200 ${130 + r() * 14} V${H} H0Z" fill="${C.cobalto}" stroke="${C.papel}" stroke-width="1.5" stroke-linejoin="round"/>
      <rect y="${206}" width="${W}" height="${H}" fill="${C.mostaza}"/>`
  },
  // Medio círculo cobalto sobre mostaza
  (r) => {
    const bg = r() < 0.5 ? C.mostaza : C.rosa
    return `<rect width="${W}" height="${H}" fill="${bg}"/>
      <path d="M${10 + r() * 20} ${H} A90 90 0 0 1 ${190 - r() * 20} ${H}Z" fill="${C.cobalto}"/>
      <circle cx="${150}" cy="${60 + r() * 30}" r="10" fill="${C.bermellon}"/>`
  },
  // Laberinto en línea sobre bermellón con trama
  (r, id) => {
    const sx = 30 + r() * 40
    return `<rect width="${W}" height="${H}" fill="${C.bermellon}"/><rect width="${W}" height="${H}" fill="url(#t${id})"/>
      <circle cx="${sx}" cy="${200}" r="70" fill="${C.mostaza}"/>
      ${line('M50 40h120v120H110M80 160H50V40M66 56h88v88H66V80M82 72h56v56H96M82 104V72', C.tinta)}`
  },
  // Brújula sobre rosa o bermellón claro
  (r) => {
    const bg = r() < 0.5 ? C.rosa : C.bermellonClaro
    const cx = W / 2, cy = 120
    let ticks = ''
    for (let a = 0; a < 360; a += 15) {
      const t = a * Math.PI / 180, L = a % 90 ? 58 : 70
      ticks += `M${(cx + Math.cos(t) * 50).toFixed(1)} ${(cy + Math.sin(t) * 50).toFixed(1)}L${(cx + Math.cos(t) * L).toFixed(1)} ${(cy + Math.sin(t) * L).toFixed(1)}`
    }
    return `<rect width="${W}" height="${H}" fill="${bg}"/>
      <rect y="${200}" width="${W}" height="${H}" fill="${C.oliva}"/>
      <circle cx="${cx}" cy="${cy}" r="62" fill="none" stroke="${C.tinta}" stroke-width="1.5"/>
      ${line(ticks)}${line(`M${cx} ${cy - 46}L${cx + 9} ${cy - 9}L${cx + 46} ${cy}L${cx + 9} ${cy + 9}L${cx} ${cy + 46}L${cx - 9} ${cy + 9}L${cx - 46} ${cy}L${cx - 9} ${cy - 9}Z`)}`
  },
  // Hoja botánica en línea sobre papel hondo, con bloque oliva
  (r) => {
    const bg = r() < 0.5 ? C.papelHondo : C.cobaltoClaro
    return `<rect width="${W}" height="${H}" fill="${bg}"/>
      <rect x="${r() < 0.5 ? 0 : 120}" width="80" height="${H}" fill="${C.oliva}"/>
      ${line('M100 240C100 180 100 120 100 30M100 80C76 64 56 68 46 84C66 98 86 94 100 80M100 120C124 104 144 108 154 124C134 138 114 134 100 120M100 160C76 144 56 148 46 164C66 178 86 174 100 160M100 200C124 184 144 188 154 204C134 218 114 214 100 200')}`
  },
  // Arquitectura: arco y columnas en línea sobre cobalto claro, sol bermellón cortado
  (r) => {
    const bg = r() < 0.5 ? C.cobaltoClaro : C.mostaza
    return `<rect width="${W}" height="${H}" fill="${bg}"/>
      <circle cx="${170}" cy="${30}" r="56" fill="${C.bermellon}"/>
      <rect y="214" width="${W}" height="${H}" fill="${C.papelHondo}"/>
      ${line('M40 214V110A60 60 0 0 1 160 110V214M60 214V116A40 40 0 0 1 140 116V214M30 214H170M30 96H170')}`
  },
  // Papel cuadriculado con un punto
  (r) => {
    let g = ''
    for (let x = 0; x <= W; x += 24) g += `M${x} 0V${H}`
    for (let y = 0; y <= H; y += 24) g += `M0 ${y}H${W}`
    return `<rect width="${W}" height="${H}" fill="${C.papelHondo}"/>
      <path d="${g}" stroke="#cfc2a6" stroke-width="1"/>
      <rect x="0" y="${150 + r() * 30}" width="${W}" height="${H}" fill="${C.cobalto}"/>
      <circle cx="${48 + Math.floor(r() * 5) * 24}" cy="${72 + Math.floor(r() * 3) * 24}" r="9" fill="${C.bermellon}"/>`
  },
]

export function coverSVG(name) {
  const seed = hash(name)
  const r = rng(seed)
  const id = seed.toString(36)
  const motif = MOTIFS[Math.floor(rng(Math.imul(seed, 2654435761) >>> 0)() * MOTIFS.length)]
  const body = motif(r, id)
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <pattern id="t${id}" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="rgba(28,25,21,0.22)"/></pattern>
      <filter id="g${id}"><feTurbulence baseFrequency=".9" numOctaves="2" seed="${seed % 97}"/><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .14 0"/></filter>
    </defs>
    ${body}
    <rect width="${W}" height="${H}" filter="url(#g${id})"/>
  </svg>`
}
