"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UsagePaywallModal } from "@/components/usage/usage-paywall-modal";
import { useUsageGuard } from "@/hooks/use-usage-guard";

type CompressionProfileKey = "light" | "balanced" | "strong";
type TargetPresetKey = "none" | "200kb" | "500kb" | "1mb" | "2mb";
type OutputFormatKey = "keep" | "jpg" | "webp";

type CompressionResult = {
  id: string;
  name: string;
  originalBytes: number;
  compressedBytes: number;
  sizeDeltaPercent: number;
  originalUrl: string;
  compressedUrl: string;
  outputMime: string;
  status: "done" | "error";
  error?: string;
};

const compressionProfiles: Record<
  CompressionProfileKey,
  { label: string; description: string; quality: number; maxDimension: number }
> = {
  light: {
    label: "Light",
    description: "Best quality, softer compression",
    quality: 0.88,
    maxDimension: 3200,
  },
  balanced: {
    label: "Balanced",
    description: "Good quality and file size",
    quality: 0.76,
    maxDimension: 2600,
  },
  strong: {
    label: "Strong",
    description: "Smaller files for web sharing",
    quality: 0.62,
    maxDimension: 1800,
  },
};

const targetPresets: Record<TargetPresetKey, { label: string; bytes: number }> = {
  none: { label: "No target", bytes: 0 },
  "200kb": { label: "200 KB (tiny)", bytes: 200 * 1024 },
  "500kb": { label: "500 KB (email)", bytes: 500 * 1024 },
  "1mb": { label: "1 MB (balanced)", bytes: 1024 * 1024 },
  "2mb": { label: "2 MB (high quality)", bytes: 2 * 1024 * 1024 },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extensionFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function resolveOutputMime(fileType: string, outputFormat: OutputFormatKey) {
  if (outputFormat === "jpg") return "image/jpeg";
  if (outputFormat === "webp") return "image/webp";
  if (fileType === "image/png" || fileType === "image/webp" || fileType === "image/jpeg") {
    return fileType;
  }
  return "image/jpeg";
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create output blob."));
          return;
        }
        resolve(blob);
      },
      mime,
      quality,
    );
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const tempUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(tempUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error("Failed to decode image."));
    };
    image.src = tempUrl;
  });
}

async function compressToTarget(
  canvas: HTMLCanvasElement,
  mime: string,
  initialQuality: number,
  targetBytes: number,
) {
  let low = 0.32;
  let high = Math.min(0.95, initialQuality);
  let bestUnder: Blob | null = null;
  let smallest: Blob | null = null;

  for (let i = 0; i < 9; i += 1) {
    const quality = Number(((low + high) / 2).toFixed(3));
    const blob = await canvasToBlob(canvas, mime, quality);

    if (!smallest || blob.size < smallest.size) {
      smallest = blob;
    }

    if (blob.size <= targetBytes) {
      bestUnder = blob;
      low = quality + 0.03;
    } else {
      high = quality - 0.03;
    }

    if (low > high) {
      break;
    }
  }

  if (bestUnder) {
    return bestUnder;
  }
  if (smallest) {
    return smallest;
  }
  return canvasToBlob(canvas, mime, initialQuality);
}

async function compressImage(
  file: File,
  profileKey: CompressionProfileKey,
  targetPreset: TargetPresetKey,
  outputFormat: OutputFormatKey,
) {
  const profile = compressionProfiles[profileKey];
  const targetBytes = targetPresets[targetPreset].bytes;
  const image = await loadImage(file);

  let width = image.naturalWidth;
  let height = image.naturalHeight;
  const longestSide = Math.max(width, height);
  if (longestSide > profile.maxDimension) {
    const ratio = profile.maxDimension / longestSide;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const outputMime = resolveOutputMime(file.type, outputFormat);
  let outputBlob: Blob;
  const qualityAware = outputMime === "image/jpeg" || outputMime === "image/webp";

  if (targetBytes > 0 && qualityAware) {
    outputBlob = await compressToTarget(canvas, outputMime, profile.quality, targetBytes);
  } else {
    outputBlob = await canvasToBlob(canvas, outputMime, profile.quality);
  }

  return { outputBlob, outputMime };
}

export function ImageCompressorClient() {
  const objectUrlsRef = useRef<string[]>([]);
  const runIdRef = useRef(0);
  const cancelRequestedRef = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<CompressionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [profile, setProfile] = useState<CompressionProfileKey>("balanced");
  const [targetPreset, setTargetPreset] = useState<TargetPresetKey>("none");
  const [outputFormat, setOutputFormat] = useState<OutputFormatKey>("keep");
  const [progressText, setProgressText] = useState("");
  const { blockedState, consumeUsage, closeBlockedModal } = useUsageGuard();

  const completedResults = useMemo(
    () => results.filter((result) => result.status === "done"),
    [results],
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

  function trackObjectUrl(blob: Blob | File) {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.push(url);
    return url;
  }

  function cancelCurrentRun() {
    cancelRequestedRef.current = true;
    runIdRef.current += 1;
    setIsProcessing(false);
  }

  function onFilesSelected(fileList: FileList | null) {
    if (!fileList) return;
    cancelCurrentRun();
    const nextFiles = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    clearObjectUrls();
    setResults([]);
    setFiles(nextFiles);
    setProgressText("");
  }

  async function runCompression() {
    if (!files.length || isProcessing) return;
    const canUse = await consumeUsage("image-compressor");
    if (!canUse) return;

    cancelRequestedRef.current = false;
    runIdRef.current += 1;
    const activeRunId = runIdRef.current;

    setIsProcessing(true);
    clearObjectUrls();
    setResults([]);

    const nextResults: CompressionResult[] = [];

    for (let index = 0; index < files.length; index += 1) {
      if (cancelRequestedRef.current || runIdRef.current !== activeRunId) {
        setIsProcessing(false);
        return;
      }

      const file = files[index];
      setProgressText(`Compressing ${index + 1} / ${files.length}...`);

      try {
        const { outputBlob, outputMime } = await compressImage(file, profile, targetPreset, outputFormat);

        if (cancelRequestedRef.current || runIdRef.current !== activeRunId) {
          setIsProcessing(false);
          return;
        }

        const originalUrl = trackObjectUrl(file);
        const compressedUrl = trackObjectUrl(outputBlob);
        const sizeDeltaPercent = file.size > 0 ? ((file.size - outputBlob.size) / file.size) * 100 : 0;

        nextResults.push({
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          originalBytes: file.size,
          compressedBytes: outputBlob.size,
          sizeDeltaPercent,
          originalUrl,
          compressedUrl,
          outputMime,
          status: "done",
        });
      } catch (error) {
        if (cancelRequestedRef.current || runIdRef.current !== activeRunId) {
          setIsProcessing(false);
          return;
        }

        nextResults.push({
          id: `${file.name}-${file.lastModified}-${index}`,
          name: file.name,
          originalBytes: file.size,
          compressedBytes: 0,
          sizeDeltaPercent: 0,
          originalUrl: "",
          compressedUrl: "",
          outputMime: "",
          status: "error",
          error: error instanceof Error ? error.message : "Compression failed.",
        });
      }
    }

    if (!cancelRequestedRef.current && runIdRef.current === activeRunId) {
      setResults(nextResults);
      setProgressText(`Done. Processed ${files.length} file(s).`);
      setIsProcessing(false);
    }
  }

  function triggerDownload(result: CompressionResult) {
    const baseName = result.name.replace(/\.[^/.]+$/, "");
    const extension = extensionFromMime(result.outputMime);
    const anchor = document.createElement("a");
    anchor.href = result.compressedUrl;
    anchor.download = `${baseName}-compressed.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  async function downloadAll() {
    if (!completedResults.length || isDownloadingAll) return;
    setIsDownloadingAll(true);
    for (let index = 0; index < completedResults.length; index += 1) {
      triggerDownload(completedResults[index]);
      if (index < completedResults.length - 1) {
        await wait(180);
      }
    }
    setIsDownloadingAll(false);
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <h2 className="text-2xl font-bold">Compress images in bulk</h2>
        <p className="muted mt-3 max-w-3xl text-sm leading-6 md:text-base">
          Upload multiple images, pick compression strength, choose a target size preset, then
          process everything in one run.
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
            <span className="muted mt-2 block text-xs">
              Supports JPG, PNG, and WEBP. Add multiple files for bulk processing.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Compression</span>
              <select
                value={profile}
                onChange={(event) => setProfile(event.target.value as CompressionProfileKey)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                {Object.entries(compressionProfiles).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Target size</span>
              <select
                value={targetPreset}
                onChange={(event) => setTargetPreset(event.target.value as TargetPresetKey)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                {Object.entries(targetPresets).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Output</span>
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as OutputFormatKey)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                <option value="keep">Keep original</option>
                <option value="jpg">Convert to JPG</option>
                <option value="webp">Convert to WEBP</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runCompression}
            disabled={isProcessing || files.length === 0}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Compress files"}
          </button>
          <button
            type="button"
            onClick={() => {
              cancelCurrentRun();
              clearObjectUrls();
              setFiles([]);
              setResults([]);
              setProgressText("");
            }}
            className="glass-panel rounded-full px-5 py-3 text-sm font-semibold"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 text-sm muted">
          {files.length ? `Queued ${files.length} file(s).` : "No files selected yet."}
          {progressText ? ` ${progressText}` : ""}
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold">Results</h3>
          <button
            type="button"
            onClick={downloadAll}
            disabled={completedResults.length === 0 || isDownloadingAll || isProcessing}
            className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloadingAll ? "Downloading..." : "Download all"}
          </button>
        </div>

        {!results.length && (
          <p className="muted mt-4 text-sm">Compressed files will appear here after processing.</p>
        )}

        {!!results.length && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {results.map((result) => (
              <article key={result.id} className="surface rounded-2xl p-4">
                <p className="truncate text-sm font-semibold">{result.name}</p>
                {result.status === "done" ? (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="overflow-hidden rounded-xl border border-white/20">
                        {/* Blob/object URLs are not suitable for next/image optimization. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={result.originalUrl} alt="" className="h-28 w-full object-cover" />
                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={result.compressedUrl} alt="" className="h-28 w-full object-cover" />
                      </div>
                    </div>
                    <div className="mt-3 text-xs muted">
                      <p>Original: {formatBytes(result.originalBytes)}</p>
                      <p>Compressed: {formatBytes(result.compressedBytes)}</p>
                      {Math.abs(result.sizeDeltaPercent) < 0.05 ? (
                        <p>No size change</p>
                      ) : result.sizeDeltaPercent > 0 ? (
                        <p>Savings: {result.sizeDeltaPercent.toFixed(1)}%</p>
                      ) : (
                        <p className="text-amber-300">
                          Larger by {Math.abs(result.sizeDeltaPercent).toFixed(1)}%
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerDownload(result)}
                      className="mt-3 rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Download
                    </button>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-red-300">{result.error}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <UsagePaywallModal
        open={blockedState.open}
        reason={blockedState.reason}
        remaining={blockedState.remaining}
        resetAt={blockedState.resetAt}
        onClose={closeBlockedModal}
      />
    </div>
  );
}
