import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const green = [56, 107, 86];
const gold = [226, 189, 115];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}

function png(size, maskable = false) {
  const scale = 3;
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    rows[row] = 0;
    for (let x = 0; x < size; x++) {
      let goldSamples = 0;
      let alphaSamples = 0;
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        const px = (x + (sx + .5) / scale) / size;
        const py = (y + (sy + .5) / scale) / size;
        const nx = px * 512;
        const ny = py * 512;
        const outside = !maskable && (nx < 0 || ny < 0 || nx >= 512 || ny >= 512 || (() => {
          const cx = Math.max(112, Math.min(400, nx));
          const cy = Math.max(112, Math.min(400, ny));
          return (nx - cx) ** 2 + (ny - cy) ** 2 > 112 ** 2;
        })());
        if (outside) continue;
        alphaSamples++;
        const inRing = (cx) => {
          const a = -36 * Math.PI / 180;
          const dx = nx - cx;
          const dy = ny - 256;
          const lx = dx * Math.cos(a) + dy * Math.sin(a);
          const ly = -dx * Math.sin(a) + dy * Math.cos(a);
          const centerlineX = Math.max(-21, Math.min(21, lx));
          const distance = Math.hypot(lx - centerlineX, ly);
          return Math.abs(distance - 68) <= 16;
        };
        if (inRing(200) || inRing(312)) goldSamples++;
      }
      const offset = row + 1 + x * 4;
      const alpha = alphaSamples / (scale * scale);
      const goldBlend = goldSamples / (scale * scale);
      const color = goldBlend > 0 ? gold : green;
      rows[offset] = color[0];
      rows[offset + 1] = color[1];
      rows[offset + 2] = color[2];
      rows[offset + 3] = Math.round(alpha * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

await mkdir("public/icons", { recursive: true });
await mkdir("src/app", { recursive: true });
await Promise.all([
  writeFile("public/icons/icon-192.png", png(192)),
  writeFile("public/icons/icon-512.png", png(512)),
  writeFile("public/icons/maskable-512.png", png(512, true)),
  writeFile("src/app/apple-icon.png", png(180)),
]);
console.log("Generated 192px, 512px, maskable and Apple touch icons.");
