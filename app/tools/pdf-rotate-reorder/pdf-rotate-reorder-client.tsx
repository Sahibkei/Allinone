"use client";

import { useMemo, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";

type PageItem = {
  id: string;
  sourceIndex: number;
  rotation: number;
};

type GeneratedOutput = {
  name: string;
  url: string;
  bytes: number;
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

export function PdfRotateReorderClient() {
  const [fileName, setFileName] = useState("");
  const [sourcePdfBytes, setSourcePdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<GeneratedOutput | null>(null);

  const hasPages = useMemo(() => pages.length > 0, [pages.length]);

  function clearOutputUrl() {
    if (generatedOutput?.url) {
      URL.revokeObjectURL(generatedOutput.url);
    }
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;
    clearOutputUrl();
    setGeneratedOutput(null);
    setErrorText("");
    setStatusText("Loading PDF...");

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFDocument.load(bytes);
      const pageCount = pdf.getPageCount();
      const pageItems: PageItem[] = Array.from({ length: pageCount }, (_, index) => ({
        id: `page-${index + 1}`,
        sourceIndex: index,
        rotation: 0,
      }));
      setFileName(file.name);
      setSourcePdfBytes(bytes);
      setPages(pageItems);
      setStatusText(`Loaded ${pageCount} page(s).`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unable to load PDF.");
      setStatusText("");
    }
  }

  function movePage(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const next = [...pages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setPages(next);
  }

  function rotatePage(index: number, delta: number) {
    const next = [...pages];
    const current = next[index];
    const normalized = ((current.rotation + delta) % 360 + 360) % 360;
    next[index] = { ...current, rotation: normalized };
    setPages(next);
  }

  function resetAll() {
    clearOutputUrl();
    setFileName("");
    setSourcePdfBytes(null);
    setPages([]);
    setStatusText("");
    setErrorText("");
    setGeneratedOutput(null);
  }

  async function exportPdf() {
    if (!sourcePdfBytes || !pages.length || isProcessing) return;
    setIsProcessing(true);
    setErrorText("");
    setStatusText("Applying page order and rotation...");
    clearOutputUrl();
    setGeneratedOutput(null);

    try {
      const sourcePdf = await PDFDocument.load(sourcePdfBytes);
      const outputPdf = await PDFDocument.create();

      for (let index = 0; index < pages.length; index += 1) {
        const item = pages[index];
        const [copiedPage] = await outputPdf.copyPages(sourcePdf, [item.sourceIndex]);
        copiedPage.setRotation(degrees(item.rotation));
        outputPdf.addPage(copiedPage);
      }

      const bytes = await outputPdf.save();
      const blob = bytesToPdfBlob(bytes);
      const url = URL.createObjectURL(blob);
      const baseName = fileName ? fileName.replace(/\.[^/.]+$/, "") : "output";
      setGeneratedOutput({
        name: `${baseName}-edited.pdf`,
        url,
        bytes: blob.size,
      });
      setStatusText("Done. Updated PDF is ready.");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unable to export updated PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  function downloadOutput() {
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
        <h2 className="text-2xl font-bold">Reorder pages and rotate as needed</h2>
        <p className="muted mt-3 max-w-3xl text-sm leading-6 md:text-base">
          Upload one PDF, adjust page order, rotate pages left/right, then export the updated
          document.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
              className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportPdf}
            disabled={!hasPages || isProcessing}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Exporting..." : "Export updated PDF"}
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="glass-panel rounded-full px-5 py-3 text-sm font-semibold"
          >
            Reset
          </button>
        </div>

        {!!statusText && <p className="muted mt-4 text-sm">{statusText}</p>}
        {!!errorText && <p className="mt-3 text-sm text-red-300">{errorText}</p>}
      </section>

      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <h3 className="text-xl font-bold">Page list</h3>
        {!hasPages && <p className="muted mt-4 text-sm">No PDF loaded yet.</p>}

        {!!hasPages && (
          <div className="mt-4 space-y-2">
            {pages.map((item, index) => (
              <article key={item.id} className="surface flex items-center justify-between rounded-xl p-3">
                <div>
                  <p className="text-sm font-semibold">Page {item.sourceIndex + 1}</p>
                  <p className="muted text-xs">Rotation: {item.rotation}°</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => rotatePage(index, -90)}
                    className="rounded-full border border-white/25 px-2 py-1 text-xs"
                  >
                    Left
                  </button>
                  <button
                    type="button"
                    onClick={() => rotatePage(index, 90)}
                    className="rounded-full border border-white/25 px-2 py-1 text-xs"
                  >
                    Right
                  </button>
                  <button
                    type="button"
                    onClick={() => movePage(index, index - 1)}
                    className="rounded-full border border-white/25 px-2 py-1 text-xs"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => movePage(index, index + 1)}
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
            onClick={downloadOutput}
            disabled={!generatedOutput}
            className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download PDF
          </button>
        </div>

        {!generatedOutput && <p className="muted mt-4 text-sm">Generated file appears here.</p>}

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
