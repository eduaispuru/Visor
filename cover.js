// Bloque de título de cada archivo en la biblioteca: un color plano de Gabinete,
// elegido a partir del nombre (siempre el mismo para el mismo archivo), con su tinta legible encima.
const INKS = [
  { bg: '#1f4fa3', fg: '#f4f4f2' }, // cobalto
  { bg: '#e2562f', fg: '#1c1915' }, // bermellón
  { bg: '#5f6b3a', fg: '#f4f4f2' }, // oliva
  { bg: '#e3c13b', fg: '#1c1915' }, // mostaza
  { bg: '#efa49b', fg: '#1c1915' }, // rosa
  { bg: '#1c1b19', fg: '#f4f4f2' }, // tinta
]

function hash(s) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  // mezcla final (murmur3 fmix32) para repartir bien los colores
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35)
  return (h ^ (h >>> 16)) >>> 0
}

// avoid: colores de las tarjetas vecinas, para que dos seguidas no queden iguales
export function titleInk(name, avoid = []) {
  const start = hash(name) % INKS.length
  for (let i = 0; i < INKS.length; i++) {
    const ink = INKS[(start + i) % INKS.length]
    if (!avoid.includes(ink.bg)) return ink
  }
  return INKS[start]
}
