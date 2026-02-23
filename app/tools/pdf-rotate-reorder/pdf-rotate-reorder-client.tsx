"use client";

import { useMemo, useState } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

type SortablePageRowProps = {
  item: PageItem;
  index: number;
  total: number;
  isDisabled: boolean;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
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

function SortablePageRow({
  item,
  index,
  total,
  isDisabled,
  onRotateLeft,
  onRotateRight,
  onMoveUp,
  onMoveDown,
}: SortablePageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`surface flex items-center justify-between rounded-xl p-3 ${isDragging ? "ring-2 ring-[var(--accent)]/60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Drag Page ${item.sourceIndex + 1}`}
          className="rounded-lg border border-white/25 px-2 py-2 text-xs font-semibold hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isDisabled}
          {...attributes}
          {...listeners}
        >
          <span className="grid grid-cols-3 gap-1 text-[var(--muted)]" aria-hidden="true">
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
            <span className="h-1 w-1 rounded-full bg-current" />
          </span>
        </button>
        <div>
          <p className="text-sm font-semibold">Page {item.sourceIndex + 1}</p>
          <p className="muted text-xs">
            Rotation: {item.rotation}deg | Position {index + 1}/{total}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRotateLeft}
          className="rounded-full border border-white/25 px-2 py-1 text-xs hover:border-[var(--accent)]"
        >
          Left
        </button>
        <button
          type="button"
          onClick={onRotateRight}
          className="rounded-full border border-white/25 px-2 py-1 text-xs hover:border-[var(--accent)]"
        >
          Right
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded-full border border-white/25 px-2 py-1 text-xs hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Up
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded-full border border-white/25 px-2 py-1 text-xs hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Down
        </button>
      </div>
    </article>
  );
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
    setPages((currentPages) => {
      if (toIndex < 0 || toIndex >= currentPages.length) return currentPages;
      const next = [...currentPages];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function rotatePage(index: number, delta: number) {
    setPages((currentPages) => {
      const next = [...currentPages];
      const current = next[index];
      if (!current) return currentPages;
      const normalized = ((current.rotation + delta) % 360 + 360) % 360;
      next[index] = { ...current, rotation: normalized };
      return next;
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPages((currentPages) => {
      const oldIndex = currentPages.findIndex((item) => item.id === active.id);
      const newIndex = currentPages.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return currentPages;
      }
      return arrayMove(currentPages, oldIndex, newIndex);
    });
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
        <p className="muted mt-2 text-xs">
          Hold and drag any row to reorder. Up/Down buttons still work for precise steps.
        </p>
        {!hasPages && <p className="muted mt-4 text-sm">No PDF loaded yet.</p>}

        {!!hasPages && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pages.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="mt-4 space-y-2">
                {pages.map((item, index) => (
                  <SortablePageRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={pages.length}
                    isDisabled={isProcessing}
                    onRotateLeft={() => rotatePage(index, -90)}
                    onRotateRight={() => rotatePage(index, 90)}
                    onMoveUp={() => movePage(index, index - 1)}
                    onMoveDown={() => movePage(index, index + 1)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
