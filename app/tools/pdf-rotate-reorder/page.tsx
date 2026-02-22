import type { Metadata } from "next";
import { ToolPageShell } from "@/components/tools/tool-page-shell";
import { ToolPlaceholder } from "@/components/tools/tool-placeholder";

export const metadata: Metadata = {
  title: "PDF Rotate + Reorder",
  description: "Rotate PDF pages and reorder them before exporting a new file.",
};

export default function PdfRotateReorderPage() {
  return (
    <ToolPageShell
      title="PDF Rotate + Reorder"
      description="Adjust page orientation and page order from one focused editor before downloading the updated PDF."
      category="Document"
    >
      <ToolPlaceholder
        heading="PDF rotate/reorder workflow is queued"
        details="The page is ready and visually consistent with the landing experience. In its PR, this route will include page thumbnails, drag reorder, rotate controls, and export."
        nextMilestone="Build PDF page preview and rotation/reordering actions."
      />
    </ToolPageShell>
  );
}
