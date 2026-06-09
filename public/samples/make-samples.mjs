// Generates two tiny test files: a C-F-G-C chord progression as MIDI and as
// MusicXML. Run: node public/samples/make-samples.mjs
import pkg from "@tonejs/midi";
const { Midi } = pkg;
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// C major, F major, G major, C major — one chord per second.
const chords = [
  [60, 64, 67], // C
  [65, 69, 72], // F
  [67, 71, 74], // G
  [60, 64, 67], // C
];

// --- MIDI ---
const midi = new Midi();
const track = midi.addTrack();
chords.forEach((notes, i) => {
  notes.forEach((midiNum) =>
    track.addNote({ midi: midiNum, time: i, duration: 0.9 })
  );
});
writeFileSync(join(here, "progression.mid"), Buffer.from(midi.toArray()));

// --- MusicXML (quarter-note chords, divisions=1, 4/4) ---
const stepOf = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
const alterOf = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
function noteXml(midiNum, isChord) {
  const pc = ((midiNum % 12) + 12) % 12;
  const octave = Math.floor(midiNum / 12) - 1;
  const alter = alterOf[pc] ? `<alter>${alterOf[pc]}</alter>` : "";
  return `      <note>${isChord ? "<chord/>" : ""}
        <pitch><step>${stepOf[pc]}</step>${alter}<octave>${octave}</octave></pitch>
        <duration>1</duration><type>quarter</type>
      </note>`;
}
const measures = chords
  .map((notes, i) => {
    const body = notes.map((n, j) => noteXml(n, j > 0)).join("\n");
    const attrs =
      i === 0
        ? `      <attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>\n`
        : "";
    return `    <measure number="${i + 1}">\n${attrs}${body}\n    </measure>`;
  })
  .join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
${measures}
  </part>
</score-partwise>`;
writeFileSync(join(here, "progression.musicxml"), xml);

console.log("Wrote progression.mid and progression.musicxml");
