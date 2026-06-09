import { unzipSync, strFromU8 } from "fflate";

/**
 * Extract the MusicXML document from a compressed `.mxl` archive.
 * Works in both browser and Node (no DOMParser dependency).
 *
 * An .mxl is a zip whose META-INF/container.xml points to the root score file.
 * We honor that pointer, with a sensible fallback to the first non-meta .xml.
 */
export function mxlToXml(data: Uint8Array): string {
  const files = unzipSync(data);

  const container = files["META-INF/container.xml"];
  if (container) {
    const text = strFromU8(container);
    const match = text.match(/full-path\s*=\s*"([^"]+)"/i);
    const path = match?.[1];
    if (path && files[path]) {
      return strFromU8(files[path]);
    }
  }

  // Fallback: first .xml/.musicxml that is not under META-INF.
  const entry = Object.keys(files).find(
    (name) => /\.(musicxml|xml)$/i.test(name) && !name.startsWith("META-INF/")
  );
  if (entry) return strFromU8(files[entry]);

  throw new Error("Archivio .mxl senza file MusicXML al suo interno.");
}
