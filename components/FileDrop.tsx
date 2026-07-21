"use client";

import { useRef, useState } from "react";
import { UploadSimpleIcon, FileAudioIcon } from "@phosphor-icons/react";

interface Props {
  onFiles: (files: File[]) => void;
  loading?: boolean;
  loadingText?: string;
  error?: string | null;
}

export default function FileDrop({ onFiles, loading, loadingText, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    if (files && files.length > 0) onFiles(Array.from(files));
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
            ? "border-[var(--ch-brass)] bg-[var(--ch-brass)]/10"
            : "border-[var(--ch-line-strong)] hover:border-[var(--ch-brass)]"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ch-brass)]/12 text-[var(--ch-brass)]">
          {loading ? (
            <FileAudioIcon size={28} weight="duotone" className="animate-pulse" />
          ) : (
            <UploadSimpleIcon size={28} weight="bold" />
          )}
        </span>
        <span className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {loading
            ? loadingText ?? "Sto leggendo il file..."
            : "Trascina qui i file, o clicca per sceglierli"}
        </span>
        <span className="text-sm text-zinc-500">
          MIDI, MusicXML (.musicxml, .xml, .mxl), spartito PDF, oppure più foto
          dello spartito insieme
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".mid,.midi,.musicxml,.xml,.mxl,.pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = ""; // allow re-selecting the same files
        }}
      />

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
