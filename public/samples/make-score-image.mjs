// Render a richer engraved score to PNG so we can test the OMR pipeline
// end-to-end. A longer piece gives Audiveris real systems/barlines to detect.
// Dev/test helper, not part of the app.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import createVerovioModule from "verovio/wasm";
import { VerovioToolkit } from "verovio/esm";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));

// A C major scale up and down (quarter notes), 8 measures of 4/4.
const scale = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60, 60];
const stepOf = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
const alterOf = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
function noteXml(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const alter = alterOf[pc] ? `<alter>${alterOf[pc]}</alter>` : "";
  return `      <note><pitch><step>${stepOf[pc]}</step>${alter}<octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type></note>`;
}
let measures = "";
for (let m = 0; m < 8; m++) {
  const notes = scale.slice(m * 2, m * 2 + 2).flatMap((n) => [n, n]); // 4 beats
  const attrs =
    m === 0
      ? `<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>`
      : "";
  measures += `    <measure number="${m + 1}">${attrs}\n${notes.map(noteXml).join("\n")}\n    </measure>\n`;
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name></part-name></score-part></part-list>
  <part id="P1">
${measures}  </part>
</score-partwise>`;
writeFileSync(join(here, "scale.musicxml"), xml);

const VerovioModule = await createVerovioModule();
const tk = new VerovioToolkit(VerovioModule);
tk.setOptions({
  pageHeight: 2970,
  pageWidth: 2100,
  scale: 50,
  systemMaxPerPage: 4,
  adjustPageHeight: true,
});
tk.loadData(xml);
const svg = tk.renderToSVG(1);

await sharp(Buffer.from(svg), { density: 150 })
  .flatten({ background: "#ffffff" })
  .png()
  .toFile(join(here, "scale.png"));

const meta = await sharp(join(here, "scale.png")).metadata();
console.log(`Wrote scale.png ${meta.width}x${meta.height}`);
