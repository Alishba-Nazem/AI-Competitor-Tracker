// Cheap, synchronous WebGL capability check used before mounting the R3F canvas.
// A canvas + getContext probe is the standard way to detect this; it never throws.
export function isWebglAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}
