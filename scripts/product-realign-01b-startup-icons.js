const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PATHS = Object.freeze([
  ['#0B1D34', 'M119 64 C136 39 166 28 196 32 L300 46 C320 49 331 66 327 86 L316 144 C312 165 295 178 274 175 L252 172 L252 367 C252 423 218 468 166 482 C116 495 68 472 51 428 C47 417 46 405 48 393 C70 414 97 423 121 416 C149 408 165 383 165 350 L165 156 L116 149 C94 146 80 128 84 106 L91 79 C95 71 104 66 119 64 Z'],
  ['#FCF9F4', 'M151 309 C151 270 177 240 214 225 C231 218 246 205 252 186 L252 384 C252 428 222 462 180 468 C153 472 127 460 111 440 C143 443 165 431 178 411 C188 394 191 374 191 350 L191 292 C173 298 160 303 151 309 Z'],
  ['#0B1D34', 'M72 397 C89 409 108 414 125 409 C144 403 156 389 162 370 C164 394 157 421 139 440 C120 460 91 466 68 455 C54 448 44 436 40 421 C50 427 61 426 72 397 Z'],
  ['#0EA7A1', 'M110 62 C130 40 158 29 188 32 L229 38 L214 112 L157 104 C135 101 120 87 110 62 Z'],
  ['#C79A5E', 'M103 373 C119 374 134 369 146 357 C144 380 134 399 116 411 C101 421 85 421 70 416 C83 406 94 392 103 373 Z'],
]);
const HASHES = Object.freeze({
  'icon-192.png': '9e7312dbb154fca07618327496e5965d5b723adcd5aa8050e0cee8777dc0ce54',
  'icon-512.png': '06d70398b87d51f6b0c10cefb69f1d50e8f17895be6183370eb78b63b6668f87',
});

function parse(source) {
  const t = source.match(/[MLCZ]|-?\d+(?:\.\d+)?/gi) || [];
  const out = []; let c = []; let i = 0; let x = 0; let y = 0; let sx = 0; let sy = 0; let op = '';
  const n = () => Number(t[i++]);
  while (i < t.length) {
    const v = t[i++]; if (/^[MLCZ]$/i.test(v)) op = v.toUpperCase(); else i -= 1;
    if (op === 'M') { if (c.length) out.push(c); x = n(); y = n(); sx = x; sy = y; c = [[x, y]]; op = 'L'; }
    else if (op === 'L') { x = n(); y = n(); c.push([x, y]); }
    else if (op === 'C') {
      const x1 = n(), y1 = n(), x2 = n(), y2 = n(), x3 = n(), y3 = n(), x0 = x, y0 = y;
      for (let s = 1; s <= 24; s += 1) { const q = s / 24, r = 1 - q; c.push([r ** 3 * x0 + 3 * r ** 2 * q * x1 + 3 * r * q ** 2 * x2 + q ** 3 * x3, r ** 3 * y0 + 3 * r ** 2 * q * y1 + 3 * r * q ** 2 * y2 + q ** 3 * y3]); }
      x = x3; y = y3;
    } else if (op === 'Z') { if (c.at(-1)[0] !== sx || c.at(-1)[1] !== sy) c.push([sx, sy]); out.push(c); c = []; op = ''; }
    else throw new Error(`Unsupported A2.2 path command: ${op || v}`);
  }
  if (c.length) out.push(c); return out;
}
function rgba(hex) { const h = hex.slice(1); return [0, 2, 4].map((o) => parseInt(h.slice(o, o + 2), 16)).concat(255); }
function transform(contours, size, ss) { const w = size * ss, h = w * .72, k = h / 488, ox = (w - 320 * k) / 2 - 40 * k, oy = (w - h) / 2 - 24 * k; return contours.map((c) => c.map(([x, y]) => [x * k + ox, y * k + oy])); }
function fill(p, w, contours, col) {
  for (let y = 0; y < w; y += 1) { const at = y + .5, xs = [];
    for (const c of contours) for (let j = 0; j < c.length - 1; j += 1) { const [x1, y1] = c[j], [x2, y2] = c[j + 1]; if ((y1 <= at && y2 > at) || (y2 <= at && y1 > at)) xs.push(x1 + (at - y1) * (x2 - x1) / (y2 - y1)); }
    xs.sort((a, b) => a - b); for (let j = 0; j + 1 < xs.length; j += 2) for (let x = Math.max(0, Math.ceil(xs[j] - .5)); x <= Math.min(w - 1, Math.floor(xs[j + 1] - .5)); x += 1) { const o = (y * w + x) * 4; for (let q = 0; q < 4; q += 1) p[o + q] = col[q]; }
  }
}
function raster(size) {
  const ss = 3, w = size * ss, bg = rgba('#FCF9F4'), high = Buffer.alloc(w * w * 4, 255);
  for (let o = 0; o < high.length; o += 4) for (let q = 0; q < 4; q += 1) high[o + q] = bg[q];
  for (const [colour, d] of PATHS) fill(high, w, transform(parse(d), size, ss), rgba(colour));
  const out = Buffer.alloc(size * size * 4), count = ss * ss;
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) { const sum = [0, 0, 0, 0]; for (let dy = 0; dy < ss; dy += 1) for (let dx = 0; dx < ss; dx += 1) { const o = ((y * ss + dy) * w + x * ss + dx) * 4; for (let q = 0; q < 4; q += 1) sum[q] += high[o + q]; } const o = (y * size + x) * 4; for (let q = 0; q < 4; q += 1) out[o + q] = Math.round(sum[q] / count); }
  return out;
}
const CRC = (() => { const a = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; a[n] = c >>> 0; } return a; })();
function crc32(b) { let c = 0xFFFFFFFF; for (const v of b) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); }
function generate(size) {
  if (!Number.isInteger(size) || size < 64 || size > 1024) throw new Error(`Unsupported startup icon size: ${size}`);
  const pixels = raster(size), head = Buffer.alloc(13), rows = Buffer.alloc((size * 4 + 1) * size); head.writeUInt32BE(size); head.writeUInt32BE(size, 4); head[8] = 8; head[9] = 6;
  for (let y = 0; y < size; y += 1) pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function write(root = process.cwd()) { const dir = path.join(root, 'dist', 'icons'); fs.mkdirSync(dir, { recursive: true }); for (const size of [192, 512]) fs.writeFileSync(path.join(dir, `icon-${size}.png`), generate(size)); }
if (require.main === module) { write(); console.log('PRODUCT-REALIGN-01B HOTFIX-05 Julvox startup icons generated.'); }
module.exports = { PATHS, HASHES, generate, write };
