// Serbian Cyrillic ↔ Latin transliteration.
// Mirrors SerbianTransliteration.cs on the backend.

const CYR_TO_LAT = [
  ['Љ', 'Lj'], ['љ', 'lj'],
  ['Њ', 'Nj'], ['њ', 'nj'],
  ['Џ', 'Dž'], ['џ', 'dž'],
  ['А', 'A'],  ['а', 'a'],
  ['Б', 'B'],  ['б', 'b'],
  ['В', 'V'],  ['в', 'v'],
  ['Г', 'G'],  ['г', 'g'],
  ['Д', 'D'],  ['д', 'd'],
  ['Ђ', 'Đ'],  ['ђ', 'đ'],
  ['Е', 'E'],  ['е', 'e'],
  ['Ж', 'Ž'],  ['ж', 'ž'],
  ['З', 'Z'],  ['з', 'z'],
  ['И', 'I'],  ['и', 'i'],
  ['Ј', 'J'],  ['ј', 'j'],
  ['К', 'K'],  ['к', 'k'],
  ['Л', 'L'],  ['л', 'l'],
  ['М', 'M'],  ['м', 'm'],
  ['Н', 'N'],  ['н', 'n'],
  ['О', 'O'],  ['о', 'o'],
  ['П', 'P'],  ['п', 'p'],
  ['Р', 'R'],  ['р', 'r'],
  ['С', 'S'],  ['с', 's'],
  ['Т', 'T'],  ['т', 't'],
  ['Ћ', 'Ć'],  ['ћ', 'ć'],
  ['У', 'U'],  ['у', 'u'],
  ['Ф', 'F'],  ['ф', 'f'],
  ['Х', 'H'],  ['х', 'h'],
  ['Ц', 'C'],  ['ц', 'c'],
  ['Ч', 'Č'],  ['ч', 'č'],
  ['Ш', 'Š'],  ['ш', 'š'],
]

// Digraphs must come before their component letters.
const LAT_TO_CYR = [
  ['LJ', 'Љ'], ['Lj', 'Љ'], ['lj', 'љ'],
  ['NJ', 'Њ'], ['Nj', 'Њ'], ['nj', 'њ'],
  ['DŽ', 'Џ'], ['Dž', 'Џ'], ['dž', 'џ'],
  ['DZ', 'Џ'], ['Dz', 'Џ'], ['dz', 'џ'],
  ['Dj', 'Ђ'], ['dj', 'ђ'],
  ['A', 'А'],  ['a', 'а'],
  ['B', 'Б'],  ['b', 'б'],
  ['V', 'В'],  ['v', 'в'],
  ['G', 'Г'],  ['g', 'г'],
  ['D', 'Д'],  ['d', 'д'],
  ['Đ', 'Ђ'],  ['đ', 'ђ'],
  ['E', 'Е'],  ['e', 'е'],
  ['Ž', 'Ж'],  ['ž', 'ж'],
  ['Z', 'З'],  ['z', 'з'],
  ['I', 'И'],  ['i', 'и'],
  ['J', 'Ј'],  ['j', 'ј'],
  ['K', 'К'],  ['k', 'к'],
  ['L', 'Л'],  ['l', 'л'],
  ['M', 'М'],  ['m', 'м'],
  ['N', 'Н'],  ['n', 'н'],
  ['O', 'О'],  ['o', 'о'],
  ['P', 'П'],  ['p', 'п'],
  ['R', 'Р'],  ['r', 'р'],
  ['S', 'С'],  ['s', 'с'],
  ['T', 'Т'],  ['t', 'т'],
  ['Ć', 'Ћ'],  ['ć', 'ћ'],
  ['Č', 'Ч'],  ['č', 'ч'],
  ['U', 'У'],  ['u', 'у'],
  ['F', 'Ф'],  ['f', 'ф'],
  ['H', 'Х'],  ['h', 'х'],
  ['C', 'Ц'],  ['c', 'ц'],
  ['Š', 'Ш'],  ['š', 'ш'],
]

export function toLatinSr(str) {
  let out = str
  for (const [c, l] of CYR_TO_LAT) out = out.replaceAll(c, l)
  return out
}

export function toCyrillicSr(str) {
  let out = str
  for (const [l, c] of LAT_TO_CYR) out = out.replaceAll(l, c)
  return out
}

/**
 * Returns a matcher function that tests a string against the query
 * in both Cyrillic and Latin variants (case-insensitive).
 */
export function makeScriptMatcher(query) {
  if (!query) return () => true
  const q = query.toLowerCase()
  const qLat = toLatinSr(q).toLowerCase()
  const qCyr = toCyrillicSr(q).toLowerCase()
  const variants = [...new Set([q, qLat, qCyr])]
  return (text) => {
    const t = text.toLowerCase()
    return variants.some(v => t.includes(v))
  }
}
