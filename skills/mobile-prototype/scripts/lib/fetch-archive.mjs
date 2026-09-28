// Download a pinned archive once, check its integrity, and unpack selected files from it.
// Used for optional, on-demand dependencies (Material Color Utilities, the ui-ux-pro-max skill),
// so the skill itself ships with no third-party code. Zero dependencies; Node 18+.

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

/** Per-user cache for downloaded dependencies (override with MOBILE_PROTOTYPE_CACHE). */
export function cacheDir() {
  if (process.env.MOBILE_PROTOTYPE_CACHE) return path.resolve(process.env.MOBILE_PROTOTYPE_CACHE);
  const base = process.platform === 'win32'
    ? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    : process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
  return path.join(base, 'mobile-prototype');
}

/** Fetch a URL into a Buffer and check it against an SRI string ("sha512-<base64>" or "sha256-<base64>"). */
export async function download(url, integrity, { timeoutMs = 60_000 } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (integrity) {
    const [algo, expected] = integrity.split(/-(.*)/s);
    const actual = crypto.createHash(algo).update(buf).digest('base64');
    if (actual !== expected) throw new Error(`${url}: integrity check failed (expected ${integrity}, got ${algo}-${actual}). Nothing was installed.`);
  }
  return buf;
}

/**
 * Unpack a .tar.gz buffer. `map(entryPath)` returns the destination path relative to `dest`, or
 * null to skip the entry. Only regular files are written; links and paths that would leave
 * `dest` are refused.
 */
export function untar(gz, dest, map) {
  const tar = zlib.gunzipSync(gz);
  const written = [];
  let longName = null, paxPath = null;
  for (let off = 0; off + 512 <= tar.length;) {
    const h = tar.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (a, b) => h.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
    const size = parseInt(str(124, 136).trim() || '0', 8);
    const type = String.fromCharCode(h[156] || 48);
    const body = tar.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
    if (type === 'L') { longName = body.toString('utf8').replace(/\0.*$/s, ''); continue; }
    if (type === 'x') { paxPath = body.toString('utf8').match(/\d+ path=([^\n]*)\n/)?.[1] ?? null; continue; }
    if (type === 'g') continue;
    const prefix = str(345, 500);
    const name = paxPath || longName || (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    longName = paxPath = null;
    if (type !== '0' && type !== '\0' && type !== '7') continue;
    const rel = map(name);
    if (!rel) continue;
    const out = path.resolve(dest, rel);
    if (out !== dest && !out.startsWith(dest + path.sep)) throw new Error(`Refusing to write outside ${dest}: ${name}`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, body);
    written.push(rel);
  }
  return written;
}
