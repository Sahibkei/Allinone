"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
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

type Mode = "merge" | "split";
type SplitMode = "every-page" | "custom-ranges";

type MergeFileItem = {
  id: string;
  file: File;
};

type OutputFile = {
  id: string;
  name: string;
  url: string;
  bytes: number;
};

type SortableMergeRowProps = {
  item: MergeFileItem;
  index: number;
  total: number;
  isDisabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bytesToPdfBlob(bytes: Uint8Array) {
  const normalized = new Uint8Array(bytes.byteLength);
  normalized.set(bytes);
  return new Blob([normalized], { type: "application/pdf" });
}

function createMergeFileId(file: File, index: number) {
  return `${file.name}-${file.lastModified}-${file.size}-${index}`;
}

function SortableMergeRow({
  item,
  index,
  total,
  isDisabled,
  onMoveUp,
  onMoveDown,
}: SortableMergeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`surface flex items-center justify-between rounded-xl p-3 ${isDragging ? "ring-2 ring-[var(--accent)]/60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Drag ${item.file.name}`}
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
        <p className="truncate text-sm">{item.file.name}</p>
      </div>
      <div className="flex gap-2">
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
    </div>
  );
}

function parseCustomRanges(input: string, totalPages: number) {
  const tokens = input
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    throw new Error("Provide at least one range, for example: 1-3, 4, 6-8");
  }

  return tokens.map((token) => {
    const [startRaw, endRaw] = token.split("-").map((value) => value.trim());
    const start = Number(startRaw);
    const end = endRaw ? Number(endRaw) : start;
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw new Error(`Invalid range token: "${token}"`);
    }
    if (start < 1 || end < 1 || start > totalPages || end > totalPages || start > end) {
      throw new Error(`Range "${token}" is out of bounds for ${totalPages} page(s).`);
    }
    const pageIndexes = [];
    for (let index = start - 1; index <= end - 1; index += 1) {
      pageIndexes.push(index);
    }
    return { label: token, pageIndexes };
  });
}

export function PdfMergeSplitClient() {
  const objectUrlsRef = useRef<string[]>([]);
  const [mode, setMode] = useState<Mode>("merge");
  const [mergeFiles, setMergeFiles] = useState<MergeFileItem[]>([]);
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>("every-page");
  const [rangeInput, setRangeInput] = useState("1-2, 3-4");
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const hasOutputs = useMemo(() => outputFiles.length > 0, [outputFiles.length]);
  const mergeSensors = useSensors(
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

  function clearObjectUrls() {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
  }

  useEffect(
    () => () => {
      clearObjectUrls();
    },
    [],
  );

  function trackObjectUrl(blob: Blob) {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.push(url);
    return url;
  }

  function resetState() {
    clearObjectUrls();
    setMergeFiles([]);
    setSplitFile(null);
    setOutputFiles([]);
    setStatusText("");
    setErrorText("");
  }

  async function runMerge() {
    if (!mergeFiles.length) return;
    setIsProcessing(true);
    clearObjectUrls();
    setOutputFiles([]);
    setErrorText("");
    setStatusText("Merging PDFs...");

    try {
      const mergedPdf = await PDFDocument.create();
      for (let index = 0; index < mergeFiles.length; index += 1) {
        const file = mergeFiles[index].file;
        const sourcePdf = await PDFDocument.load(await file.arrayBuffer());
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = bytesToPdfBlob(mergedBytes);
      const url = trackObjectUrl(blob);

      setOutputFiles([
        {
          id: "merged",
          name: "merged.pdf",
          url,
          bytes: blob.size,
        },
      ]);
      setStatusText(`Done. Merged ${mergeFiles.length} file(s).`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unable to merge PDFs.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function runSplit() {
    if (!splitFile) return;
    setIsProcessing(true);
    clearObjectUrls();
    setOutputFiles([]);
    setErrorText("");
    setStatusText("Splitting PDF...");

    try {
      const sourcePdf = await PDFDocument.load(await splitFile.arrayBuffer());
      const totalPages = sourcePdf.getPageCount();
      const baseName = splitFile.name.replace(/\.[^/.]+$/, "");

      const groups =
        splitMode === "every-page"
          ? Array.from({ length: totalPages }, (_, idx) => ({
              label: `page-${idx + 1}`,
              pageIndexes: [idx],
            }))
          : parseCustomRanges(rangeInput, totalPages);

      const nextOutputs: OutputFile[] = [];
      for (let index = 0; index < groups.length; index += 1) {
        const group = groups[index];
        const newPdf = await PDFDocument.create();
        const copiedPages = await newPdf.copyPages(sourcePdf, group.pageIndexes);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const bytes = await newPdf.save();
        const blob = bytesToPdfBlob(bytes);
        const url = trackObjectUrl(blob);
        nextOutputs.push({
          id: `${group.label}-${index}`,
          name: `${baseName}-${group.label}.pdf`,
          url,
          bytes: blob.size,
        });
      }

      setOutputFiles(nextOutputs);
      setStatusText(`Done. Generated ${nextOutputs.length} split file(s).`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unable to split PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  function triggerDownload(file: OutputFile) {
    const anchor = document.createElement("a");
    anchor.href = file.url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function downloadAll() {
    if (!outputFiles.length || isDownloadingAll) return;
    setIsDownloadingAll(true);
    for (let index = 0; index < outputFiles.length; index += 1) {
      triggerDownload(outputFiles[index]);
      if (index < outputFiles.length - 1) {
        await wait(180);
      }
    }
    setIsDownloadingAll(false);
  }

  function moveMergeFile(fromIndex: number, toIndex: number) {
    setMergeFiles((currentFiles) => {
      if (toIndex < 0 || toIndex >= currentFiles.length) return currentFiles;
      const next = [...currentFiles];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function onMergeDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setMergeFiles((currentFiles) => {
      const oldIndex = currentFiles.findIndex((item) => item.id === active.id);
      const newIndex = currentFiles.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return currentFiles;
      }
      return arrayMove(currentFiles, oldIndex, newIndex);
    });
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-bold">Merge or split PDF files</h2>
        <p className="muted mt-3 max-w-3xl text-sm leading-6 md:text-base">
          Use merge mode to combine multiple PDFs. Use split mode to export one file per page or
          custom page ranges.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Tool mode</span>
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as Mode);
                setOutputFiles([]);
                setErrorText("");
                setStatusText("");
              }}
              className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
            >
              <option value="merge">Merge PDFs</option>
              <option value="split">Split PDF</option>
            </select>
          </label>
        </div>

        {mode === "merge" ? (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Upload PDFs to merge</span>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(event) =>
                  setMergeFiles(
                    Array.from(event.target.files ?? []).map((file, index) => ({
                      id: createMergeFileId(file, index),
                      file,
                    })),
                  )
                }
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              />
            </label>

            {!!mergeFiles.length && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Merge order</p>
                <p className="muted text-xs">
                  Hold and drag a file to reorder. Up/Down buttons still work for precise steps.
                </p>
                <DndContext
                  sensors={mergeSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onMergeDragEnd}
                >
                  <SortableContext
                    items={mergeFiles.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {mergeFiles.map((file, index) => (
                      <SortableMergeRow
                        key={file.id}
                        item={file}
                        index={index}
                        total={mergeFiles.length}
                        isDisabled={isProcessing}
                        onMoveUp={() => moveMergeFile(index, index - 1)}
                        onMoveDown={() => moveMergeFile(index, index + 1)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}

            <button
              type="button"
              onClick={runMerge}
              disabled={!mergeFiles.length || isProcessing}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Merge PDFs"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Upload PDF to split</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setSplitFile(event.target.files?.[0] ?? null)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Split mode</span>
              <select
                value={splitMode}
                onChange={(event) => setSplitMode(event.target.value as SplitMode)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                <option value="every-page">Every page as separate PDF</option>
                <option value="custom-ranges">Custom ranges</option>
              </select>
            </label>

            {splitMode === "custom-ranges" && (
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Ranges (e.g., 1-3, 4, 8-10)</span>
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(event) => setRangeInput(event.target.value)}
                  className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
                />
              </label>
            )}

            <button
              type="button"
              onClick={runSplit}
              disabled={!splitFile || isProcessing}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : "Split PDF"}
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={resetState}
            className="glass-panel rounded-full px-5 py-3 text-sm font-semibold"
          >
            Reset
          </button>
        </div>

        {!!statusText && <p className="muted mt-4 text-sm">{statusText}</p>}
        {!!errorText && <p className="mt-3 text-sm text-red-300">{errorText}</p>}
      </section>

      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Output files</h3>
          <button
            type="button"
            onClick={downloadAll}
            disabled={!hasOutputs || isDownloadingAll || isProcessing}
            className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloadingAll ? "Downloading..." : "Download all"}
          </button>
        </div>

        {!hasOutputs && <p className="muted mt-4 text-sm">Generated PDF files appear here.</p>}

        {!!hasOutputs && (
          <div className="mt-4 space-y-3">
            {outputFiles.map((file) => (
              <article key={file.id} className="surface flex items-center justify-between rounded-xl p-4">
                <div>
                  <p className="text-sm font-semibold">{file.name}</p>
                  <p className="muted text-xs">{formatBytes(file.bytes)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerDownload(file)}
                  className="rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Download
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
