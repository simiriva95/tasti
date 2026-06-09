# Tasti

Carica un file **MIDI** o uno spartito **MusicXML** (pianoforte) e scopri, sulla
tastiera, **quali tasti premere** per ogni accordo, sull'ottava giusta. Pensato
per chi non conosce la teoria musicale.

- Traccia scorrevole stile piano-roll: ogni accordo è una colonna di barre.
- Clic su una nota/accordo → la tastiera evidenzia i tasti e suona l'accordo.
- Clic su un singolo tasto della tastiera → suona quella nota.

## Avvio

```bash
npm install
npm run dev
```

Apri http://localhost:3000 e trascina un file `.mid`, `.midi`, `.musicxml`,
`.mxl` o un PDF.

## Spartiti PDF (OMR)

PDF **e immagini** (png/jpg/tiff/bmp, utile per scansioni/foto) vengono convertiti
in MusicXML con **Audiveris** (OMR open-source) lato server, poi caricati nel
viewer. Audiveris include il proprio runtime Java (nessuna installazione Java
separata).

Setup:

1. Scarica l'MSI **console** di Audiveris da
   https://github.com/Audiveris/audiveris/releases (es. `windowsConsole`).
2. L'MSI richiede admin per l'install normale. In alternativa, estrazione senza
   admin: `msiexec /a Audiveris-...-windowsConsole.msi /qn TARGETDIR="C:\percorso"`.
3. Copia `.env.example` in `.env.local` e imposta `AUDIVERIS_CMD` al launcher:
   `AUDIVERIS_CMD="C:\percorso\Audiveris\Audiveris.exe"`
4. Riavvia `npm run dev`. Ora puoi trascinare un PDF o un'immagine.

Nota: l'OMR è automatico ma imperfetto. Spartiti complessi vanno corretti a mano
in un editor (es. MuseScore) prima di esportare il MusicXML definitivo. La
conversione può richiedere da pochi secondi a oltre un minuto.

## File di esempio

Una progressione C–F–G–C già pronta in `public/samples/`. Per rigenerarla:

```bash
node public/samples/make-samples.mjs
```

## Come funziona

| Pezzo | File |
|---|---|
| Lettura MIDI | `lib/parseMidi.ts` (`@tonejs/midi`) |
| Lettura MusicXML | `lib/parseMusicXml.ts` (parser DOM dedicato) |
| Lettura .mxl (zip) | `lib/mxl.ts` (`fflate`) |
| Conversione PDF (OMR) | `app/api/omr/route.ts` (Audiveris) |
| Modello unico note | `lib/types.ts` |
| Rilevamento accordi | `lib/chords.ts` (`@tonaljs/tonal`) |
| Audio pianoforte | `lib/audio.ts` (`tone`, campioni Salamander) |
| Geometria tastiera | `lib/keyboard.ts` (condivisa roll + tastiera) |

Entrambi i formati confluiscono nello stesso modello `Song`, quindi l'interfaccia
non sa né deve sapere quale formato è stato caricato.
