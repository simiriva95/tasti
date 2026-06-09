"use client";

import { useRef, useState } from "react";
import { UploadSimpleIcon, FileAudioIcon } from "@phosphor-icons/react";

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
  loadingText?: string;
  error?: string | null;
}

export default function FileDrop({ onFile, loading, loadingText, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition ${
          dragging
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-zinc-300 hover:border-emerald-400 dark:border-zinc-700"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          {loading ? (
            <FileAudioIcon size={28} weight="duotone" className="animate-pulse" />
          ) : (
            <UploadSimpleIcon size={28} weight="bold" />
          )}
        </span>
        <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {loading
            ? loadingText ?? "Sto leggendo il file..."
            : "Trascina qui un file, o clicca per sceglierlo"}
        </span>
        <span className="text-sm text-zinc-500">
          MIDI, MusicXML (.musicxml, .xml, .mxl), oppure spartito PDF / immagine
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".mid,.midi,.musicxml,.xml,.mxl,.pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
