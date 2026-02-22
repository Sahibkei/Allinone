"use client";

import { useMemo, useState } from "react";
import { PDFDocument } from "pdf-lib";

type PagePreset = "a4" | "letter" | "original";
type OrientationMode = "auto" | "portrait" | "landscape";

type GeneratedOutput = {
  name: string;
  url: string;
  bytes: number;
};

type QueueItem = {
  id: string;
  file: File;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function bytesToPdfBlob(bytes: Uint8Array) {
  const normalized = new Uint8Array(bytes.byteLength);
  normalized.set(bytes);
  return new Blob([normalized], { type: "application/pdf" });
}

function getPresetSize(preset: PagePreset) {
  if (preset === "letter") {
    return { width: 612, height: 792 };
  }
  if (preset === "a4") {
    return { width: 595, height: 842 };
  }
  return null;
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to decode image: ${file.name}`));
    };
    image.src = objectUrl;
  });
}

async function fileToPngBytes(file: File) {
  const image = await loadImageElement(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }
  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("Failed to convert image."));
          return;
        }
        resolve(value);
      },
      "image/png",
      0.92,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export function ImagesToPdfClient() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [pagePreset, setPagePreset] = useState<PagePreset>("a4");
  const [orientation, setOrientation] = useState<OrientationMode>("auto");
  const [margin, setMargin] = useState(24);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);

  const hasQueue = useMemo(() => queue.length > 0, [queue.length]);

  function clearOutputUrl() {
    if (generatedOutput?.url) {
      URL.revokeObjectURL(generatedOutput.url);
    }
  }

  function onFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    clearOutputUrl();
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    setQueue(files.map((file, index) => ({ id: `${file.name}-${file.lastModified}-${index}`, file })));
    setGeneratedOutput(null);
    setStatusText("");
    setErrorText("");
  }

  function moveQueueItem(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= queue.length) return;
    const next = [...queue];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setQueue(next);
  }

  function clearAll() {
    clearOutputUrl();
    setQueue([]);
    setGeneratedOutput(null);
    setStatusText("");
    setErrorText("");
  }

  async function createPdf() {
    if (!queue.length || isProcessing) return;
    setIsProcessing(true);
    setErrorText("");
    setStatusText("Generating PDF...");
    clearOutputUrl();
    setGeneratedOutput(null);

    try {
      const pdf = await PDFDocument.create();
      const presetSize = getPresetSize(pagePreset);

      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index];
        const file = item.file;
        const rawBytes = new Uint8Array(await file.arrayBuffer());

        let embeddedImage;
        if (file.type === "image/jpeg" || file.type === "image/jpg") {
          embeddedImage = await pdf.embedJpg(rawBytes);
        } else if (file.type === "image/png") {
          embeddedImage = await pdf.embedPng(rawBytes);
        } else {
          const pngBytes = await fileToPngBytes(file);
          embeddedImage = await pdf.embedPng(pngBytes);
        }

        const imageWidth = embeddedImage.width;
        const imageHeight = embeddedImage.height;

        let pageWidth = imageWidth;
        let pageHeight = imageHeight;
        if (presetSize) {
          const wantsLandscape =
            orientation === "landscape" || (orientation === "auto" && imageWidth > imageHeight);
          pageWidth = wantsLandscape ? presetSize.height : presetSize.width;
          pageHeight = wantsLandscape ? presetSize.width : presetSize.height;
        }

        const page = pdf.addPage([pageWidth, pageHeight]);
        const maxWidth = Math.max(1, pageWidth - margin * 2);
        const maxHeight = Math.max(1, pageHeight - margin * 2);
        const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);
        const drawWidth = imageWidth * scale;
        const drawHeight = imageHeight * scale;

        page.drawImage(embeddedImage, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const bytes = await pdf.save();
      const blob = bytesToPdfBlob(bytes);
      const url = URL.createObjectURL(blob);
      setGeneratedOutput({
        name: "images-to-pdf.pdf",
        url,
        bytes: blob.size,
      });
      setStatusText(`Done. PDF generated from ${queue.length} image(s).`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to generate PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadPdf() {
    if (!generatedOutput) return;
    const anchor = document.createElement("a");
    anchor.href = generatedOutput.url;
    anchor.download = generatedOutput.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-bold">Build a PDF from multiple images</h2>
        <p className="muted mt-3 max-w-3xl text-sm leading-6 md:text-base">
          Upload images, reorder pages, choose page layout settings, and export one PDF file.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Upload images</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => onFilesSelected(event.target.files)}
              className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Page size</span>
              <select
                value={pagePreset}
                onChange={(event) => setPagePreset(event.target.value as PagePreset)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="original">Original image size</option>
              </select>
            </label>

            <label className={`block ${pagePreset === "original" ? "opacity-60" : ""}`}>
              <span className="mb-2 block text-sm font-medium">Orientation</span>
              <select
                value={orientation}
                disabled={pagePreset === "original"}
                onChange={(event) => setOrientation(event.target.value as OrientationMode)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                <option value="auto">Auto</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label>

            <label className={`block ${pagePreset === "original" ? "opacity-60" : ""}`}>
              <span className="mb-2 block text-sm font-medium">Margins ({margin}pt)</span>
              <input
                type="range"
                min={0}
                max={72}
                value={margin}
                disabled={pagePreset === "original"}
                onChange={(event) => setMargin(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={createPdf}
            disabled={!hasQueue || isProcessing}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Generating..." : "Create PDF"}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="glass-panel rounded-full px-5 py-3 text-sm font-semibold"
          >
            Reset
          </button>
        </div>

        {!!statusText && <p className="muted mt-4 text-sm">{statusText}</p>}
        {!!errorText && <p className="mt-3 text-sm text-red-300">{errorText}</p>}
      </section>

      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <h3 className="text-xl font-bold">Image order</h3>
        {!hasQueue && <p className="muted mt-4 text-sm">No images queued.</p>}

        {!!hasQueue && (
          <div className="mt-4 space-y-2">
            {queue.map((item, index) => (
              <article key={item.id} className="surface flex items-center justify-between rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold">{item.file.name}</p>
                  <p className="muted text-xs">{formatBytes(item.file.size)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveQueueItem(index, index - 1)}
                    className="rounded-full border border-white/25 px-2 py-1 text-xs"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQueueItem(index, index + 1)}
                    className="rounded-full border border-white/25 px-2 py-1 text-xs"
                  >
                    Down
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Output</h3>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!generatedOutput}
            className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>
        {!generatedOutput && <p className="muted mt-4 text-sm">Generated PDF file will appear here.</p>}
        {!!generatedOutput && (
          <article className="surface mt-4 rounded-xl p-4">
            <p className="text-sm font-semibold">{generatedOutput.name}</p>
            <p className="muted text-xs">{formatBytes(generatedOutput.bytes)}</p>
          </article>
        )}
      </section>
    </div>
  );
}
