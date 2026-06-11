// Client-side cleanup for photos of paper scores: grayscale + percentile
// contrast stretch, re-encoded as JPEG. Phone shots convert much better in OMR
// after this (evens out lighting, darkens the print).

const MAX_DIM = 2400; // cap the long side; plenty of resolution for OMR

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(`Immagine non leggibile: ${file.name}`));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function cleanPhoto(file: File): Promise<File> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Grayscale + luminance histogram.
  const hist = new Uint32Array(256);
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
    px[i] = px[i + 1] = px[i + 2] = y;
    hist[y]++;
  }

  // Contrast stretch between the 2nd and 98th percentile.
  const total = w * h;
  let lo = 0,
    hi = 255,
    acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * 0.02) {
      hi = v;
      break;
    }
  }
  const range = Math.max(1, hi - lo);
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.min(255, Math.max(0, ((px[i] - lo) * 255) / range));
    px[i] = px[i + 1] = px[i + 2] = y;
  }
  ctx.putImageData(data, 0, 0);

  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("Conversione immagine fallita."))),
      "image/jpeg",
      0.92
    )
  );
  const name = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
