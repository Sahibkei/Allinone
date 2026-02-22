import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { PdfMergeSplitClient } from "@/app/tools/pdf-merge-split/pdf-merge-split-client";

export const metadata: Metadata = {
  title: "PDF Merge + Split",
  description: "Merge PDF files or split pages into separate output PDFs.",
};

export default function PdfMergeSplitPage() {
  return (
    <ToolPageShell
      title="PDF Merge + Split"
      description="Combine multiple PDFs in order or split pages into separate documents from one focused workspace."
      category="Document"
    >
      <PdfMergeSplitClient />
    </ToolPageShell>
  );
}
