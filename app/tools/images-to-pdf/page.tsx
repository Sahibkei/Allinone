import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ToolPlaceholder } from "@/components/tools/tool-placeholder";

export const metadata: Metadata = {
  title: "Images to PDF",
  description: "Convert one or many images into a single PDF document.",
};

export default function ImagesToPdfPage() {
  return (
    <ToolPageShell
      title="Images to PDF"
      description="Upload images, control page order, and export one clean PDF document tailored to print or digital usage."
      category="Document"
    >
      <ToolPlaceholder
        heading="Images to PDF workflow is queued"
        details="This standalone route is ready. In its PR, this page will support image upload, page sorting, page-size presets, and PDF export."
        nextMilestone="Implement image ingestion, order controls, and PDF rendering."
      />
    </ToolPageShell>
  );
}
