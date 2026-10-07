export type ProductImage = { id: string; name: string; url: string };

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Only raster uploads are accepted; user-supplied SVG/HTML is never served. */
export function imageFormat(bytes: Uint8Array): "png" | "jpeg" | "webp" | null {
  if (bytes.length >= 24 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (bytes.length >= 16 && Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "webp";
  return null;
}

export function safeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".") && !/^(localhost|127\.|0\.|169\.254\.|10\.|192\.168\.)/.test(url.hostname);
  } catch {
    return false;
  }
}
