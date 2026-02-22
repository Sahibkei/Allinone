import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ToolPlaceholder } from "@/components/tools/tool-placeholder";

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
      <ToolPlaceholder
        heading="PDF merge/split workflow is queued"
        details="The dedicated page is live with matching UI/UX. In its PR, this route will get file ordering, page range split options, and output generation."
        nextMilestone="Add PDF import, order controls, merge, split by range, and export."
      />
    </ToolPageShell>
  );
}
