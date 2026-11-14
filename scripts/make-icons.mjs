// Generates the app icons (PNG, no dependencies): an amber artificial sun on cool slate.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const c = size / 2;
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c) / size;
      let rgb = [15, 20, 27]; // slate
      if (d < 0.2) rgb = [255, 190, 92]; // core
      else if (d < 0.23) rgb = [15, 20, 27]; // gap
      else if (d < 0.27) rgb = [232, 148, 58]; // containment ring
      else if (d < 0.46) {
        const t = (d - 0.27) / 0.19;
        rgb = [mix(70, 15, t), mix(52, 20, t), mix(34, 27, t)]; // glow falloff
      }
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = rgb[0];
      raw[i + 1] = rgb[1];
      raw[i + 2] = rgb[2];
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192));
writeFileSync('public/icons/icon-512.png', png(512));
writeFileSync('public/icons/apple-touch-icon.png', png(180));
writeFileSync(
  'public/icons/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0f141b"/><circle cx="50" cy="50" r="25" fill="none" stroke="#e8943a" stroke-width="4"/><circle cx="50" cy="50" r="19" fill="#ffbe5c"/></svg>`,
);
console.log('icons written');
