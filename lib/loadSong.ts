import { parseMidi } from "./parseMidi";
import { parseMusicXml } from "./parseMusicXml";
import { mxlToXml } from "./mxl";
import type { Song } from "./types";

const MIDI_EXT = /\.midi?$/i;
const XML_EXT = /\.(musicxml|xml)$/i;
const MXL_EXT = /\.mxl$/i;

/** Read a user-supplied File and route it to the correct parser. */
export async function loadSong(file: File): Promise<Song> {
  const name = file.name.replace(/\.[^.]+$/, "");

  if (MIDI_EXT.test(file.name)) {
    const buffer = await file.arrayBuffer();
    return parseMidi(buffer, name);
  }

  if (MXL_EXT.test(file.name)) {
    const buffer = await file.arrayBuffer();
    return parseMusicXml(mxlToXml(new Uint8Array(buffer)), name);
  }

  if (XML_EXT.test(file.name)) {
    const xml = await file.text();
    return parseMusicXml(xml, name);
  }

  // Fall back to content sniffing for files with odd extensions.
  const head = (await file.slice(0, 256).text()).trimStart();
  if (head.startsWith("<?xml") || head.includes("score-partwise")) {
    return parseMusicXml(await file.text(), name);
  }

  throw new Error(
    "Formato non riconosciuto. Carica un file .mid, .midi o .musicxml."
  );
}
