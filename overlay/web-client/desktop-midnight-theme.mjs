/**
 * Midnight theme: retints the web client's purple UI to near-black navy, at build time.
 *
 * Upstream hard-codes its purples (about 150 `rgba(...)` and `#hex` literals across dozens of
 * components) rather than routing them through CSS variables, so there is no one place to change.
 * This Vite plugin rewrites those literals as each source file is transformed. It is deliberately
 * narrow: only colours that are clearly purple (hue 245-320 and visibly saturated) are touched, so
 * greys, whites, mana colours and card art are left exactly as they were.
 *
 * Plain ESM (not TypeScript) so any runtime that can load a Vite config can load it.
 * Disable with DESKTOP_THEME=original.
 */

/** Hue every retinted colour is moved to (degrees): a deep blue, not a violet. */
export const NAVY_HUE = 222

export function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

export function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [Math.round(channel(hue + 1 / 3) * 255), Math.round(channel(hue) * 255), Math.round(channel(hue - 1 / 3) * 255)]
}

/** True for a clearly purple colour; false for greys and every other hue. */
export function isPurple(r, g, b) {
  const [h, s] = rgbToHsl(r, g, b)
  return h >= 245 && h <= 320 && s >= 0.18
}

/**
 * The navy a purple becomes. Hue moves to blue and saturation drops, and the colour gets darker:
 * backgrounds the most (so panels read almost black), mid tones a little (borders stay visible),
 * pale text hardly at all (so lavender text turns cool white and stays readable).
 */
export function toNavy(r, g, b) {
  const [, s, l] = rgbToHsl(r, g, b)
  const sat = Math.min(s * 0.6, 0.5)
  const light = l < 0.35 ? l * 0.55 : l < 0.7 ? l * 0.8 : l * 0.97
  return hslToRgb(NAVY_HUE, sat, light)
}

const RGBA = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)/g
// A complete quoted hex string only ('#7c3aed'): never one that code appends an alpha suffix to
// (`${color}55`), which is a template interpolation, not a literal.
const QUOTED_HEX = /(['"])#([0-9a-fA-F]{6})\1/g
// Any 6-digit hex in a stylesheet, where there is no string concatenation to worry about.
const CSS_HEX = /#([0-9a-fA-F]{6})\b/g

const hex2 = (n) => n.toString(16).padStart(2, '0')

/** Retint the purple colour literals in `code`. `isCss` also rewrites bare hex colours. */
export function retintPurples(code, isCss) {
  let out = code.replace(RGBA, (match, rs, gs, bs, a) => {
    const r = Number(rs)
    const g = Number(gs)
    const b = Number(bs)
    if (r > 255 || g > 255 || b > 255 || !isPurple(r, g, b)) return match
    const [nr, ng, nb] = toNavy(r, g, b)
    return a === undefined ? `rgb(${nr}, ${ng}, ${nb})` : `rgba(${nr}, ${ng}, ${nb}, ${a})`
  })
  const hexRewrite = (hex) => {
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    if (!isPurple(r, g, b)) return null
    const [nr, ng, nb] = toNavy(r, g, b)
    return `#${hex2(nr)}${hex2(ng)}${hex2(nb)}`
  }
  if (isCss) {
    out = out.replace(CSS_HEX, (match, hex) => hexRewrite(hex) ?? match)
  } else {
    out = out.replace(QUOTED_HEX, (match, quote, hex) => {
      const next = hexRewrite(hex)
      return next === null ? match : `${quote}${next}${quote}`
    })
  }
  return out
}

const SOURCE = /\/src\/.*\.(?:tsx?|css)(?:\?.*)?$/

export function midnightTheme() {
  const enabled = (process.env.DESKTOP_THEME ?? 'midnight') !== 'original'
  return {
    name: 'argentum-desktop-midnight-theme',
    // Before esbuild/postcss, so the literals are still in the source as written.
    enforce: 'pre',
    transform(code, id) {
      if (!enabled || !SOURCE.test(id)) return null
      // Our own files choose their colours deliberately.
      if (id.includes('/src/desktop/')) return null
      const out = retintPurples(code, /\.css(?:\?.*)?$/.test(id))
      return out === code ? null : { code: out, map: null }
    },
  }
}
