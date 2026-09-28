// Colour maths for theme.mjs: parsing, WCAG contrast, CIELAB, and tonal palettes.
// Tone is CIELAB L* (0–100), the same quantity Material's HCT calls "tone", so two colours whose
// tones differ enough have a known contrast, whichever way they were generated.

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** '#rgb' | '#rrggbb' | 'rgb(r g b / a)' | 'rgba(r, g, b, a)' → { r, g, b, a } (0–255, a 0–1), or null. */
export function parse(css) {
  const s = String(css).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] == null ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  return null;
}

export const hex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
export const isHex = (s) => /^#[0-9a-f]{6}$/i.test(String(s).trim());

/** Alpha-composite `top` over an opaque `bottom`. */
export function over(top, bottom) {
  const a = top.a ?? 1;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const unlin = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export const luminance = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/** WCAG 2 contrast ratio. fg may be translucent; bg must be opaque. */
export function contrast(fg, bg) {
  const f = typeof fg === 'string' ? parse(fg) : fg;
  const b = typeof bg === 'string' ? parse(bg) : bg;
  const L1 = luminance(f.a < 1 ? over(f, b) : f), L2 = luminance(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

// ---------- CIELAB (D65) ----------
const WHITE = [0.95047, 1, 1.08883];
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const finv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

export function toLch(c) {
  const [R, G, B] = [lin(c.r), lin(c.g), lin(c.b)];
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / WHITE[0];
  const Y = (0.2126729 * R + 0.7151522 * G + 0.0721750 * B) / WHITE[1];
  const Z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / WHITE[2];
  const L = 116 * f(Y) - 16, a = 500 * (f(X) - f(Y)), b = 200 * (f(Y) - f(Z));
  return { l: L, c: Math.hypot(a, b), h: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 };
}

function fromLchRaw(l, c, h) {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const fy = (l + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = finv(fx) * WHITE[0], Y = (l > 8 ? fy ** 3 : l / (24389 / 27)) * WHITE[1], Z = finv(fz) * WHITE[2];
  const R = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const G = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
  const Bl = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
  return [R, G, Bl];
}

/** The colour with this tone (L*) and hue, at the given chroma or the most the sRGB gamut allows. */
export function fromTone(tone, hue, chroma) {
  const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  let lo = 0, hi = chroma, rgb = fromLchRaw(tone, 0, hue);
  if (inGamut(fromLchRaw(tone, chroma, hue))) rgb = fromLchRaw(tone, chroma, hue);
  else {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2, t = fromLchRaw(tone, mid, hue);
      if (inGamut(t)) { lo = mid; rgb = t; } else hi = mid;
    }
  }
  const [r, g, b] = rgb.map((v) => unlin(clamp(v, 0, 1)));
  return { r, g, b, a: 1 };
}

export const toneOf = (c) => toLch(typeof c === 'string' ? parse(c) : c).l;

/** A tonal palette (tone → hex) for a hue and chroma: the offline stand-in for Material's HCT palettes. */
export function palette(hue, chroma) {
  const cache = new Map();
  return { hue, chroma, tone: (t) => { if (!cache.has(t)) cache.set(t, hex(fromTone(t, hue, chroma))); return cache.get(t); } };
}

/** Same hue and chroma as `color`, moved to the nearest tone that reaches `ratio` against `bg`. */
export function nearestPassing(color, bg, ratio, direction = 'auto') {
  const c = toLch(typeof color === 'string' ? parse(color) : color);
  const b = typeof bg === 'string' ? parse(bg) : bg;
  const dirs = direction === 'auto' ? (toneOf(b) > 50 ? [-1, 1] : [1, -1]) : [direction === 'darker' ? -1 : 1];
  for (const d of dirs) {
    for (let t = clamp(c.l, 0, 100); t >= 0 && t <= 100; t += d * 0.5) {
      const cand = hex(fromTone(t, c.h, c.c));
      if (contrast(cand, b) >= ratio) return cand;
    }
  }
  return null;
}
