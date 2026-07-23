// Raster post-processing for the generated claim assets.
//
// Documents are rendered as SVG and rasterised here; the optional "scan"
// artifacts (a degree of skew, warm paper tint, grain, edge vignette) are what
// make a code-rendered page read as something that came off a scanner rather
// than out of a design tool.

import sharp from "sharp";

/** Deterministic 0..1 from a string, so a given asset always looks the same. */
function seededUnit(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Monochrome grain with a low constant alpha, composited in `overlay`. */
async function grain(width: number, height: number, seed: string) {
  const px = Buffer.alloc(width * height * 4);
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < width * height; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const v = 110 + ((h >>> 0) % 40);
    px[i * 4] = v;
    px[i * 4 + 1] = v;
    px[i * 4 + 2] = v;
    px[i * 4 + 3] = 20;
  }
  return sharp(px, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

function vignetteSvg(width: number, height: number) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<defs><radialGradient id="v" cx="50%" cy="50%" r="76%">` +
    `<stop offset="0.7" stop-color="#ffffff"/>` +
    `<stop offset="1" stop-color="#ece7dc"/>` +
    `</radialGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#v)"/></svg>`
  );
}

function warmSvg(width: number, height: number) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="#fff8ec" opacity="0.35"/></svg>`
  );
}

export type ScanOptions = {
  /** Skip the scan artifacts and emit a crisp render. */
  clean?: boolean;
  /** Output width in px. */
  width?: number;
  /** Seed for skew angle and grain. */
  seed?: string;
};

/** SVG string -> PNG buffer, optionally aged to look scanned. */
export async function toScannedPng(
  svg: string,
  { clean = false, width = 1400, seed = "seed" }: ScanOptions = {}
): Promise<Buffer> {
  const flat = await sharp(Buffer.from(svg), { density: 200 })
    .resize({ width })
    .toBuffer();

  if (clean) return encodePng(sharp(flat));

  const angle = (seededUnit(seed) * 2.4 - 1.2).toFixed(2);
  const rotated = await sharp(flat)
    .rotate(Number(angle), { background: "#efece5" })
    .toBuffer();

  const { width: w = width, height: h = width } = await sharp(rotated).metadata();

  const aged = sharp(rotated)
    .composite([
      { input: Buffer.from(warmSvg(w, h)), blend: "multiply" },
      { input: Buffer.from(vignetteSvg(w, h)), blend: "multiply" },
      { input: await grain(w, h, seed), blend: "overlay" },
    ])
    .modulate({ brightness: 1.02, saturation: 0.95 });

  return encodePng(aged);
}

/** Palette-quantised PNG — documents are flat-toned, so this stays small. */
function encodePng(pipeline: sharp.Sharp) {
  return pipeline
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 9 })
    .toBuffer();
}

/** Model output -> a web-sized progressive JPEG for the repo. */
export async function toDemoJpeg(input: Buffer, width = 1600): Promise<Buffer> {
  return sharp(input)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toBuffer();
}
