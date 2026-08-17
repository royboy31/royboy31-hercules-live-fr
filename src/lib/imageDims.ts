/**
 * Build-time intrinsic-size lookup for WordPress-sourced images.
 *
 * Images rendered without `width`/`height` collapse to a zero-height box until
 * the bytes arrive, then push everything below them down: that is a layout
 * shift, and it counts against Core Web Vitals CLS.
 *
 * Commit 7583f20 solved most of the blog by reading the size out of the
 * WordPress resized filename (`…-768x512.png`). Six of the 49 live articles use
 * the full-size upload, whose filename carries no suffix, so they kept shipping
 * an undimensioned `<img>`. The sidebar's related-post thumbnails have the same
 * problem for a different reason: they are served through the Worker proxy
 * (`/post-image/<slug>`), a URL that never carries a size.
 *
 * The Worker payload has no width/height field to read (checked 2026-08-17 on
 * `/post/{slug}` and `/posts`), and the six images range from 1:1 to ~2.17:1,
 * so a single CSS `aspect-ratio` fallback would distort them. Instead we read
 * the real size from the image header at build time: one ranged request per
 * distinct URL, results cached for the whole build.
 *
 * Every failure path returns `null`, which renders exactly the markup we ship
 * today. A slow or unreachable image can never fail the build.
 *
 * See RESEARCH/HERCULES_FR_MOBILE_CLS_AUDIT_2026_08_17.md.
 */

export interface ImageDims {
  width: number;
  height: number;
}

/** One ranged request per distinct URL per build. */
const probeCache = new Map<string, ImageDims | null>();

/** 64 KB covers the header of every format below, with room to spare. */
const HEADER_BYTES = 65_536;

/**
 * Read the size out of a WordPress resized filename (`…-768x512.png`).
 * Returns null for full-size uploads and for the Worker proxy URLs.
 */
export function parseImageDimsFromUrl(url: string): ImageDims | null {
  const m = url?.match(/-(\d{2,5})x(\d{2,5})\.(?:webp|jpe?g|png|avif)(?:$|\?)/i);
  return m ? { width: Number(m[1]), height: Number(m[2]) } : null;
}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b: Uint8Array, i: number) =>
  ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const fourcc = (b: Uint8Array, i: number) =>
  String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG: IHDR is always the first chunk, at a fixed offset. */
function pngDims(b: Uint8Array): ImageDims | null {
  if (b.length < 24) return null;
  if (PNG_SIGNATURE.some((byte, i) => b[i] !== byte)) return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

/** GIF: logical screen descriptor, little-endian, right after the signature. */
function gifDims(b: Uint8Array): ImageDims | null {
  if (b.length < 10 || fourcc(b, 0) !== 'GIF8') return null;
  return { width: u16le(b, 6), height: u16le(b, 8) };
}

/** WebP: three container variants, each with its own size field. */
function webpDims(b: Uint8Array): ImageDims | null {
  if (b.length < 30 || fourcc(b, 0) !== 'RIFF' || fourcc(b, 8) !== 'WEBP') return null;
  const variant = fourcc(b, 12);

  if (variant === 'VP8 ') {
    // Lossy: 3-byte frame tag, then the 0x9D012A start code, then 14-bit sizes.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }

  if (variant === 'VP8L') {
    // Lossless: signature byte, then width-1 and height-1 packed in 28 bits.
    if (b[20] !== 0x2f) return null;
    const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (variant === 'VP8X') {
    // Extended: canvas size as two 24-bit little-endian values, minus one.
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }

  return null;
}

/** JPEG: walk the segment chain until a start-of-frame marker. */
function jpegDims(b: Uint8Array): ImageDims | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // Padding and standalone markers carry no length field.
    if (marker === 0xff || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2;
      continue;
    }
    const length = u16be(b, i + 2);
    // SOF0-SOF15, excluding DHT (c4), JPG (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: u16be(b, i + 7), height: u16be(b, i + 5) };
    }
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

function readImageDims(bytes: Uint8Array): ImageDims | null {
  const dims =
    pngDims(bytes) || jpegDims(bytes) || webpDims(bytes) || gifDims(bytes);
  return dims && dims.width > 0 && dims.height > 0 ? dims : null;
}

/**
 * Intrinsic size of an image, from its filename when WordPress encodes it there,
 * otherwise from the image header itself. Returns null when the size cannot be
 * established, so callers render their current markup unchanged.
 */
export async function getImageDims(url: string): Promise<ImageDims | null> {
  if (!url) return null;

  const fromFilename = parseImageDimsFromUrl(url);
  if (fromFilename) return fromFilename;

  const cached = probeCache.get(url);
  if (cached !== undefined) return cached;

  let dims: ImageDims | null = null;
  try {
    const res = await fetch(url, { headers: { Range: `bytes=0-${HEADER_BYTES - 1}` } });
    if (res.ok) {
      dims = readImageDims(new Uint8Array(await res.arrayBuffer()));
    }
  } catch (error) {
    console.warn(`[imageDims] could not read ${url}:`, error);
  }

  probeCache.set(url, dims);
  return dims;
}
