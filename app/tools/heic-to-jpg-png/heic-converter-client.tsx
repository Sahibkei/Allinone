"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OutputFormat = "jpg" | "png";

type ConversionResult = {
  id: string;
  sourceName: string;
  sourceBytes: number;
  outputBytes: number;
  outputUrl: string;
  outputMime: string;
  status: "done" | "error";
  error?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isHeicFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return (
    extension === "heic" ||
    extension === "heif" ||
    file.type.includes("heic") ||
    file.type.includes("heif")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extensionFor(format: OutputFormat) {
  return format === "jpg" ? "jpg" : "png";
}

export function HeicConverterClient() {
  const objectUrlsRef = useRef<string[]>([]);
  const runIdRef = useRef(0);
  const cancelRequestedRef = useRef(false);
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("jpg");
  const [jpgQuality, setJpgQuality] = useState(86);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [progressText, setProgressText] = useState("");

  const completedResults = useMemo(
    () => results.filter((item) => item.status === "done"),
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

  function trackObjectUrl(blob: Blob) {
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
    clearObjectUrls();
    const nextFiles = Array.from(fileList).filter((file) => isHeicFile(file));
    setFiles(nextFiles);
    setResults([]);
    setProgressText("");
  }

  async function convertFiles() {
    if (!files.length || isProcessing) return;
    cancelRequestedRef.current = false;
    runIdRef.current += 1;
    const activeRunId = runIdRef.current;

    clearObjectUrls();
    setResults([]);
    setIsProcessing(true);

    const nextResults: ConversionResult[] = [];

    for (let index = 0; index < files.length; index += 1) {
      if (cancelRequestedRef.current || runIdRef.current !== activeRunId) {
        setIsProcessing(false);
        return;
      }

      const file = files[index];
      setProgressText(`Converting ${index + 1} / ${files.length}...`);

      try {
        const { default: heic2any } = await import("heic2any");
        const outputMime = outputFormat === "jpg" ? "image/jpeg" : "image/png";
        const converted = await heic2any({
          blob: file,
          toType: outputMime,
          quality: outputFormat === "jpg" ? jpgQuality / 100 : undefined,
        });

        if (cancelRequestedRef.current || runIdRef.current !== activeRunId) {
          setIsProcessing(false);
          return;
        }

        const outputBlob = Array.isArray(converted) ? converted[0] : converted;
        if (!(outputBlob instanceof Blob)) {
          throw new Error("Conversion failed for this file.");
        }

        const outputUrl = trackObjectUrl(outputBlob);
        nextResults.push({
          id: `${file.name}-${file.lastModified}-${index}`,
          sourceName: file.name,
          sourceBytes: file.size,
          outputBytes: outputBlob.size,
          outputUrl,
          outputMime,
          status: "done",
        });
      } catch (error) {
        nextResults.push({
          id: `${file.name}-${file.lastModified}-${index}`,
          sourceName: file.name,
          sourceBytes: file.size,
          outputBytes: 0,
          outputUrl: "",
          outputMime: "",
          status: "error",
          error: error instanceof Error ? error.message : "Conversion failed.",
        });
      }
    }

    if (!cancelRequestedRef.current && runIdRef.current === activeRunId) {
      setResults(nextResults);
      setProgressText(`Done. Converted ${files.length} file(s).`);
      setIsProcessing(false);
    }
  }

  function triggerDownload(item: ConversionResult) {
    if (item.status !== "done") return;
    const basename = item.sourceName.replace(/\.[^/.]+$/, "");
    const extension = extensionFor(outputFormat);
    const anchor = document.createElement("a");
    anchor.href = item.outputUrl;
    anchor.download = `${basename}.${extension}`;
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
        <h2 className="text-2xl font-bold">Convert HEIC files in bulk</h2>
        <p className="muted mt-3 max-w-3xl text-sm leading-6 md:text-base">
          Upload one or many `.heic` / `.heif` images, choose JPG or PNG output, and export all
          converted files.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Upload HEIC files</span>
            <input
              type="file"
              accept=".heic,.heif,image/heic,image/heif"
              multiple
              onChange={(event) => onFilesSelected(event.target.files)}
              className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
            />
            <span className="muted mt-2 block text-xs">
              Only HEIC/HEIF files are accepted on this page.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Output format</span>
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
                className="surface w-full rounded-xl border border-white/30 px-3 py-3 text-sm"
              >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
              </select>
            </label>

            <label className={`block ${outputFormat === "png" ? "opacity-60" : ""}`}>
              <span className="mb-2 block text-sm font-medium">JPG quality ({jpgQuality}%)</span>
              <input
                type="range"
                min={55}
                max={98}
                value={jpgQuality}
                disabled={outputFormat === "png"}
                onChange={(event) => setJpgQuality(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={convertFiles}
            disabled={!files.length || isProcessing}
            className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Converting..." : "Convert files"}
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

        {!results.length && <p className="muted mt-4 text-sm">Converted files will appear here.</p>}

        {!!results.length && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {results.map((item) => (
              <article key={item.id} className="surface rounded-2xl p-4">
                <p className="truncate text-sm font-semibold">{item.sourceName}</p>
                {item.status === "done" ? (
                  <>
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/20">
                      {/* Blob/object URLs are not suitable for next/image optimization. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.outputUrl} alt="" className="h-32 w-full object-cover" />
                    </div>
                    <div className="mt-3 text-xs muted">
                      <p>Source: {formatBytes(item.sourceBytes)}</p>
                      <p>Output: {formatBytes(item.outputBytes)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerDownload(item)}
                      className="mt-3 rounded-full bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Download
                    </button>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-red-300">{item.error}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
